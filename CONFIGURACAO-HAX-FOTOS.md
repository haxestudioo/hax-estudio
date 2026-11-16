# HAX Fotos — configuração de produção (branch main)
Atualizado em 16/11/2026. A loja é uma INCLUSÃO: site e /admin/ existentes permanecem ativos.

## 1. O que está implementado
- Loja separada em `/fotos/`, responsiva, tema esportivo escuro, navegação e entrada animada.
- Eventos e galerias, zoom de prévia, seleção múltipla, sacola persistente por evento no navegador.
- Página de checkout com nome, WhatsApp e e-mail do comprador, conforme a API Pix do Mercado Pago.
- Pix exclusivamente: QR Code e Pix copia e cola. Status sempre consultado no Mercado Pago, não confiando em alterações do navegador.
- Webhook assinado; pedido privado reaberto via link com token secreto salvo localmente. Fotos originais liberadas SÓ após status aprovado.
- Admin já existente ganha aba `Venda de Fotos`: cadastro de eventos, preços, upload múltiplo dos originais, capas, publicar/ocultar, resumo de vendas, pedidos, CRM, conferência de pagamentos e download administrativo para correção manual.
- Original é enviado SEM REDUÇÃO e SEM MARCA D'ÁGUA para um bucket privado R2. Prévia WebP menor com marca d'água repetida é gerada no navegador do administrador. NÃO envie fotos originais para a galeria de portfólio antiga: aquela converte/resimensiona as imagens.
- O sistema não consegue bloquear captura de tela em navegadores comuns. A proteção efetiva é prévia reduzida, marca d'água gravada e original privado.
- O site e a branch main não foram modificados.

