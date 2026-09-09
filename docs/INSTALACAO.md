# Instalação · Hax Estúdio Casamentos

Este guia coloca o projeto do ZIP em suas próprias contas. A ordem é: Supabase → GitHub → Netlify → administrador → Google Agenda → chatbot. Google e OpenAI podem ser conectados depois; o portfólio, o CRM e o WhatsApp funcionam sem essas duas integrações quando o Supabase está conectado.

## 1. Preparar o Supabase

1. Acesse [Supabase](https://supabase.com/dashboard) e crie um **projeto novo**, dedicado a este site. Guarde a senha do banco.
2. Aguarde a criação do projeto e abra **SQL Editor → New query**.
3. Abra o arquivo `supabase/migrations/001_initial.sql` no seu computador, copie todo o conteúdo e execute no SQL Editor.
4. Em uma nova consulta, execute todo o conteúdo de `supabase/migrations/002_content.sql`.

O primeiro arquivo cria tabelas, permissões, histórico, limitação de solicitações, controle do chatbot e o bucket público `portfolio` para capas. O segundo insere os textos, filmes, coleções em rascunho e etapas do funil.

Execute o primeiro arquivo uma vez em um banco novo. Ele não é uma atualização para um sistema antigo já em operação. O arquivo de conteúdo usa `ON CONFLICT DO NOTHING`: repetir sua execução preserva os registros que já existem, em vez de atualizar o conteúdo salvo pelo painel.

### Criar o administrador

1. No Supabase, abra **Authentication → Users → Add user** e crie um usuário com seu e-mail e uma senha forte. Marque a confirmação automática do e-mail, se essa opção estiver disponível.
2. Desabilite novos cadastros públicos em **Authentication → Sign In / Providers → Allow new users to sign up**. Os nomes das opções podem variar conforme o painel.
3. Abra `supabase/admin.example.sql`, substitua `SEU-EMAIL@EXEMPLO.COM` pelo e-mail cadastrado e execute no SQL Editor.

O cadastro no Authentication sozinho não libera o painel: o usuário também precisa existir em `public.admin_users`. Não há senha padrão no código. Para criar outro administrador, repita o procedimento com o e-mail correto; todos os administradores desta versão têm acesso completo ao site e ao CRM.

### Copiar as chaves certas

Nas configurações de API do projeto, copie:

- **Project URL**, no formato `https://seu-projeto.supabase.co`.
- **Publishable key**; se estiver usando as chaves antigas, use a **anon key**.
- **Legacy service_role key**, a chave JWT legada destinada ao servidor.

Esta versão usa a chave legada `service_role` no acesso REST do servidor. Não substitua esse valor por uma chave `sb_secret_...` sem adaptar o cliente de servidor. A publishable/anon pode chegar ao navegador; a `service_role` fica exclusivamente nas funções do Netlify.

As tabelas do CRM não são acessíveis diretamente por visitantes nem por usuários comuns autenticados. As funções administrativas verificam a sessão e a lista de administradores. O Storage permite enviar imagens somente para administradores, embora as capas publicadas possam ser visualizadas por qualquer visitante. Veja a documentação oficial de [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e de [permissões do Storage](https://supabase.com/docs/guides/storage/security/access-control).

## 2. Colocar o projeto no GitHub

Extraia o ZIP. A pasta que contém `package.json`, `netlify.toml`, `dist` e `supabase` deve ser a raiz do repositório.

Uma opção simples é usar o GitHub Desktop:

1. Crie um repositório novo, por exemplo `hax-casamentos-site`.
2. Copie **o conteúdo** da pasta extraída para dentro da pasta desse repositório, incluindo os arquivos de configuração.
3. Faça o primeiro commit e use **Publish repository**. Você pode manter o repositório privado e autorizar o Netlify a acessá-lo.

Se usar um repositório existente, trabalhe em uma nova branch e revise as mudanças antes de substituir o site atual. Não envie o ZIP como único arquivo do repositório: o Netlify precisa enxergar os arquivos descompactados na raiz.

Não coloque senhas, `.env`, chaves Google em JSON ou a chave OpenAI nos arquivos versionados. O projeto inclui `.env.example` com campos vazios e regras no `.gitignore`.

## 3. Conectar o Netlify

No [Netlify](https://app.netlify.com/), crie um projeto a partir de um repositório existente, escolha GitHub e selecione o repositório e a branch.

| Campo               | Preenchimento                           |
| ------------------- | --------------------------------------- |
| Base directory      | Vazio, se os arquivos estiverem na raiz |
| Build command       | `npm run build`                         |
| Publish directory   | `dist`                                  |
| Functions directory | `netlify/functions`                     |

O arquivo `netlify.toml` já fornece esses valores e fixa Node.js 22. Publique o **repositório completo**: enviar apenas a pasta `dist` pelo modo de arrastar arquivos não instala o backend deste projeto. As funções usam o formato oficial de [Netlify Functions](https://docs.netlify.com/build/functions/api/).

### Variáveis de ambiente

Em **Project configuration → Environment variables**, adicione os valores abaixo. Habilite o escopo **Functions** e o contexto de **Production**. Se o seu plano mostrar apenas uma opção geral, use todos os escopos. As credenciais não precisam entrar no JavaScript público durante o build.

| Variável                       | Valor                                                             | Quando é necessária                                     |
| ------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------- |
| `SUPABASE_URL`                 | Project URL do Supabase                                           | Site editável, formulário e painel                      |
| `SUPABASE_PUBLISHABLE_KEY`     | Publishable key                                                   | Login e envio de capas                                  |
| `SUPABASE_ANON_KEY`            | Anon key antiga                                                   | Alternativa à publishable; preencha apenas uma das duas |
| `SUPABASE_SERVICE_ROLE_KEY`    | Chave JWT legada `service_role`                                   | Acesso das funções ao banco                             |
| `RATE_LIMIT_SECRET`            | Um segredo aleatório estável, por exemplo 32 bytes em hexadecimal | Recomendado para anonimizar os limites por IP           |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da conta de serviço                                        | Integração Google                                       |
| `GOOGLE_PRIVATE_KEY`           | Campo `private_key` do JSON Google                                | Integração Google                                       |
| `GOOGLE_CALENDAR_ID`           | ID da agenda de datas fechadas                                    | Integração Google                                       |
| `OPENAI_API_KEY`               | Chave da API OpenAI                                               | Chatbot ativado                                         |

Para gerar um valor local de `RATE_LIMIT_SECRET`, você pode executar:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Guarde o valor diretamente nas variáveis do Netlify. Se ele não for definido, o servidor usa a chave de serviço como segredo da função de hash; não grava o IP bruto na tabela de limitação.

Depois de adicionar ou alterar variáveis, faça **um novo deploy**. As funções precisam ser publicadas com a nova configuração. Consulte [variáveis das funções](https://docs.netlify.com/build/functions/environment-variables/) para os detalhes de escopo e contexto.

Para testar alterações em uma branch, prefira um projeto Supabase separado com dados de teste e configure variáveis específicas para Deploy Previews. Um preview que usa as credenciais de produção também altera os dados reais.

### Endereços do login e do domínio

Com a URL do site em mãos, volte ao Supabase em **Authentication → URL Configuration**:

- **Site URL:** `https://seu-site.netlify.app` ou o domínio definitivo.
- **Redirect URLs:** inclua `https://seu-site.netlify.app/admin/` e, quando existir, `https://seu-dominio.com.br/admin/`.

O redirecionamento é usado na recuperação de senha. Para uso regular dos e-mails de autenticação, configure seu provedor SMTP no Supabase. As condições de envio dependem da configuração do seu projeto; veja [autenticação por senha](https://supabase.com/docs/guides/auth/passwords).

Abra `https://seu-site.netlify.app/admin/` e entre com o usuário criado no Supabase. Para usar seu domínio, adicione-o no Netlify, siga os registros DNS indicados por ele e confira o HTTPS. Atualize as URLs de autenticação quando fizer a troca.

## 4. Integrar o Google Agenda

A agenda é privada. O servidor consulta somente intervalos livres e ocupados; o site não exibe títulos, convidados ou descrições de eventos.

1. No Google Agenda da Hax, crie uma agenda separada chamada **Casamentos — Datas Fechadas**. Configure o fuso **America/Sao_Paulo**.
2. No [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione um projeto e ative **Google Calendar API**.
3. Abra **IAM & Admin → Service Accounts**, crie uma conta de serviço e copie o e-mail dela, terminado em `iam.gserviceaccount.com`. Não é necessário conceder papéis administrativos no projeto para esta consulta.
4. Nas chaves dessa conta, crie uma chave JSON. Guarde o arquivo em local privado. Ele não deve ser enviado ao GitHub ou colocado na pasta publicada do site.
5. No Google Agenda, abra as configurações de **Casamentos — Datas Fechadas → Compartilhar com pessoas ou grupos específicos** e adicione o e-mail da conta de serviço. Conceda **Ver apenas livre/ocupado (ocultar detalhes)**.
6. Na seção **Integrar agenda**, copie o **ID da agenda**. Esse valor pode terminar em `group.calendar.google.com`; não é o link público nem o código HTML de incorporação.
7. Preencha as três variáveis Google no Netlify e publique novamente.

| Campo do JSON/configuração Google     | Variável Netlify               |
| ------------------------------------- | ------------------------------ |
| `client_email`                        | `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `private_key`                         | `GOOGLE_PRIVATE_KEY`           |
| ID obtido nas configurações da agenda | `GOOGLE_CALENDAR_ID`           |

Em `GOOGLE_PRIVATE_KEY`, cole somente o valor da chave, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`, sem as aspas externas do JSON. O código aceita quebras de linha reais ou a sequência literal `\n`.

Não é necessário tornar a agenda pública nem ativar delegação de domínio. Se sua organização proibir compartilhar agendas com contas de serviço, o administrador do Google Workspace deverá permitir esse compartilhamento. O fluxo usado é o oficial de [conta de serviço](https://developers.google.com/identity/protocols/oauth2/service-account), com o escopo `calendar.freebusy` e a consulta [FreeBusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query).

### Marcar datas e conferir a conexão

- Cadastre casamentos fechados nessa agenda como eventos de **dia inteiro**, marcados como **Ocupado**.
- No painel do site, abra **Agenda → Testar consulta da agenda**. Ele deve confirmar que o Google respondeu.
- Confira no calendário público um dia com evento e um dia sem evento. Qualquer intervalo ocupado deixa o dia inteiro indisponível, porque a consulta é por data de casamento.
- Um evento de dia inteiro que termina à meia-noite não bloqueia o dia seguinte. Um evento que realmente ocupa horas dos dois dias bloqueia ambos.

Os bloqueios manuais do painel também deixam uma data indisponível. Eles não criam nem removem eventos no Google. Mover um lead para **Contrato fechado** no CRM também não agenda automaticamente o casamento: registre a data na agenda ou bloqueie-a no painel.

Se o Google não responder ou ainda não estiver conectado, os dias ficam **A consultar**. Isso evita informar uma disponibilidade sem confirmação da agenda. Bloqueios manuais continuam valendo quando a consulta está habilitada.

Para disponibilizar também um agendamento de reunião, cole seu link de agenda de horários do Google em **Conteúdo → Textos e contato → Link do agendamento de reunião**. Esse botão é separado da disponibilidade dos casamentos.

## 5. Integrar e ativar o chatbot OpenAI

1. Acesse a [plataforma OpenAI](https://platform.openai.com/), crie ou escolha um projeto de API e configure o faturamento desse projeto.
2. Crie uma chave com acesso à Responses API e salve-a como `OPENAI_API_KEY` nas variáveis do Netlify.
3. Publique novamente e abra **Chatbot & orçamento** no painel. O indicador deve mostrar a presença da chave.
4. Revise o modelo, as instruções de atendimento, o teto mensal estimado em reais, o câmbio e as tarifas por milhão de tokens.
5. Marque **Ativar chatbot no site** e salve. Atualize a página pública e faça uma conversa curta de teste.

O modelo inicial é `gpt-4.1-mini`, com saída de até 400 tokens e teto estimado de **R$ 10/mês**. O câmbio inicial de R$ 6 por dólar é apenas um parâmetro de cálculo; não é uma cotação consultada em tempo real. A IA começa **desativada**.

O faturamento da API é separado da assinatura do ChatGPT. O painel controla uma estimativa dos custos deste site, não consulta créditos da OpenAI e não limita outros aplicativos que usem a mesma conta. Revise [os preços oficiais](https://developers.openai.com/api/docs/pricing) antes de ativar. Veja [docs/CHATBOT.md](CHATBOT.md) para o funcionamento do teto.

Quando desativado, o botão flutuante leva ao WhatsApp. Se a IA estiver ativada e o teto impedir uma resposta, a conversa oferece continuidade pelo WhatsApp. O formulário do site continua sendo a entrada automática de contatos no CRM. A IA não cria reservas nem altera leads.

## 6. Revisar conteúdo e fazer o primeiro uso

No painel, confira os filmes e capas, sua apresentação, o WhatsApp, o Instagram e o e-mail de privacidade. Revise os valores antigos antes de publicar coleções. A foto e as capas são reais, recuperadas das fontes registradas no projeto.

Antes de direcionar campanhas ao domínio, faça estas verificações com dados de teste:

1. Envie um formulário e confirme a chegada do contato no CRM. Abra o cartão, adicione uma próxima ação e mova-o entre etapas.
2. Edite um filme e envie uma capa. Depois de salvar, atualize o site e confira o resultado.
3. Confira uma data ocupada e uma livre com Google conectado.
4. Se ativar a IA, teste uma conversa curta, desative-a e confirme o acesso ao WhatsApp.
5. Abra o site no seu celular, reproduza um filme e envie um formulário.

Um endereço de campanha pode ser:

```text
https://seu-dominio.com.br/?utm_source=instagram&utm_medium=paid_social&utm_campaign=casamentos
```

A origem permanece durante a navegação na mesma aba e é salva com o formulário. O projeto emite o evento JavaScript `hax:lead-submitted` somente após uma gravação bem-sucedida. Ele pode ser usado numa futura integração de conversões. Pixels da Meta, Google Ads e ferramentas de analytics não foram ativados nesta versão.

## Problemas comuns

| Sintoma                                         | O que conferir                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Painel pede configuração                        | Variáveis Supabase no escopo Functions e novo deploy                                       |
| Login válido, mas acesso negado                 | E-mail cadastrado em Authentication e UUID correspondente em `admin_users`                 |
| Site mostra o conteúdo inicial após você editar | Acesso a `public-config`, credenciais da função e existência das tabelas                   |
| Imagem não é enviada                            | Bucket `portfolio`, permissões do script inicial, usuário autorizado e arquivo de até 8 MB |
| Formulário não salva                            | Scripts SQL executados, chave `service_role` correta e ao menos uma etapa aberta no funil  |
| Recuperação de senha não chega                  | Configuração de e-mail/SMTP, URL de redirecionamento e cadastro do usuário                 |
| Todas as datas estão “A consultar”              | API Google habilitada, compartilhamento, ID, chave privada e teste no painel               |
| Chat só oferece WhatsApp                        | Ativação, chave OpenAI, faturamento do projeto, tarifas válidas e saldo do teto estimado   |

Os logs das Functions no Netlify mostram códigos de falha sem registrar o corpo dos leads ou das conversas pelo código deste projeto. O diagnóstico de uma integração real deve ser feito com as credenciais configuradas na sua conta.
