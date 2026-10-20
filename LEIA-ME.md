# Hax Estúdio — fotografia e filmes

Site completo para publicar no GitHub e no Netlify, com painel próprio em `/admin/`.

## O que está incluído

- Site em português, com layout adaptável, identidade clara em creme e verde-oliva, animações discretas, fotos otimizadas e fontes locais.
- Banner com vídeo em tela inteira, texto e botões sobre a imagem. Consulta rápida logo abaixo; alinhamento, altura, sombra, capa e textos editáveis no painel.
- Quem sou eu com retrato menor, redondo e centralizado. Tamanho, enquadramento, foto e biografia editáveis.
- Seção de depoimentos com dois relatos reais e fotos do site antigo: Leticia e Eduardo; Maria Vitoria e Jeferson. Fotos circulares pequenas, nome, descrição e texto.
- Portfólio em seis capítulos: pré-wedding, casamento em filme, fotografia de casamento, gestantes, ensaios externos e fotografia de shows. As galerias são independentes, sem lightbox ou ampliação.
- As 19 imagens enviadas, preservadas, mais 8 imagens recuperadas do site antigo da Hax: 1 pré-wedding, 3 ensaios externos e 4 shows. Também foram recuperadas as duas capas originais dos filmes de pré-wedding.
- Os cinco links do YouTube: abertura, dois filmes de casamento e dois de pré-wedding, classificados conforme o portfólio antigo. Reprodução na própria página, sem áudio inicialmente; controle de som e pausa. Apenas um filme é reproduzido por vez.
- WhatsApp `+55 44 99185-5451`, Instagram `@haxestudioo`, chamadas por pacote, por serviço e mensagem com a data selecionada. O formulário logo abaixo da abertura prepara uma mensagem com nome, data e interesse; não cria reserva nem declara disponibilidade antes de consultar a agenda.
- Nove pacotes editáveis. Acréscimos criados para este projeto: Eternidade (R$ 1.200), Doce Espera (R$ 350) e Florescer (R$ 550).
- Campanha Black Friday com 30% nos pacotes Romance (R$ 525), Essencial (R$ 1.540) e Promessa (R$ 2.450). Sem contagem regressiva ou prazo inventado. Pause ou defina o encerramento pelo painel. O pop-up abre após 5 segundos, uma vez por sessão, e pode ser reaberto pelo selo no banner ou pela faixa de investimento. A abertura automática aguarda o término da edição de campos e não interrompe outro diálogo.
- Painel com login, banner, quem sou eu, depoimentos, textos, pacotes, fotos, filmes, cores, promoção e Google Agenda.
- Conteúdo e fotos enviados pelo painel persistem no Netlify Blobs. Não dependem do navegador do administrador.
- Consulta Google FreeBusy no servidor: o visitante recebe somente dias livres/ocupados, sem nomes nem detalhes dos eventos.
- HTML inicial com conteúdo, descrição, títulos, dados estruturados, robots e sitemap gerado quando houver URL final.

## Publicar no GitHub e Netlify

1. Extraia o ZIP e abra a pasta `Hax-Estudio`.
2. Crie um repositório GitHub e envie **o conteúdo inteiro desta pasta**, incluindo `package.json`, `package-lock.json`, `netlify.toml`, `src`, `public`, `scripts`, `tests` e `netlify`. Não envie `node_modules`, `.env` ou chaves Google.
3. No Netlify, escolha **Add new project → Import an existing project → GitHub**, selecione o repositório e publique.
4. As configurações já estão em `netlify.toml`: **build command** `npm run build`; **publish directory** `dist`; **Node.js** 22; **functions directory** `netlify/functions`.
5. Depois do primeiro deploy, o portfólio estará acessível. Prepare as credenciais de administração conforme abaixo e faça um novo deploy.
6. Defina `SITE_URL` com o endereço final, por exemplo o endereço HTTPS fornecido pelo Netlify ou seu domínio. A variável deve estar disponível para **Builds e Functions**. Não coloque barra no final. Publique novamente para gerar canonical, imagem social e sitemap completos.

