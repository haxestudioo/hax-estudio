# Correção de reprodução automática · versão 1.1.1

## Onde estava a falha

Na versão 1.1, `dist/assets/cinema.js` aguardava o script externo da API do YouTube antes de criar os players. Os iframes eram configurados com `autoplay=0`; o play dependia do evento `onReady`, e o vídeo só aparecia após outro evento da API. Se essa comunicação não concluísse, a capa permanecia estática. Essa dependência foi introduzida na atualização da abertura. Também havia uma condição que impedia o autoplay quando o sistema indicava movimento reduzido.

Esta correção volta ao método da primeira versão: iframe direto com `autoplay=1`, `mute=1`, `playsinline=1` e permissão `allow="autoplay"`. O primeiro começa ao abrir a página; o segundo começa a carregar pouco antes da transição. A exibição não espera eventos da API externa. Os efeitos de rolagem, a galeria, a logo e o CRM são preservados.

## Como aplicar

1. Extraia o ZIP e substitua os arquivos do repositório pelos da pasta `hax-casamentos`. O ZIP contém o projeto completo.
2. Faça o commit na branch conectada ao Netlify e aguarde o deploy. Se estiver usando a branch `teste`, confira o endereço dessa branch.
3. Recarregue a página com **Ctrl + Shift + R**. Os arquivos principais também receberam identificação de versão para renovar o cache.

**Não é necessário executar SQL, recriar o Supabase ou alterar credenciais.** Se a versão 1.1 e o SQL 003 já estavam instalados, esta correção depende somente dos arquivos. O SQL 003 continua incluído para quem ainda está atualizando a versão 1.0.

## Reprodução e verificação

- Os dois filmes solicitam autoplay sem som. “Assistir com som” abre o filme com áudio por clique.
- O botão de pausa e a saída da seção interrompem a prévia. Para funcionar mesmo sem API, o iframe do YouTube é removido; ao voltar, a prévia inicia novamente. MP4/WebM usa pausa nativa e mantém a posição.
- Movimento reduzido simplifica animações e transições; não desliga mais o autoplay.
- Restrições explícitas do navegador, extensões ou bloqueio do YouTube ainda podem impedir a reprodução. O site não consegue sobrepor essas permissões.

Foram aprovados seis testes locais do controlador: início imediato sem API, carregamento do segundo filme antes da transição, exibição sem evento PLAYING, interrupção de mídia e descarte de eventos atrasados, pausa manual/aba oculta e autoplay com movimento reduzido. Eles simulam os elementos e eventos, sem acessar o YouTube. Não houve teste da reprodução real no navegador do visitante; os testes anteriores de CRM e banco não comprovavam esse comportamento.

Referência: [parâmetros oficiais de incorporação do YouTube](https://developers.google.com/youtube/player_parameters).
