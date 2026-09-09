# Hax Estúdio · Filmes de casamento

Primeiro modelo completo do site de Leanderson: portfólio cinematográfico, captação de contatos, painel administrativo e CRM próprio. Projeto preparado para um repositório GitHub e publicação no Netlify, com Supabase como banco, autenticação e armazenamento de imagens.

**Comece por [docs/INSTALACAO.md](docs/INSTALACAO.md).** O guia cobre todas as contas, variáveis, scripts SQL e o primeiro acesso ao painel.

## O que está incluído

- Site escuro, com títulos em serifada, cores champanhe e marfim, abertura em vídeo, movimento discreto na rolagem, transições e cursor contextual sobre os filmes. Respeita a preferência por movimento reduzido.
- Cinco filmes recuperados do portfólio anterior, capas reais, foto e apresentação de Leanderson. Cada filme tem um endereço próprio em `/filmes/endereco-do-filme`.
- Formulário que grava leads no Supabase, com consentimento, data, cidade, mensagem e origem das campanhas. WhatsApp: **+55 44 99185-5451**.
- Administração em `/admin/`: filmes, capas com upload, textos, coleções, depoimentos, dúvidas frequentes, cores e fontes.
- CRM com cartões arrastáveis, seleção de etapa no celular, cadastro manual, maturação, propostas, próximas ações, histórico, busca, arquivo e exportação CSV.
- Calendário público que consulta livre/ocupado do Google Agenda, com bloqueios adicionais no painel.
- Chatbot com OpenAI Responses API, ativação e desativação, teto mensal estimado em reais, registro de tokens e encaminhamento ao WhatsApp quando a IA estiver indisponível.

## Conteúdo inicial

Os filmes são Dani & Jonas, Letícia & Eduardo, Casamento Vini, Mariana & Jackson e o pré-wedding de Dani & Jonas. A apresentação usa o texto do portfólio anterior. Os preços antigos de Storymaker, Highlights e Básico foram mantidos **em rascunho**, para revisão no painel antes de publicar. Depoimentos não foram inventados; a seção aparece após o cadastro de conteúdo real.

A abertura usa o filme de Dani & Jonas pelo YouTube em computadores compatíveis. No celular e com movimento reduzido, usa a capa com reprodução por clique. Você pode substituir a abertura por uma montagem própria em MP4/WebM. Não há upload de filmes pesados no painel: eles são incorporados por link; as imagens podem ser enviadas ao Supabase.

## Publicação

1. Crie um projeto Supabase novo e execute `001_initial.sql` e `002_content.sql`, nesta ordem.
2. Crie seu usuário em Authentication e autorize seu e-mail usando `supabase/admin.example.sql`.
3. Coloque o conteúdo desta pasta em um repositório GitHub e importe-o no Netlify.
4. Configure as variáveis do Supabase no Netlify e publique novamente.
5. Entre em `/admin/`. Conecte Google Agenda e OpenAI conforme o guia.

| Configuração do Netlify | Valor               |
| ----------------------- | ------------------- |
| Pasta base              | Raiz do repositório |
| Comando de build        | `npm run build`     |
| Pasta publicada         | `dist`              |
| Pasta de funções        | `netlify/functions` |
| Node.js                 | `22`                |

Esses valores já estão em `netlify.toml`. As integrações precisam das suas credenciais para operar. Sem banco configurado, o site mostra o conteúdo inicial e o WhatsApp; o painel explica a configuração necessária e o formulário não informa sucesso sem ter salvo o contato.

## Código e verificação

```sh
npm run build
npm test
```

Não é necessário instalar pacotes para esses dois comandos. `dist` contém o HTML, CSS e JavaScript finais e deve ser versionado. O build verifica sintaxe, imports e presença dos recursos locais; não apaga nem gera novamente seu conteúdo.

O SDK oficial Supabase está incluído com a licença original. As funções de servidor usam as APIs nativas do Node. A verificação opcional do banco está explicada em [docs/VALIDACAO.md](docs/VALIDACAO.md).

Para desenvolvimento local com as funções, instale Node.js 22, copie `.env.example` para `.env`, preencha as credenciais de um projeto de teste e execute `npx netlify-cli dev`. Abra o endereço que o CLI informar. Nunca envie `.env` ao GitHub.

## Guias

- [Instalação: GitHub, Netlify, Supabase, Google e OpenAI](docs/INSTALACAO.md)
- [Operação do painel e do CRM](docs/USO-DO-PAINEL.md)
- [Funcionamento do orçamento do chatbot](docs/CHATBOT.md)
- [Verificações realizadas e limites da entrega](docs/VALIDACAO.md)
- [Dependências e fontes dos recursos](docs/DEPENDENCIAS.md)

Arquivos de banco ficam em `supabase/`, funções em `netlify/functions/` e páginas em `dist/`. Depois da instalação, as alterações feitas no painel ficam no Supabase e continuam existindo nos próximos deploys do código. Faça backup do banco e do Storage separadamente do GitHub.
