import { endpoint, json, method } from './lib/core.mjs';
import { monthAvailability } from './lib/availability.mjs';
export default endpoint(async (req) => {
  method(req, 'GET');
  const month =
    new URL(req.url).searchParams.get('month') ||
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
      .format(new Date())
      .slice(0, 7);
  return json(await monthAvailability(month));
});
