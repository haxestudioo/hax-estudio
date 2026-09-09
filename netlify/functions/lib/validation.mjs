import { HttpError, text, uuid, validDate } from './core.mjs';
import { safeUrl, videoSpec, fonts } from '../../../dist/assets/utils.js';
const schema = {
  projects: {
    str: {
      slug: 100,
      title: 160,
      category: 30,
      video_url: 2000,
      cover_url: 2000,
      preview_url: 2000,
      description: 4000,
      location: 160,
      year: 4,
    },
    bool: ['published', 'featured'],
    num: ['position'],
  },
  testimonials: {
    str: { couple: 160, quote: 3000, project_slug: 100 },
    bool: ['published'],
    num: ['position'],
  },
  packages: {
    str: { name: 120, description: 2000 },
    bool: ['published'],
    num: ['position', 'price'],
    array: ['items'],
  },
  faqs: { str: { question: 250, answer: 4000 }, bool: ['published'], num: ['position'] },
  pipeline_stages: {
    str: { id: 60, name: 80, color: 7, kind: 10 },
    num: ['position', 'probability'],
  },
  leads: {
    str: {
      name: 120,
      partner: 120,
      phone: 24,
      email: 200,
      event_city: 160,
      venue: 200,
      origin: 100,
      stage_id: 60,
      temperature: 10,
      next_action: 1000,
      notes: 10000,
      loss_reason: 1000,
    },
    num: ['score', 'budget', 'estimated_value'],
    bool: ['archived', 'consent'],
    dates: ['event_date', 'next_action_at', 'last_contact_at'],
  },
  lead_activities: { str: { lead_id: 36, type: 30, content: 5000 } },
  blocked_dates: { str: { date: 10, label: 250 } },
};
export const tables = Object.keys(schema);
export function validateEntity(table, data, creating = false) {
  const s = schema[table];
  if (!s || !data || typeof data !== 'object' || Array.isArray(data))
    throw new HttpError(400, 'Registro inválido.');
  const out = {};
  for (const [k, max] of Object.entries(s.str || {})) if (k in data) out[k] = text(data[k], max);
  for (const k of s.bool || [])
    if (k in data) {
      if (typeof data[k] !== 'boolean') throw new HttpError(400, 'Valor inválido: ' + k);
      out[k] = data[k];
    }
  for (const k of s.num || [])
    if (k in data) {
      if (data[k] === null && k === 'price') {
        out[k] = null;
        continue;
      }
      const n = Number(data[k]);
      if (!Number.isFinite(n) || n < 0 || n > 100000000)
        throw new HttpError(400, 'Valor inválido: ' + k);
      out[k] = n;
    }
  for (const k of s.dates || [])
    if (k in data) {
      if (!data[k]) {
        out[k] = null;
        continue;
      }
      const n = new Date(data[k]);
      if (Number.isNaN(n.getTime()) || (k === 'event_date' && !validDate(data[k])))
        throw new HttpError(400, 'Data inválida.');
      out[k] = k === 'event_date' ? data[k] : n.toISOString();
    }
  for (const k of s.array || [])
    if (k in data) {
      if (!Array.isArray(data[k]) || data[k].length > 30)
        throw new HttpError(400, 'Lista inválida.');
      out[k] = data[k].map((x) => text(x, 300));
    }
  if (table !== 'pipeline_stages' && table !== 'blocked_dates' && data.id) {
    if (!uuid(data.id)) throw new HttpError(400, 'Identificador inválido.');
    out.id = data.id;
  }
  for (const k of ['video_url', 'cover_url', 'preview_url'])
    if (out[k] && !safeUrl(out[k]))
      throw new HttpError(400, 'Use uma URL HTTPS válida para ' + k + '.');
  if (out.video_url && !videoSpec(out.video_url))
    throw new HttpError(400, 'Use um link YouTube, Vimeo ou um arquivo MP4/WebM.');
  if (out.preview_url && videoSpec(out.preview_url)?.type !== 'file')
    throw new HttpError(400, 'A prévia deve ser um arquivo MP4 ou WebM.');
  if (out.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(out.slug))
    throw new HttpError(400, 'Use letras minúsculas, números e hífens no endereço.');
  if (out.category && !['Casamento', 'Pré-wedding'].includes(out.category))
    throw new HttpError(400, 'Categoria inválida.');
  if (out.temperature && !['cold', 'warm', 'hot'].includes(out.temperature))
    throw new HttpError(400, 'Temperatura inválida.');
  if (out.kind && !['open', 'won', 'lost'].includes(out.kind))
    throw new HttpError(400, 'Tipo de etapa inválido.');
  if (table === 'pipeline_stages' && out.id && !/^[a-z0-9-]+$/.test(out.id))
    throw new HttpError(400, 'Identificador da etapa inválido.');
  if (out.color && !/^#[\da-f]{6}$/i.test(out.color)) throw new HttpError(400, 'Cor inválida.');
  for (const k of ['probability', 'score'])
    if (out[k] !== undefined && (out[k] > 100 || !Number.isInteger(out[k])))
      throw new HttpError(400, 'Informe um número inteiro de 0 a 100.');
  if (table === 'lead_activities' && !uuid(out.lead_id)) throw new HttpError(400, 'Lead inválido.');
  if (table === 'blocked_dates' && (creating || 'date' in data) && !validDate(out.date))
    throw new HttpError(400, 'Data inválida.');
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))
    throw new HttpError(400, 'E-mail inválido.');
  if (out.phone) {
    out.phone = out.phone.replace(/\D/g, '');
    if (out.phone.length < 10 || out.phone.length > 15)
      throw new HttpError(400, 'WhatsApp inválido.');
  }
  const required =
    {
      projects: ['title', 'slug', 'video_url', 'cover_url'],
      leads: ['name', 'phone', 'stage_id'],
      pipeline_stages: ['id', 'name'],
      testimonials: ['couple', 'quote'],
      faqs: ['question', 'answer'],
      packages: ['name'],
      lead_activities: ['content', 'lead_id'],
      blocked_dates: ['date'],
    }[table] || [];
  for (const k of required)
    if ((creating || k in data) && !out[k]) throw new HttpError(400, 'Preencha o campo ' + k + '.');
  if (out.position !== undefined && !Number.isInteger(out.position))
    throw new HttpError(400, 'A ordem deve ser um número inteiro.');
  return out;
}
export function validateSettings(key, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new HttpError(400, 'Configuração inválida.');
  let out = {};
  if (key === 'site') {
    const keys = [
      'brand',
      'signature',
      'headline',
      'intro',
      'whatsapp',
      'email',
      'instagram',
      'region',
      'hero_cover',
      'hero_video',
      'second_video',
      'second_cover',
      'about_title',
      'about_photo',
      'about',
      'contact_title',
      'contact_text',
      'seo_title',
      'seo_description',
      'privacy_email',
      'meeting_url',
      'films_title',
      'films_intro',
      'experience_title',
      'experience_intro',
      'step1_title',
      'step1_text',
      'step2_title',
      'step2_text',
      'step3_title',
      'step3_text',
      'calendar_title',
      'calendar_text',
      'packages_title',
      'packages_intro',
      'faq_title',
      'footer_text',
    ];
    for (const k of keys) if (k in data) out[k] = text(data[k], k === 'about' ? 6000 : 2000);
    for (const k of [
      'instagram',
      'hero_cover',
      'hero_video',
      'second_cover',
      'second_video',
      'about_photo',
      'meeting_url',
    ])
      if (out[k] && !safeUrl(out[k])) throw new HttpError(400, 'URL inválida: ' + k);
    for (const field of ['hero_video', 'second_video'])
      if (out[field] && !['youtube', 'file'].includes(videoSpec(out[field])?.type))
        throw new HttpError(400, 'Use YouTube ou MP4/WebM nos filmes de tela cheia.');
    if (out.whatsapp) {
      out.whatsapp = out.whatsapp.replace(/\D/g, '');
      if (out.whatsapp.length < 12 || out.whatsapp.length > 15)
        throw new HttpError(400, 'Use o WhatsApp com país e DDD.');
    }
  } else if (key === 'theme') {
    for (const k of ['background', 'surface', 'text', 'muted', 'accent']) {
      if (!/^#[\da-f]{6}$/i.test(data[k] || ''))
        throw new HttpError(400, 'Selecione cores válidas.');
      out[k] = data[k];
    }
    for (const k of ['heading_font', 'body_font']) {
      if (!fonts.includes(data[k])) throw new HttpError(400, 'Fonte não suportada.');
      out[k] = data[k];
    }
    out.heading_scale = Number(data.heading_scale);
    out.body_size = Number(data.body_size);
    if (!(
      out.heading_scale >= 0.8 &&
      out.heading_scale <= 1.3 &&
      out.body_size >= 16 &&
      out.body_size <= 20
    ))
      throw new HttpError(400, 'Tamanho de fonte inválido.');
  } else if (key === 'calendar') {
    out = {
      enabled: data.enabled === true,
      months_ahead: Math.max(1, Math.min(24, Math.floor(Number(data.months_ahead) || 18))),
      timezone: 'America/Sao_Paulo',
    };
  } else if (key === 'chatbot') {
    out = {
      enabled: data.enabled === true,
      budget_brl: Number(data.budget_brl),
      model: data.model,
      input_usd: Number(data.input_usd),
      output_usd: Number(data.output_usd),
      usd_brl: Number(data.usd_brl),
      max_output_tokens: Number(data.max_output_tokens),
      system_prompt: text(data.system_prompt, 6000),
    };
    const rates = {
      'gpt-4.1-mini': [0.4, 1.6],
      'gpt-4o-mini': [0.15, 0.6],
      'gpt-4.1-nano': [0.1, 0.4],
    };
    if (!rates[out.model]) throw new HttpError(400, 'Modelo inválido.');
    if (!(
      out.budget_brl >= 0 &&
      out.budget_brl <= 10000 &&
      out.usd_brl >= 1 &&
      out.usd_brl <= 20 &&
      out.max_output_tokens >= 100 &&
      out.max_output_tokens <= 800 &&
      out.input_usd >= rates[out.model][0] &&
      out.output_usd >= rates[out.model][1] &&
      out.input_usd <= 100 &&
      out.output_usd <= 1000 &&
      out.system_prompt.length >= 20
    ))
      throw new HttpError(400, 'Revise os limites, as tarifas e as instruções do chatbot.');
    out.max_output_tokens = Math.floor(out.max_output_tokens);
  } else throw new HttpError(400, 'Configuração não permitida.');
  return out;
}
