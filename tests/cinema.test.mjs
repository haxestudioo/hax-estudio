import test from 'node:test';
import assert from 'node:assert/strict';
import { BackgroundFilm, createCinema } from '../dist/assets/cinema.js';

// Isolated media-controller tests. No browser, network or real YouTube playback.
class Element extends EventTarget {
  constructor(tag = 'div') {
    super();
    this.tagName = tag;
    this.children = [];
    this.attributes = new Map();
    const classes = new Set();
    this.classList = {
      add: (...values) => values.forEach((value) => classes.add(value)),
      remove: (...values) => values.forEach((value) => classes.delete(value)),
      contains: (value) => classes.has(value),
    };
    this.style = { setProperty() {} };
  }
  setAttribute(key, value) {
    this.attributes.set(key, value);
  }
  append(child) {
    child.parent = this;
    this.children.push(child);
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  replaceChildren() {
    this.children.forEach((child) => (child.parent = null));
    this.children = [];
  }
  querySelector() {
    return this.icon;
  }
}

function environment(t, reduced = false) {
  const original = new Map();
  const set = (key, value) => {
    original.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  };
  t.after(() => {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const document = new EventTarget(),
    window = new EventTarget();
  const nodes = Object.fromEntries(
    [
      'cinema-sequence',
      'cinema-toggle',
      'cinema-watch',
      'cinema-player-first',
      'cinema-player-second',
    ].map((id) => [id, new Element()]),
  );
  const stage = new Element(),
    scenes = [new Element(), new Element()];
  let scroll = 0;
  nodes['cinema-toggle'].icon = new Element('span');
  nodes['cinema-sequence'].querySelector = () => stage;
  nodes['cinema-sequence'].querySelectorAll = () => scenes;
  nodes['cinema-sequence'].offsetHeight = reduced ? 2000 : 2500;
  nodes['cinema-sequence'].getBoundingClientRect = () => ({
    top: -scroll,
    bottom: (reduced ? 2000 : 2500) - scroll,
  });
  stage.offsetHeight = 1000;
  scenes[1].getBoundingClientRect = () => ({ top: 1000 - scroll });
  document.createElement = (tag) => new Element(tag);
  document.getElementById = (id) => nodes[id];
  document.hidden = false;
  set('document', document);
  set('window', window); // deliberately has no YT or onYouTubeIframeAPIReady
  set('matchMedia', () => ({ matches: reduced }));
  set('innerHeight', 1000);
  set('requestAnimationFrame', (fn) => {
    fn();
    return 1;
  });
  return {
    nodes,
    document,
    scrollTo(value) {
      scroll = value;
      window.dispatchEvent(new Event('scroll'));
    },
  };
}
const first = 'https://www.youtube.com/watch?v=AciOu04BxZg';
const second = 'https://www.youtube.com/watch?v=T0VN2ykadeg';

function assertAutoplay(frame, id) {
  assert.ok(frame, 'The embed must exist immediately, without an API callback');
  const url = new URL(frame.src);
  assert.equal(url.pathname, '/embed/' + id);
  assert.equal(url.searchParams.get('autoplay'), '1');
  assert.equal(url.searchParams.get('mute'), '1');
  assert.equal(url.searchParams.get('playsinline'), '1');
  assert.match(frame.allow, /autoplay/);
}

test('Vini solicita autoplay silencioso imediatamente, sem API externa', (t) => {
  const { nodes } = environment(t);
  const cinema = createCinema({ first, second, onWatch() {} });
  assertAutoplay(nodes['cinema-player-first'].children[0], 'AciOu04BxZg');
  assert.equal(nodes['cinema-player-second'].children.length, 0);
  cinema.dispose();
});
test('segundo filme inicia antes da transição e o primeiro para ao sair', (t) => {
  const { nodes, scrollTo } = environment(t);
  const cinema = createCinema({ first, second, onWatch() {} });
  scrollTo(200);
  assertAutoplay(nodes['cinema-player-second'].children[0], 'T0VN2ykadeg');
  assert.equal(nodes['cinema-player-first'].children.length, 1);
  scrollTo(1150);
  assert.equal(nodes['cinema-player-first'].children.length, 0);
  assert.equal(nodes['cinema-player-second'].children.length, 1);
  cinema.dispose();
});
test('player carregado aparece mesmo sem evento PLAYING da API', (t) => {
  const { nodes } = environment(t);
  const film = new BackgroundFilm(nodes['cinema-player-first'], first, () => {});
  film.setActive(true);
  film.frame.dispatchEvent(new Event('load'));
  assert.equal(nodes['cinema-player-first'].classList.contains('is-loaded'), true);
  film.dispose();
});
test('pausa, saída da seção e eventos atrasados não deixam vídeo oculto tocando', (t) => {
  const { nodes } = environment(t);
  const film = new BackgroundFilm(nodes['cinema-player-first'], first, () => {});
  film.setActive(true);
  const stale = film.frame;
  film.setActive(false);
  stale.dispatchEvent(new Event('load'));
  assert.equal(nodes['cinema-player-first'].children.length, 0);
  assert.equal(nodes['cinema-player-first'].classList.contains('is-loaded'), false);
  film.setActive(true);
  assert.notEqual(film.frame, stale);
  assertAutoplay(film.frame, 'AciOu04BxZg');
  film.dispose();
});
test('pausa manual permanece após rolagem e vídeos param com a aba oculta', (t) => {
  const { nodes, document, scrollTo } = environment(t);
  const cinema = createCinema({ first, second, onWatch() {} });
  nodes['cinema-toggle'].dispatchEvent(new Event('click'));
  scrollTo(20);
  assert.equal(nodes['cinema-player-first'].children.length, 0);
  nodes['cinema-toggle'].dispatchEvent(new Event('click'));
  assertAutoplay(nodes['cinema-player-first'].children[0], 'AciOu04BxZg');
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(nodes['cinema-player-first'].children.length, 0);
  cinema.dispose();
});
test('movimento reduzido simplifica a transição sem desligar o autoplay solicitado', (t) => {
  const { nodes, scrollTo } = environment(t, true);
  const cinema = createCinema({ first, second, onWatch() {} });
  assertAutoplay(nodes['cinema-player-first'].children[0], 'AciOu04BxZg');
  scrollTo(1000);
  assert.equal(nodes['cinema-player-first'].children.length, 0);
  assertAutoplay(nodes['cinema-player-second'].children[0], 'T0VN2ykadeg');
  cinema.dispose();
});
