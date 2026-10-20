# Envio da nova versão do Hax Estúdio

Agora envie apenas o arquivo Hax-Estudio-Site.zip original. Não é necessário extrair nem selecionar as pastas.

## Passos

1. Abra esta pasta nova-versao na branch envio-site.
2. Clique em Add file > Upload files.
3. Arraste somente Hax-Estudio-Site.zip para a página.
4. Use a mensagem Enviar ZIP do site. Não inclua [skip ci], pois a importação automática precisa executar.
5. Confirme o envio diretamente na branch envio-site.
6. Avise na conversa que o ZIP foi enviado.

A automação Importar ZIP do Hax Estudio extrairá os arquivos para nova-versao/conteudo e registrará o resultado em resultado-importacao.json. Ela atua somente nesta branch temporária. A integração final na branch teste será feita após a conferência dos arquivos.

O ZIP original tem aproximadamente 13 MB, abaixo do limite de 25 MiB por arquivo no envio pelo navegador. Ao enviar o ZIP fechado, o GitHub recebe apenas um arquivo.
