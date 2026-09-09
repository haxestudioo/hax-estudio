# Chatbot: ativação, consumo e orçamento

O atendimento segue o comportamento solicitado para o projeto “Mães que Curam”: uma chave de ativação no painel e continuidade pelo WhatsApp quando a IA está desativada ou indisponível. Esta implementação usa um backend próprio com a OpenAI Responses API; não depende do código ou do banco daquele outro site.

## Configuração inicial

| Parâmetro            | Valor inicial                                         |
| -------------------- | ----------------------------------------------------- |
| Ativação             | Desativado                                            |
| Modelo               | `gpt-4.1-mini`                                        |
| Teto mensal estimado | R$ 10                                                 |
| Saída máxima         | 400 tokens por resposta                               |
| Tarifa de entrada    | US$ 0,40 por milhão de tokens                         |
| Tarifa de saída      | US$ 1,60 por milhão de tokens                         |
| Câmbio para cálculo  | R$ 6 por US$ 1, editável e sem atualização automática |

O painel também aceita `gpt-4o-mini` e `gpt-4.1-nano`, com valores iniciais próprios. Confira as tarifas na [tabela oficial de preços](https://developers.openai.com/api/docs/pricing) antes de ativar e quando alterar o modelo. Os valores cadastrados são parâmetros locais de estimativa; o painel não consulta a fatura, o saldo ou os créditos da OpenAI. Não há cobrança da API enquanto o chatbot permanece desligado.

As chaves ficam nas variáveis de ambiente do Netlify. Nunca coloque a chave em textos do painel, código HTML ou campos de configuração pública. A conexão usa a [Responses API](https://developers.openai.com/api/docs/guides/text) com `store: false`, sem ferramentas de escrita ou acesso ao CRM.

## Como o teto é aplicado

1. A função confere a ativação, a presença da chave, os parâmetros do modelo e os limites de solicitações.
2. Monta o contexto com apresentação da empresa, filmes, coleções e dúvidas **publicadas**. Não inclui leads, anotações privadas ou eventos da agenda.
3. Calcula uma reserva conservadora usando o tamanho em bytes do contexto e das mensagens, uma margem adicional e o máximo de tokens de saída.
4. A função SQL `reserve_chat_budget` confere, numa transação com bloqueio, se **gasto estimado + reservas pendentes + nova reserva** cabe no teto do mês.
5. Somente uma reserva aprovada permite chamar a OpenAI.
6. Ao receber a resposta, o servidor usa os tokens informados para calcular o custo estimado e substituir a reserva pelo lançamento correspondente.

O controle no banco coordena chamadas simultâneas deste site. O mês segue `America/Sao_Paulo` e é renovado automaticamente. Diminuir o teto abaixo do consumo já registrado interrompe novas reservas; não remove o consumo anterior. Desativar a IA impede novas reservas assim que a configuração é consultada, mas uma chamada já iniciada pode concluir.

O limite é **estimado**, não um limite financeiro global da conta OpenAI. Ele depende de tarifas e câmbio corretos, do modelo configurado e das condições de cobrança da API. A conta pode ter consumo de outros aplicativos. Para controle administrativo adicional, use um projeto de API dedicado e acompanhe os registros de uso e faturamento na OpenAI.

O cálculo considera a tarifa de entrada cheia mesmo quando houver tokens de entrada em cache; isso mantém a estimativa conservadora. Não há tentativas automáticas de repetir uma chamada OpenAI que falhou, evitando chamadas duplicadas pelo servidor.

## Falhas e reservas pendentes

- **Teto insuficiente:** nenhuma chamada OpenAI é iniciada; a interface oferece WhatsApp.
- **Erro HTTP 400, 401, 402, 403, 404 ou 429:** a reserva é liberada e a interface oferece WhatsApp.
- **Timeout, erro de rede ou resultado de cobrança incerto:** a reserva integral é contabilizada como custo estimado, com status `uncertain`.
- **Falha da função antes de liquidar a reserva:** o registro continua `pending` e reduz o limite disponível até a reconciliação.

O painel mostra o total contabilizado, as reservas ainda pendentes e o histórico mensal. Reservas pendentes não são liberadas automaticamente por tempo, pois uma chamada pode ter sido processada pelo provedor mesmo sem a resposta chegar ao site.

Para investigar no SQL Editor do Supabase:

```sql
select id, created_at, model, amount_brl, status
from public.chat_reservations
where status = 'pending'
order by created_at;
```

Os logs do código identificam reservas que não puderam ser liquidadas pelo UUID, sem o texto da conversa. O mesmo UUID é enviado no cabeçalho `X-Client-Request-Id` à OpenAI.

Se a chamada estiver encerrada e você não conseguir confirmar a cobrança, a reconciliação conservadora mantém a reserva integral como consumo. Substitua o UUID abaixo pelo registro investigado:

```sql
select public.settle_chat_budget(
  'SUBSTITUA-PELO-UUID-DA-RESERVA'::uuid,
  0, 0, 0, 'uncertain'
);
```

Use `released` somente se você tiver confirmado que a chamada não foi cobrada. A função é idempotente: uma reserva já liquidada não é contabilizada duas vezes. Não zere `chat_usage` para liberar orçamento sem conciliar os registros; ajuste o teto no painel quando quiser autorizar mais consumo.

## Contexto, leads e limites de conversa

O assistente recebe a mensagem atual, até oito mensagens anteriores e os dados comerciais publicados. A entrada é limitada a 1.500 caracteres por mensagem; a saída é configurável entre 100 e 800 tokens. O backend aplica limites persistentes por hash de IP: 15 tentativas em 10 minutos e 80 por dia. Esses limites podem ser ajustados no arquivo `netlify/functions/chat.mjs`.

O texto de orientação pode ser editado no painel. Há regras fixas para não inventar preços ou confirmar datas, não afirmar que um contato foi salvo e encaminhar a proposta ao formulário ou ao WhatsApp. As respostas continuam sendo geradas por IA; mantenha as informações publicadas atualizadas.

As conversas não são salvas como transcrições no banco deste site. A memória da conversa fica na página e se perde ao recarregá-la. `store: false` controla o armazenamento do objeto de resposta pela API; não é uma promessa de ausência de todos os registros operacionais do provedor.

O lead é cadastrado automaticamente **quando o formulário é enviado com sucesso**, com autorização de contato. A conversa do chatbot não cria um registro silenciosamente, não acessa o CRM e não reserva datas. Isso deixa claro para o casal quando a solicitação realmente foi recebida.
