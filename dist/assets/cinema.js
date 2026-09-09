import { videoSpec } from './utils.js';

const clamp = (n) => Math.max(0, Math.min(1, n));
export function cinemaBlend(progress) {
  const n = clamp((progress - 0.26) / 0.42);
  return n * n * (3 - 2 * n);
}
let youtubePromise;
function youtubeReady() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubePromise) return youtubePromise;
  youtubePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('YouTube unavailable')), 14000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('YouTube unavailable'));
    };
    document.head.append(script);
  });
  return youtubePromise;
}

class BackgroundFilm {
  constructor(container, url, onChange) {
    this.container = container;
    this.spec = videoSpec(url);
    this.onChange = onChange;
    this.active = false;
    this.ready = false;
    this.started = false;
    this.dead = false;
    this.blocked = false;
  }
  async prepare() {
    if (this.started || !this.spec || this.dead) return;
    this.started = true;
    if (this.spec.type === 'file') {
      this.video = document.createElement('video');
      Object.assign(this.video, {
        muted: true,
        loop: true,
        playsInline: true,
        preload: 'metadata',
      });
      this.video.setAttribute('muted', '');
      this.video.setAttribute('playsinline', '');
      this.video.src = this.spec.src;
      this.video.addEventListener('playing', () => this.playing());
      this.video.addEventListener('error', () => this.unavailable());
      this.container.append(this.video);
      this.ready = true;
      this.sync();
      return;
    }
    if (this.spec.type !== 'youtube') {
      this.unavailable();
      return;
    }
    try {
      const YT = await youtubeReady();
      if (this.dead) return;
      const frame = document.createElement('iframe');
      const url = new URL(this.spec.src);
      for (const [key, value] of Object.entries({
        enablejsapi: 1,
        origin: location.origin,
        autoplay: 0,
        mute: 1,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        loop: 1,
        playlist: this.spec.id,
      }))
        url.searchParams.set(key, value);
      frame.src = url.href;
      frame.title = 'Prévia silenciosa do filme em destaque';
      frame.tabIndex = -1;
      frame.allow = 'autoplay; fullscreen; picture-in-picture';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.setAttribute('aria-hidden', 'true');
      this.container.append(frame);
      this.player = new YT.Player(frame, {
        events: {
          onReady: (event) => {
            if (this.dead) return;
            this.player = event.target;
            this.ready = true;
            this.player.mute();
            this.sync();
          },
          onStateChange: (event) => {
            if (this.dead) return;
            if (event.data === YT.PlayerState.PLAYING) {
              this.playing();
              if (!this.active) this.player.pauseVideo();
            }
          },
          onAutoplayBlocked: () => this.unavailable(false),
          onError: () => this.unavailable(),
        },
      });
    } catch {
      if (!this.dead) this.unavailable();
    }
  }
  playing() {
    if (this.dead) return;
    this.blocked = false;
    this.container.classList.add('is-playing');
    this.onChange();
  }
  unavailable(hide = true) {
    this.blocked = true;
    if (hide) this.container.classList.remove('is-playing');
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
    if (!this.ready || this.dead) return;
    if (this.video) {
      if (this.active && !this.blocked)
        this.video.play().catch(() => {
          if (this.active) this.unavailable(false);
        });
      else this.video.pause();
    } else if (this.player) {
      if (this.active && !this.blocked) {
        this.player.mute();
        this.player.playVideo();
      } else this.player.pauseVideo();
    }
  }
  dispose() {
    this.dead = true;
    this.video?.pause();
    this.player?.destroy();
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
  const paused = [reduce, reduce];
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
      const shown = reduce ? i === activeIndex : i === 0 ? blend < 0.995 : blend > 0.005;
      film.setActive(
        shown && inView && !paused[i] && !suspended && !document.hidden,
        gesture && i === activeIndex,
      );
    });
    if (!reduce && inView && progress > 0.1) media[1].prepare();
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
