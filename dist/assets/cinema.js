import { videoSpec } from './utils.js';

const clamp = (n) => Math.max(0, Math.min(1, n));
export function cinemaBlend(progress) {
  const n = clamp((progress - 0.26) / 0.42);
  return n * n * (3 - 2 * n);
}
// Background playback is native to the embed. Never wait for YT.onReady to start
// or reveal it: a blocked/late iframe_api script used to leave both covers frozen.
export class BackgroundFilm {
  constructor(container, url, onChange) {
    this.container = container;
    this.spec = videoSpec(url);
    this.onChange = onChange;
    this.active = false;
    this.started = false;
    this.dead = false;
    this.blocked = false;
    this.frame = null;
  }
  prepare() {
    if (this.started || !this.spec || this.dead) return;
    this.started = true;
    if (this.spec.type === 'file') {
      this.video = document.createElement('video');
      Object.assign(this.video, {
        autoplay: true,
        muted: true,
        defaultMuted: true,
        loop: true,
        playsInline: true,
        preload: 'auto',
      });
      this.video.setAttribute('autoplay', '');
      this.video.setAttribute('muted', '');
      this.video.setAttribute('playsinline', '');
      this.video.src = this.spec.src;
      this.video.addEventListener('playing', () => this.playing());
      this.video.addEventListener('error', () => this.unavailable());
      this.container.append(this.video);
    } else if (this.spec.type !== 'youtube') {
      this.unavailable();
    }
  }
  mountYouTube() {
    if (this.frame || this.dead) return;
    const url = new URL(this.spec.src);
    for (const [key, value] of Object.entries({
      autoplay: 1,
      mute: 1,
      controls: 0,
      disablekb: 1,
      playsinline: 1,
      loop: 1,
      playlist: this.spec.id,
    }))
      url.searchParams.set(key, value);
    const frame = document.createElement('iframe');
    this.frame = frame;
    frame.title = 'Prévia silenciosa do filme em destaque';
    frame.tabIndex = -1;
    frame.width = '1280';
    frame.height = '720';
    frame.loading = 'eager';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('aria-hidden', 'true');
    frame.addEventListener(
      'load',
      () => {
        if (this.dead || !this.active || this.frame !== frame) return;
        // "loaded" means the iframe is displayed, not a claim that a browser
        // has allowed playback. The native embed requests muted autoplay itself.
        this.container.classList.add('is-loaded');
        this.onChange();
      },
      { once: true },
    );
    frame.src = url.href;
    this.container.append(frame);
  }
  unmountYouTube() {
    // Removing the iframe stops playback even when iframe_api is unavailable.
    const frame = this.frame;
    this.frame = null;
    frame?.remove();
    this.container.classList.remove('is-loaded');
  }
  playing() {
    if (this.dead || !this.active) return;
    this.blocked = false;
    this.container.classList.add('is-playing');
    this.onChange();
  }
  unavailable(hide = true) {
    if (this.dead) return;
    this.blocked = true;
    if (hide) this.container.classList.remove('is-playing', 'is-loaded');
    this.onChange();
  }
  setActive(active, gesture = false) {
    const changed = this.active !== active;
    this.active = active;
    if (gesture) this.blocked = false;
    if (active) this.prepare();
    if (changed || gesture) this.sync();
  }
  sync() {
    if (this.dead) return;
    if (this.spec?.type === 'youtube') {
      if (this.active && !this.blocked) this.mountYouTube();
      else this.unmountYouTube();
    } else if (this.video) {
      if (this.active && !this.blocked)
        this.video.play().catch(() => {
          if (this.active) this.unavailable(false);
        });
      else this.video.pause();
    }
  }
  dispose() {
    this.dead = true;
    this.video?.pause();
    this.unmountYouTube();
    this.container.replaceChildren();
    this.container.classList.remove('is-playing');
  }
}

export function createCinema({ first, second, onWatch }) {
  const sequence = document.getElementById('cinema-sequence');
  if (!sequence) return null;
  const stage = sequence.querySelector('.cinema-stage');
  const scenes = [...sequence.querySelectorAll('[data-cinema-scene]')];
  const toggle = document.getElementById('cinema-toggle');
  const watch = document.getElementById('cinema-watch');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const events = new AbortController();
  let activeIndex = 0,
    progress = 0,
    inView = true,
    suspended = false,
    queued = false,
    disposed = false;
  // Reduced motion simplifies scroll effects; playback still starts silently.
  const paused = [false, false];
  const films = [first, second];
  const media = films.map(
    (url, i) =>
      new BackgroundFilm(
        document.getElementById(i ? 'cinema-player-second' : 'cinema-player-first'),
        url,
        paintControl,
      ),
  );
  function paintControl() {
    const playing = !paused[activeIndex] && !media[activeIndex]?.blocked;
    const label = playing ? 'Pausar prévia' : 'Reproduzir prévia';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    toggle.querySelector('span').textContent = playing ? 'Ⅱ' : '▷';
    toggle.disabled = !media[activeIndex]?.spec;
    watch.disabled = !media[activeIndex]?.spec;
    watch.setAttribute(
      'aria-label',
      'Assistir ao ' + (activeIndex ? 'segundo' : 'primeiro') + ' filme com som',
    );
  }
  function syncMedia(gesture = false) {
    const blend = cinemaBlend(progress);
    media.forEach((film, i) => {
      // Start loading the second film shortly before it enters the crossfade.
      const shown = reduce ? i === activeIndex : i === 0 ? blend < 0.995 : progress > 0.1;
      film.setActive(
        shown && inView && !paused[i] && !suspended && !document.hidden,
        gesture && i === activeIndex,
      );
    });
    paintControl();
  }
  function draw() {
    queued = false;
    if (disposed) return;
    const rect = sequence.getBoundingClientRect();
    inView = rect.bottom > 0 && rect.top < innerHeight;
    if (reduce) {
      activeIndex = scenes[1].getBoundingClientRect().top < innerHeight * 0.5 ? 1 : 0;
      scenes.forEach((scene) => (scene.inert = false));
    } else {
      progress = clamp(-rect.top / Math.max(1, sequence.offsetHeight - stage.offsetHeight));
      const blend = cinemaBlend(progress);
      activeIndex = blend >= 0.5 ? 1 : 0;
      stage.style.setProperty('--cinema-progress', progress);
      stage.style.setProperty('--cinema-blend', blend);
      stage.style.setProperty('--cinema-copy', Math.max(0, 1 - progress / 0.29));
      scenes.forEach((scene, i) => {
        scene.inert = i !== activeIndex;
      });
    }
    syncMedia();
  }
  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(draw);
    }
  }
  window.addEventListener('scroll', schedule, { passive: true, signal: events.signal });
  window.addEventListener('resize', schedule, { passive: true, signal: events.signal });
  document.addEventListener('visibilitychange', () => syncMedia(), { signal: events.signal });
  toggle.addEventListener(
    'click',
    () => {
      paused[activeIndex] = media[activeIndex].blocked ? false : !paused[activeIndex];
      syncMedia(true);
    },
    { signal: events.signal },
  );
  watch.addEventListener(
    'click',
    () => {
      suspended = true;
      syncMedia();
      onWatch(films[activeIndex]);
    },
    { signal: events.signal },
  );
  draw();
  return {
    suspend() {
      suspended = true;
      syncMedia();
    },
    resume() {
      suspended = false;
      syncMedia();
    },
    dispose() {
      disposed = true;
      events.abort();
      media.forEach((film) => film.dispose());
    },
  };
}
