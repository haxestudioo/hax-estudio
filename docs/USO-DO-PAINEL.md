# Operação do site e do CRM

Entre em `/admin/` com o usuário autorizado no Supabase. As alterações são salvas no banco ao clicar em **Salvar alterações**. Atualize a página pública para conferir o resultado. O botão **Atualizar** no cabeçalho do painel busca os dados mais recentes.

## Filmes e capas

Em **Filmes e capas**, escolha **Adicionar filme** ou edite um dos cinco filmes iniciais.

- **Título:** nome do casal ou nome do projeto.
- **Endereço:** identificador sem acentos, espaços ou caracteres especiais; por exemplo `ana-e-pedro`. Ele forma a página `/filmes/ana-e-pedro`. Evite mudar o endereço depois de divulgá-lo.
- **Categoria:** Casamento ou Pré-wedding.
- **Link do vídeo:** YouTube, Vimeo com reprodução incorporada habilitada, ou endereço HTTPS direto de MP4/WebM. Links de pastas ou páginas comuns do Google Drive não são links diretos de vídeo.
- **Capa:** envie uma imagem ou informe uma URL HTTPS. O limite de upload é 8 MB, nos formatos JPEG, PNG, WebP e AVIF. Prefira imagens horizontais próximas de 16:9 e com tamanho otimizado.
- **Prévia silenciosa:** opcional; aceita um MP4/WebM direto e toca ao passar o mouse, em computadores. Deixe vazio se não tiver uma versão curta preparada para isso.
- **Filme em destaque:** prioriza o filme na listagem. Entre filmes com a mesma prioridade, vale o número de ordem, do menor para o maior. O primeiro recebe a maior área visual.
- **Publicar no site:** desmarque para retirar o filme da listagem pública sem excluí-lo do banco.

O upload de uma capa preenche o endereço no formulário. **Salve o formulário para aplicar a imagem ao filme.** Arquivos enviados e depois substituídos não são apagados automaticamente do Storage; isso evita quebrar imagens que ainda estejam em uso em outro lugar. A limpeza pode ser feita no Storage após conferir as referências.

Vídeos permanecem hospedados no YouTube, Vimeo ou em um serviço de mídia escolhido por você. O painel envia imagens ao Supabase, não arquivos de filmes. Uma restrição de incorporação definida no provedor do vídeo também afeta a reprodução no site.

## Conteúdo e identidade visual

**Conteúdo → Textos e contato** permite editar títulos e textos das seções, as três etapas da experiência, a apresentação, o WhatsApp, links sociais, os textos de contato e os campos de busca. Uma quebra de linha nos títulos divide a frase e coloca a segunda parte em destaque.

A abertura começa com Dani & Jonas. Você pode trocar a capa e o vídeo por um link YouTube ou um MP4/WebM direto. Para uma abertura com linguagem de trailer, prepare uma montagem curta e silenciosa com suas próprias cenas e informe a URL do arquivo. A página tem botão para pausar o fundo. No celular e com movimento reduzido, preserva a capa e o botão para assistir com som.

As abas **Coleções**, **Depoimentos** e **Dúvidas frequentes** têm cadastro, edição, ordem e controle de publicação. Se não houver registros publicados, a seção correspondente fica oculta. Os preços de Storymaker, Highlights e Básico vieram do modelo anterior e estão em rascunho. Confira valores, prazos e itens antes de publicar. Um preço vazio mostra a coleção sem valor; zero mostra R$ 0.

Em **Cores e fontes**, escolha as cores principais e uma das fontes disponíveis. A prévia acompanha as alterações; o site só muda ao salvar. Há controle da escala dos títulos e tamanho do corpo de texto. A escolha afeta o site público, enquanto o painel mantém sua própria aparência.

## Receber e organizar leads

Os formulários chegam automaticamente à primeira etapa do tipo **Em andamento**, conforme a ordem configurada no funil. Cada contato inclui nome, telefone, data, cidade, mensagem, data de cadastro e autorização de contato. Se o visitante chegou com parâmetros UTM, a origem da campanha também é registrada.

Em **Todos os leads** ou **Funil de vendas**, use **Adicionar lead** para registrar contatos que vieram por indicação, mensagem ou atendimento pessoal. Preencha a origem, por exemplo `indicação` ou `WhatsApp`. Marque a autorização de contato apenas quando ela tiver sido obtida.

