import { createSign } from 'node:crypto';
let cachedToken = null;
export function monthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('invalid month');
  const [y, m] = month.split('-').map(Number);
  if (m < 1 || m > 12 || y < 2020 || y > 2100) throw new Error('invalid month');
  const next = new Date(Date.UTC(y, m, 1));
  return {
    start: month + '-01T00:00:00-03:00',
    end: next.toISOString().slice(0, 10) + 'T00:00:00-03:00',
    days: new Date(Date.UTC(y, m, 0)).getUTCDate(),
  };
}
export function mapBusyDays(month, intervals = [], manual = [], connected = true) {
  const range = monthRange(month),
    result = {};
  for (let d = 1; d <= range.days; d++) {
    const key = month + '-' + String(d).padStart(2, '0');
    const start = Date.parse(key + 'T00:00:00-03:00'),
      end = start + 86400000;
    const busy =
      manual.includes(key) ||
      intervals.some((x) => Date.parse(x.start) < end && Date.parse(x.end) > start);
    result[key] = busy ? 'busy' : connected ? 'available' : 'unknown';
  }
  return result;
}
export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_CALENDAR_ID,
  );
}
export async function googleToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const enc = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
  const unsigned =
    enc({ alg: 'RS256', typ: 'JWT' }) +
    '.' +
    enc({
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/calendar.freebusy',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    });
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion =
    unsigned + '.' + signer.sign(process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('google_auth_failed');
  const data = await response.json();
  if (!data.access_token) throw new Error('google_auth_failed');
  cachedToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}
export async function fetchBusy(month) {
  const range = monthRange(month),
    token = await googleToken();
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: range.start,
      timeMax: range.end,
      timeZone: 'America/Sao_Paulo',
      items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('google_calendar_failed');
  const result = await response.json();
  const cal = result.calendars?.[process.env.GOOGLE_CALENDAR_ID];
  if (!cal || cal.errors?.length || !Array.isArray(cal.busy))
    throw new Error('google_calendar_unavailable');
  return cal.busy;
}
