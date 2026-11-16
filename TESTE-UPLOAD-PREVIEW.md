# Prévia gratuita para testar upload da HAX Fotos

Este branch `teste-upload-preview` foi criado **a partir da branch `teste`** apenas para obter um Deploy Preview no Netlify. O PR correspondente deve ter como **base a branch `teste`**, que atualmente está configurada no Netlify como produção.

## Créditos
- Netlify: Deploy Previews custam **zero créditos de publicação** na tabela atual de cobrança.
- Netlify ainda mede créditos para requisições, banda e processamento de Functions. Evite testes de carga.
- **Não mesclar este PR** na `teste` nem publicar na `main` até concluir a validação.
- Os builds da própria `teste` permanecem ignorados pela regra no `netlify.toml`, evitando novos deploys de produção em sequência.

## Como testar
1. Abra a URL exata do Deploy Preview, com formato `https://deploy-preview-N--hasestudio.netlify.app/admin/`.
2. Entre com o mesmo login administrativo, abra **Venda de Fotos** e clique **Verificar conexões**.
3. O bucket **hax-fotos** e o banco Supabase devem estar conectados; o CORS deve autorizar a origem **exata** do preview.
4. Antes de enviar fotos, confirme que existe `/fotos/marca-dagua.png` no preview. O upload é interrompido intencionalmente caso a marca fornecida pelo estúdio não esteja publicada.
5. Crie um evento **rascunho** com nome facilmente identificável. Envie duas fotos JPG (de tamanhos diferentes) e confira os arquivos em R2: `originais/` e `previas/`.
6. Verifique que o original tem a **mesma resolução e bytes** do arquivo enviado; somente a prévia deve conter marca d'água.
7. Deixe o evento como rascunho. Não gere Pix real durante a verificação de upload.
8. Quando terminar, mantenha o PR aberto apenas durante os testes; o preview deixa de ser necessário após integrar a funcionalidade com segurança.

## Configuração Netlify
O Netlify atual está publicando a branch `teste` com `context: production`. Isso causa o custo de produção por deploy. Este PR cria um **Deploy Preview** sem mudar o projeto de produção ou o GitHub `main`.

A correção permanente recomendada é trocar a *Production branch* para `main`, liberar `teste` como *Branch deploy*, e então revisar/remover a regra `ignore` do `netlify.toml`. Esta operação precisa ser feita no painel do Netlify, pois a integração disponível não tem controle da branch de produção.

## Configuração de pagamento
Por enquanto, testar **somente upload, marca d'água, álbum e visualização**. A validação Pix requer credenciais e webhook próprios de produção, fora do escopo da prévia de upload.
