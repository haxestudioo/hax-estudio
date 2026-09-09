import test from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, videoSpec, esc, csvCell } from '../dist/assets/utils.js';
import { seed } from '../dist/assets/seed.js';
import { body, validDate } from '../netlify/functions/lib/core.mjs';
import { validateEntity, validateSettings } from '../netlify/functions/lib/validation.mjs';
import { validateLead } from '../netlify/functions/leads.mjs';
import { monthRange, mapBusyDays } from '../netlify/functions/lib/calendar.mjs';
import { reserveCost, actualCost, extractText } from '../netlify/functions/lib/chat-cost.mjs';

const validLead = () => ({
  name: 'Casal de teste',
  phone: '(44) 99999-0000',
  event_city: 'Maringá',
  event_date: `${new Date().getFullYear() + 1}-06-20`,
  consent: true,
  request_key: 'a1234567-1234-4234-8234-123456789abc',
});
const bad = (fn) => assert.throws(fn, (e) => e.status === 400);

test('mídias rejeitam scripts, credenciais e nomes parecidos com provedores', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,hi',
    '//evil.example',
    'https://name:pass@example.com/a',
  ])
    assert.equal(safeUrl(value), '');
  assert.equal(videoSpec('https://youtube.com.evil.example/watch?v=T0VN2ykadeg'), null);
  assert.equal(videoSpec('https://youtu.be/T0VN2ykadeg').type, 'youtube');
  assert.equal(videoSpec('https://vimeo.com/123456').type, 'vimeo');
  assert.equal(videoSpec('/assets/reel.mp4').type, 'file');
});
test('HTML e CSV preservam texto sem executar marcação ou fórmulas', () => {
  assert.equal(esc('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.ok(csvCell('\t+1').startsWith('"\''));
  assert.equal(csvCell('Ana; João'), '"Ana; João"');
});
test('datas inválidas não são normalizadas silenciosamente', () => {
  assert.equal(validDate('2028-02-29'), true);
  for (const value of ['2027-02-29', '2028-02-30', '2028-13-01', '2028-01-00', 'x'])
    assert.equal(validDate(value), false);
  for (const value of ['2028-13-01', '2027-02-29'])
    bad(() => validateLead({ ...validLead(), event_date: value }));
  bad(() => validateEntity('blocked_dates', { date: '2028-13-01' }, true));
  bad(() => validateEntity('leads', { event_date: '2027-02-29' }));
});
test('captação exige consentimento, data futura e identificador de reenvio', () => {
  for (const change of [
    { consent: false },
    { phone: '123' },
    { name: 'A' },
    { event_date: '2020-01-01' },
    { request_key: 'x' },
  ])
    bad(() => validateLead({ ...validLead(), ...change }));
  const result = validateLead({
    ...validLead(),
    utm: { utm_source: 'instagram', utm_campaign: 'casamentos', password: 'ignore' },
    stage_id: 'fechado',
    estimated_value: 999,
  });
  assert.equal(result.origin, 'campanha');
  assert.equal(result.phone, '44999990000');
  assert.equal(result.stage_id, undefined);
  assert.equal(result.estimated_value, undefined);
  assert.equal(result.utm.password, undefined);
});
test('atualizações respeitam a lista de campos e não apagam obrigatórios', () => {
  const result = validateEntity('leads', {
    notes: 'Conversa',
    updated_by: 'forged',
    created_at: 'yesterday',
    score: 80,
  });
  assert.deepEqual(result, { notes: 'Conversa', score: 80 });
  bad(() => validateEntity('projects', { title: '' }));
  bad(() => validateEntity('projects', { position: 1.2 }));
  bad(() => validateEntity('leads', { score: 101 }));
  assert.equal(validateEntity('packages', { price: null }).price, null);
});
test('configurações impõem fontes, formatos e limites de custo', () => {
  bad(() => validateSettings('theme', { ...seed.settings.theme, heading_font: 'url(evil)' }));
  bad(() => validateSettings('site', { hero_video: 'https://example.com/page' }));
  bad(() => validateSettings('site', { second_video: 'https://vimeo.com/123456' }));
  bad(() => validateSettings('site', { second_cover: 'javascript:alert(1)' }));
  assert.equal(
    validateSettings('site', { second_video: seed.settings.site.second_video }).second_video,
    seed.settings.site.second_video,
  );
  bad(() => validateSettings('chatbot', { ...seed.settings.chatbot, input_usd: 0 }));
  bad(() => validateSettings('chatbot', { ...seed.settings.chatbot, budget_brl: -1 }));
  assert.equal(validateSettings('chatbot', seed.settings.chatbot).enabled, false);
});
test('JSON público recusa arrays, null, outra origem e corpo excessivo', async () => {
  const req = (text, origin = 'https://hax.example') =>
    new Request('https://hax.example/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin },
      body: text,
    });
  for (const value of ['null', '[]', '"text"', '{'])
    await assert.rejects(body(req(value)), (e) => e.status === 400);
  await assert.rejects(body(req('{}', 'https://evil.example')), (e) => e.status === 403);
  await assert.rejects(body(req('{"text":"large"}'), 5), (e) => e.status === 413);
  assert.deepEqual(await body(req('{"name":"Ana"}')), { name: 'Ana' });
});
test('calendário respeita ano bissexto e virada do ano', () => {
  assert.equal(monthRange('2028-02').days, 29);
  assert.equal(monthRange('2028-12').end, '2029-01-01T00:00:00-03:00');
  assert.throws(() => monthRange('2028-13'));
});
test('ocupação de dia inteiro respeita o final exclusivo à meia-noite', () => {
  const days = mapBusyDays('2028-06', [
    { start: '2028-06-12T00:00:00-03:00', end: '2028-06-13T00:00:00-03:00' },
  ]);
  assert.equal(days['2028-06-12'], 'busy');
  assert.equal(days['2028-06-13'], 'available');
});
test('evento que cruza meia-noite bloqueia os dois dias', () => {
  const days = mapBusyDays('2028-06', [
    { start: '2028-06-12T23:00:00-03:00', end: '2028-06-13T01:00:00-03:00' },
  ]);
  assert.equal(days['2028-06-12'], 'busy');
  assert.equal(days['2028-06-13'], 'busy');
});
test('agenda indisponível nunca transforma dias desconhecidos em livres', () => {
  const days = mapBusyDays('2028-06', [], ['2028-06-10'], false);
  assert.equal(days['2028-06-10'], 'busy');
  assert.equal(days['2028-06-11'], 'unknown');
  assert.ok(!Object.values(days).includes('available'));
});
test('reserva conservadora cobre o custo previsto da resposta', () => {
  const config = seed.settings.chatbot,
    input = [{ role: 'user', content: 'Olá, gostaria de conhecer os filmes!' }];
  const reservation = reserveCost('Atendimento em português.', input, config);
  assert.ok(reservation > actualCost({ input_tokens: 40, output_tokens: 400 }, config));
  assert.equal(actualCost({ input_tokens: 1000000, output_tokens: 1000000 }, config), 12);
});
test('extração da OpenAI ignora outros tipos de saída', () => {
  assert.equal(
    extractText({
      output: [
        { type: 'function_call', content: [{ type: 'output_text', text: 'não' }] },
        { type: 'message', content: [{ type: 'output_text', text: 'Olá!' }] },
      ],
    }),
    'Olá!',
  );
});