**Não publique apenas a pasta `dist` por arrastar e soltar** se quiser painel e agenda funcionais. Esses recursos precisam das Netlify Functions e do build do projeto completo. GitHub Pages sozinho exibe apenas a parte estática.

## Primeiro acesso ao painel

Não há senha pública nem senha padrão.

No seu computador, instale Node.js 22 ou mais recente. Abra um terminal dentro da pasta e execute:

```bash
npm install
npm run setup-admin
```

O comando pede uma senha com no mínimo 12 caracteres, sem mostrá-la durante a digitação. Ao concluir, ele gera dois valores:

| Variável | Uso | Escopo no Netlify |
| --- | --- | --- |
| `ADMIN_PASSWORD_HASH` | Verificação da senha por scrypt | Functions |
| `ADMIN_SESSION_SECRET` | Assinatura da sessão e criptografia da conexão Google | Functions |
| `SITE_URL` | Endereço final e metadados de pesquisa | Builds e Functions |

Em **Project configuration → Environment variables**, cadastre os dois valores gerados, marque como secretos e disponibilize no contexto **Production**. Faça um novo deploy. Entre em `https://SEU-ENDERECO/admin/` com a senha que você escolheu.

- A sessão expira em 8 horas. Cookie HttpOnly, Secure e SameSite Strict.
- O servidor valida a autenticação e a origem das alterações.
- O login tem limite de requisições por IP configurado no Netlify.
- Não compartilhe os valores gerados nem os coloque no repositório.
- Para trocar a senha, execute o comando novamente e atualize as variáveis. Se trocar `ADMIN_SESSION_SECRET`, reconecte a agenda, pois a conexão existente foi criptografada com a chave anterior.

## Conectar Google Agenda

A agenda do proprietário ainda precisa ser conectada. Nenhuma conta Google foi acessada durante a criação do site.

