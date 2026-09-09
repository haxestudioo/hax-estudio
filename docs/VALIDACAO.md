# Verificação da entrega

Data: **8 de setembro de 2026**.

## Resultado

| Verificação | Resultado |
| --- | --- |
| Sintaxe JavaScript, imports e arquivos necessários | Aprovado com `npm run build` |
| Regras de domínio e endpoints das funções | 26 testes aprovados |
| Migrações, permissões e funções SQL | 12 testes aprovados em PostgreSQL via PGlite 0.5.8 |

Os 38 testes verificam entradas inválidas, autorização de administrador, proteção do CRM, origem das campanhas, reenvio idempotente de leads, conflito entre edições, autoria e preservação da data de consentimento, upload restrito, limites por IP, datas ocupadas e bloqueios de orçamento.

## O que foi exercitado

**Funções e regras:** URLs perigosas, escape de HTML, proteção de CSV contra fórmulas, datas impossíveis, consentimento obrigatório, lista de campos permitidos, limites de configuração, acesso sem sessão, usuário sem papel administrativo, resposta pública sem dados do CRM, gravação de leads, controle de abuso, conflito entre versões, manutenção de etapa aberta, chatbot desligado, teto insuficiente, contabilização de tokens e timeout com encaminhamento ao WhatsApp.

**Agenda:** fevereiro bissexto, virada do ano, fim exclusivo à meia-noite, evento que cruza dois dias, ausência de credenciais e preservação de bloqueios manuais sem apresentar datas desconhecidas como livres.

**Banco:** execução das duas migrações, conteúdo inicial, permissões de tabelas e funções, `is_admin`, políticas de imagem, chave idempotente, histórico com autoria, data de autorização preservada, integridade das etapas, limitação persistente e expiração, reserva de orçamento, liquidação idempotente e consumo integral de chamada incerta.

## Limites da verificação

As requisições externas dos testes de endpoints usam respostas simuladas. A verificação SQL usa o motor PostgreSQL do PGlite com estruturas locais que simulam os schemas `auth` e `storage` do Supabase. A extensão `pgcrypto` é omitida nesse ambiente, que já fornece `gen_random_uuid`. Isso valida o SQL e as políticas escritas, mas não substitui a integração com os serviços hospedados do Supabase.

As chamadas concorrentes submetidas ao PGlite são serializadas pelo executor local. O teste verifica a consistência do saldo e a recusa de uma reserva acima do limite; não é um teste de carga com múltiplas conexões ao Supabase.

O ambiente local usou Node.js 24.19. A implantação está configurada para Node.js 22 e usa APIs disponíveis a partir dessa versão. Não houve navegação automatizada ou inspeção visual desta entrega em um navegador. Login real, envio de arquivos ao Storage, OAuth do Google, respostas e faturamento reais da OpenAI precisam ser conferidos com as credenciais da sua conta. O roteiro está no final do guia de instalação.

Os indicadores de integração do painel mostram presença de configuração; o botão de teste da agenda faz a consulta real. A primeira conversa após ativar a IA confirma o fluxo de resposta da sua conta.

## Repetir a verificação

Para o código e as funções:

```sh
npm run build
npm test
```

Para a verificação opcional do banco, em uma cópia local do projeto:

```sh
npm install --no-save --package-lock=false @electric-sql/pglite@0.5.8
npm run test:db
```

O teste SQL cria um banco temporário em memória e não se conecta ao seu Supabase. PGlite é uma ferramenta de desenvolvimento; não é necessário para publicar ou operar o site. Nenhuma dependência de testes precisa ser adicionada ao código público.
