import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
let count = 0;
const errors = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.netlify'].includes(item.name)) continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      await walk(path);
      continue;
    }
    if (/\.(mjs|js)$/.test(path)) {
      try {
        execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
        count++;
      } catch (e) {
        errors.push(path + ': ' + e.stderr);
      }
      if (!path.includes('/vendor/')) {
        const source = await readFile(path, 'utf8');
        for (const m of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
          try {
            await stat(resolve(dirname(path), m[1]));
          } catch {
            errors.push('Import não encontrado: ' + path + ' -> ' + m[1]);
          }
        }
      }
    }
    if (/\.html$/.test(path)) {
      const html = await readFile(path, 'utf8');
      for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) {
        try {
          await stat(join(root, 'dist', m[1]));
        } catch {
          errors.push('Asset não encontrado: ' + m[1]);
        }
      }
    }
  }
}
await walk(root);
for (const path of [
  'dist/index.html',
  'dist/admin/index.html',
  'dist/filme.html',
  'dist/privacidade.html',
  'supabase/migrations/001_initial.sql',
  'supabase/migrations/002_content.sql',
  'netlify.toml',
]) {
  try {
    await stat(join(root, path));
  } catch {
    errors.push('Arquivo necessário ausente: ' + path);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Projeto validado: ${count} arquivos JavaScript, imports e recursos locais presentes.`);
