import { seed } from './seed.js';
import { createCinema } from './cinema.js';
import { animatedTitle, watchMotion, enhanceCard, startPortraitMotion } from './motion.js';
import {
  esc,
  safeUrl,
  videoSpec,
  applyTheme,
  request,
  money,
  isoToday,
  dateLabel,
} from './utils.js';
let content = structuredClone(seed),
  connected = false,
  currentMonth = new Date(isoToday() + 'T12:00:00'),
  chosenDate = '',
  calendarData = {},
  calendarSequence = 0,
  calendarSubmitting = false;
const $ = (id) => document.getElementById(id),
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function setText(id, value) {
  if ($(id)) $(id).textContent = value || '';
}
function titleLines(id, value) {
  if ($(id)) $(id).innerHTML = animatedTitle(value);
}
let cinema = null,
  cinemaKey = '';

let leadSource = {};
try {
  const saved = JSON.parse(sessionStorage.getItem('hax_campaign') || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) leadSource = saved;
} catch {}
const campaign = {};
new URLSearchParams(location.search).forEach((v, k) => {
  if (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].includes(k))
    campaign[k] = v.slice(0, 250);
});
if (Object.keys(campaign).length) {
  leadSource = campaign;
  try {
    sessionStorage.setItem('hax_campaign', JSON.stringify(campaign));
  } catch {}
}
function whatsapp(
  message = 'Olá, Leanderson! Gostaria de conversar sobre o filme do meu casamento.',
) {
  return (
    'https://wa.me/' +
    String(content.settings.site.whatsapp || seed.settings.site.whatsapp).replace(/\D/g, '') +
    '?text=' +
    encodeURIComponent(message)
  );
}
function fillSite() {
  const s = content.settings.site;
  applyTheme(content.settings.theme);
  document.title = s.seo_title || seed.settings.site.seo_title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', s.seo_description || '');
  titleLines('hero-title', s.headline);
  setText('hero-intro', s.intro);
  titleLines('about-title', s.about_title);
  setText('about-text', s.about);
  titleLines('contact-title', s.contact_title);
  setText('contact-text', s.contact_text);
  setText('region', s.region);
  if ($('region')) $('region').hidden = !s.region;
  document
    .querySelectorAll('.brand')
    .forEach((el) => el.setAttribute('aria-label', (s.brand || 'Hax Estúdio') + ', início'));
  setText('site-signature', s.signature);
  setText('hero-label', (s.brand || 'Hax Estúdio').toUpperCase() + ' / FILMES DE CASAMENTO');
  setText('chat-brand', s.brand);
  for (const key of [
    'films_title',
    'experience_title',
    'calendar_title',
    'packages_title',
    'faq_title',
  ])
    if (s[key]) titleLines(key.replaceAll('_', '-'), s[key]);
  for (const key of [
    'films_intro',
    'experience_intro',
    'calendar_text',
    'packages_intro',
    'footer_text',
    'step1_title',
    'step1_text',
    'step2_title',
    'step2_text',
    'step3_title',
    'step3_text',
  ])
    if (s[key] !== undefined) setText(key.replaceAll('_', '-'), s[key]);
  if ($('hero-cover')) $('hero-cover').src = safeUrl(s.hero_cover) || seed.settings.site.hero_cover;
  if (safeUrl(s.about_photo) && $('about-art'))
    $('about-art').innerHTML =
      `<img src="${esc(safeUrl(s.about_photo))}" alt="Leanderson, Hax Estúdio" loading="lazy" width="1024" height="1020">`;
  document.querySelectorAll('.whatsapp-link,#contact-widget').forEach((a) => (a.href = whatsapp()));
  if ($('instagram-link')) {
    $('instagram-link').hidden = !safeUrl(s.instagram);
    $('instagram-link').href = safeUrl(s.instagram) || '#';
  }
  if ($('meeting-link')) {
    $('meeting-link').hidden = !safeUrl(s.meeting_url);
    $('meeting-link').href = safeUrl(s.meeting_url) || '#';
  }
  setText('copyright', new Date().getFullYear() + ' · ' + (s.brand || 'Hax Estúdio'));
  renderFilms();
  renderExtras();
  renderCinema();
  watchMotion();
}
function card(p) {
  return `<a class="film-card reveal" href="/filmes/${esc(p.slug)}" data-project="${esc(p.id)}" aria-haspopup="dialog" aria-label="Assistir a ${esc(p.title)}"><div class="film-image"><img src="${esc(safeUrl(p.cover_url) || seed.projects[0].cover_url)}" alt="${esc(p.title)}" loading="lazy" width="1280" height="720"><span class="film-watch" aria-hidden="true">Assistir <span>↗</span></span></div><div class="film-info"><div><h3>${esc(p.title)}</h3><span class="film-meta">${esc(p.category)}${p.location ? ' / ' + esc(p.location) : ''}</span></div></div></a>`;
}
function renderFilms(filter = 'Todos') {
  if (!$('film-grid')) return;
  const projects = content.projects
    .filter((p) => p.published && (filter === 'Todos' || p.category === filter))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.position - b.position);
  $('film-grid').innerHTML = projects.length
    ? projects.map(card).join('')
    : '<p class="empty-public">Novas histórias em breve. Converse com a Hax para conhecer nossos filmes.</p>';
  document.querySelectorAll('.film-card').forEach((a) => {
    enhanceCard(a);
    a.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return;
      event.preventDefault();
      openFilm(projects.find((p) => p.id === a.dataset.project));
    });
  });
  watchMotion();
}

