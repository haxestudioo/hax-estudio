# Hax Estúdio · Filmes de casamento

Versão 1.1.1 do site de Leanderson: portfólio cinematográfico, captação de contatos, painel administrativo e CRM próprio. Projeto preparado para um repositório GitHub e publicação no Netlify, com Supabase como banco, autenticação e armazenamento de imagens.

**Comece por [docs/INSTALACAO.md](docs/INSTALACAO.md).** O guia cobre todas as contas, variáveis, scripts SQL e o primeiro acesso ao painel.

**Correção do autoplay:** veja [docs/CORRECAO-AUTOPLAY.md](docs/CORRECAO-AUTOPLAY.md). Esta revisão não exige novo SQL.

**Já instalou a versão anterior? Siga [docs/ATUALIZACAO-V2.md](docs/ATUALIZACAO-V2.md).** A atualização preserva seu CRM e inclui um único SQL para colocar Vini na abertura.

## O que está incluído

- Dois filmes em tela cheia com reprodução automática silenciosa e transição contínua na rolagem: Casamento Vini e Dani & Jonas. Sem texto ou seção intermediária.
- Galeria com o título “O amor acontece. A gente guarda.”, filtros e reprodução por clique. Hover com leve inclinação da imagem e indicação translúcida de assistir, sem círculo no cursor.
- Entradas de títulos por palavras, movimentos nas seções, botões animados e parallax suave. Respeita a preferência por movimento reduzido. Logo e favicon usam a imagem fornecida da Hax Estúdio de Criação.
- Cinco filmes recuperados do portfólio anterior, capas reais, foto e apresentação de Leanderson. Cada filme tem um endereço próprio em `/filmes/endereco-do-filme`.
- Formulário que grava leads no Supabase, com consentimento, data, cidade, mensagem e origem das campanhas. WhatsApp: **+55 44 99185-5451**.
- Administração em `/admin/`: filmes, capas com upload, textos, coleções, depoimentos, dúvidas frequentes, cores e fontes.
- CRM com cartões arrastáveis, seleção de etapa no celular, cadastro manual, maturação, propostas, próximas ações, histórico, busca, arquivo e exportação CSV.
- Calendário público integrado ao Google Agenda: uma data livre abre os campos WhatsApp, nome e cidade; o envio grava um lead no CRM. Uma data ocupada oferece consulta de exceções pelo WhatsApp. Bloqueios adicionais no painel.
- Chatbot com OpenAI Responses API, ativação e desativação, teto mensal estimado em reais, registro de tokens e encaminhamento ao WhatsApp quando a IA estiver indisponível.

## Conteúdo inicial

Os filmes são Dani & Jonas, Letícia & Eduardo, Casamento Vini, Mariana & Jackson e o pré-wedding de Dani & Jonas. A apresentação usa o texto do portfólio anterior. Os preços antigos de Storymaker, Highlights e Básico foram mantidos **em rascunho**, para revisão no painel antes de publicar. Depoimentos não foram inventados; a seção aparece após o cadastro de conteúdo real.

A abertura começa por Casamento Vini; o segundo filme é Dani & Jonas. Os dois usam o player incorporado do YouTube com autoplay silencioso, sem depender do carregamento da API externa. Fora de vista, a reprodução é interrompida. O botão “Assistir com som” abre o filme selecionado com controles. Se o navegador bloquear a reprodução automática, use “Assistir com som” para abrir o player por clique. Com movimento reduzido, os dois filmes ficam em seções comuns de tela cheia e continuam iniciando automaticamente sem som. O controle de pausa permanece disponível. Você pode trocar cada vídeo e capa no painel. Não há upload de filmes pesados: eles são incorporados por link YouTube ou MP4/WebM; as imagens podem ser enviadas ao Supabase.

## Publicação

1. Crie um projeto Supabase novo e execute `001_initial.sql`, `002_content.sql` e `003_cinematic_update.sql`, nesta ordem. Em um banco que já tem a versão anterior, execute somente `003_cinematic_update.sql`.
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
- [Atualizar a versão anterior preservando os leads](docs/ATUALIZACAO-V2.md)
- [Operação do painel e do CRM](docs/USO-DO-PAINEL.md)
- [Funcionamento do orçamento do chatbot](docs/CHATBOT.md)
- [Verificações realizadas e limites da entrega](docs/VALIDACAO.md)
- [Dependências e fontes dos recursos](docs/DEPENDENCIAS.md)

Arquivos de banco ficam em `supabase/`, funções em `netlify/functions/` e páginas em `dist/`. Depois da instalação, as alterações feitas no painel ficam no Supabase e continuam existindo nos próximos deploys do código. Faça backup do banco e do Storage separadamente do GitHub.
