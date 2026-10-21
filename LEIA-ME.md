# Hax Estúdio — fotografia e filmes

Site completo para upload manual no GitHub e publicação pelo Netlify, com painel próprio em `/admin/`.

**Esta entrega contém 99 arquivos após extrair o ZIP**, contando todas as subpastas. Inclui código, fotos, logo, painel, funções, testes e instruções. A pasta `dist` é gerada automaticamente no build; ela não foi duplicada no pacote. Nenhuma alteração desta entrega foi enviada ao GitHub ou publicada no Netlify.

**Importante:** extraia o ZIP no computador e envie os arquivos e subpastas que estão dentro de `Hax-Estudio`. Enviar o arquivo `.zip` ao repositório não instala o site.

## O que está incluído

- Site em português, com layout adaptável, identidade clara em creme e verde-oliva, animações discretas, fotos otimizadas e fontes locais.
- Banner com vídeo em tela inteira, texto e botões sobre a imagem. Consulta rápida logo abaixo; alinhamento, altura, sombra, capa e textos editáveis no painel.
- Quem sou eu com retrato menor, redondo e centralizado. Tamanho, enquadramento, foto e biografia editáveis.
- Seção de depoimentos com dois relatos reais e fotos do site antigo: Leticia e Eduardo; Maria Vitoria e Jeferson. Fotos circulares pequenas, nome, descrição e texto.
- Portfólio em seis capítulos: pré-wedding, casamento em filme, fotografia de casamento, gestantes, ensaios externos e fotografia de shows. As galerias são independentes, sem lightbox ou ampliação.
- As 19 imagens enviadas, preservadas, mais 8 imagens recuperadas do site antigo da Hax: 1 pré-wedding, 3 ensaios externos e 4 shows. Também foram recuperadas as duas capas originais dos filmes de pré-wedding.
- Os cinco links do YouTube: abertura, dois filmes de casamento e dois de pré-wedding, classificados conforme o portfólio antigo. Reprodução na própria página, sem áudio inicialmente; controle de som e pausa. Apenas um filme é reproduzido por vez.
- WhatsApp `+55 44 99185-5451`, Instagram `@haxestudioo`, chamadas por pacote, por serviço e mensagem com a data selecionada. O formulário logo abaixo da abertura prepara uma mensagem com nome, data e interesse; não cria reserva nem declara disponibilidade antes de consultar a agenda.
- Treze opções editáveis: quatro de vídeo, três de fotografia de casamento, duas de gestante, três de ensaio externo e uma cobertura de shows com valor a combinar.
- Ao final de cada capítulo do portfólio, um botão abre os planos daquele serviço. No pré-wedding, abre os planos de vídeo e informa que o pré-wedding está incluído no Essencial e no Promessa; o cliente também pode trocar para Ensaios externos se quiser fotografias.
- Um único pop-up permite mudar de serviço, navegar pelos planos, consultar as condições e destacar a opção recomendada. O botão **Solicitar mais informações** abre o formulário de nome, data e plano escolhido. **Continuar no WhatsApp** prepara a mensagem com esses dados e o valor atual, incluindo a Black Friday quando aplicável. A mensagem não é enviada automaticamente.
- Novos ensaios externos: **Brisa — R$ 350:** até 1 hora, 20 fotos, uma locação e uma produção; **Horizonte — R$ 550 (recomendado):** até 1h30, 40 fotos, uma locação e duas produções; **Liberdade — R$ 750:** até 2 horas, 60 fotos, até duas locações próximas e três produções. As condições completas estão nos planos e são editáveis.
- Nova arte Black Friday com a foto original da noiva, tipografia editorial, moldura delicada e a paleta creme, oliva e champanhe. Textos, imagem, percentual e participantes continuam editáveis. O desconto de 30% no Essencial é **R$ 1.540**, calculado sobre R$ 2.200.
- Campanha Black Friday com 30% nos pacotes Romance (R$ 525), Essencial (R$ 1.540) e Promessa (R$ 2.450). Sem contagem regressiva ou prazo inventado. Pause ou defina o encerramento pelo painel. O pop-up abre após 5 segundos, uma vez por sessão, e pode ser reaberto pelo selo no banner ou pela faixa de investimento. A abertura automática aguarda o término da edição de campos e não interrompe outro diálogo.
- Painel com login, banner, quem sou eu, depoimentos, textos, pacotes, fotos, filmes, cores, promoção e Google Agenda.
- Conteúdo e fotos enviados pelo painel persistem no Netlify Blobs. Não dependem do navegador do administrador.
- Consulta Google FreeBusy no servidor: o visitante recebe somente dias livres/ocupados, sem nomes nem detalhes dos eventos.
- HTML inicial com conteúdo, descrição, títulos, dados estruturados, robots e sitemap gerado quando houver URL final.

