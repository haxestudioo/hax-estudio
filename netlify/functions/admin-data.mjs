import { endpoint, json, admin, db, settings, method, HttpError, uuid } from './lib/core.mjs';
import { googleConfigured } from './lib/calendar.mjs';
export default endpoint(async (req) => {
  method(req, 'GET');
  const user = await admin(req);
  const q = new URL(req.url).searchParams,
    entity = q.get('entity');
  if (entity === 'activities') {
    const id = q.get('lead_id');
    if (!uuid(id)) throw new HttpError(400, 'Lead inválido.');
    return json({
      rows: await db('lead_activities?lead_id=eq.' + id + '&order=created_at.desc&limit=200'),
    });
  }
  if (entity === 'leads') {
    const page = Math.max(0, Math.min(10000, Number(q.get('page')) || 0));
    return json({ rows: await db('leads?order=created_at.desc&limit=200&offset=' + page * 200) });
  }
  const names = [
    'projects',
    'testimonials',
    'packages',
    'faqs',
    'pipeline_stages',
    'blocked_dates',
  ];
  const results = await Promise.all(
    names.map((t) =>
      db(t + '?order=' + (t === 'blocked_dates' ? 'date.asc' : 'position.asc') + '&limit=1000'),
    ),
  );
  const data = Object.fromEntries(names.map((n, i) => [n, results[i]]));
  const [s, leads, usage, reservations] = await Promise.all([
    settings(),
    db('leads?order=created_at.desc&limit=200'),
    db('chat_usage?order=month.desc&limit=12'),
    db('chat_reservations?status=eq.pending&order=created_at.desc&limit=100'),
  ]);
  return json({
    ...data,
    settings: s,
    leads,
    usage,
    reservations,
    user: { id: user.id, name: user.name, email: user.email },
    integrations: {
      supabase: true,
      google: googleConfigured(),
      openai: Boolean(process.env.OPENAI_API_KEY),
      calendar_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    },
  });
});
