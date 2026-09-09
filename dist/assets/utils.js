export const esc = (value = '') =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const money = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
export const dateLabel = (value) =>
  value
    ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('pt-BR')
    : 'Não informada';
export const isoToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function safeUrl(value = '', { local = true } = {}) {
  if (local && /^\/(?!\/)[a-zA-Z0-9_./%?=&-]*$/.test(value)) return value;
  try {
    const u = new URL(value);
    if (u.protocol === 'https:' && !u.username && !u.password) return u.href;
  } catch {}
  return '';
}
export function videoSpec(value = '') {
  const safe = safeUrl(value);
  if (!safe) return null;
  if (safe.startsWith('/'))
    return /\.(mp4|webm)(\?|$)/i.test(safe) ? { type: 'file', src: safe } : null;
  const u = new URL(safe);
  let id;
  if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtube-nocookie.com',
      'www.youtube-nocookie.com',
    ].includes(u.hostname)
  )
    id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
  else if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
  if (id && /^[\w-]{11}$/.test(id))
    return {
      type: 'youtube',
      id,
      src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,
    };
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(u.hostname)) {
    id = u.pathname
      .split('/')
      .filter(Boolean)
      .find((x) => /^\d+$/.test(x));
    if (id) return { type: 'vimeo', id, src: `https://player.vimeo.com/video/${id}` };
  }
  return /\.(mp4|webm)(\?|$)/i.test(safe) ? { type: 'file', src: safe } : null;
}
export const fonts = [
  'Cormorant Garamond',
  'Playfair Display',
  'Manrope',
  'DM Sans',
  'Georgia',
  'Arial',
];
export function applyTheme(theme = {}) {
  const root = document.documentElement;
  for (const [key, css] of Object.entries({
    background: 'bg',
    surface: 'surface',
    text: 'text',
    muted: 'muted',
    accent: 'accent',
  }))
    if (/^#[\da-f]{6}$/i.test(theme[key] || '')) root.style.setProperty('--' + css, theme[key]);
  if (fonts.includes(theme.heading_font))
    root.style.setProperty('--heading', `"${theme.heading_font}", Georgia, serif`);
  if (fonts.includes(theme.body_font))
    root.style.setProperty('--body', `"${theme.body_font}", Arial, sans-serif`);
  root.style.setProperty(
    '--heading-scale',
    String(Math.max(0.8, Math.min(1.3, Number(theme.heading_scale) || 1))),
  );
  root.style.setProperty(
    '--body-size',
    Math.max(16, Math.min(20, Number(theme.body_size) || 16)) + 'px',
  );
}
export async function request(path, { method = 'GET', body, token, signal } = {}) {
  const response = await fetch('/.netlify/functions/' + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal || AbortSignal.timeout(25000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('O serviço não está disponível. Tente novamente ou fale pelo WhatsApp.');
  }
  if (!response.ok) {
    const error = new Error(data.error || 'Não foi possível concluir. Tente novamente.');
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}
export function csvCell(v) {
  let s = String(v ?? '');
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}