## Publicar no GitHub e Netlify

1. Extraia `Hax-Estudio-Site.zip` e abra a pasta `Hax-Estudio`. Faça o upload **antes de executar `npm ci`**, para não selecionar a pasta `node_modules` que será criada por esse comando.
2. Abra seu repositório [haxestudioo/hax-estudio](https://github.com/haxestudioo/hax-estudio). No seletor de branches, escolha **teste**. Volte à raiz do repositório, onde aparece `package.json` — não use a pasta `nova-versao` nem `envio-site`.
3. Escolha **Add file → Upload files**. Arraste os arquivos e subpastas de dentro de `Hax-Estudio` para a área de envio. São 99 arquivos no total; todos cabem em um envio. Preserve as subpastas. Não envie o ZIP nem arraste a pasta externa `Hax-Estudio` inteira.
4. Confirme que `package.json`, `package-lock.json`, `netlify.toml`, `README.md` e `LEIA-ME.md` ficam na raiz. As pastas `public`, `src`, `netlify`, `scripts`, `tests` e `licenses` ficam ao lado deles. Clique em **Commit changes** para salvar na branch `teste`. Os arquivos com o mesmo caminho serão substituídos.
5. No seu projeto Netlify já conectado ao GitHub, confirme: repositório **haxestudioo/hax-estudio**, branch de produção **teste**, diretório base vazio, comando **npm run build**, diretório de publicação **dist** e Node.js **22**. As configurações de build e Functions também estão em `netlify.toml`.
6. O commit aciona o deploy se a publicação automática estiver ativa. Acompanhe a aba **Deploys**. Se não iniciar, use **Trigger deploy → Deploy site**. O endereço público pode ser aberto no celular ao terminar. Não é necessário alterar seu domínio antigo para testar.
7. Configure o acesso ao admin seguindo a seção abaixo. Defina também `SITE_URL` com o endereço HTTPS final, sem barra no final, disponível para **Builds e Functions** no contexto **Production**. Depois, faça um novo deploy para gerar canonical, imagem social e sitemap completos.

Se o repositório já tiver uma pasta `dist` antiga, o build apaga e recria a saída a partir do código novo. As antigas folhas `presentation.css` e `enhancements.css` foram reunidas em `public/styles.css`, e `promotion-popup.js` foi incorporado a `public/plans.js`; cópias antigas eventualmente restantes no GitHub não são usadas. O pacote não contém dependências instaladas nem arquivos duplicados de build.

Se já houver conteúdo salvo no admin, ele continua tendo prioridade sobre `src/content.json`. A migração adiciona os novos serviços uma única vez, preservando suas personalizações. Para substituir todo o conteúdo pelos dados desta entrega, faça primeiro um backup no painel, depois use **Publicação & backup → Importar backup**, selecione `src/content.json` e salve.

**Não publique apenas `dist` por arrastar e soltar** se quiser painel e agenda funcionais. Esses recursos precisam das Netlify Functions e do build completo. GitHub Pages sozinho não executa essas funções.

## Primeiro acesso ao painel

Não há senha pública nem senha padrão.

No seu computador, instale Node.js 22 ou mais recente. Abra um terminal dentro da pasta e execute:

```bash
npm ci
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

A integração está implementada, mas precisa da sua conta Google e da configuração abaixo. Faça isso após publicar no Netlify e configurar a senha do painel. Não é necessário instalar o aplicativo Google Agenda no site nem tornar a agenda pública.

1. No computador, abra [Google Agenda](https://calendar.google.com/). Ao lado de **Outras agendas**, clique em **+ → Criar nova agenda**. Use um nome como **Hax — Reservas**, fuso **America/Sao_Paulo** e crie a agenda.
2. Em [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione um projeto. Entre em **APIs e serviços → Biblioteca**, pesquise **Google Calendar API** e clique em **Ativar**.
3. Em **IAM e administrador → Contas de serviço → Criar conta de serviço**, use um nome como **hax-agenda**. Conclua sem conceder funções administrativas do projeto; o acesso necessário será dado diretamente na agenda.
4. Abra a conta de serviço, vá a **Chaves → Adicionar chave → Criar nova chave → JSON**. Guarde o arquivo em local seguro. Ele contém `client_email` e `private_key`. **Não envie esse JSON para o GitHub e não o coloque na pasta do site.**
5. Nas configurações da agenda Hax, em **Compartilhar com pessoas ou grupos específicos**, adicione o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`) e conceda **Ver apenas os níveis disponível/ocupado (ocultar detalhes)**.
6. Em **Integrar agenda**, copie o **ID da agenda**. Use o ID da agenda, não um link de incorporação.
7. Entre no painel Hax → **Google Agenda**, informe o ID, selecione o JSON e clique em **Testar e conectar**. O servidor verifica a conexão antes de salvar.
8. Marque os eventos como **Ocupado**. Um compromisso que atravesse qualquer período de um dia bloqueia aquele dia inteiro; essa é a regra para cobertura de casamentos. Eventos terminando exatamente à meia-noite não bloqueiam o dia seguinte.
9. Crie um evento futuro marcado **Ocupado** nessa agenda e confira se o dia aparece **Indisponível** no site. Confira também um dia sem eventos. Reabra a página após até um minuto, por causa do cache. No admin, mantenha **Exibir seção de agenda** ativado e salve.

