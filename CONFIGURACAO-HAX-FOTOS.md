# HAX Fotos — configuração de produção (branch teste
Atualizado em 16/11/2026. A loja é uma INCLUSÃO: site e /admin/ existentes permanecem ativos.

## 1. O que está implementado
- Loja separada em `/fotos/`, responsiva, tema esportivo escuro, navegação e entrada animada.
- Eventos e galerias, zoom de prévia, seleção múltipla, sacola persistente por evento no navegador.
- Página de checkout com nome, WhatsApp e e-mail (e-mail é exigido pelo Mercado Pago para Pix).
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
      "https://www.haxestudio.com.br",
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

## 4. Configurar Mercado Pago — PIX REAL (não usar conta de teste)
1. Entre em https://www.mercadopago.com.br/developers/panel/applications e crie/abra uma aplicação do vendedor **real**.
2. Habilite Pix no seu cadastro, conforme os requisitos atuais do Mercado Pago. Confira a titularidade e habilitação para receber pagamentos.
3. Em Credenciais de PRODUÇÃO, copie o Access Token de produção, começando por `APP_USR-`; defina `MP_ACCESS_TOKEN` no Netlify. Não compartilhe o token e não coloque em arquivos do GitHub.
4. Em Webhooks da aplicação, cadastre a URL de produção `https://www.haxestudio.com.br/api/fotos/webhook` (ajuste para domínio canônico real); habilite notificações do tópico **Pagamentos** (payment).
5. Copie a chave secreta da assinatura do Webhook para `MP_WEBHOOK_SECRET` no Netlify.
6. Defina `PUBLIC_SITE_URL=https://www.haxestudio.com.br` (domínio EXATO com HTTPS e sem barra final). Este endereço é usado para o callback do Pix.
7. Defina `MP_REQUIRE_LIVE=true`. O servidor rejeita confirmação com `live_mode=false` e não libera originais enquanto o pagamento não for confirmado como aprovado pelo Mercado Pago.
8. PIX é o único método implementado. Não há opção cartão, boleto ou pagamento manual no checkout.
9. A confirmação depende do provedor e rede. É OBRIGATÓRIO fazer uma compra real controlada de baixo valor antes de anunciar o sistema ao público. Não há como garantir uma integração financeira sem validar a credencial e o webhook reais. Você pode realizar a verificação com uma pequena compra real e conferir o recebimento/estorno pela sua conta, sem usar credenciais de teste.

## 5. Variáveis no Netlify
Em https://app.netlify.com > seu projeto > `Project configuration` > `Environment variables`, crie:
- `PUBLIC_SITE_URL`: `https://www.haxestudio.com.br` (ou domínio final canônico)
- `SUPABASE_URL`: URL do projeto
- `SUPABASE_SECRET_KEY`: `sb_secret_...` (apenas servidor)
- `R2_ACCOUNT_ID`: ID da conta Cloudflare
- `R2_BUCKET`: `hax-fotos`
- `R2_ACCESS_KEY_ID`: Access Key R2
- `R2_SECRET_ACCESS_KEY`: Secret Key R2
- `MP_ACCESS_TOKEN`: chave REAL `APP_USR-...`
- `MP_WEBHOOK_SECRET`: assinatura secreta Webhooks
- `MP_REQUIRE_LIVE`: `true`

Mantenha `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `SITE_URL` e demais variáveis preexistentes sem alterações. Escopo das chaves: Functions/All (incluindo branch deploy quando desejado). Não crie arquivo `.env` versionado.

## 6. Deploy da branch teste
1. GitHub: confira os arquivos da branch `teste` e mantenha `main` intacta.
2. Netlify > `Project configuration` > `Continuous deployment` > `Branches and deploy contexts`: habilite `Branch deploys` para `teste`. Se a branch não for publicada automaticamente, esta opção é necessária.
3. A URL de branch geralmente fica `https://teste--NOME-DO-SITE.netlify.app` (verifique no painel). Adicione a origem exata à política CORS do R2.
4. Para evitar Pix real em domínio de prévia indevidamente indexado, proteja a prévia com senha/Netlify Access e não divulgue.
   **Webhook em branch:** configure `PUBLIC_SITE_URL` com escopo de deploy `branch:teste` e valor da URL HTTPS exata da branch. Mantenha a variável de produção com o domínio principal. O Pix criado pela branch envia seu webhook à própria branch. Se houver proteção por senha, crie uma exceção para `/api/fotos/webhook` sem tornar o painel público, caso contrário as notificações serão bloqueadas; a consulta ao Mercado Pago ainda pode reconciliar o status.
5. Netlify compila com `npm run build` e publica `dist`. Os arquivos de `public/fotos/` são copiados automaticamente pelo script existente.
6. Acesse `/admin/`, faça login habitual, abra `Venda de Fotos`; crie evento em rascunho, faça upload de fotos e coloque capa. Ative `PUBLICAR`.
7. Acesse `/fotos/`, selecione fotos, informe nome, WhatsApp, e-mail, gere Pix e verifique status. O URL do pedido pode ser copiado para retorno.
8. No admin, confirme que cliente, nome, WhatsApp, pedido, status do pagamento e relação imutável das fotos aparecem. Teste o download do original (tamanho e resolução), após Pix aprovado.
9. Após validar, abra PR da `teste` para `main`, revise e só então faça o merge. A `main` de produção não deve ser alterada antes disso.

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
- O Pix é emitido em BRL, e o site exige e-mail porque a API Pix do Mercado Pago solicita `payer.email`.
- Para recuperação em outro dispositivo, copiar o link do pedido. O token é secreto: não publicar links de pedidos nem incluí-los em analytics, mensagens públicas ou capturas de tela.
- Nunca elimine originais do R2 já vendidos sem um plano de retenção e backup.

Documentação oficial: https://developers.cloudflare.com/r2/buckets/cors/ , https://supabase.com/docs/guides/api/creating-routes , https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix , https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
