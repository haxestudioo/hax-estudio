# Hax Estúdioo

**Entrega manual: 99 arquivos na pasta extraída.** Envie o conteúdo de `Hax-Estudio` à raiz da branch `teste`, sem enviar o ZIP e sem incluir `node_modules`. O Netlify gera `dist` no build.

Portfólio com seis capítulos: pré-wedding, casamento em filme, fotografia de casamento, gestantes, ensaios externos e fotografia de shows. Inclui banner em tela inteira, depoimentos reais, apresentação com retrato circular, pacotes, painel administrativo e consulta ao Google Agenda.

Identidade em creme claro, verde-oliva e champanhe com a logo original. Banner, retrato, depoimentos e pop-up Black Friday são editáveis no admin. O painel organiza os textos por seção, classifica os filmes por capítulo e oferece envio de fotos e miniaturas de vídeos, ordenação por arraste/setas/posição e remoção de itens. Botões e seções têm animações, e os pacotes respondem ao ponteiro, ao teclado e à navegação no celular.

**Comece pelo [LEIA-ME.md](./LEIA-ME.md)** para publicar, criar a senha do painel e conectar a agenda.

```bash
npm ci
npm test
npm run build
```

Netlify: build `npm run build`, publish `dist`. Publique o projeto completo conectado ao GitHub para habilitar as funções.

Admin: `/admin/`. Não há senha padrão. Execute `npm run setup-admin` e configure as variáveis no Netlify.

Novidade: planos por serviço em um único pop-up, recomendação em destaque e formulário que prepara nome, data e pacote no WhatsApp. Ensaios externos: R$ 350, R$ 550 e R$ 750. Shows: a combinar.
