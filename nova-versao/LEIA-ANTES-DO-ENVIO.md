# Envio da nova versão do Hax Estúdio

Esta pasta recebe os arquivos extraídos de Hax-Estudio-Site.zip, versão de 19/10/2026. A integração final será feita na branch teste após a conferência dos arquivos.

## Como enviar pelo navegador

1. Baixe e extraia Hax-Estudio-Site.zip.
2. Abra a pasta Hax-Estudio extraída.
3. Nesta pasta nova-versao do GitHub, clique em Add file > Upload files.
4. Primeiro, arraste a pasta public inteira. Preserve as subpastas. Confirme o envio diretamente na branch envio-site.
5. Volte à mesma pasta nova-versao e envie as outras pastas e os arquivos que estão dentro de Hax-Estudio, exceto public (já enviada) e dist (será gerada na publicação).
6. Use a mensagem Enviar nova versão [skip ci] em cada envio. O GitHub aceita até 100 arquivos por envio; divida em lotes menores mantendo as subpastas caso necessário.

Não envie o ZIP fechado, credenciais, senhas, arquivos .env pessoais, node_modules ou .netlify. O arquivo .env.example do pacote pode ser enviado.

Após o envio, avise na conversa para que os arquivos sejam conferidos e a publicação continue. Esta pasta é temporária e não faz parte do site final.
