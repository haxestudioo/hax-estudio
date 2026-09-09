import { endpoint, json, configured, settings, db, method } from './lib/core.mjs';
export default endpoint(async (req) => {
  method(req, 'GET');
  if (!configured()) return json({ connected: false, chat_available: false });
  const s = await settings();
  const [projects, testimonials, packages, faqs] = await Promise.all(
    ['projects', 'testimonials', 'packages', 'faqs'].map((t) =>
      db(t + '?published=eq.true&order=position.asc&limit=100'),
    ),
  );
  return json({
    connected: true,
    settings: {
      site: s.site || {},
      theme: s.theme || {},
      calendar: {
        enabled: s.calendar?.enabled !== false,
        months_ahead: s.calendar?.months_ahead || 18,
      },
    },
    projects,
    testimonials,
    packages,
    faqs,
    chat_available:
      s.chatbot?.enabled === true &&
      Boolean(process.env.OPENAI_API_KEY) &&
      Number(s.chatbot.budget_brl) > 0,
  });
});
