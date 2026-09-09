import { esc } from './utils.js';

export function animatedTitle(value) {
  let order = 0;
  return String(value || '')
    .split('\n')
    .map((line, index) => {
      const words = line
        .split(/\s+/)
        .filter(Boolean)
        .map(
          (word) =>
            `<span class="title-word-mask"><span class="title-word" style="--word-order:${order++}">${esc(word)}</span></span>`,
        )
        .join(' ');
      return index ? '<em>' + words + '</em>' : words;
    })
    .join('<br>');
}
let observer;
const observed = new WeakSet();
export function watchMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window))
    return;
  document.documentElement.classList.add('js-motion');
  observer ||= new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }),
    { threshold: 0.06, rootMargin: '0px 0px -22px 0px' },
  );
  document.querySelectorAll('.reveal').forEach((el) => {
    if (observed.has(el)) return;
    observed.add(el);
    if (el.classList.contains('film-card'))
      el.style.setProperty(
        '--reveal-delay',
        (Array.from(el.parentElement.children).indexOf(el) % 2) * 90 + 'ms',
      );
    observer.observe(el);
  });
}
export function enhanceCard(card) {
  if (
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !matchMedia('(hover:hover) and (pointer:fine)').matches
  )
    return;
  let frame = 0;
  card.addEventListener('pointermove', (event) => {
    cancelAnimationFrame(frame);
    const { clientX, clientY } = event;
    frame = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty(
        '--card-tilt-y',
        ((clientX - rect.left) / rect.width - 0.5) * 3 + 'deg',
      );
      card.style.setProperty(
        '--card-tilt-x',
        -((clientY - rect.top) / rect.height - 0.5) * 2 + 'deg',
      );
    });
  });
  card.addEventListener('pointerleave', () => {
    cancelAnimationFrame(frame);
    card.style.setProperty('--card-tilt-x', '0deg');
    card.style.setProperty('--card-tilt-y', '0deg');
  });
}
export function startPortraitMotion() {
  const portrait = document.getElementById('about-art');
  if (
    !portrait ||
    !('IntersectionObserver' in window) ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  let queued = false,
    visible = false;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) draw();
  }).observe(portrait);
  function draw() {
    queued = false;
    if (!visible) return;
    const rect = portrait.getBoundingClientRect();
    const progress = Math.max(
      -1,
      Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight),
    );
    portrait.style.setProperty('--portrait-shift', progress * 20 + 'px');
  }
  window.addEventListener(
    'scroll',
    () => {
      if (visible && !queued) {
        queued = true;
        requestAnimationFrame(draw);
      }
    },
    { passive: true },
  );
}
