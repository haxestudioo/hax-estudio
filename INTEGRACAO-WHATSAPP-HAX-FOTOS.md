# HAX Fotos — painel comercial e integração WhatsApp Cloud API
**Não executar nenhuma etapa de produção antes da autorização do proprietário.** A branch feature/hax-fotos-admin-whatsapp é isolada. A produção continua na branch configurada no Netlify (teste, conforme última publicação; reconfirmar antes de publicar).

## 1. Preparação no Meta (pode ser feita antes da autorização de deploy)
1. Acesse https://developers.facebook.com/apps/ e selecione o portfólio empresarial da HAX Estúdio. Crie um app empresarial para a HAX Fotos (ou reutilize app empresarial autorizado para WhatsApp, sem confundir com o app Instagram).
2. Adicione o caso de uso WhatsApp / WhatsApp Business Platform. Em API Setup, use o número de teste fornecido pela Meta e adicione seu próprio telefone de teste como destinatário. Para produção, vincule/crie a conta WhatsApp Business (WABA), adicione/verifique o número comercial e configure o perfil/nome de exibição. Se o número estiver no WhatsApp Business App, confirme se a coexistência oficial está disponível para sua conta antes de migrar; não desregistre seu número atual sem verificar.
3. Copie o ID do número de telefone (não é o número de telefone nem o ID WABA). Anote a versão Graph API indicada no painel (ex.: v27.0, desde que suportada).
4. Em https://business.facebook.com/settings/ > Usuários do sistema, crie ou selecione usuário de sistema, atribua o app e a conta WhatsApp, e gere token com whatsapp_business_messaging. Use whatsapp_business_management se precisar administrar modelos/conta via API. Use token de longa duração conforme disponível; teste e planeje rotação. Conclua verificações e configuração de cobrança exigidas pela Meta. Não compartilhe tokens em chat nem commit.
5. Em Configurações do app > Básico, localize App Secret. Gere também duas chaves aleatórias distintas para WA_VERIFY_TOKEN e WA_DELIVERY_SECRET (32 bytes ou mais, por exemplo Node: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"). Mantenha a chave de entrega estável: alterá-la invalida links WhatsApp já enviados, mas não os links originais do checkout.

## 2. Modelos de mensagem
WhatsApp Manager > Modelos de mensagem > Criar modelo. Selecione Português (Brasil), variáveis numéricas, somente corpo de texto (sem cabeçalho, botão ou rodapé com variáveis). Envie para aprovação. Os nomes podem ser alterados nas variáveis de ambiente; a estrutura de variáveis precisa permanecer igual.

### hax_fotos_confirmacao — Utilidade
Olá, {{1}}! Seu pagamento na HAX Fotos foi confirmado. Suas fotos originais estão disponíveis em alta resolução e sem marca d'água. Baixe suas fotos aqui: {{2}}. Guarde esse link para acessar seu pedido quando quiser. Obrigado pela compra!
Exemplos: {{1}} = Ana; {{2}} = https://haxestudio.com.br/fotos/?pedido=00000000-0000-4000-8000-000000000000&chave=exemplo
O link é individual e só é aceito pelo backend quando o pedido está aprovado. Nunca publique ou encaminhe links reais fora do destinatário.

### hax_fotos_lembrete — Marketing
Olá, {{1}}! Aqui é da HAX Fotos. Vimos que você iniciou um pedido de fotos, mas ainda não concluiu o pagamento. Teve algum problema? Podemos ajudar e finalizar sua compra diretamente pelo WhatsApp, inclusive com cartão. Responda esta mensagem para falar com nossa equipe. Se não quiser receber lembretes, responda SAIR.
Exemplo: {{1}} = Ana.
A Meta pode classificar, rejeitar ou cobrar pelos modelos. Não envie fora das políticas. O checkout oferece duas autorizações opcionais separadas e não pré-marcadas; clientes antigos não são incluídos automaticamente. A palavra SAIR, STOP, PARAR ou CANCELAR MENSAGENS bloqueia novos disparos automáticos no banco.

## 3. Depois da autorização: migração, deploy e webhook
1. Faça backup do banco Supabase HAX Fotos. SQL Editor: execute database/hax-fotos-whatsapp.sql **somente no projeto correto**, antes da ativação da API. É uma migração aditiva e transacional, cria tabelas RLS, funções e índices, sem alterar hashes/pedidos/fotos. Não reexecute o SQL inicial hax-fotos.sql.
2. Netlify > projeto hasestudio > Project configuration > Environment variables. Crie as variáveis abaixo com escopo Functions e somente Production. Preserve todas as variáveis atuais de Mercado Pago, R2 e Supabase.
   - WA_ENABLED=false (até concluir as verificações)
   - WA_ACCESS_TOKEN: token do usuário de sistema Meta.
   - WA_PHONE_NUMBER_ID: ID numérico do número de telefone da API.
   - WA_GRAPH_VERSION: versão suportada no app (ex.: v27.0).
   - WA_TEMPLATE_RECEIPT=hax_fotos_confirmacao
   - WA_TEMPLATE_REMINDER=hax_fotos_lembrete
   - WA_APP_SECRET: App Secret da Meta.
   - WA_VERIFY_TOKEN: chave aleatória de verificação do webhook.
   - WA_DELIVERY_SECRET: chave aleatória estável de pelo menos 32 caracteres.
   - PUBLIC_SITE_URL: já existente, domínio HTTPS oficial (preservar).
3. Após autorização e teste da migração em ambiente isolado, mescle a branch em main e sincronize a branch realmente usada em produção. Netlify publica atomicamente, preservando o deploy anterior até o novo estar pronto.
4. No app Meta > WhatsApp > Configuration/Webhooks, configure callback https://haxestudio.com.br/api/fotos/whatsapp-webhook e token WA_VERIFY_TOKEN. Assine o campo messages; vincule/inscreva o app à WABA, se necessário, em API Setup ou POST /{WABA_ID}/subscribed_apps. A verificação GET só funciona após o código estar publicado. O POST valida X-Hub-Signature-256 com WA_APP_SECRET e confere o ID do número.
5. Confira os dois modelos aprovados e um envio de teste no painel Meta com seu próprio número. Ative WA_ENABLED=true somente depois disso. Refaça o deploy se o Netlify exigir atualização das variáveis. Verifique a função agendada fotos-whatsapp-cron (*/5 * * * *, apenas deploy publicado). O checkout só exibe as caixas de consentimento quando a integração está ativa e as credenciais necessárias estão presentes.

## 4. Fluxo e validação
- Confirmação: até cerca de 5 minutos após aprovação (dependente da fila/API), inclusive com a página fechada. O scheduler também consulta pagamentos pendentes inscritos. Links WhatsApp têm token HMAC separado; o backend exige aprovação e pertencimento da fotografia ao pedido. Links antigos continuam aceitos.
- Lembrete: primeira execução após 4h, geralmente 4h–4h05, nunca antes; fila cheia ou falhas do provedor podem atrasar. Verifica todos os pedidos relevantes pelo telefone (DDD/DDI normalizado), reconcilia pendências com Mercado Pago e verifica novamente no banco antes do disparo. Nova tentativa mais recente adia/substitui a antiga. Se já houve pagamento após a tentativa, não dispara. Por segurança: no máximo um lembrete por telefone em 24h; não envia lembretes de pedidos com mais de 24h, nem se houver mais de 20 pedidos relevantes a reconciliar sem confirmação segura. Uma corrida residual de pagamento imediatamente após a última checagem pode existir; não há transação atômica entre Mercado Pago e Meta.
- Prevenção de duplicatas: claim transacional com lock por telefone. Envio aceito, entrega e leitura são registrados. Erros de envio ambíguos ficam "Envio incerto" para revisão manual, sem reenvio automático; claims travados viram incertos após 30 min. Nenhum envio automático retroativo.
- Cartão: link discreto para atendimento comercial, não é checkout de cartão. O contato acompanha o número do site (fallback do contato atual). O cliente não deve enviar dados de cartão pelo chat: encaminhe um link seguro de pagamento.
- Testar: checkout opt-in e opt-out; compra aprovada no Pix e link correto; impedir acesso a outro pedido; pedido pendente após 4h; duas tentativas do mesmo número com/sem DDI, nova compra aprovada antes de 4h; cancelamento via SAIR; webhook de entrega/leitura; falha Meta. Usar ambiente/banco de testes e número de teste, não dados de clientes reais.
- Indicadores usam o status atual dos pedidos, valores brutos e data de criação como filtro. Não equivalem a um relatório contábil de liquidação de taxas. A interface carrega páginas do banco, sem os limites antigos de 500 pedidos/2.000 itens, mas volumes muito grandes podem exigir agregação server-side.
- Referências oficiais: https://developers.facebook.com/documentation/business-messaging/whatsapp/overview/ ; https://developers.facebook.com/docs/graph-api/webhooks/getting-started/ ; https://business.whatsapp.com/policy ; https://docs.netlify.com/build/functions/scheduled-functions/ .