A consulta é somente leitura e nunca cria reservas. A contratação continua pelo WhatsApp. Nenhum cliente precisa entrar no Google. A chave JSON fica criptografada no servidor e não é incluída no backup público de conteúdo. O site não revela títulos, participantes nem horários dos compromissos.

Se a conexão estiver ausente ou falhar, os dias aparecem como **A consultar** e o cliente é encaminhado ao WhatsApp. Nenhuma data é apresentada como livre sem uma resposta válida do Google.

Se o teste de conexão falhar, confira o ID da agenda, o e-mail que recebeu o compartilhamento, a ativação da Calendar API no projeto da conta de serviço e se o arquivo escolhido é a chave JSON. Em contas Google Workspace, o administrador da organização pode restringir compartilhamento externo ou criação de chaves; nesse caso, solicite a ele a configuração permitida. Não é necessário habilitar delegação em todo o domínio.

Referências oficiais: [compartilhar uma agenda](https://support.google.com/calendar/answer/37082?hl=pt-BR), [consulta FreeBusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) e [autenticação de contas de serviço](https://developers.google.com/identity/protocols/oauth2/service-account).

## Usar o painel

- **Visão geral:** contatos, região, nome do estúdio e informações para busca.
- **Banner principal:** altura em tela inteira ou compacta, alinhamento, intensidade da sombra, vídeo, capa, título, descrições e botões. Ative ou oculte o formulário de consulta.
- **Quem sou eu:** envie a foto, ajuste o diâmetro e a posição dentro do círculo e edite a biografia.
- **Depoimentos:** adicione nome, foto, descrição e relato. Edite o título e a apresentação da seção. Reordene por arraste, setas ou posição, oculte ou remova relatos e ative ou desative a seção. Novos relatos começam ocultos; preencha nome e texto antes de ativá-los. Sem foto, aparecem as iniciais. Uma seção sem relatos visíveis é ocultada automaticamente.
- **Textos do site:** títulos e descrições agrupados por capítulo. Cada seção pode ser expandida para editar chamadas, textos e botões. Biografia, etapas e perguntas frequentes também são editáveis.
- **Pacotes:** criar, editar, pausar ou excluir; alterar serviço, valores, itens e entregas. Marque **Recomendar este pacote** para definir a escolha inicial no pop-up. Ao recomendar um pacote, o painel desmarca os outros do mesmo serviço. **Valor a combinar** remove o preço fechado; fotografia de shows usa sempre esse formato. Pacotes pausados não aparecem nos planos. Se não houver pacotes ativos de um serviço, o visitante pode solicitar uma proposta personalizada.
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

Esta entrega é uma pasta de código para publicação manual; nenhuma nova prévia pública foi publicada. Depois do deploy pelo GitHub, abra o endereço HTTPS fornecido pelo Netlify no computador e no celular.

Para testar o projeto localmente com as funções:

```bash
npm ci
npm run build
npm run dev:netlify
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

33 testes automatizados aprovados de autenticação, conteúdo, mídia, migração e interface. Foram conferidos a troca de serviço no mesmo pop-up, navegação entre planos, escolha recomendada, formulário, nomes com caracteres especiais, data brasileira, preço promocional e mensagem do WhatsApp. Shows é tratado como orçamento a combinar, sem anunciar preço zero. A suíte preserva os testes do painel, fotos, vídeos, depoimentos e agenda.

A apresentação foi revisada em navegador no computador e em janelas de 390 e 320 pixels. Foram verificados os diálogos, as opções recomendadas, o formulário e a ausência de rolagem horizontal nesses tamanhos. Build de produção e empacotamento das cinco funções também conferidos.

A conexão com uma agenda real depende da configuração pessoal descrita acima. Os testes de calendário verificam a resposta livre/ocupado, o fuso brasileiro, eventos atravessando dias e tratamento de erros. Nenhuma mensagem foi enviada pelo WhatsApp na validação.

## Referências consultadas

Direção visual atual baseada na organização editorial de [Ale Cavaliere](https://www.alecavaliere.com/) e no portfólio anterior da [Hax Estúdio](https://www.haxestudio.com.br/). A abertura combina filme em tela inteira e apresentação sobre a imagem; os capítulos alternam imagens amplas, títulos e galerias. O material fotográfico e audiovisual é da Hax. Color grading, documentários e videoclipes não integram a página.

Documentação técnica: [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference), [Google Calendar FreeBusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query), [Google OAuth para contas de serviço](https://developers.google.com/identity/protocols/oauth2/service-account), [Netlify Functions](https://docs.netlify.com/build/functions/overview/) e [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).


## Referências dos novos ensaios externos

Os valores de R$ 350, R$ 550 e R$ 750 foram propostos para este projeto, considerando a faixa dos ensaios gestantes já definida e referências públicas consultadas em 21/10/2026. Não representam uma média estatística de mercado. O catálogo [Digitalclicks, Maringá](https://digitalclicks.catalog.kyte.site/) exibia ensaio externo por R$ 345; o [Estúdio Eliseu R.R](https://estudioeliseurr.jimdofree.com/valores-book/) apresentava opções de book externo por R$ 220, R$ 420 e R$ 800, com coberturas diferentes. Os pacotes Hax têm escopo próprio, descrito no site. Ajuste preços e condições pelo painel conforme seus custos e sua agenda.
