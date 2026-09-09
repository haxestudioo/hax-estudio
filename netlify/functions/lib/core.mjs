import { createHmac } from 'node:crypto';
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}
export function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export const publicKey = () =>
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
export function guardOrigin(req) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    throw new HttpError(403, 'Origem não autorizada.');
}
export async function body(req, max = 32000) {
  guardOrigin(req);
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Envie JSON.');
  const text = await req.text();
  if (Buffer.byteLength(text) > max) throw new HttpError(413, 'O conteúdo excede o limite.');
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('object required');
    return value;
  } catch {
    throw new HttpError(400, 'Dados inválidos.');
  }
}
export async function db(path, { method = 'GET', data, prefer, token } = {}) {
  if (!configured())
    throw new HttpError(503, 'O serviço ainda não está configurado. Fale com a Hax pelo WhatsApp.');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path, {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + (token || key),
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation',
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(12000),
  });
  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }
  if (!response.ok) {
    if (result?.message === 'hax_pipeline_requires_open_stage')
      throw new HttpError(
        400,
        'Mantenha pelo menos uma etapa em andamento para receber novos contatos.',
      );
    console.error('database_request_failed', response.status, result?.code || '');
    if (response.status === 409 || ['23001', '23503'].includes(result?.code))
      throw new HttpError(409, 'O registro já existe ou está vinculado a outros dados.');
    throw new HttpError(503, 'Não foi possível salvar ou consultar os dados. Tente novamente.');
  }
  return result;
}
export async function settings() {
  const rows = await db('site_settings?select=key,value');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
export async function admin(req) {
  if (!configured())
    throw new HttpError(503, 'Configure o Supabase seguindo o guia de instalação.');
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, 'Entre no painel para continuar.');
  const response = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
    headers: {
      apikey: publicKey() || process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + token,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  const user = await response.json();
  if (!user.id) throw new HttpError(401, 'Sessão inválida.');
  const rows = await db(
    'admin_users?user_id=eq.' + encodeURIComponent(user.id) + '&select=user_id,name',
  );
  if (!rows.length) throw new HttpError(403, 'Este usuário não possui acesso administrativo.');
  return { ...user, name: rows[0].name, token };
}
export async function limit(context, scope, max, seconds) {
  const raw = context?.ip || 'unknown';
  const digest = createHmac(
    'sha256',
    process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'local',
  )
    .update(scope + ':' + raw)
    .digest('hex');
  const allowed = await db('rpc/consume_rate_limit', {
    method: 'POST',
    data: { p_bucket: scope + ':' + digest, p_max: max, p_seconds: seconds },
  });
  if (!allowed)
    throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
}
export function endpoint(handler) {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('request_failed', error.status || 500, error.status ? 'handled' : error.name);
      return json(
        {
          error: error.status
            ? error.message
            : 'O serviço está temporariamente indisponível. Tente novamente.',
        },
        error.status || 503,
      );
    }
  };
}
export const method = (req, ...allowed) => {
  if (!allowed.includes(req.method)) throw new HttpError(405, 'Método não permitido.');
};
export const uuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const text = (value, max = 2000) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