## 2. Criar projeto Supabase (banco exclusivo)
1. Entre em https://supabase.com/dashboard e crie uma organização/projeto específico para HAX Fotos. Salve a senha de banco em local seguro.
2. Acesse `SQL Editor` > `New query`.
3. Abra `database/hax-fotos.sql` neste repositório, cole o conteúdo COMPLETO e execute UMA VEZ em projeto vazio. Verifique em `Table Editor` as tabelas `hax_events`, `hax_photos`, `hax_customers`, `hax_orders`, `hax_order_items`.
4. Em `Project Settings` > `API Keys` (ou janela `Connect`), copie a chave **secret** (`sb_secret_...`) e salve em um gerenciador de senhas. NÃO use a publishable/anon key neste backend. A chave secret bypassa RLS e NUNCA deve ir para o navegador ou GitHub.
5. Copie a URL do projeto no formato `https://xxxxx.supabase.co`. Configure as variáveis `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no Netlify.
6. Confirme que RLS está ligada nas cinco tabelas (o SQL faz isso); não crie políticas públicas. Prefira projeto EXCLUSIVO para isolar dados, chaves e backups. O SQL restringe acesso anônimo apenas às tabelas HAX.
7. Faça backup periódico do banco. Pedidos, itens e clientes são dados essenciais à recuperação.

## 3. Criar armazenamento Cloudflare R2
1. Entre no https://dash.cloudflare.com > `R2 Object Storage` e habilite R2.
2. Crie um bucket de nome exato `hax-fotos` (ou ajuste `R2_BUCKET` nas variáveis do Netlify).
3. Mantenha o bucket **PRIVADO**: não habilite Public Development URL nem domínio público para os originais.
4. Em R2, vá a `Manage R2 API Tokens` e crie token com leitura/escrita de objetos restrito ao bucket `hax-fotos`. Guarde `Access Key ID` e `Secret Access Key` ao criar (a secret aparece apenas uma vez).
5. Copie o `Account ID` da conta Cloudflare (não é o nome do bucket).
6. No bucket `hax-fotos` > `Settings` > `CORS Policy`, cole a regra JSON abaixo, trocando as URLs pelas URLs REAIS do seu site e da prévia do Netlify:

```json
[
  {
    "AllowedOrigins": [
      "https://haxestudio.com.br",
      "https://haxestudio.com.br",
      "https://SEU-BRANCH-DEPLOY.netlify.app"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Disposition"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

7. Configure `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` no Netlify.
8. Faça um upload de imagem pelo admin. Deve aparecer em R2 a estrutura `originais/<evento>/<foto>/arquivo.jpg` e `previas/<evento>/<foto>.webp`. Só os originais sem marca d'água são entregues ao cliente após pagar.
9. Para arquivos originais, a transferência é direta do navegador ao R2 por URL assinada (sem usar o limite de upload das Netlify Functions). O download também redireciona para URL assinada de curto prazo.

## 3A. Usar a marca d'água original fornecida (etapa obrigatória antes do upload)
O painel foi atualizado para usar EXATAMENTE o arquivo de marca d'água personalizado do estúdio, em vez de texto gerado por código.
Como o GitHub atual só está disponível nesta integração para envio de arquivos textuais, o arquivo PNG binário precisa ser enviado uma vez pela interface GitHub:
1. Baixe o arquivo `marca-dagua.png` preparado a partir do PNG original anexado à conversa com o ChatGPT.
2. No repositório `haxestudioo/hax-estudio`, abra a branch `main` e confira `public/fotos/`.
3. Escolha `Add file` > `Upload files`, envie o PNG com o nome **exato** `marca-dagua.png`.
4. Confirme o commit diretamente em `teste` (NÃO na `main`). Espere o deploy da branch ficar pronto.
5. No domínio oficial, verifique `/fotos/marca-dagua.png`. O navegador deve exibir o PNG translúcido; não uma página 404.
6. No painel `/admin/` > `Venda de Fotos`, clique em `VERIFICAR CONEXÕES`. O indicador `Arquivo da marca d'água` deve aparecer OK.
7. Somente depois envie novas fotografias. O upload é interrompido se a marca personalizada não estiver disponível. As prévias anteriores feitas com marca por texto não são alteradas automaticamente; para substituí-las, é preciso novo upload das fotografias, preservando pedidos já vendidos.

O PNG anexo tem transparência (RGBA) e o logo Hax Estúdio repetido. O código cobre a fotografia com essa arte, preservando a proporção e usando opacidade ~68% sobre a imagem. O original enviado ao Cloudflare R2 permanece inalterado. Evite aplicar qualquer marca diretamente aos arquivos originais.

## 3B. Diagnóstico de conectividade antes de publicar
No painel `/admin/` > `Venda de Fotos`, clique `VERIFICAR CONEXÕES`.
- **Supabase OK:** a chave de backend consultou `hax_events`; se falhar, confira URL, chave secret, SQL e escopo das variáveis no Netlify.
- **Cloudflare R2 OK:** uma requisição assinada foi aceita (404 é normal porque testa um arquivo inexistente); se 403, confira as chaves, ID da conta, nome do bucket e permissões.
- **Marca d'água OK:** o PNG foi publicado na branch.
- **Mercado Pago configurado:** apenas as variáveis estão presentes; isso NÃO confirma um Pix real.
- O diagnóstico do servidor **não verifica CORS**. O CORS é comprovado no navegador quando o admin envia uma foto; confira o domínio exato da branch em `AllowedOrigins`, o método `PUT` e o cabeçalho `Content-Type`.

Se a aba não carregar, o botão `Verificar conexões` também aparece na tela de erro, para diagnosticar sem precisar cadastrar eventos.
A integração GitHub não permite ver as variáveis secretas, os logs internos do Netlify ou a configuração privada do Cloudflare; estes detalhes só podem ser confirmados no respectivo painel do proprietário.

## 4. Configurar Mercado Pago — PIX REAL (não usar conta de teste)
1. Entre em https://www.mercadopago.com.br/developers/panel/applications e crie/abra uma aplicação do vendedor **real**.
2. Habilite Pix no seu cadastro, conforme os requisitos atuais do Mercado Pago. Confira a titularidade e habilitação para receber pagamentos.
3. Em Credenciais de PRODUÇÃO, copie o Access Token de produção, começando por `APP_USR-`; defina `MP_ACCESS_TOKEN` no Netlify. Não compartilhe o token e não coloque em arquivos do GitHub.
3a. O cliente informa seu próprio e-mail no formulário. O backend valida e envia esse endereço como `payer.email` ao Mercado Pago e registra o mesmo e-mail junto ao pedido e no CRM.
4. Em Webhooks da aplicação, cadastre a URL de produção `https://haxestudio.com.br/api/fotos/webhook` (ajuste para domínio canônico real); habilite notificações do tópico **Pagamentos** (payment).
5. Copie a chave secreta da assinatura do Webhook para `MP_WEBHOOK_SECRET` no Netlify.
6. Defina `PUBLIC_SITE_URL=https://haxestudio.com.br` (domínio EXATO com HTTPS e sem barra final). Este endereço é usado para o callback do Pix.
7. Não é necessário `MP_REQUIRE_LIVE`: o servidor exige `live_mode=true` no código e libera os originais apenas após consultar o Mercado Pago e verificar o pedido, o valor e o método Pix.
8. PIX é o único método implementado. Não há opção cartão, boleto ou pagamento manual no checkout.
9. A confirmação depende do provedor e rede. É OBRIGATÓRIO fazer uma compra real controlada de baixo valor antes de anunciar o sistema ao público. Não há como garantir uma integração financeira sem validar a credencial e o webhook reais. Você pode realizar a verificação com uma pequena compra real e conferir o recebimento/estorno pela sua conta, sem usar credenciais de teste.

## 5. Variáveis no Netlify
Em https://app.netlify.com > seu projeto > `Project configuration` > `Environment variables`, crie:
- `PUBLIC_SITE_URL`: `https://haxestudio.com.br` (ou domínio final canônico)
- `SUPABASE_URL`: URL do projeto
- `SUPABASE_SECRET_KEY`: `sb_secret_...` (apenas servidor)
- `R2_ACCOUNT_ID`: ID da conta Cloudflare
- `R2_BUCKET`: `hax-fotos`
- `R2_ACCESS_KEY_ID`: Access Key R2
- `R2_SECRET_ACCESS_KEY`: Secret Key R2
- `MP_ACCESS_TOKEN`: chave REAL `APP_USR-...`
- `MP_WEBHOOK_SECRET`: assinatura secreta Webhooks

Mantenha `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `SITE_URL` e demais variáveis preexistentes sem alterações. Escopo das chaves: Functions/All (incluindo branch deploy quando desejado). Não crie arquivo `.env` versionado.

## 6. Deploy da branch teste
1. GitHub: confira os arquivos da branch `teste` e mantenha `main` intacta.
2. Netlify > `Project configuration` > `Continuous deployment` > `Branches and deploy contexts`: habilite `Branch deploys` para `teste`. Se a branch não for publicada automaticamente, esta opção é necessária.
3. A URL de branch geralmente fica `https://teste--NOME-DO-SITE.netlify.app` (verifique no painel). Adicione a origem exata à política CORS do R2.
4. Para evitar Pix real em domínio de prévia indevidamente indexado, proteja a prévia com senha/Netlify Access e não divulgue.
   **Webhook em Deploy Preview:** a função usa `DEPLOY_PRIME_URL` fornecida automaticamente pelo Netlify quando `CONTEXT=deploy-preview`; em produção utiliza `PUBLIC_SITE_URL`. Confirme que o Webhook está acessível publicamente na URL da prévia. Bloquear `/api/fotos/webhook` com senha impede notificações, mas a consulta autenticada ao Mercado Pago ainda pode reconciliar o status.
5. Netlify compila com `npm run build` e publica `dist`. Os arquivos de `public/fotos/` são copiados automaticamente pelo script existente.
6. Acesse `/admin/`, faça login habitual, abra `Venda de Fotos`; crie evento em rascunho, faça upload de fotos e coloque capa. Ative `PUBLICAR`.
7. Acesse `/fotos/`, selecione fotos, informe nome, WhatsApp e e-mail, gere Pix e verifique o status. O URL do pedido pode ser copiado para retorno.
8. No admin, confirme que cliente, nome, WhatsApp, pedido, status do pagamento e relação imutável das fotos aparecem. Teste o download do original (tamanho e resolução), após Pix aprovado.
9. Após validar, abra PR da `teste` para `main`, revise e só então faça o merge. A `main` de produção não deve ser alterada antes disso.

## 6A. Checklist Mercado Pago (habilitação)
1. Entre no painel de desenvolvedores do Mercado Pago e abra uma aplicação própria da HAX Fotos.
2. Verifique se a conta de vendedor está habilitada para Pix e se a aplicação dispõe de **credenciais de produção**. Nunca copie o Access Token no chat ou no repositório.
3. Em Netlify > Site configuration > Environment variables, cadastre **MP_ACCESS_TOKEN** e **MP_WEBHOOK_SECRET** com escopo Functions (incluindo Deploy Previews). É seguro utilizar variáveis secretas; não exponha em frontend.
4. Nas configurações de Webhooks do Mercado Pago, habilite tópico **Pagamentos (payment)** e cadastre `https://haxestudio.com.br/api/fotos/webhook` para produção. Para prévias, o código envia automaticamente o endereço do Deploy Preview no campo `notification_url`.
5. O comprador informa e-mail verdadeiro junto do nome e WhatsApp. O frontend não recebe o token do Mercado Pago.
6. Em uma compra real controlada de baixo valor, verifique QR Code, Pix copia e cola, status aprovado, chegada do Webhook, dados do pedido/cliente no CRM e download de cada original comprado.
7. Reembolso, cancelamento, falha de API ou expiração não devem liberar arquivos. Confirme esse comportamento antes de abrir ao público.

## 7. Checklist de aceitação ANTES de liberar vendas
- [ ] Nenhuma credencial exposta no GitHub ou no navegador.
- [ ] O painel atual e as páginas preexistentes continuam funcionando.
- [ ] Upload em lote funciona no Chrome/Android e Safari/iPhone.
- [ ] A imagem de prévia tem marca d'água embutida e o arquivo público é menor.
- [ ] Original do R2 confere em bytes/dimensões com o arquivo enviado.
- [ ] PIX real gera QR e código copia/cola; PIX pendente NÃO libera original.
- [ ] Aprovação real libera apenas fotos pagas; pedidos não pagos permanecem bloqueados.
- [ ] Link do pedido funciona após fechar e voltar, inclusive em outro dispositivo.
- [ ] Admin consegue baixar foto comprada e contato do cliente para atendimento manual.
- [ ] Reembolsos/chargebacks e falhas temporárias de webhook não deixam acesso incorreto.
- [ ] Política de privacidade, consentimento para uso de WhatsApp e retenção de dados adequados à LGPD.
- [ ] Testar pagamento de baixo valor em produção antes de divulgar e acompanhamento de logs do Netlify.

## 8. Limitações e cuidados operacionais
- Não dá para impedir screenshot em navegadores comuns. A marca d'água da prévia é a mitigação.
- Sem chaves reais, buckets e banco criados, a plataforma **não está operacional**. Não considerar pronta para venda até validar o checklist.
- O upload gera prévia no navegador (processamento sequencial); imagens muito grandes exigem memória suficiente. JPG de 70 MB pode falhar em celulares antigos; nesses casos usar computador.
- Como toda solução real de pagamentos, pode ocorrer indisponibilidade de API; pedidos e seleção são armazenados para recuperação, mas exigem monitoramento operacional, backup e reconciliação.
- O Pix é emitido em BRL. O formulário pede nome, WhatsApp e e-mail. O endereço informado pelo comprador é utilizado em `payer.email`, sem dados fictícios.
- Para recuperação em outro dispositivo, copiar o link do pedido. O token é secreto: não publicar links de pedidos nem incluí-los em analytics, mensagens públicas ou capturas de tela.
- Nunca elimine originais do R2 já vendidos sem um plano de retenção e backup.

Documentação oficial: https://developers.cloudflare.com/r2/buckets/cors/ , https://supabase.com/docs/guides/api/creating-routes , https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix , https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

## Atualização da interface mobile (16/11/2026)
- Cabeçalho HAXFOTOS volta para `/fotos/`.
- Chamada principal: **ENCONTRE SUA FOTO!**. Botões principais sem ícones de seta.
- Busca agora filtra apenas **eventos**, não nomes ou números dos arquivos fotográficos.
- Fotografia aberta em visualizador de tela cheia com setas e gesto de deslizar; retratos preenchem a tela mobile mantendo a proporção (podendo cortar bordas laterais), fotografias horizontais ficam inteiras com fundo desfocado. Sem rolagem lateral da página.
- Checkout pede **nome, WhatsApp e e-mail**; o CRM registra esses dados para suporte a pedidos. A liberação dos originais continua condicionada à confirmação do Pix.
- Alterações somente na branch `teste-upload-preview`, sem modificar `main`.

## Publicação oficial da HAX Fotos — 16/11/2026
- Site e canônico: `https://haxestudio.com.br/`.
- Loja de fotos: `https://haxestudio.com.br/fotos/`.
- Painel de gestão: `https://haxestudio.com.br/admin/`.
- Webhook de produção: `https://haxestudio.com.br/api/fotos/webhook`.
- Variáveis Netlify: `SITE_URL` e `PUBLIC_SITE_URL` devem ser `https://haxestudio.com.br` (sem barra final).
- Branch canônica no GitHub: `main`. Ajustar a **Production branch** do projeto Netlify para `main` no painel assim que possível, pois anteriormente o projeto usava `teste`.
- O deploy deve incluir a marca d'água em `public/fotos/marca-dagua.png` e o backend Pix nas Netlify Functions.
