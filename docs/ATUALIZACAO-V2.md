# Atualização · abertura cinematográfica e agenda

Versão 1.1 · com correção 1.1.1 do autoplay. Se você já instalou a 1.1 e executou o SQL 003, siga apenas [CORRECAO-AUTOPLAY.md](CORRECAO-AUTOPLAY.md); não repita o SQL.

## Se o site já está instalado

1. Extraia o ZIP. Substitua os arquivos do repositório GitHub pelos arquivos da pasta `hax-casamentos`, incluindo `dist`, `netlify`, `scripts`, `supabase`, `package.json` e `netlify.toml`. Mantenha esses itens na raiz do repositório, sem uma pasta extra ao redor. Mantenha `.env.example` e `.gitignore`; não envie suas chaves.
2. Publique a alteração na branch conectada ao Netlify e aguarde o deploy terminar. As variáveis já configuradas no Netlify continuam valendo. O build permanece `npm run build`, a pasta publicada é `dist` e as funções estão em `netlify/functions`.
3. No SQL Editor do **mesmo projeto Supabase**, execute uma vez **somente** `supabase/migrations/003_cinematic_update.sql`. Ele configura Vini como primeiro filme, Dani & Jonas como segundo e ajusta a ordem dos três primeiros filmes da galeria. Preserva leads, histórico, administradores, textos e as demais configurações. Não execute `001_initial.sql` novamente.
4. Atualize o site. Se o navegador mantiver o favicon anterior em cache, feche a aba e abra novamente. Em `/admin/`, os dois vídeos e suas capas ficam em **Conteúdo → Textos e contato**.
5. Na agenda, confira uma data livre e uma bloqueada. Envie um contato de teste pela data livre e confira nome, telefone, cidade, data e origem no CRM. As datas livres dependem da conexão real do Google Agenda; confira o botão de teste em **Agenda**.

O ZIP contém o projeto inteiro. A publicação de código mantém os dados do Supabase. O SQL 003 altera especificamente a ordem dos filmes solicitada; se você personalizar essa ordem posteriormente no painel, não precisa executá-lo novamente.

## Se ainda não instalou

Siga [INSTALACAO.md](INSTALACAO.md) desde o início. Em um banco novo, execute os SQLs **001 → 002 → 003**, crie o administrador e configure as variáveis no Netlify.

## O que muda

- Casamento Vini abre o site. Dani & Jonas ocupa a segunda tela. A rolagem faz uma transição contínua, sem texto entre os dois.
- Os dois filmes iniciam sem som, com controles para pausar ou assistir com áudio. A galeria vem depois, com o título “O amor acontece. A gente guarda.” e filtros; seus vídeos só iniciam com clique.
- O círculo marrom do cursor foi removido. Os quadros têm leve inclinação e zoom no hover, com “Assistir” discreto e translúcido.
- Datas disponíveis abrem WhatsApp, nome e cidade, com gravação no CRM após nova consulta da disponibilidade. Datas ocupadas oferecem consulta de exceções pelo WhatsApp.
- A logo fornecida aparece no site, no painel e no favicon. Títulos, seções e botões receberam animações.

O autoplay segue as permissões do navegador e do provedor do vídeo; o botão “Assistir com som” permite abrir o player por clique. O visitante pode pausar a prévia ou abrir o filme com som. A preferência do sistema por movimento reduzido desativa as transições amplas; os filmes mantêm reprodução automática silenciosa e o botão de pausa. A implementação usa o player incorporado e os [parâmetros oficiais do YouTube](https://developers.google.com/youtube/player_parameters).

As credenciais reais de Supabase, Google e OpenAI ficam nas suas contas. O site público de visualização da versão anterior não é atualizado apenas por baixar este ZIP; a versão corrigida é aplicada pelo deploy dos arquivos.
