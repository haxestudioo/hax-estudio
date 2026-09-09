import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { seed } from '../dist/assets/seed.js';
import bootstrap from '../netlify/functions/bootstrap.mjs';
import publicConfig from '../netlify/functions/public-config.mjs';
import adminData from '../netlify/functions/admin-data.mjs';
import adminWrite from '../netlify/functions/admin-write.mjs';
import capture from '../netlify/functions/leads.mjs';
import chat from '../netlify/functions/chat.mjs';
import availability from '../netlify/functions/availability.mjs';
const originalFetch = globalThis.fetch,
  originalEnv = { ...process.env };
const userId = 'c1234567-1234-4234-8234-123456789abc';
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const req = (path, data, method = 'POST', auth = false) =>
  new Request('https://hax.example/.netlify/functions/' + path, {
    method,
    headers: {
      origin: 'https://hax.example',
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { authorization: 'Bearer user-token' } : {}),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
const settings = (enabled = true) =>
  Object.entries({ ...seed.settings, chatbot: { ...seed.settings.chatbot, enabled } }).map(
    ([key, value]) => ({ key, value }),
  );
let calls = [];
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://database.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-secret';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'public-key';
  process.env.OPENAI_API_KEY = 'openai-secret';
  delete process.env.GOOGLE_PRIVATE_KEY;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_CALENDAR_ID;
  calls = [];
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
function mock(handler) {
  globalThis.fetch = async (url, options = {}) => {
    const call = {
      url: String(url),
      ...options,
      data:
        options.body instanceof URLSearchParams
          ? Object.fromEntries(options.body)
          : options.body
            ? JSON.parse(options.body)
            : undefined,
    };
    calls.push(call);
    const result = await handler(call);
    if (result === undefined) throw new Error('Unexpected request: ' + url);
    return result;
  };
}
function authorized(call) {
  if (call.url.endsWith('/auth/v1/user'))
    return response({ id: userId, email: 'admin@example.com' });
  if (call.url.includes('/admin_users?')) return response([{ user_id: userId, name: 'Admin' }]);
}
function chatBase(call, { enabled = true, allowed = true } = {}) {
  if (call.url.includes('/site_settings?')) return response(settings(enabled));
  if (call.url.includes('/rpc/consume_rate_limit')) return response(true);
  if (/\/(projects|packages|faqs)\?/.test(call.url)) return response([]);
  if (call.url.includes('/rpc/reserve_chat_budget')) return response(allowed);
  if (call.url.includes('/rpc/settle_chat_budget')) return response(null);
}

test('bootstrap expõe somente configuração pública', async () => {
  const result = await (await bootstrap(req('bootstrap', undefined, 'GET'))).json();
  assert.equal(result.supabase_key, 'public-key');
  assert.equal(JSON.stringify(result).includes('server-secret'), false);
  assert.equal(JSON.stringify(result).includes('openai-secret'), false);
});
test('acesso administrativo sem sessão retorna 401 sem consultar dados', async () => {
  mock(() => {
    throw new Error('must not fetch');
  });
  const r = await adminData(req('admin-data', undefined, 'GET'));
  assert.equal(r.status, 401);
  assert.equal(calls.length, 0);
});
test('usuário autenticado sem autorização não lê o CRM', async () => {
  mock((c) =>
    c.url.endsWith('/auth/v1/user')
      ? response({ id: userId })
      : c.url.includes('/admin_users?')
        ? response([])
        : undefined,
  );
  const r = await adminData(req('admin-data', undefined, 'GET', true));
  assert.equal(r.status, 403);
  assert.ok(!calls.some((c) => c.url.includes('/leads')));
});
test('API pública filtra conteúdo publicado e omite instruções e consumo', async () => {
  mock((c) =>
    c.url.includes('/site_settings?')
      ? response(settings())
      : c.url.includes('published=eq.true')
        ? response([])
        : undefined,
  );
  const result = await (await publicConfig(req('public-config', undefined, 'GET'))).json();
  assert.equal(result.settings.chatbot, undefined);
  assert.equal(result.leads, undefined);
  assert.equal(result.settings.calendar.timezone, undefined);
  assert.equal(calls.filter((c) => c.url.includes('published=eq.true')).length, 4);
});
test('lead é gravado com chave idempotente, origem e etapa inicial', async () => {
  mock((c) =>
    c.url.includes('/rpc/consume_rate_limit')
      ? response(true)
      : c.url.includes('/pipeline_stages?')
        ? response([{ id: 'novo' }])
        : c.url.includes('/leads?')
          ? response(null)
          : undefined,
  );
  const input = {
    name: 'Casal teste',
    phone: '44999990000',
    event_city: 'Maringá',
    event_date: `${new Date().getFullYear() + 1}-10-10`,
    consent: true,
    request_key: userId,
    utm: { utm_source: 'instagram', utm_campaign: 'filmes' },
  };
  const r = await capture(req('leads', input), { ip: '203.0.113.5' });
  assert.equal(r.status, 201);
  const write = calls.find((c) => c.url.includes('/leads?'));
  assert.equal(write.data.stage_id, 'novo');
  assert.equal(write.data.request_key, userId);
  assert.match(write.headers.Prefer, /ignore-duplicates/);
  assert.ok(calls[0].data.p_bucket.startsWith('leads:'));
  assert.ok(!calls[0].data.p_bucket.includes('203.0.113.5'));
});
test('bloqueio de abuso impede a gravação do lead', async () => {
  mock((c) => (c.url.includes('/rpc/consume_rate_limit') ? response(false) : undefined));
  const r = await capture(
    req('leads', {
      name: 'Casal teste',
      phone: '44999990000',
      event_city: 'Maringá',
      event_date: `${new Date().getFullYear() + 1}-10-10`,
      consent: true,
      request_key: userId,
    }),
    { ip: '203.0.113.5' },
  );
  assert.equal(r.status, 429);
  assert.equal(calls.length, 1);
});
function calendarInput(utm = {}) {
  const nextMonth = new Date();
  nextMonth.setUTCDate(15);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return {
    name: 'Ana e Vini',
    phone: '(44) 99999-0000',
    event_city: 'Maringá',
    event_date: nextMonth.toISOString().slice(0, 10),
    consent: true,
    request_key: userId,
    intent: 'calendar',
    utm,
  };
}
const { privateKey: testGoogleKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
function configureTestGoogle() {
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'calendar@example.iam.gserviceaccount.com';
  process.env.GOOGLE_CALENDAR_ID = 'weddings@example.com';
  process.env.GOOGLE_PRIVATE_KEY = testGoogleKey;
}
function calendarMock({ busy = [], manual = [], existing = false } = {}) {
  mock((c) => {
    if (c.url.includes('/rpc/consume_rate_limit')) return response(true);
    if (c.url.includes('/leads?request_key=')) return response(existing ? [{ id: userId }] : []);
    if (c.url.includes('/site_settings?')) return response(settings());
    if (c.url.includes('/blocked_dates?')) return response(manual.map((date) => ({ date })));
    if (c.url.includes('oauth2.googleapis.com/token'))
      return response({ access_token: 'mock-google-token', expires_in: 3600 });
    if (c.url.includes('/calendar/v3/freeBusy'))
      return response({ calendars: { [process.env.GOOGLE_CALENDAR_ID]: { busy } } });
    if (c.url.includes('/pipeline_stages?')) return response([{ id: 'novo' }]);
    if (c.url.includes('/leads?on_conflict=') && c.method === 'POST') return response(null);
  });
}
test('data livre consultada no Google grava nome, WhatsApp, cidade e data no CRM', async () => {
  configureTestGoogle();
  calendarMock();
  const input = calendarInput();
  const r = await capture(req('leads', input), { ip: '203.0.113.5' });
  assert.equal(r.status, 201);
  const write = calls.find((c) => c.url.includes('/leads?on_conflict='));
  assert.deepEqual(
    [
      write.data.name,
      write.data.phone,
      write.data.event_city,
      write.data.event_date,
      write.data.origin,
      write.data.stage_id,
    ],
    ['Ana e Vini', '44999990000', 'Maringá', input.event_date, 'agenda', 'novo'],
  );
  assert.ok(write.data.consented_at);
  assert.ok(calls.findIndex((c) => c.url.includes('/calendar/v3/freeBusy')) < calls.indexOf(write));
  assert.match(write.headers.Prefer, /ignore-duplicates/);
});
test('envio pela agenda conserva atribuição de campanha', async () => {
  configureTestGoogle();
  calendarMock();
  const r = await capture(
    req('leads', calendarInput({ utm_source: 'instagram', utm_campaign: 'noivas' })),
    { ip: '203.0.113.5' },
  );
  assert.equal(r.status, 201);
  const saved = calls.find((c) => c.url.includes('/leads?on_conflict=')).data;
  assert.equal(saved.origin, 'campanha');
  assert.equal(saved.utm.utm_campaign, 'noivas');
  assert.match(saved.notes, /agenda do site/);
});
test('data que ficou ocupada no Google recusa o envio antes de gravar o lead', async () => {
  configureTestGoogle();
  const input = calendarInput();
  calendarMock({
    busy: [
      { start: input.event_date + 'T10:00:00-03:00', end: input.event_date + 'T23:00:00-03:00' },
    ],
  });
  const r = await capture(req('leads', input), { ip: '203.0.113.5' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).availability, 'busy');
  assert.ok(!calls.some((c) => c.url.includes('/leads?on_conflict=')));
});
test('bloqueio manual da data impede envio mesmo sem integração Google', async () => {
  const input = calendarInput();
  calendarMock({ manual: [input.event_date] });
  const r = await capture(req('leads', input), { ip: '203.0.113.5' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).availability, 'busy');
  assert.ok(!calls.some((c) => c.url.includes('/leads?on_conflict=')));
});
test('data sem disponibilidade confirmada não registra um falso sucesso', async () => {
  calendarMock();
  const r = await capture(req('leads', calendarInput()), { ip: '203.0.113.5' });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).availability, 'unknown');
  assert.ok(!calls.some((c) => c.url.includes('/leads?on_conflict=')));
});
test('reenvio de contato já salvo confirma sucesso sem depender da agenda atual', async () => {
  calendarMock({ existing: true });
  const r = await capture(req('leads', calendarInput()), { ip: '203.0.113.5' });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).success, true);
  assert.equal(calls.length, 2);
  assert.ok(
    !calls.some((c) => c.url.includes('/calendar/') || c.url.includes('/leads?on_conflict=')),
  );
});
test('mudança de lead concorrente retorna conflito e identifica o administrador', async () => {
  mock((c) => authorized(c) || (c.url.includes('/leads?') ? response([]) : undefined));
  const r = await adminWrite(
    req(
      'admin-write',
      {
        entity: 'leads',
        id: userId,
        version: '2026-09-08T15:00:00Z',
        data: { stage_id: 'proposta', updated_by: 'forged' },
      },
      'PATCH',
      true,
    ),
  );
  assert.equal(r.status, 409);
  const write = calls.find((c) => c.url.includes('/leads?'));
  assert.ok(write.url.includes('updated_at=eq.'));
  assert.equal(write.data.updated_by, userId);
});
test('painel preserva ao menos uma etapa aberta para captar contatos', async () => {
  mock(
    (c) =>
      authorized(c) ||
      (c.url.includes('/pipeline_stages?') ? response([{ id: 'novo' }]) : undefined),
  );
  const r = await adminWrite(
    req('admin-write', { entity: 'pipeline_stages', id: 'novo' }, 'DELETE', true),
  );
  assert.equal(r.status, 400);
  assert.ok(!calls.some((c) => c.method === 'DELETE'));
});
test('chat desativado não chama a OpenAI', async () => {
  mock((c) => chatBase(c, { enabled: false }));
  const r = await chat(req('chat', { message: 'Olá' }), { ip: '203.0.113.5' });
  assert.equal((await r.json()).fallback, true);
  assert.equal(calls.length, 1);
});
test('orçamento recusado impede chamada à OpenAI', async () => {
  mock((c) => chatBase(c, { allowed: false }));
  const r = await chat(req('chat', { message: 'Olá' }), { ip: '203.0.113.5' });
  assert.equal((await r.json()).fallback, true);
  assert.ok(!calls.some((c) => c.url.startsWith('https://api.openai.com')));
});
test('resposta registra tokens e mantém a chave no servidor', async () => {
  mock(
    (c) =>
      chatBase(c) ||
      (c.url.startsWith('https://api.openai.com')
        ? response({
            output: [
              {
                type: 'message',
                content: [{ type: 'output_text', text: 'Vamos conhecer sua história.' }],
              },
            ],
            usage: { input_tokens: 100, output_tokens: 20 },
          })
        : undefined),
  );
  const r = await chat(req('chat', { message: 'Olá' }), { ip: '203.0.113.5' });
  const result = await r.json();
  assert.equal(result.fallback, false);
  assert.equal(result.message, 'Vamos conhecer sua história.');
  const api = calls.find((c) => c.url.startsWith('https://api.openai.com'));
  assert.equal(api.data.store, false);
  assert.equal(api.data.tools, undefined);
  const settled = calls.find((c) => c.url.includes('/rpc/settle_chat_budget'));
  assert.equal(settled.data.p_status, 'completed');
  assert.equal(settled.data.p_input, 100);
  assert.ok(!JSON.stringify(result).includes('openai-secret'));
});
test('timeout contabiliza reserva incerta e oferece WhatsApp', async () => {
  mock((c) => {
    if (c.url.startsWith('https://api.openai.com'))
      throw new DOMException('Timeout', 'TimeoutError');
    return chatBase(c);
  });
  const r = await chat(req('chat', { message: 'Olá' }), { ip: '203.0.113.5' });
  assert.equal((await r.json()).fallback, true);
  const settled = calls.find((c) => c.url.includes('/rpc/settle_chat_budget'));
  assert.equal(settled.data.p_status, 'uncertain');
  assert.ok(settled.data.p_actual > 0);
});
test('sem Google configurado, bloqueio manual permanece e outros dias ficam a consultar', async () => {
  mock((c) =>
    c.url.includes('/site_settings?')
      ? response(settings())
      : c.url.includes('/blocked_dates?')
        ? response([
            {
              date:
                new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
                  .format(new Date())
                  .slice(0, 7) + '-15',
            },
          ])
        : undefined,
  );
  const r = await availability(req('availability', undefined, 'GET'));
  const result = await r.json();
  assert.equal(result.connected, false);
  assert.ok(Object.values(result.days).includes('busy'));
  assert.ok(!Object.values(result.days).includes('available'));
});
