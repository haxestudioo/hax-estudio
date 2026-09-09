// Verificação opcional em PostgreSQL WASM. Auth e Storage são simulados.
// npm install --no-save --package-lock=false @electric-sql/pglite@0.5.8
// npm run test:db
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const pg = new PGlite();
await pg.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant all on storage.objects to authenticated,service_role;
`);
const migration = await readFile(
  new URL('../supabase/migrations/001_initial.sql', import.meta.url),
  'utf8',
);
// gen_random_uuid existe no núcleo do PostgreSQL; pgcrypto é habilitado no Supabase real.
await pg.exec(migration.replace('create extension if not exists pgcrypto;', ''));
await pg.exec(
  await readFile(new URL('../supabase/migrations/002_content.sql', import.meta.url), 'utf8'),
);
const query = (sql, params) => pg.query(sql, params);
const scalar = async (sql, params) => Object.values((await query(sql, params)).rows[0])[0];
const adminId = randomUUID(),
  visitorId = randomUUID();
await query('insert into auth.users(id) values($1),($2)', [adminId, visitorId]);
await query('insert into public.admin_users(user_id,name) values($1,$2)', [adminId, 'Admin teste']);
async function as(role, user, fn) {
  await pg.exec('set role ' + role);
  await query("select set_config('request.jwt.claim.sub',$1,false)", [user || '']);
  try {
    return await fn();
  } finally {
    await pg.exec('reset role');
  }
}

await test('migrações criam cinco filmes, sete etapas e coleções em rascunho', async () => {
  assert.equal(await scalar('select count(*)::int from projects'), 5);
  assert.equal(await scalar('select count(*)::int from pipeline_stages'), 7);
  assert.equal(await scalar('select count(*)::int from packages where published'), 0);
});
await test('visitante não pode ler leads, configurações ou executar reserva de orçamento', async () => {
  await as('anon', null, async () => {
    await assert.rejects(query('select * from leads'), (e) => e.code === '42501');
    await assert.rejects(query('select * from site_settings'), (e) => e.code === '42501');
    await assert.rejects(
      query("select reserve_chat_budget($1,1,'gpt-4.1-mini')", [randomUUID()]),
      (e) => e.code === '42501',
    );
  });
});
await test('autenticação não concede permissão de administrador por si só', async () => {
  await as('authenticated', visitorId, async () => {
    assert.equal(await scalar('select is_admin()'), false);
    assert.equal(await scalar('select count(*)::int from admin_users'), 0);
    await assert.rejects(query('select * from leads'), (e) => e.code === '42501');
  });
  await as('authenticated', adminId, async () => {
    assert.equal(await scalar('select is_admin()'), true);
    assert.equal(await scalar('select count(*)::int from admin_users'), 1);
  });
});
await test('políticas de imagem permitem upload apenas ao administrador', async () => {
  await as('authenticated', visitorId, () =>
    assert.rejects(
      query("insert into storage.objects(bucket_id,name) values('portfolio','invalid.jpg')"),
      (e) => e.code === '42501',
    ),
  );
  await as('authenticated', adminId, () =>
    query("insert into storage.objects(bucket_id,name) values('portfolio','valid.jpg')"),
  );
  assert.equal(await scalar('select count(*)::int from storage.objects'), 1);
});
const leadId = randomUUID(),
  key = randomUUID();
await test('lead idempotente e mudança de etapa geram histórico com autoria', async () => {
  await query(
    "insert into leads(id,request_key,name,phone,stage_id,updated_by) values($1,$2,'Teste','44999990000','novo',$3)",
    [leadId, key, adminId],
  );
  await query(
    "insert into leads(request_key,name,phone,stage_id) values($1,'Duplicado','44999990000','novo') on conflict(request_key) do nothing",
    [key],
  );
  assert.equal(await scalar('select count(*)::int from leads'), 1);
  await query("update leads set stage_id='proposta',updated_by=$2 where id=$1", [leadId, adminId]);
  const activities = (
    await query(
      'select type,created_by from lead_activities where lead_id=$1 order by created_at',
      [leadId],
    )
  ).rows;
  assert.equal(activities.length, 2);
  assert.deepEqual(
    activities.map((x) => x.type),
    ['created', 'stage'],
  );
  assert.ok(activities.every((x) => x.created_by === adminId));
});
await test('editar um lead preserva a data da autorização já registrada', async () => {
  await query('update leads set consent=true where id=$1', [leadId]);
  const before = await scalar('select consented_at::text from leads where id=$1', [leadId]);
  await query(
    "update leads set notes='Mais informações',consented_at=now()+interval '1 day' where id=$1",
    [leadId],
  );
  assert.equal(await scalar('select consented_at::text from leads where id=$1', [leadId]), before);
});
await test('atualização 003 muda abertura e preserva leads, histórico e conteúdo personalizado', async () => {
  const before = (await query('select * from leads where id=$1', [leadId])).rows[0];
  const activities = await scalar('select count(*)::int from lead_activities');
  await query(
    'update site_settings set value=value || \'{"about":"Texto personalizado","hero_video":"https://www.youtube.com/watch?v=T0VN2ykadeg"}\'::jsonb where key=\'site\'',
  );
  await pg.exec(
    await readFile(
      new URL('../supabase/migrations/003_cinematic_update.sql', import.meta.url),
      'utf8',
    ),
  );
  const site = await scalar("select value from site_settings where key='site'");
  assert.equal(site.hero_video, 'https://www.youtube.com/watch?v=AciOu04BxZg');
  assert.equal(site.second_video, 'https://www.youtube.com/watch?v=T0VN2ykadeg');
  assert.equal(site.about, 'Texto personalizado');
  assert.deepEqual((await query('select * from leads where id=$1', [leadId])).rows[0], before);
  assert.equal(await scalar('select count(*)::int from lead_activities'), activities);
  assert.equal(await scalar('select count(*)::int from admin_users'), 1);
  assert.equal(
    await scalar('select slug from projects order by position limit 1'),
    'casamento-vini',
  );
});
await test('banco recusa remoção de etapa usada por um lead', async () => {
  await assert.rejects(
    query("delete from pipeline_stages where id='proposta'"),
    (e) => ['23001', '23503'].includes(e.code) && e.message.includes('leads_stage_id_fkey'),
  );
});
await test('banco preserva uma etapa aberta para captação', async () => {
  await query("update pipeline_stages set kind='won' where kind='open' and id<>'novo'");
  await assert.rejects(
    query("update pipeline_stages set kind='won' where id='novo'"),
    (e) => e.code === '23514',
  );
  await assert.rejects(
    query("delete from pipeline_stages where id='novo'"),
    (e) => e.code === '23514',
  );
});
await test('limitação persiste entre chamadas e reinicia após expiração', async () => {
  assert.equal(await scalar("select consume_rate_limit('test',2,600)"), true);
  assert.equal(await scalar("select consume_rate_limit('test',2,600)"), true);
  assert.equal(await scalar("select consume_rate_limit('test',2,600)"), false);
  await query("update rate_limits set expires_at=now()-interval '1 second' where bucket='test'");
  assert.equal(await scalar("select consume_rate_limit('test',2,600)"), true);
});
let reservation;
await test('chat desligado recusa reserva e teto bloqueia a segunda chamada', async () => {
  assert.equal(
    await scalar("select reserve_chat_budget($1,6,'gpt-4.1-mini')", [randomUUID()]),
    false,
  );
  await query(
    "update site_settings set value=jsonb_set(value,'{enabled}','true') where key='chatbot'",
  );
  const ids = [randomUUID(), randomUUID()];
  const answers = await Promise.all(
    ids.map((id) => scalar("select reserve_chat_budget($1,6,'gpt-4.1-mini')", [id])),
  );
  assert.equal(answers.filter(Boolean).length, 1);
  reservation = ids[answers.findIndex(Boolean)];
  assert.equal(Number(await scalar('select reserved_brl from chat_usage')), 6);
});
await test('liquidação é idempotente e devolve apenas a diferença estimada', async () => {
  await query("select settle_chat_budget($1,2,100,50,'completed')", [reservation]);
  await query("select settle_chat_budget($1,2,100,50,'completed')", [reservation]);
  const row = (await query('select * from chat_usage')).rows[0];
  assert.equal(Number(row.spent_brl), 2);
  assert.equal(Number(row.reserved_brl), 0);
  assert.equal(row.requests, 1);
});
await test('chamada incerta consome reserva integral e impede exceder o teto', async () => {
  const id = randomUUID();
  assert.equal(await scalar("select reserve_chat_budget($1,8,'gpt-4.1-mini')", [id]), true);
  await query("select settle_chat_budget($1,0,0,0,'uncertain')", [id]);
  assert.equal(Number(await scalar('select spent_brl from chat_usage')), 10);
  assert.equal(
    await scalar("select reserve_chat_budget($1,0.01,'gpt-4.1-mini')", [randomUUID()]),
    false,
  );
});
await pg.close();
