# Dependências

O site usa HTML, CSS e módulos JavaScript. As Functions usam Node.js 22, `fetch` e `node:crypto`, sem pacotes de produção instalados.

O cliente oficial Supabase JS 2.116.0 está incluído em `dist/assets/vendor/supabase.js`, no formato UMD publicado pelo projeto. Ele cuida das sessões, recuperação de senha e upload de imagens. Origem: https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.116.0.tgz. Licença MIT, mantida no aviso de terceiros.

As fontes Cormorant Garamond, Manrope, DM Sans e Playfair Display são carregadas por Google Fonts e possuem fontes de sistema alternativas. Nenhuma fonte comercial foi incluída.

Os testes de regras e endpoints usam o executor embutido do Node. A verificação SQL opcional usa PGlite 0.5.8, instalado apenas no ambiente de teste, com licença Apache-2.0. `npm run build` valida os arquivos já publicados em `dist`; não substitui o conteúdo editável do Supabase.
