import { configured, db, settings, HttpError } from './core.mjs';
import { monthRange, mapBusyDays, googleConfigured, fetchBusy } from './calendar.mjs';

export async function monthAvailability(month) {
  let range;
  try {
    range = monthRange(month);
  } catch {
    throw new HttpError(400, 'Mês inválido.');
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );
  const diff =
    Number(month.slice(0, 4)) * 12 +
    Number(month.slice(5)) -
    (Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)));
  if (diff < 0 || diff > 24) throw new HttpError(400, 'Mês fora do período de consulta.');
  if (!configured()) return { connected: false, days: mapBusyDays(month, [], [], false) };
  const s = await settings();
  const manual = await db(
    `blocked_dates?date=gte.${month}-01&date=lt.${range.end.slice(0, 10)}&select=date`,
  );
  let connected = false,
    busy = [];
  if (s.calendar?.enabled !== false && googleConfigured()) {
    try {
      busy = await fetchBusy(month);
      connected = true;
    } catch {
      console.error('google_availability_unavailable');
    }
  }
  return {
    connected,
    checked_at: new Date().toISOString(),
    days: mapBusyDays(
      month,
      busy,
      manual.map((x) => x.date),
      connected,
    ),
  };
}
