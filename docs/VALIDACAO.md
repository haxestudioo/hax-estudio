# Verificação da entrega

## Correção 1.1.1 do autoplay

Após a entrega 1.1, foram adicionados e aprovados seis testes específicos em `tests/cinema.test.mjs`: criação imediata dos players sem API externa, autoplay silencioso dos dois vídeos, entrada do segundo antes da transição, exibição após carregamento, pausa/saída e eventos atrasados, além do comportamento com movimento reduzido. São testes locais do controlador, sem reprodução real do YouTube em navegador. Veja [CORRECAO-AUTOPLAY.md](CORRECAO-AUTOPLAY.md).

Os resultados abaixo são o registro da verificação da versão 1.1. Os componentes de CRM, servidor e banco não foram alterados pela correção 1.1.1.

Data: **9 de setembro de 2026** · versão 1.1.

## Resultado

| Verificação                                        | Resultado                                                    |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Sintaxe JavaScript, imports e arquivos necessários | Aprovado com `node scripts/validate.mjs`, o comando do build |
| Regras de domínio e endpoints das funções          | 32 testes aprovados                                          |
| Migrações, permissões e funções SQL                | 13 testes aprovados em PostgreSQL via PGlite 0.5.8           |

Os 45 testes verificam entradas inválidas, autorização de administrador, proteção do CRM, origem das campanhas, reenvio idempotente de leads, conflito entre edições, autoria e preservação da data de consentimento, upload restrito, limites por IP, datas ocupadas e bloqueios de orçamento. A atualização acrescenta a captação pela agenda e a preservação dos dados na migração 003.

## O que foi exercitado

**Funções e regras:** URLs perigosas, escape de HTML, proteção de CSV contra fórmulas, datas impossíveis, consentimento obrigatório, lista de campos permitidos, limites de configuração, acesso sem sessão, usuário sem papel administrativo, resposta pública sem dados do CRM, gravação de leads, controle de abuso, conflito entre versões, manutenção de etapa aberta, chatbot desligado, teto insuficiente, contabilização de tokens e timeout com encaminhamento ao WhatsApp.

**Agenda:** fevereiro bissexto, virada do ano, fim exclusivo à meia-noite, evento que cruza dois dias, ausência de credenciais e preservação de bloqueios manuais sem apresentar datas desconhecidas como livres. Os novos testes exercitam o envio após consulta de uma data livre, preservação de nome/WhatsApp/cidade/data/UTM, recusa quando a data fica ocupada ou não pode ser confirmada e reenvio de um contato já salvo sem duplicação.

**Banco:** execução das três migrações, conteúdo inicial, permissões de tabelas e funções, `is_admin`, políticas de imagem, chave idempotente, histórico com autoria, data de autorização preservada, integridade das etapas, limitação persistente e expiração, reserva de orçamento, liquidação idempotente e consumo integral de chamada incerta. A migração 003 foi executada após criar um lead e personalizar um texto: a ordem dos filmes mudou, e o lead, seu histórico, o administrador e o texto personalizado foram preservados.

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
