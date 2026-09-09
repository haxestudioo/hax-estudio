import { writeFile } from 'node:fs/promises';
import { seed } from '../dist/assets/seed.js';
const quote = (v) =>
  v == null
    ? 'null'
    : typeof v === 'boolean'
      ? String(v)
      : typeof v === 'number'
        ? String(v)
        : "'" + String(typeof v === 'object' ? JSON.stringify(v) : v).replaceAll("'", "''") + "'";
let sql =
  '-- Conteúdo inicial recuperado do portfólio anterior. Execute depois de 001_initial.sql.\n-- ON CONFLICT DO NOTHING preserva alterações já feitas no painel.\nbegin;\n';
for (const [key, value] of Object.entries(seed.settings))
  sql += `insert into public.site_settings(key,value) values (${quote(key)},${quote(value)}::jsonb) on conflict(key) do nothing;\n`;
for (const table of ['projects', 'testimonials', 'packages', 'faqs', 'pipeline_stages'])
  for (const row of seed[table])
    sql += `insert into public.${table} (${Object.keys(row).join(',')}) values (${Object.values(row).map(quote).join(',')}) on conflict do nothing;\n`;
sql += 'commit;\n';
await writeFile(new URL('../supabase/migrations/002_content.sql', import.meta.url), sql);
console.log('Conteúdo inicial atualizado.');