function renderExtras() {
  const testimonials = content.testimonials.filter((x) => x.published);
  if ($('testimonials-section')) {
    $('testimonials-section').hidden = !testimonials.length;
    $('testimonials').innerHTML = testimonials
      .map(
        (x) =>
          `<blockquote>“${esc(x.quote)}”<cite>${esc(x.couple)}${x.project_slug ? ` · <a href="/filmes/${esc(x.project_slug)}">Assistir ao filme ↗</a>` : ''}</cite></blockquote>`,
      )
      .join('');
  }
  const packages = content.packages.filter((x) => x.published);
  if ($('packages-section')) {
    $('packages-section').hidden = !packages.length;
    $('packages').innerHTML = packages
      .map(
        (x) =>
          `<article class="package"><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p>${x.price !== null ? `<p class="package-price">${money(x.price)}</p>` : ''}<ul>${(x.items || []).map((y) => '<li>' + esc(y) + '</li>').join('')}</ul><a class="text-link" href="#contato" data-package="${esc(x.name)}">Conversar sobre esta coleção ↗</a></article>`,
      )
      .join('');
    document.querySelectorAll('[data-package]').forEach((a) =>
      a.addEventListener('click', () => {
        $('lead-message').value = 'Tenho interesse na coleção ' + a.dataset.package + '. ';
      }),
    );
  }
  const faqs = content.faqs.filter((x) => x.published);
  if ($('faq-section')) {
    $('faq-section').hidden = !faqs.length;
    $('faqs').innerHTML = faqs
      .map((x) => `<details><summary>${esc(x.question)}</summary><p>${esc(x.answer)}</p></details>`)
      .join('');
  }
}
function renderCinema() {
  if (!$('cinema-sequence')) return;
  const s = content.settings.site;
  const first = s.hero_video || seed.settings.site.hero_video;
  const second = s.second_video || seed.settings.site.second_video;
  $('second-cover').src = safeUrl(s.second_cover) || seed.settings.site.second_cover;
  const key = JSON.stringify([first, second]);
  if (cinemaKey === key) return;
  cinemaKey = key;
  cinema?.dispose();
  cinema = createCinema({ first, second, onWatch: (url) => openFilm({ video_url: url }) });
}