Para mover um contato, arraste o cartão até outra coluna ou use seu seletor de etapa. O seletor também funciona no celular e pelo teclado. Abrir o cartão permite editar:

| Informação             | Uso no atendimento                                             |
| ---------------------- | -------------------------------------------------------------- |
| Etapa                  | Situação comercial atual da conversa                           |
| Temperatura            | Frio: conhecendo; morno: avaliando; quente: próximo de decidir |
| Pontuação de maturação | Sua avaliação manual, de 0 a 100                               |
| Orçamento informado    | Quanto o casal informou que pretende investir                  |
| Valor da proposta      | Quanto está sendo negociado                                    |
| Próxima ação e prazo   | Retorno, reunião, envio de proposta ou outro passo             |
| Último contato         | Quando a conversa foi retomada pela última vez                 |
| Motivo de não avançar  | Registro para compreender perdas                               |
| Observações            | Preferências e detalhes relevantes sobre o casamento           |

Temperatura e pontuação são preenchidas por você. Elas não são inferidas por IA. A data da próxima ação é exibida no fuso do navegador de quem usa o painel. Os prazos vencidos aparecem na visão geral; esta versão não envia notificações automáticas por e-mail ou WhatsApp.

O histórico registra o cadastro, mudanças de etapa e anotações que você adicionar. As mudanças feitas pelo painel também registram o administrador responsável no banco. Anotações históricas não são reescritas pelo formulário de edição do lead.

Se duas sessões editarem o mesmo contato, o servidor recusa a gravação baseada numa versão antiga. Use **Atualizar**, reabra o contato e confira os dados antes de salvar novamente.

### Personalizar o funil

Em **Funil de vendas → Editar etapas**, você pode criar etapas e alterar nome, cor, ordem, probabilidade e tipo.

- **Em andamento:** conversa comercial aberta.
- **Ganho:** contratos fechados.
- **Perdido:** contatos que não avançaram.

A probabilidade de cada etapa é usada na previsão ponderada: valor da proposta × percentual da etapa. Isso é um indicador de gestão, não uma previsão automática de vendas. O sistema preserva pelo menos uma etapa aberta para receber novos formulários. Uma etapa vinculada a contatos não pode ser excluída; primeiro mova esses contatos para outra etapa.

Marcar um lead como ganho não cria contrato, cobrança ou evento no Google. Depois de fechar, registre a data na agenda dedicada ou em **Agenda → Bloquear data**.

### Busca, arquivo e exportação

A busca considera nome, telefone, e-mail, cidade e local. É possível filtrar pela temperatura e mostrar contatos arquivados. Arquivar mantém o registro; excluir remove o contato e seu histórico após a confirmação no painel.

Os contatos são carregados em lotes de 200. Quando houver mais registros, use **Carregar mais contatos**. Busca, indicadores e exportação consideram os registros carregados; carregue todos os lotes para um relatório completo. O CSV inclui os contatos do filtro atual, com proteção contra interpretação de texto como fórmula em planilhas.

## Agenda e chatbot

**Agenda** permite testar a resposta do Google, controlar a consulta pública, definir até 24 meses de navegação e criar bloqueios manuais. A agenda dedicada é a origem dos eventos; detalhes privados não aparecem no site. Para conexão e uso de eventos de dia inteiro, siga [o guia de instalação](INSTALACAO.md#4-integrar-o-google-agenda).

**Chatbot & orçamento** permite ativar a IA, alterar as orientações, escolher o modelo, ajustar o teto, as tarifas e o câmbio. O consumo mostrado é uma estimativa baseada nos tokens e em reservas de chamadas. Clique em **Atualizar** para buscar o consumo recente. A ausência de uma chave, o limite insuficiente ou uma falha de resposta encaminham a conversa ao WhatsApp. Veja [o guia do chatbot](CHATBOT.md).

## Preservar o trabalho

O GitHub guarda o código e as mídias iniciais. Leads, conteúdo editado, configuração e capas enviadas ficam no Supabase. Mantenha backups do banco e do Storage conforme o plano e o processo da sua conta. Exportar CSV ajuda a consultar contatos fora do CRM, mas não substitui o backup completo de configurações e históricos.

Um novo deploy do mesmo código mantém os dados salvos no Supabase. Alterar arquivos de conteúdo inicial não modifica registros que já foram editados no painel; para esses registros, use o painel ou uma migração de atualização específica.
