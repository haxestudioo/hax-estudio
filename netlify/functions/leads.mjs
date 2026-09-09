import {
  endpoint,
  json,
  body,
  db,
  limit,
  method,
  HttpError,
  text,
  uuid,
  validDate,
} from './lib/core.mjs';
import { monthAvailability } from './lib/availability.mjs';
export function validateLead(data) {
  const name = text(data.name, 120),
    phone = text(data.phone, 24).replace(/\D/g, ''),
    city = text(data.event_city, 160),
    date = text(data.event_date, 10);
  if (
    name.length < 2 ||
    phone.length < 10 ||
    phone.length > 15 ||
    city.length < 2 ||
    data.consent !== true
  )
    throw new HttpError(400, 'Preencha nome, WhatsApp, cidade e a autorização de contato.');
  if (!validDate(date)) throw new HttpError(400, 'Informe uma data válida.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );
  if (date < today || date > String(new Date().getFullYear() + 4) + '-12-31')
    throw new HttpError(400, 'Informe uma data futura válida.');
  if (!uuid(data.request_key)) throw new HttpError(400, 'Recarregue a página e tente novamente.');
  const utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'])
    if (data.utm?.[k]) utm[k] = text(data.utm[k], 250);
  return {
    name,
    phone,
    event_city: city,
    event_date: date,
    notes: text(data.message, 2000),
    consent: true,
    consented_at: new Date().toISOString(),
    origin: utm.utm_source ? 'campanha' : data.intent === 'calendar' ? 'agenda' : 'site',
    utm,
    request_key: data.request_key,
  };
}
export default endpoint(async (req, context) => {
  method(req, 'POST');
  const data = await body(req, 8000);
  if (data.website) return json({ success: true });
  const lead = validateLead(data);
  await limit(context, 'leads', 5, 600);
  if (data.intent === 'calendar') {
    const existing = await db('leads?request_key=eq.' + lead.request_key + '&select=id&limit=1');
    if (existing.length) return json({ success: true }, 201);
    const availability = await monthAvailability(lead.event_date.slice(0, 7));
    const status = availability.days[lead.event_date] || 'unknown';
    if (status !== 'available')
      return json(
        {
          error:
            status === 'busy'
              ? 'Esta data está indisponível. Consulte exceções pelo WhatsApp.'
              : 'Não foi possível confirmar esta data. Consulte pelo WhatsApp.',
          availability: status,
        },
        409,
      );
    lead.notes =
      'Solicitação enviada pela agenda do site. Disponibilidade consultada; a contratação ainda precisa ser confirmada.';
  }
  const stages = await db('pipeline_stages?kind=eq.open&order=position.asc&limit=1');
  if (!stages.length) throw new HttpError(503, 'Entre em contato com a Hax pelo WhatsApp.');
  await db('leads?on_conflict=request_key', {
    method: 'POST',
    data: { ...lead, stage_id: stages[0].id },
    prefer: 'resolution=ignore-duplicates,return=minimal',
  });
  return json({ success: true }, 201);
});