function embed(spec, autoplay = true) {
  if (!spec) return '<p>O filme não está disponível no momento.</p>';
  return spec.type === 'file'
    ? `<video src="${esc(spec.src)}" controls ${autoplay ? 'autoplay' : ''} playsinline></video>`
    : `<iframe src="${esc(spec.src + (spec.src.includes('?') ? '&' : '?') + 'autoplay=' + (autoplay ? '1' : '0'))}" title="Filme de casamento" allow="autoplay; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}
function openFilm(p) {
  const spec = videoSpec(p?.video_url);
  if (!spec) return;
  cinema?.suspend();
  $('video-container').innerHTML = embed(spec);
  $('video-dialog').showModal();
}

async function calendar() {
  if (!$('calendar-days')) return;
  const seq = ++calendarSequence;
  const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  setText(
    'month-label',
    currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  );
  calendarData = {};
  chosenDate = '';
  renderCalendarSelection();
  renderDays();
  setText('calendar-status', 'Consultando a disponibilidade…');
  if (content.settings.calendar?.enabled === false) {
    setText('calendar-status', 'Consulte a disponibilidade diretamente com Leanderson.');
    return;
  }
  try {
    const result = await request('availability?month=' + month);
    if (seq !== calendarSequence) return;
    calendarData = result.days || {};
    setText(
      'calendar-status',
      result.connected
        ? 'Disponibilidade consultada na agenda da Hax.'
        : 'Confirme a disponibilidade da sua data pelo WhatsApp.',
    );
  } catch {
    if (seq !== calendarSequence) return;
    setText(
      'calendar-status',
      'Não foi possível consultar a agenda agora. Podemos verificar sua data pelo WhatsApp.',
    );
  }
  renderDays();
  renderCalendarSelection();
}
function renderDays() {
  if (!$('calendar-days')) return;
  const year = currentMonth.getFullYear(),
    month = currentMonth.getMonth(),
    count = new Date(year, month + 1, 0).getDate(),
    first = new Date(year, month, 1).getDay(),
    today = isoToday();
  let html = '<span></span>'.repeat(first);
  for (let d = 1; d <= count; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = date < today ? 'past' : calendarData[date] || 'unknown';
    const label = {
      past: 'Data passada',
      available: 'Disponível',
      busy: 'Indisponível',
      unknown: 'Disponibilidade a consultar',
    }[status];
    html += `<button type="button" data-date="${date}" class="${status} ${date === chosenDate ? 'selected' : ''}" aria-label="${dateLabel(date)}, ${label}" aria-pressed="${date === chosenDate}" ${status === 'past' || calendarSubmitting ? 'disabled' : ''}>${d}</button>`;
  }
  $('calendar-days').innerHTML = html;
  $('calendar-days')
    .querySelectorAll('button:not(:disabled)')
    .forEach(
      (b) =>
        (b.onclick = () => {
          chosenDate = b.dataset.date;
          renderCalendarSelection();
          renderDays();
        }),
    );
  const now = new Date(isoToday() + 'T12:00:00');
  $('prev-month').disabled =
    calendarSubmitting || year * 12 + month <= now.getFullYear() * 12 + now.getMonth();
  $('next-month').disabled =
    calendarSubmitting ||
    year * 12 + month >=
      now.getFullYear() * 12 + now.getMonth() + (content.settings.calendar.months_ahead || 18);
}
function renderCalendarSelection() {
  const panel = $('calendar-response'),
    form = $('calendar-lead-form'),
    link = $('calendar-exception');
  if (!panel || !form || !link) return;
  panel.hidden = !chosenDate;
  if (!chosenDate) {
    setText('selected-date', 'Selecione o dia do seu casamento.');
    return;
  }
  const status = calendarData[chosenDate] || 'unknown';
  form.hidden = status !== 'available';
  link.hidden = status === 'available';
  form.elements.event_date.value = chosenDate;
  setText('calendar-form-status', '');
  setText('selected-date', dateLabel(chosenDate) + ' selecionado.');
  setText('calendar-response-title', dateLabel(chosenDate));
  if (status === 'available') {
    setText(
      'calendar-response-message',
      'Sua data está disponível. Vamos conversar sobre o seu casamento?',
    );
  } else if (status === 'busy') {
    setText('calendar-response-message', 'Data indisponível.');
    link.innerHTML = 'Consultar exceções no WhatsApp <span aria-hidden="true">↗</span>';
    link.href = whatsapp(
      'Olá, Leanderson! Vi que a data ' +
        dateLabel(chosenDate) +
        ' está indisponível. Podemos conversar sobre alguma exceção para o meu casamento?',
    );
  } else {
    setText('calendar-response-message', 'Precisamos confirmar a disponibilidade desta data.');
    link.innerHTML = 'Consultar pelo WhatsApp <span aria-hidden="true">↗</span>';
    link.href = whatsapp(
      'Olá, Leanderson! Gostaria de consultar a disponibilidade para o dia ' +
        dateLabel(chosenDate) +
        '.',
    );
  }
}
const leadAttempts = new WeakMap();
async function submitLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const isCalendar = form.id === 'calendar-lead-form';
  const statusElement = $(isCalendar ? 'calendar-form-status' : 'form-status');
  const data = Object.fromEntries(new FormData(form));
  data.consent = data.consent === 'on';
  data.utm = leadSource;
  if (isCalendar && calendarData[data.event_date] !== 'available') {
    renderCalendarSelection();
    return;
  }
  const fingerprint = JSON.stringify(data);
  let attempt = leadAttempts.get(form);
  if (!attempt || attempt.fingerprint !== fingerprint) {
    attempt = { fingerprint, key: crypto.randomUUID() };
    leadAttempts.set(form, attempt);
  }
  data.request_key = attempt.key;
  const controls = [...form.elements];
  controls.forEach((el) => (el.disabled = true));
  if (isCalendar) calendarSubmitting = true;
  if (isCalendar) renderDays();
  statusElement.textContent = 'Enviando seus dados…';
  statusElement.className = '';
  try {
    await request('leads', { method: 'POST', body: data });
    form.reset();
    leadAttempts.delete(form);
    if (isCalendar) {
      form.hidden = true;
      setText(
        'calendar-response-message',
        'Recebemos seus dados para ' +
          dateLabel(data.event_date) +
          '! Leanderson vai conversar com você pelo WhatsApp. A reserva é confirmada com a contratação.',
      );
    } else {
      statusElement.textContent =
        'Recebemos sua história! Leanderson vai entrar em contato pelo WhatsApp informado.';
      statusElement.className = 'success';
    }
    window.dispatchEvent(
      new CustomEvent('hax:lead-submitted', {
        detail: { source: isCalendar ? 'calendar' : 'form' },
      }),
    );
  } catch (error) {
    if (isCalendar && ['busy', 'unknown'].includes(error.details?.availability)) {
      calendarData[data.event_date] = error.details.availability;
      renderCalendarSelection();
    } else {
      statusElement.textContent = error.message + ' Seus dados continuam aqui.';
      statusElement.className = 'error';
    }
  } finally {
    controls.forEach((el) => (el.disabled = false));
    if (isCalendar) calendarSubmitting = false;
    if (isCalendar) renderDays();
  }
}

const chatHistory = [];
let chatSession = crypto.randomUUID();
function chatMessage(role, text) {
  const el = document.createElement('div');
  el.className = 'chat-message ' + role;
  el.textContent = text;
  $('chat-messages').append(el);
  $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
}
async function startChat(event) {
  if (!content.chat_available) return;
  event.preventDefault();
  $('chat-dialog').showModal();
  if (!$('chat-messages').children.length)
    chatMessage(
      'assistant',
      'Olá! Sou o assistente virtual da Hax Estúdio. Como vocês estão imaginando o casamento?',
    );
  $('chat-form').elements.message.focus();
}
async function sendChat(event) {
  event.preventDefault();
  const form = event.currentTarget,
    input = form.elements.message,
    text = input.value.trim();
  if (!text) return;
  const btn = form.querySelector('button');
  btn.disabled = true;
  input.value = '';
  chatMessage('user', text);
  try {
    const response = await request('chat', {
      method: 'POST',
      body: { message: text, history: chatHistory.slice(-8), session_id: chatSession },
    });
    if (response.fallback) {
      chatMessage('assistant', response.message);
      content.chat_available = false;
      input.disabled = true;
      return;
    }
    chatMessage('assistant', response.message);
    chatHistory.push(
      { role: 'user', content: text },
      { role: 'assistant', content: response.message },
    );
  } catch {
    chatMessage(
      'assistant',
      'Não consegui responder agora. Você pode continuar a conversa com Leanderson no WhatsApp abaixo.',
    );
  } finally {
    btn.disabled = false;
  }
}
async function renderDetail() {
  if (!$('film-detail')) return;
  let slug = '';
  try {
    slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  } catch {}
  if (slug === 'filme.html') slug = new URLSearchParams(location.search).get('filme') || '';
  const p = content.projects.find((p) => p.published && p.slug === slug);
  if (!p) {
    $('film-detail').innerHTML =
      '<div class="document-page"><h1>Filme não encontrado.</h1><a class="button" href="/#filmes">Conhecer outras histórias</a></div>';
    return;
  }
  document.title = p.title + ' | Hax Estúdio';
  $('film-detail').innerHTML =
    `<div class="detail-heading"><a class="text-link" href="/#filmes">← Voltar aos filmes</a><p class="eyebrow">${esc(p.category)}${p.location ? ' / ' + esc(p.location) : ''}</p><h1>${esc(p.title)}</h1><p>${esc(p.description)}</p></div><div class="film-player"><div class="film-image"><img src="${esc(safeUrl(p.cover_url))}" alt="${esc(p.title)}" width="1280" height="720"></div><button id="detail-play"><span>▶ &nbsp; Assistir ao filme</span></button></div><div class="detail-contact"><h2>O próximo filme<br><em>pode ser o de vocês.</em></h2><a class="button primary" href="/#contato">Consultar minha data ↗</a></div>`;
  $('detail-play').onclick = () =>
    (document.querySelector('.film-player').innerHTML = embed(videoSpec(p.video_url)));
}
document.querySelector('.menu-toggle')?.addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  $('navigation').classList.toggle('open', open);
});
document.querySelectorAll('#navigation a').forEach((a) =>
  a.addEventListener('click', () => {
    $('navigation').classList.remove('open');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
  }),
);
document
  .querySelectorAll('.dialog-close')
  .forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$('video-dialog')?.addEventListener('close', () => {
  $('video-container').innerHTML = '';
  cinema?.resume();
});
$('video-dialog')?.addEventListener('click', (e) => {
  if (e.target === $('video-dialog')) $('video-dialog').close();
});
$('film-filters')?.addEventListener('click', (e) => {
  if (!e.target.dataset.filter) return;
  document
    .querySelectorAll('[data-filter]')
    .forEach((b) => b.classList.toggle('active', b === e.target));
  renderFilms(e.target.dataset.filter);
});
$('lead-form')?.addEventListener('submit', submitLead);
$('calendar-lead-form')?.addEventListener('submit', submitLead);
if ($('lead-date')) $('lead-date').min = isoToday();
$('prev-month')?.addEventListener('click', () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  calendar();
});
$('next-month')?.addEventListener('click', () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  calendar();
});
$('contact-widget')?.addEventListener('click', startChat);
$('chat-form')?.addEventListener('submit', sendChat);
fillSite();
renderDetail();
startPortraitMotion();
try {
  const remote = await request('public-config');
  if (remote.settings) {
    content = {
      ...content,
      ...remote,
      settings: Object.fromEntries(
        Object.entries(content.settings).map(([key, value]) => [
          key,
          { ...value, ...(remote.settings[key] || {}) },
        ]),
      ),
    };
    connected = remote.connected === true;
    fillSite();
    renderDetail();
  }
} catch {}
calendar();