1. No Google Agenda, crie uma agenda exclusiva, como **Hax — Reservas**, com fuso **America/Sao_Paulo**.
2. Em [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e ative **Google Calendar API**.
3. Em **IAM e administrador → Contas de serviço**, crie uma conta de serviço. Não é preciso conceder funções administrativas do projeto.
4. Abra a conta de serviço, vá a **Chaves → Adicionar chave → Criar nova chave → JSON**. Guarde o arquivo em local seguro.
5. Nas configurações da agenda Hax, em **Compartilhar com pessoas ou grupos específicos**, adicione o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`) e conceda **Ver apenas os níveis disponível/ocupado (ocultar detalhes)**.
6. Em **Integrar agenda**, copie o **ID da agenda**. Use o ID da agenda, não um link de incorporação.
7. Entre no painel Hax → **Google Agenda**, informe o ID, selecione o JSON e clique em **Testar e conectar**. O servidor verifica a conexão antes de salvar.
8. Marque os eventos como **Ocupado**. Um compromisso que atravesse qualquer período de um dia bloqueia aquele dia inteiro; essa é a regra para cobertura de casamentos. Eventos terminando exatamente à meia-noite não bloqueiam o dia seguinte.
9. Confira no site um dia com evento e outro sem evento. A atualização pode levar até um minuto por causa do cache.

A consulta é somente leitura e nunca cria reservas. A contratação continua pelo WhatsApp. Nenhum cliente precisa entrar no Google. A chave JSON fica criptografada no servidor e não é incluída no backup público de conteúdo. O site não revela títulos, participantes nem horários dos compromissos.

Se a conexão estiver ausente ou falhar, os dias aparecem como **A consultar** e o cliente é encaminhado ao WhatsApp. Nenhuma data é apresentada como livre sem uma resposta válida do Google.

## Usar o painel

- **Visão geral:** contatos, região, nome do estúdio e informações para busca.
- **Banner principal:** altura em tela inteira ou compacta, alinhamento, intensidade da sombra, vídeo, capa, título, descrições e botões. Ative ou oculte o formulário de consulta.
- **Quem sou eu:** envie a foto, ajuste o diâmetro e a posição dentro do círculo e edite a biografia.
- **Depoimentos:** adicione nome, foto, descrição e relato. Edite o título e a apresentação da seção. Reordene por arraste, setas ou posição, oculte ou remova relatos e ative ou desative a seção. Novos relatos começam ocultos; preencha nome e texto antes de ativá-los. Sem foto, aparecem as iniciais. Uma seção sem relatos visíveis é ocultada automaticamente.
- **Textos do site:** títulos e descrições agrupados por capítulo. Cada seção pode ser expandida para editar chamadas, textos e botões. Biografia, etapas e perguntas frequentes também são editáveis.
- **Pacotes:** criar, editar, pausar ou excluir; alterar valores, itens, entregas e destaque.
- **Fotografias:** clique em **Adicionar fotos** para enviar JPG/PNG/WebP. Edite as descrições, escolha fotografia de casamento, pré-wedding, gestantes, ensaios externos ou shows, oculte ou remova da galeria. Reordene arrastando pelo ícone de pontos, usando as setas ou escolhendo a posição — inclusive no celular. O painel converte para WebP e limita o lado maior a 1.800 pixels.
- **Filmes:** clique em **Adicionar vídeo**, cole o link do YouTube e marque **Visível no site**. Escolha o capítulo **Casamento** ou **Pré-wedding**, edite título e chamada, reorganize por arraste, setas ou posição e remova quando desejar. Cada filme, incluindo o da abertura, aceita uma miniatura enviada do computador, uma foto da galeria ou a capa do próprio YouTube. A miniatura aparece enquanto o vídeo carrega e quando está pausado.
- **Cores & identidade:** ajustar a paleta de seis cores. Seu retrato é editado em **Quem sou eu**. A logo original está aplicada no cabeçalho, rodapé, pop-up e painel. O site usa creme claro, verde-oliva e detalhes em champanhe, suavizando a paleta do criativo enviado.
- **Black Friday:** ativar/pausar, definir percentual, pacotes, textos, imagem e data final opcional. Configure a abertura automática, o tempo de espera (0–120 segundos), a frequência e o selo no banner. Edite a mensagem do WhatsApp usando `{desconto}` e `{pacotes}` para os valores automáticos. Use **Visualizar pop-up** para conferir a oferta no painel antes de salvar. As cores seguem a paleta do site.
- **Google Agenda:** conectar ou desconectar a agenda.
- **Publicação & backup:** exportar/importar conteúdo.

A primeira foto visível de pré-wedding, gestantes e shows é a capa da respectiva seção. Reordene ou pause fotos para trocar o banner. Em fotografia de casamento e ensaios externos, a ordem define a composição da galeria. As fotos de cada capítulo permanecem separadas no site.

Clique em **Salvar alterações** depois de editar. Se outra sessão tiver salvo o conteúdo ao mesmo tempo, o painel pede recarregamento em vez de sobrescrever silenciosamente. Exporte primeiro se precisar preservar suas alterações.

Excluir uma foto remove sua exibição do portfólio, mas não apaga o arquivo físico do Blobs nem fotos utilizadas como capa em outra seção. Para remoção completa de um arquivo, retire todas as referências e exclua a chave correspondente em **Data & Storage → Blobs** do Netlify. Os originais deste projeto também podem ser removidos de `public/assets` quando não forem mais utilizados.

## SEO e conteúdo

O foco inicial é fotografia/filmagem de casamento em Ribeirão Preto e Maringá, com capítulos específicos para pré-wedding, gestantes, ensaios externos e shows. Não foram inventadas avaliações, premiações ou números de clientes.

Após alterar textos, preços e SEO no painel:

1. Exporte o conteúdo JSON.
2. Substitua `src/content.json` pelo arquivo exportado no GitHub.
3. Deixe o Netlify gerar o novo build. Isso atualiza também o HTML inicial e os metadados usados por robôs e prévias de redes sociais.

O conteúdo salvo pelo painel tem prioridade para visitantes. O arquivo do repositório mantém uma cópia de segurança e abastece o HTML inicial. Ao usar imagens novas, os caminhos `/api/media/...` referem-se ao armazenamento **do mesmo projeto Netlify**; para migrar de projeto, transfira também essas imagens.

Com o domínio definido, cadastre-o no Google Search Console e envie `/sitemap.xml`. O código oferece a base de SEO; a indexação e a posição no Google dependem também do domínio, do conteúdo, da concorrência e do tempo.

## Visualização e execução local

A prévia privada entregue separadamente permite navegar pelo site e explorar o painel em modo demonstração. Nessa prévia, as edições e imagens enviadas ficam no armazenamento local do navegador (IndexedDB); a conexão real com Google e o login de produção funcionam na versão Netlify após a configuração. Para visualizar as edições da demonstração, abra o site no mesmo navegador depois de salvar.

Para testar o projeto localmente com as funções:

```bash
npm install
npm run build
npm run dev
```

O último comando usa o Netlify CLI, que pode pedir autenticação para vincular o projeto. Configure as mesmas variáveis no ambiente de desenvolvimento. Dados de testes e deploy previews usam armazenamento separado da produção.

Não abra `index.html` por duplo clique: os caminhos absolutos, módulos e funções precisam de servidor HTTP.

## Observações de uso

- Os vídeos precisam estar públicos ou não listados, com incorporação habilitada no YouTube. Autoplay sem som é solicitado; bloqueios de navegador, economia de bateria/dados, restrição de direitos ou de incorporação podem exigir um toque ou impedir a reprodução.
- Fotos sem lightbox, sem zoom de galeria e sem botão de download; arraste e menu de contexto são desativados nelas. Isso dificulta a cópia casual, mas não impede capturas de tela nem extração de imagens exibidas. O zoom de acessibilidade do navegador não foi desabilitado.
- A interface pública não contém mensagens de configuração. Informações administrativas ficam neste guia e no painel.
- O texto sobre acesso a uma conta para Storymaker foi preservado como combinação prévia; o site não coleta senhas de redes sociais.
- A infraestrutura segue a franquia e os limites do plano Netlify/Google utilizado. Nenhum plano pago foi contratado na criação.
- Mantenha cópias locais das fotografias originais e exporte o conteúdo regularmente.

## Validação realizada

31 testes aprovados, incluindo edição persistida de banner e retrato, criação, edição, reordenação e exclusão de depoimentos, upload durante reordenação, migração de conteúdo anterior e abertura automática/manual da campanha. Testes automatizados de autenticação, cookie, expiração, criptografia, validação de conteúdo, cálculo de descontos, exclusão de pacotes pausados, datas no fuso brasileiro, eventos atravessando dias, resposta de erro Google e integridade dos arquivos. Testes de interação do menu, galeria, abas de pacotes, promoção, seleção de datas, edição e gravação do painel também foram executados em DOM simulado. Build estático, sintaxe dos módulos e empacotamento das cinco funções conferidos.

A atualização de identidade também inclui testes dos controles de adição, ordenação e remoção de fotos e vídeos, envio de miniaturas, persistência da paleta e destaque dos pacotes por ponteiro e teclado. A organização em capítulos, a separação dos filmes, as galerias independentes, a migração de conteúdo anterior e o formulário de orçamento foram verificados em DOM simulado. São 27 testes automatizados. As animações respeitam a preferência de redução de movimento do dispositivo.

A conta Google e um ambiente Netlify de produção não foram conectados, portanto o fluxo com dados reais ainda precisa ser conferido após a configuração. Não houve verificação visual em navegador nesta execução; a prévia permite revisar o resultado no computador e no celular antes da publicação pública.

## Referências consultadas

Direção visual atual baseada na organização editorial de [Ale Cavaliere](https://www.alecavaliere.com/) e no portfólio anterior da [Hax Estúdio](https://www.haxestudio.com.br/). A abertura combina filme e apresentação lado a lado; os capítulos alternam imagens amplas, títulos e galerias. O material fotográfico e audiovisual é da Hax. Color grading, documentários e videoclipes não integram a página.

Documentação técnica: [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference), [Google Calendar FreeBusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query), [Google OAuth para contas de serviço](https://developers.google.com/identity/protocols/oauth2/service-account), [Netlify Functions](https://docs.netlify.com/build/functions/overview/) e [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).
