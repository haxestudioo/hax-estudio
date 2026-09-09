import { seed } from './seed.js';
import {
  esc,
  safeUrl,
  videoSpec,
  request,
  money,
  dateLabel,
  fonts,
  slugify,
  csvCell,
} from './utils.js';
const $ = (id) => document.getElementById(id);
let client = null,
  data = null,
  page = 'overview',
  contentTab = 'site',
  search = '',
  tempFilter = '',
  showArchived = false,
  leadPage = 0,
  hasMore = false,
  toastTimer,
  refreshing = false;
const names = {
  overview: 'Visão geral',
  crm: 'Funil de vendas',
  leads: 'Todos os leads',
  portfolio: 'Filmes e capas',
  content: 'Conteúdo do site',
  appearance: 'Cores e fontes',
  calendar: 'Agenda',
  chatbot: 'Chatbot & orçamento',
};
const temperatures = { cold: 'Frio', warm: 'Morno', hot: 'Quente' };
const clone = (x) => structuredClone(x);
function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').className = error ? 'error' : '';
  $('toast').hidden = false;
  toastTimer = setTimeout(() => ($('toast').hidden = true), 6500);
}
async function token() {
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw new Error('Entre no painel para continuar.');
  return session.access_token;
}
async function api(path, options = {}) {
  try {
    return await request(path, { ...options, token: await token() });
  } catch (e) {
    if (e.status === 401) await signOut();
    throw e;
  }
}
async function signOut() {
  await client?.auth.signOut();
  data = null;
  $('admin-app').hidden = true;
  $('login-screen').hidden = false;
  $('login-form').elements.password.value = '';
}
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  $('refresh').disabled = true;
  try {
    data = await api('admin-data');
    data.settings = { ...clone(seed.settings), ...data.settings };
    leadPage = 0;
    hasMore = data.leads.length === 200;
    showApp();
    render();
  } catch (e) {
    if (!data) $('login-status').textContent = e.message;
    else toast(e.message, true);
  } finally {
    refreshing = false;
    $('refresh').disabled = false;
  }
}
function showApp() {
  $('login-screen').hidden = true;
  $('admin-app').hidden = false;
  $('user-name').textContent = data.user.name || data.user.email;
}
function navigate(next) {
  page = next;
  search = '';
  tempFilter = '';
  $('sidebar').classList.remove('open');
  $('sidebar-toggle').setAttribute('aria-expanded', 'false');
  document
    .querySelectorAll('[data-page]')
    .forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  render();
}
function render() {
  $('page-title').textContent = names[page];
  (
    ({
      overview: overview,
      crm: crm,
      leads: leads,
      portfolio: portfolio,
      content: contentView,
      appearance: appearance,
      calendar: calendarView,
      chatbot: chatbotView,
    })[page] || overview
  )();
  bindCommon();
}
const stage = (id) =>
  data.pipeline_stages.find((s) => s.id === id) || {
    name: id,
    color: '#c9b58e',
    kind: 'open',
    probability: 0,
  };
const stages = () => [...data.pipeline_stages].sort((a, b) => a.position - b.position);
const activeLeads = () => data.leads.filter((l) => !l.archived);
function filteredLeads() {
  const term = search.toLocaleLowerCase('pt-BR');
  return data.leads.filter(
    (l) =>
      (showArchived || !l.archived) &&
      (!tempFilter || l.temperature === tempFilter) &&
      (!term ||
        [l.name, l.phone, l.email, l.event_city, l.venue].some((x) =>
          String(x || '')
            .toLocaleLowerCase('pt-BR')
            .includes(term),
        )),
  );
}
function empty(title, description, button = '') {
  return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(description)}</p>${button}</div>`;
}
function dateTime(v) {
  return v
    ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Sem data';
}
function tempBadge(l) {
  return `<span class="badge ${esc(l.temperature)}">${temperatures[l.temperature] || 'Morno'} · ${l.score}/100</span>`;
}
function leadButton(l) {
  return `<button class="row-link" data-lead="${esc(l.id)}">${esc(l.name)}</button>`;
}
function moreButton() {
  return hasMore
    ? '<button class="btn" id="load-more">Carregar mais contatos</button><p class="section-footnote">Os indicadores consideram os contatos carregados.</p>'
    : '';
}
function overview() {
  const all = activeLeads(),
    open = all.filter((l) => stage(l.stage_id).kind === 'open'),
    won = all.filter((l) => stage(l.stage_id).kind === 'won'),
    due = open
      .filter((l) => l.next_action_at && new Date(l.next_action_at) <= new Date())
      .sort((a, b) => a.next_action_at.localeCompare(b.next_action_at));
  const total = open.reduce((sum, l) => sum + Number(l.estimated_value), 0),
    forecast = open.reduce(
      (sum, l) => sum + (Number(l.estimated_value) * stage(l.stage_id).probability) / 100,
      0,
    );
  const published = data.projects.filter((p) => p.published).length;
  $('workspace').innerHTML =
    `<div class="toolbar"><div><h2>Olá, ${esc((data.user.name || 'Leanderson').split(' ')[0])}.</h2><p>As próximas histórias começam nas conversas de hoje.</p></div><button class="btn primary" data-new="leads">+ Adicionar lead</button></div><div class="stats"><article class="stat"><small>Contatos em andamento</small><strong>${open.length}</strong><p>${all.filter((l) => l.temperature === 'hot').length} contatos quentes</p></article><article class="stat"><small>Valor em negociação</small><strong>${money(total)}</strong><p>${money(forecast)} ponderados pelas etapas</p></article><article class="stat"><small>Contratos fechados</small><strong>${won.length}</strong><p>${money(won.reduce((n, l) => n + Number(l.estimated_value), 0))} em valor registrado</p></article><article class="stat"><small>Próximas ações vencidas</small><strong>${due.length}</strong><p>${published} filmes publicados</p></article></div><div class="two-col"><section class="panel"><div class="panel-title"><h2>Conversas que pedem atenção</h2><button class="link-btn" data-go="crm">Abrir funil ↗</button></div>${
      due.length
        ? due
            .slice(0, 8)
            .map(
              (l) =>
                `<div class="task-row"><div>${leadButton(l)}<p>${esc(l.next_action || 'Retomar contato')}</p></div><small class="overdue">${dateTime(l.next_action_at)}</small></div>`,
            )
            .join('')
        : empty(
            'Tudo em dia.',
            'Cadastre uma próxima ação em cada lead para acompanhar seus retornos.',
          )
    }</section><section class="panel"><div class="panel-title"><h2>Seu funil</h2><span>${all.length} contatos</span></div>${stages()
      .map((s) => {
        const n = all.filter((l) => l.stage_id === s.id).length;
        return `<div class="stage-progress"><div class="progress-label"><span>${esc(s.name)}</span><span>${n}</span></div><div class="bar"><span style="--width:${all.length ? (n / all.length) * 100 : 0}%;--stage:${esc(s.color)}"></span></div></div>`;
      })
      .join(
        '',
      )}</section></div><section class="panel"><div class="panel-title"><h2>Últimos contatos</h2><button class="link-btn" data-go="leads">Ver todos ↗</button></div>${all.length ? leadTable(all.slice(0, 5)) : empty('Seu primeiro contato começa aqui.', 'Os formulários enviados pelo site chegam automaticamente ao CRM.')}</section>${moreButton()}`;
}
function leadTable(list) {
  return `<div class="table-wrap"><table><thead><tr><th>Contato</th><th>Casamento</th><th>Etapa</th><th>Maturação</th><th>Próxima ação</th><th>Valor</th></tr></thead><tbody>${list.map((l) => `<tr><td>${leadButton(l)}<small>${esc(l.phone)} ${l.archived ? '· Arquivado' : ''}</small></td><td>${dateLabel(l.event_date)}<small>${esc(l.event_city)}</small></td><td>${esc(stage(l.stage_id).name)}<small>${esc(l.origin)}</small></td><td>${tempBadge(l)}</td><td>${esc(l.next_action || 'Não definida')}<small class="${l.next_action_at && new Date(l.next_action_at) < new Date() ? 'overdue' : ''}">${dateTime(l.next_action_at)}</small></td><td>${money(l.estimated_value)}</td></tr>`).join('')}</tbody></table></div>`;
}
function leadToolbar() {
  return `<div class="toolbar"><div class="toolbar-actions"><input type="search" id="lead-search" placeholder="Buscar nome, telefone ou cidade" aria-label="Buscar lead" value="${esc(search)}"><select id="temperature-filter" aria-label="Filtrar por maturação"><option value="">Todas as temperaturas</option>${Object.entries(
    temperatures,
  )
    .map(([v, t]) => `<option value="${v}" ${tempFilter === v ? 'selected' : ''}>${t}</option>`)
    .join(
      '',
    )}</select></div><div class="toolbar-actions"><button class="btn" id="export-leads">Exportar CSV</button><button class="btn primary" data-new="leads">+ Adicionar lead</button></div></div>`;
}
function crm() {
  const list = filteredLeads();
  $('workspace').innerHTML =
    leadToolbar() +
    `<div class="toolbar"><p class="section-footnote">Arraste os cartões ou use o seletor de etapa. Temperatura e pontuação são avaliações manuais.</p><button class="btn small" id="edit-stages">Editar etapas</button></div><div class="board">${stages()
      .map((s) => {
        const ls = list.filter((l) => l.stage_id === s.id);
        return `<section class="board-column" data-stage="${esc(s.id)}"><div class="column-head"><h2><i class="stage-color" style="--stage:${esc(s.color)}"></i>${esc(s.name)}</h2><span class="count">${ls.length}</span></div><div class="column-value">${money(ls.reduce((n, l) => n + Number(l.estimated_value), 0))}</div>${ls
          .map(
            (l) =>
              `<article class="lead-card" draggable="true" data-drag-lead="${l.id}"><button class="lead-open" data-lead="${l.id}"><h3>${esc(l.name)}</h3><p>${dateLabel(l.event_date)} · ${esc(l.event_city)}</p><div class="card-row">${tempBadge(l)}<span class="badge">${money(l.estimated_value)}</span></div></button>${l.next_action ? `<p class="followup ${l.next_action_at && new Date(l.next_action_at) < new Date() ? 'overdue' : ''}">${esc(l.next_action)}<br>${dateTime(l.next_action_at)}</p>` : ''}<select data-move-lead="${l.id}" aria-label="Etapa de ${esc(l.name)}">${stages()
                .map(
                  (t) =>
                    `<option value="${esc(t.id)}" ${t.id === s.id ? 'selected' : ''}>${esc(t.name)}</option>`,
                )
                .join('')}</select></article>`,
          )
          .join('')}</section>`;
      })
      .join('')}</div>${moreButton()}`;
  bindLeadFilters();
  $('edit-stages').onclick = showStages;
  document.querySelectorAll('[data-drag-lead]').forEach((el) =>
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', el.dataset.dragLead);
      e.dataTransfer.effectAllowed = 'move';
    }),
  );
  document.querySelectorAll('[data-stage]').forEach((el) => {
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('over'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('over');
      moveLead(e.dataTransfer.getData('text/plain'), el.dataset.stage);
    });
  });
  document
    .querySelectorAll('[data-move-lead]')
    .forEach((el) => (el.onchange = () => moveLead(el.dataset.moveLead, el.value)));
}
async function moveLead(id, stageId) {
  const l = data.leads.find((x) => x.id === id);
  if (!l || !data.pipeline_stages.some((s) => s.id === stageId) || l.stage_id === stageId) return;
  try {
    const result = await api('admin-write', {
      method: 'PATCH',
      body: { entity: 'leads', id, version: l.updated_at, data: { stage_id: stageId } },
    });
    Object.assign(l, result.rows[0]);
    render();
    toast('Lead movido para ' + stage(stageId).name + '.');
  } catch (e) {
    toast(e.message, true);
    render();
  }
}
function leads() {
  const list = filteredLeads();
  $('workspace').innerHTML =
    leadToolbar() +
    `<div class="toolbar"><p>${list.length} contatos ${showArchived ? 'incluindo arquivados' : 'ativos'}</p><label class="check-field"><input id="show-archived" type="checkbox" ${showArchived ? 'checked' : ''}> Mostrar arquivados</label></div>` +
    (list.length
      ? leadTable(list)
      : empty(
          'Nenhum contato por aqui.',
          'Adicione um lead ou aguarde o primeiro formulário enviado pelo site.',
        )) +
    moreButton();
  bindLeadFilters();
  $('show-archived').onchange = (e) => {
    showArchived = e.target.checked;
    render();
  };
}
function bindLeadFilters() {
  let timer;
  $('lead-search').addEventListener('input', (e) => {
    search = e.target.value;
    const caret = e.target.selectionStart;
    clearTimeout(timer);
    timer = setTimeout(() => {
      render();
      $('lead-search').focus();
      $('lead-search').setSelectionRange(caret, caret);
    }, 220);
  });
  $('temperature-filter').onchange = (e) => {
    tempFilter = e.target.value;
    render();
  };
  $('export-leads').onclick = exportLeads;
}
function exportLeads() {
  const headers = [
    'Nome',
    'Parceiro(a)',
    'Telefone',
    'Email',
    'Data',
    'Cidade',
    'Local',
    'Origem',
    'Etapa',
    'Temperatura',
    'Pontuação',
    'Orçamento',
    'Valor da proposta',
    'Próxima ação',
    'Prazo',
    'Último contato',
    'Observações',
    'Campanha',
    'Consentimento',
    'Criado em',
  ];
  const rows = filteredLeads().map((l) => [
    l.name,
    l.partner,
    l.phone,
    l.email,
    l.event_date,
    l.event_city,
    l.venue,
    l.origin,
    stage(l.stage_id).name,
    temperatures[l.temperature],
    l.score,
    l.budget,
    l.estimated_value,
    l.next_action,
    l.next_action_at,
    l.last_contact_at,
    l.notes,
    l.utm?.utm_campaign,
    l.consent ? 'Sim' : 'Não',
    l.created_at,
  ]);
  download(
    'hax-leads-' + new Date().toISOString().slice(0, 10) + '.csv',
    '\ufeff' + [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n'),
    'text/csv;charset=utf-8',
  );
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function portfolio() {
  $('workspace').innerHTML =
    `<div class="toolbar"><div><p>${data.projects.length} filmes · ${data.projects.filter((p) => p.published).length} publicados</p></div><button class="btn primary" data-new="projects">+ Adicionar filme</button></div><div class="portfolio-admin">${[
      ...data.projects,
    ]
      .sort((a, b) => a.position - b.position)
      .map(
        (p) =>
          `<article class="project-tile"><img src="${esc(safeUrl(p.cover_url))}" alt="${esc(p.title)}"><div class="tile-info"><h2>${esc(p.title)}</h2><p>${esc(p.category)} · Ordem ${p.position}</p><div class="tile-bottom"><span class="badge ${p.published ? 'good' : ''}">${p.published ? 'Publicado' : 'Rascunho'}</span><button class="btn small" data-edit="projects" data-id="${p.id}">Editar filme ↗</button></div></div></article>`,
      )
      .join('')}</div>` +
    (data.projects.length
      ? ''
      : empty('Uma nova história.', 'Adicione seu primeiro filme com link e capa.'));
}
const defs = {
  projects: {
    title: 'Filme',
    fields: [
      ['title', 'Nome do casal / título', 'text', true],
      ['slug', 'Endereço do filme', 'text', true],
      ['category', 'Categoria', 'select', true, ['Casamento', 'Pré-wedding']],
      ['position', 'Ordem de exibição', 'number'],
      ['video_url', 'Link do vídeo (YouTube, Vimeo, MP4 ou WebM)', 'url', true],
      ['cover_url', 'Capa', 'image', true],
      ['preview_url', 'Prévia silenciosa (link direto MP4/WebM)', 'url'],
      ['description', 'Sobre esta história', 'textarea'],
      ['location', 'Local', 'text'],
      ['year', 'Ano', 'text'],
      ['published', 'Publicar no site', 'checkbox'],
      ['featured', 'Filme em destaque', 'checkbox'],
    ],
  },
  testimonials: {
    title: 'Depoimento',
    fields: [
      ['couple', 'Nome do casal', 'text', true],
      ['quote', 'Depoimento real', 'textarea', true],
      ['project_slug', 'Endereço do filme associado (opcional)', 'text'],
      ['position', 'Ordem', 'number'],
      ['published', 'Publicar depoimento', 'checkbox'],
    ],
  },
  packages: {
    title: 'Coleção',
    fields: [
      ['name', 'Nome da coleção', 'text', true],
      ['description', 'Descrição', 'textarea'],
      ['price', 'Valor em reais (vazio para sob consulta)', 'number'],
      ['items', 'Itens incluídos — um por linha', 'lines'],
      ['position', 'Ordem', 'number'],
      ['published', 'Publicar coleção', 'checkbox'],
    ],
  },
  faqs: {
    title: 'Dúvida frequente',
    fields: [
      ['question', 'Pergunta', 'text', true],
      ['answer', 'Resposta', 'textarea', true],
      ['position', 'Ordem', 'number'],
      ['published', 'Publicar resposta', 'checkbox'],
    ],
  },
  pipeline_stages: {
    title: 'Etapa do funil',
    fields: [
      ['id', 'Identificador (letras minúsculas e hífens)', 'text', true],
      ['name', 'Nome da etapa', 'text', true],
      ['position', 'Ordem', 'number'],
      ['probability', 'Probabilidade estimada de fechar (%)', 'number'],
      ['color', 'Cor', 'color'],
      [
        'kind',
        'Tipo',
        'select',
        true,
        [
          ['open', 'Em andamento'],
          ['won', 'Ganho'],
          ['lost', 'Perdido'],
        ],
      ],
    ],
  },
  blocked_dates: {
    title: 'Bloquear data',
    fields: [
      ['date', 'Data', 'date', true],
      ['label', 'Observação interna', 'text'],
    ],
  },
  leads: {
    title: 'Contato',
    fields: [
      ['name', 'Nome', 'text', true],
      ['partner', 'Parceiro(a)', 'text'],
      ['phone', 'WhatsApp', 'tel', true],
      ['email', 'E-mail', 'email'],
      ['event_date', 'Data do casamento', 'date'],
      ['event_city', 'Cidade', 'text'],
      ['venue', 'Local / espaço', 'text'],
      ['origin', 'Origem do contato', 'text'],
      ['stage_id', 'Etapa do funil', 'stage', true],
      [
        'temperature',
        'Temperatura',
        'select',
        true,
        [
          ['cold', 'Frio — conhecendo'],
          ['warm', 'Morno — avaliando'],
          ['hot', 'Quente — próximo de decidir'],
        ],
      ],
      ['score', 'Maturação (avaliação manual, 0 a 100)', 'number'],
      ['budget', 'Orçamento informado (R$)', 'number'],
      ['estimated_value', 'Valor da proposta (R$)', 'number'],
      ['next_action', 'Próxima ação', 'text'],
      ['next_action_at', 'Prazo da próxima ação', 'datetime-local'],
      ['last_contact_at', 'Último contato', 'datetime-local'],
      ['loss_reason', 'Motivo de não avançar (se houver)', 'text'],
      ['notes', 'Informações, preferências e observações', 'textarea'],
      ['consent', 'Autorização de contato registrada', 'checkbox'],
      ['archived', 'Arquivar contato', 'checkbox'],
    ],
  },
};
function localInput(value, type) {
  if (!value) return '';
  if (type === 'date') return value.slice(0, 10);
  if (type === 'datetime-local') {
    const d = new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return value;
}
function field(f, value, record = {}) {
  let [key, label, type, required, opts] = f;
  value =
    value ?? (type === 'checkbox' ? false : type === 'number' ? (key === 'price' ? '' : 0) : '');
  const name = esc(key),
    req = required ? 'required' : '';
  if (type === 'stage') {
    type = 'select';
    opts = stages().map((s) => [s.id, s.name]);
  }
  let control = '';
  if (type === 'checkbox')
    return `<label class="check-field"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}>${esc(label)}</label>`;
  if (type === 'select')
    control = `<select name="${name}" ${req}>${opts
      .map((o) => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(v)}" ${String(value) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
      })
      .join('')}</select>`;
  else if (['textarea', 'lines'].includes(type))
    control = `<textarea name="${name}" rows="4" ${req}>${esc(type === 'lines' ? (Array.isArray(value) ? value.join('\n') : value) : value)}</textarea>`;
  else if (type === 'image')
    control = `<input name="${name}" type="text" value="${esc(value)}" placeholder="/assets/imagem.jpg ou https://…" ${req}>${safeUrl(value) ? `<img class="preview-image" src="${esc(safeUrl(value))}" alt="Prévia da imagem">` : ''}<input type="file" data-upload-for="${name}" accept="image/jpeg,image/png,image/webp,image/avif"><small>JPEG, PNG, WebP ou AVIF · até 8 MB. O upload substitui o endereço acima.</small>`;
  else
    control = `<input name="${name}" type="${['color', 'number', 'date', 'datetime-local', 'email', 'tel', 'password'].includes(type) ? type : 'text'}" value="${esc(localInput(value, type))}" ${type === 'number' ? 'min="0" step="any"' : ''} ${req} ${key === 'id' && record.id ? 'readonly' : ''}>`;
  return `<label class="${['textarea', 'lines', 'image'].includes(type) ? 'full' : ''}">${esc(label)}${control}</label>`;
}
function values(form, fields) {
  const raw = Object.fromEntries(new FormData(form));
  return Object.fromEntries(
    fields.map(([key, , type]) => [
      key,
      type === 'checkbox'
        ? form.elements[key].checked
        : type === 'number'
          ? raw[key] === '' && key === 'price'
            ? null
            : Number(raw[key]) || 0
          : type === 'lines'
            ? String(raw[key] || '')
                .split('\n')
                .map((x) => x.trim())
                .filter(Boolean)
            : type === 'datetime-local' && raw[key]
              ? new Date(raw[key]).toISOString()
              : raw[key] || '',
    ]),
  );
}
function defaults(entity) {
  if (entity === 'leads')
    return {
      stage_id: stages().find((s) => s.kind === 'open')?.id,
      temperature: 'warm',
      score: 30,
      origin: 'manual',
      budget: 0,
      estimated_value: 0,
    };
  if (entity === 'projects') return { category: 'Casamento', position: data.projects.length };
  if (entity === 'pipeline_stages')
    return {
      color: '#c9b58e',
      kind: 'open',
      position: data.pipeline_stages.length,
      probability: 0,
    };
  return {};
}
function edit(entity, id) {
  const def = defs[entity],
    existing = id
      ? (entity === 'leads' ? data.leads : data[entity]).find(
          (x) => (entity === 'blocked_dates' ? x.date : x.id) === id,
        )
      : null;
  const record = existing ? clone(existing) : defaults(entity);
  $('editor-content').innerHTML =
    `<p class="overline">${existing ? 'EDITAR' : 'ADICIONAR'} / HAX ESTÚDIO</p><h2>${entity === 'leads' && existing ? esc(record.name) : def.title}</h2>${entity === 'leads' && existing ? `<div class="lead-meta">${tempBadge(record)}<span class="badge">${esc(stage(record.stage_id).name)}</span><a class="btn small" href="https://wa.me/${esc(record.phone.length <= 11 ? '55' + record.phone : record.phone)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a></div>` : ''}<form id="edit-form" class="edit-form"><div class="form-grid">${def.fields.map((f) => field(f, record[f[0]], record)).join('')}</div><p class="form-status" id="edit-status" role="status"></p><div class="form-actions">${existing ? '<button class="btn danger" type="button" id="delete-record">Excluir</button>' : '<span></span>'}<div><button class="btn" type="button" id="cancel-edit">Cancelar</button><button class="btn primary" type="submit">Salvar alterações</button></div></div></form>${entity === 'leads' && existing ? `<h3 class="lead-section-title">Histórico da conversa</h3><p class="section-footnote">Origem: ${esc(record.origin)} · Criado em ${dateTime(record.created_at)}<br>Campanha: ${esc(record.utm?.utm_campaign || 'Não informada')} · Mídia: ${esc(record.utm?.utm_medium || 'Não informada')}<br>Autorização registrada: ${record.consented_at ? dateTime(record.consented_at) : record.consent ? 'Sim (registro manual)' : 'Não'}</p><form id="activity-form" class="activity-form"><label for="activity-note">Registrar contato, reunião ou observação</label><textarea id="activity-note" name="content" required maxlength="5000"></textarea><button class="btn" type="submit">Adicionar ao histórico</button></form><div id="lead-activities"><p>Carregando histórico…</p></div>` : ''}`;
  $('editor').showModal();
  $('cancel-edit').onclick = () => $('editor').close();
  bindUploads();
  if (entity === 'projects' && !existing) {
    const form = $('edit-form');
    form.elements.title.addEventListener('input', () => {
      if (!form.elements.slug.dataset.edited)
        form.elements.slug.value = slugify(form.elements.title.value);
    });
    form.elements.slug.addEventListener(
      'input',
      () => (form.elements.slug.dataset.edited = 'true'),
    );
  }
  $('edit-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!e.target.reportValidity()) return;
    const button = e.target.querySelector('[type=submit]');
    button.disabled = true;
    $('edit-status').textContent = 'Salvando…';
    try {
      const payload = values(e.target, def.fields);
      const result = await api('admin-write', {
        method: existing ? 'PATCH' : 'POST',
        body: {
          entity,
          id: existing ? (entity === 'blocked_dates' ? record.date : record.id) : undefined,
          version: record.updated_at,
          data: payload,
        },
      });
      if (entity === 'leads') {
        const idx = data.leads.findIndex((x) => x.id === result.rows[0].id);
        if (idx < 0) data.leads.unshift(result.rows[0]);
        else data.leads[idx] = result.rows[0];
      } else {
        const key = entity === 'blocked_dates' ? 'date' : 'id';
        const idx = data[entity].findIndex((x) => x[key] === result.rows[0][key]);
        if (idx < 0) data[entity].push(result.rows[0]);
        else data[entity][idx] = result.rows[0];
      }
      $('editor').close();
      render();
      toast('Alterações salvas.');
    } catch (error) {
      $('edit-status').textContent = error.message;
      $('edit-status').className = 'form-status error';
    } finally {
      button.disabled = false;
    }
  };
  if (existing)
    $('delete-record').onclick = () =>
      remove(entity, entity === 'blocked_dates' ? record.date : record.id);
  if (entity === 'leads' && existing) {
    loadActivities(record.id);
    $('activity-form').onsubmit = async (e) => {
      e.preventDefault();
      const b = e.target.querySelector('button');
      b.disabled = true;
      try {
        await api('admin-write', {
          method: 'POST',
          body: {
            entity: 'lead_activities',
            data: { lead_id: record.id, type: 'note', content: e.target.elements.content.value },
          },
        });
        e.target.reset();
        await loadActivities(record.id);
        toast('Histórico atualizado.');
      } catch (error) {
        toast(error.message, true);
      } finally {
        b.disabled = false;
      }
    };
  }
}
async function loadActivities(id) {
  try {
    const result = await api('admin-data?entity=activities&lead_id=' + encodeURIComponent(id));
    if ($('lead-activities'))
      $('lead-activities').innerHTML =
        result.rows
          .map(
            (a) =>
              `<article class="activity"><small>${dateTime(a.created_at)} · ${a.type === 'stage' ? 'Mudança de etapa' : a.type === 'created' ? 'Cadastro' : 'Anotação'}</small><p>${esc(a.content)}</p></article>`,
          )
          .join('') || '<p>Nenhuma anotação.</p>';
  } catch (e) {
    if ($('lead-activities')) $('lead-activities').textContent = e.message;
  }
}
async function remove(entity, id) {
  $('confirm-dialog').returnValue = 'cancel';
  $('confirm-dialog').showModal();
  const answer = await new Promise((resolve) =>
    $('confirm-dialog').addEventListener('close', () => resolve($('confirm-dialog').returnValue), {
      once: true,
    }),
  );
  if (answer !== 'delete') return;
  try {
    await api('admin-write', { method: 'DELETE', body: { entity, id } });
    if (entity === 'leads') data.leads = data.leads.filter((x) => x.id !== id);
    else
      data[entity] = data[entity].filter(
        (x) => (entity === 'blocked_dates' ? x.date : x.id) !== id,
      );
    $('editor').close();
    render();
    toast('Registro excluído.');
  } catch (e) {
    toast(e.message, true);
  }
}
function bindUploads() {
  document.querySelectorAll('[data-upload-for]').forEach(
    (input) =>
      (input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        if (
          !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) ||
          file.size > 8388608
        ) {
          toast('Envie uma imagem JPEG, PNG, WebP ou AVIF de até 8 MB.', true);
          input.value = '';
          return;
        }
        const submit = input.closest('form')?.querySelector('[type=submit]');
        input.disabled = true;
        if (submit) submit.disabled = true;
        try {
          const ext = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/avif': 'avif',
          }[file.type];
          const path = 'uploads/' + crypto.randomUUID() + '.' + ext;
          const { error } = await client.storage
            .from('portfolio')
            .upload(path, file, {
              contentType: file.type,
              cacheControl: '31536000',
              upsert: false,
            });
          if (error)
            throw new Error(
              'Não foi possível enviar a imagem. Verifique as permissões do Storage.',
            );
          const { data: publicData } = client.storage.from('portfolio').getPublicUrl(path);
          input.closest('form').elements[input.dataset.uploadFor].value = publicData.publicUrl;
          const preview = input.parentElement.querySelector('img');
          if (preview) preview.src = publicData.publicUrl;
          toast('Imagem enviada. Salve o formulário para aplicar.');
        } catch (e) {
          toast(e.message, true);
        } finally {
          input.disabled = false;
          if (submit) submit.disabled = false;
        }
      }),
  );
}
function showStages() {
  $('editor-content').innerHTML =
    '<p class="overline">ORGANIZAÇÃO DO CRM</p><h2>Etapas do funil</h2><p>Os percentuais servem para estimar o valor ponderado das propostas.</p><div class="content-list">' +
    stages()
      .map(
        (s) =>
          `<div class="content-row"><div><h3>${esc(s.name)}</h3><p>Ordem ${s.position} · ${s.probability}% · ${s.kind === 'won' ? 'Ganho' : s.kind === 'lost' ? 'Perdido' : 'Em andamento'}</p></div><button class="btn small" data-edit-stage="${esc(s.id)}">Editar</button></div>`,
      )
      .join('') +
    '</div><button class="btn primary" id="new-stage" style="margin-top:25px">+ Nova etapa</button>';
  $('editor').showModal();
  document.querySelectorAll('[data-edit-stage]').forEach(
    (b) =>
      (b.onclick = () => {
        $('editor').close();
        edit('pipeline_stages', b.dataset.editStage);
      }),
  );
  $('new-stage').onclick = () => {
    $('editor').close();
    edit('pipeline_stages');
  };
}
const siteFields = [
  ['films_title', 'Título da seção de filmes', 'textarea'],
  ['films_intro', 'Introdução dos filmes', 'textarea'],
  ['experience_title', 'Título da experiência', 'textarea'],
  ['experience_intro', 'Introdução da experiência', 'textarea'],
  ['step1_title', 'Etapa 1 — título', 'textarea'],
  ['step1_text', 'Etapa 1 — texto', 'textarea'],
  ['step2_title', 'Etapa 2 — título', 'textarea'],
  ['step2_text', 'Etapa 2 — texto', 'textarea'],
  ['step3_title', 'Etapa 3 — título', 'textarea'],
  ['step3_text', 'Etapa 3 — texto', 'textarea'],
  ['calendar_title', 'Título da agenda', 'textarea'],
  ['calendar_text', 'Texto da agenda', 'textarea'],
  ['packages_title', 'Título das coleções', 'textarea'],
  ['packages_intro', 'Introdução das coleções', 'textarea'],
  ['faq_title', 'Título das dúvidas frequentes', 'textarea'],
  ['footer_text', 'Frase do rodapé', 'textarea'],
  ['brand', 'Nome da empresa', 'text'],
  ['signature', 'Assinatura', 'text'],
  ['headline', 'Título de abertura — use uma quebra de linha', 'textarea'],
  ['intro', 'Texto de abertura', 'textarea'],
  ['hero_cover', 'Imagem de abertura', 'image'],
  ['hero_video', 'Vídeo de abertura (MP4/WebM ou YouTube)', 'url'],
  ['about_title', 'Título da apresentação', 'textarea'],
  ['about_photo', 'Foto de apresentação', 'image'],
  ['about', 'Sua apresentação', 'textarea'],
  ['contact_title', 'Título de contato', 'textarea'],
  ['contact_text', 'Texto de contato', 'textarea'],
  ['whatsapp', 'WhatsApp com país e DDD', 'tel', true],
  ['email', 'E-mail comercial', 'email'],
  ['instagram', 'Link do Instagram', 'url'],
  ['region', 'Região atendida', 'text'],
  ['meeting_url', 'Link do agendamento de reunião no Google', 'url'],
  ['privacy_email', 'E-mail para solicitações de privacidade', 'email'],
  ['seo_title', 'Título nos mecanismos de busca', 'text'],
  ['seo_description', 'Descrição nos mecanismos de busca', 'textarea'],
];
function contentView() {
  const tabs = {
    site: 'Textos e contato',
    packages: 'Coleções',
    testimonials: 'Depoimentos',
    faqs: 'Dúvidas frequentes',
  };
  $('workspace').innerHTML = `<div class="tabs">${Object.entries(tabs)
    .map(
      ([k, v]) =>
        `<button data-content-tab="${k}" class="${contentTab === k ? 'active' : ''}">${v}</button>`,
    )
    .join('')}</div><div id="content-panel"></div>`;
  document.querySelectorAll('[data-content-tab]').forEach(
    (b) =>
      (b.onclick = () => {
        contentTab = b.dataset.contentTab;
        render();
      }),
  );
  if (contentTab === 'site') {
    settingsForm('content-panel', 'site', siteFields);
    return;
  }
  const rows = data[contentTab];
  $('content-panel').innerHTML =
    `<div class="toolbar"><p>${contentTab === 'testimonials' ? 'Publique somente depoimentos reais, autorizados pelos casais.' : contentTab === 'packages' ? 'Os valores recuperados do modelo anterior estão em rascunho. Revise antes de publicar.' : 'Respostas que ajudam o casal a decidir.'}</p><button class="btn primary" data-new="${contentTab}">+ Adicionar</button></div><div class="content-list">${rows.map((r) => `<article class="content-row"><div><h3>${esc(r.name || r.couple || r.question)} <span class="badge ${r.published ? 'good' : ''}">${r.published ? 'Publicado' : 'Rascunho'}</span></h3><p>${esc((r.description || r.quote || r.answer || '').slice(0, 180))}${r.price != null ? ' · ' + money(r.price) : ''}</p></div><button class="btn small" data-edit="${contentTab}" data-id="${r.id}">Editar</button></article>`).join('')}</div>` +
    (rows.length
      ? ''
      : empty('Nada publicado ainda.', 'Adicione o conteúdo quando estiver pronto.'));
}
function settingsForm(target, key, fields, extra = '') {
  const current = { ...seed.settings[key], ...data.settings[key] };
  $(target).innerHTML =
    extra +
    `<form id="settings-form" class="settings-form"><div class="form-grid">${fields.map((f) => field(f, current[f[0]])).join('')}</div><p id="settings-status" class="form-status" role="status"></p><div><button class="btn primary" type="submit">Salvar alterações</button></div></form>`;
  bindUploads();
  $('settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector('[type=submit]');
    b.disabled = true;
    $('settings-status').textContent = 'Salvando…';
    try {
      const result = await api('admin-write', {
        method: 'POST',
        body: { entity: 'settings', key, data: values(e.target, fields) },
      });
      data.settings[key] = result.rows[0].value;
      $('settings-status').textContent = 'Alterações salvas. Atualize o site para visualizar.';
      $('settings-status').className = 'form-status success';
      toast('Configuração salva.');
      if (key === 'chatbot') chatbotView();
    } catch (error) {
      $('settings-status').textContent = error.message;
      $('settings-status').className = 'form-status error';
    } finally {
      b.disabled = false;
    }
  };
}
function appearance() {
  const fields = [
    ['background', 'Fundo principal', 'color'],
    ['surface', 'Fundo das seções', 'color'],
    ['text', 'Cor dos textos', 'color'],
    ['muted', 'Textos secundários', 'color'],
    ['accent', 'Destaques e botões', 'color'],
    ['heading_font', 'Fonte dos títulos', 'select', true, fonts],
    ['body_font', 'Fonte dos textos', 'select', true, fonts],
    ['heading_scale', 'Escala dos títulos (0,8 a 1,3)', 'number'],
    ['body_size', 'Texto em pixels (16 a 20)', 'number'],
  ];
  $('workspace').innerHTML =
    '<div class="two-col"><section class="panel"><h2>Cores e tipografia</h2><p>As alterações afetam o site público.</p><div id="appearance-form"></div></section><div><div class="theme-preview" id="theme-preview"><p>HAX ESTÚDIO / FILMES DE CASAMENTO</p><h2>O dia passa.<br><em>O que sentimos fica.</em></h2><p>Histórias reais, contadas com cuidado e sensibilidade.</p><span class="btn primary">Consultar minha data ↗</span></div></div></div>';
  settingsForm('appearance-form', 'theme', fields);
  const preview = () => {
    const v = values($('settings-form'), fields),
      el = $('theme-preview');
    for (const [k, n] of Object.entries({
      background: 'bg',
      surface: 'surface',
      text: 'text',
      muted: 'muted',
      accent: 'accent',
    }))
      el.style.setProperty('--' + n, v[k]);
    el.style.setProperty('--heading', `"${v.heading_font}",Georgia,serif`);
    el.style.setProperty('--body', `"${v.body_font}",Arial,sans-serif`);
    el.style.setProperty('--heading-scale', Math.max(0.8, Math.min(1.3, v.heading_scale)));
    el.style.setProperty('--body-size', Math.max(16, Math.min(20, v.body_size)) + 'px');
  };
  $('settings-form').addEventListener('input', preview);
  preview();
}
function calendarView() {
  $('workspace').innerHTML =
    `<div class="two-col"><section class="panel"><h2>Disponibilidade do casamento</h2><div class="integration-row"><div><strong>Google Agenda</strong><small>${esc(data.integrations.calendar_email || 'Configure a conta de serviço no Netlify.')}</small></div><span class="badge ${data.integrations.google ? 'good' : ''}">${data.integrations.google ? 'Credenciais presentes' : 'A configurar'}</span></div><p class="section-footnote">O site consulta apenas livre/ocupado. Títulos, convidados e detalhes dos eventos não são publicados.</p><div id="calendar-settings"></div><button class="btn" id="test-calendar" style="margin-top:22px">Testar consulta da agenda</button><p id="calendar-test-status" role="status"></p></section><section class="panel"><div class="panel-title"><h2>Bloqueios adicionais</h2><button class="btn small" data-new="blocked_dates">+ Bloquear data</button></div><p>Um bloqueio manual sempre deixa o dia indisponível no site. Os eventos do Google continuam sendo gerenciados na sua agenda.</p><div class="content-list">${data.blocked_dates.map((b) => `<div class="content-row"><div><h3>${dateLabel(b.date)}</h3><p>${esc(b.label)}</p></div><button class="btn small" data-delete-date="${b.date}">Liberar</button></div>`).join('') || '<p>Nenhum bloqueio manual.</p>'}</div></section></div><div class="help-box"><strong>Como conectar</strong><p>Siga docs/INSTALACAO.md: habilite a API Google Calendar, crie uma conta de serviço, compartilhe a agenda “Casamentos — Datas Fechadas” com essa conta e adicione as três variáveis no Netlify. A conexão é somente de leitura. Registre casamentos fechados como eventos de dia inteiro, marcados como Ocupado.</p></div>`;
  settingsForm('calendar-settings', 'calendar', [
    ['enabled', 'Exibir consulta da agenda', 'checkbox'],
    ['months_ahead', 'Meses disponíveis para navegação (1 a 24)', 'number'],
  ]);
  $('test-calendar').onclick = async () => {
    $('test-calendar').disabled = true;
    $('calendar-test-status').textContent = 'Consultando…';
    try {
      const r = await request(
        'availability?month=' +
          new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
            .format(new Date())
            .slice(0, 7),
      );
      $('calendar-test-status').textContent = r.connected
        ? 'Conexão confirmada. A agenda respondeu corretamente.'
        : 'A agenda não respondeu. Confira credenciais, ID e compartilhamento no Google.';
      $('calendar-test-status').className = r.connected ? 'success' : 'error';
    } catch (e) {
      $('calendar-test-status').textContent = e.message;
    } finally {
      $('test-calendar').disabled = false;
    }
  };
  document.querySelectorAll('[data-delete-date]').forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await api('admin-write', {
            method: 'DELETE',
            body: { entity: 'blocked_dates', id: b.dataset.deleteDate },
          });
          data.blocked_dates = data.blocked_dates.filter((x) => x.date !== b.dataset.deleteDate);
          render();
          toast('Bloqueio manual removido.');
        } catch (e) {
          toast(e.message, true);
        }
      }),
  );
}
function chatbotView() {
  const s = { ...seed.settings.chatbot, ...data.settings.chatbot },
    month =
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
        .format(new Date())
        .slice(0, 7) + '-01',
    usage = data.usage.find((u) => u.month === month) || {
      spent_brl: 0,
      reserved_brl: 0,
      requests: 0,
    };
  const total = Number(usage.spent_brl) + Number(usage.reserved_brl);
  $('workspace').innerHTML =
    `<div class="two-col"><div><section class="panel"><h2>Atendimento com inteligência artificial</h2><div class="integration-row"><span>Chave OpenAI no servidor</span><span class="badge ${data.integrations.openai ? 'good' : ''}">${data.integrations.openai ? 'Configurada' : 'A configurar'}</span></div><div class="help-box" style="margin-top:20px"><strong>Ativado: o assistente responde no site.</strong><p>Desativado, sem créditos disponíveis ou sem resposta da API: o atendimento continua pelo WhatsApp. O formulário permanece disponível para captar leads.</p></div><div id="chat-settings"></div></section></div><div><section class="panel"><p class="overline">CONSUMO ESTIMADO / MÊS ATUAL</p><div class="budget-values"><strong>${money(total)}</strong><span>de ${money(s.budget_brl)}</span></div><div class="budget-bar"><span style="--progress:${s.budget_brl > 0 ? Math.min(100, (total / s.budget_brl) * 100) : 0}%"></span></div><p>${usage.requests} respostas/tentativas contabilizadas</p><p class="section-footnote">${money(usage.spent_brl)} contabilizados · ${money(usage.reserved_brl)} reservados para chamadas pendentes. Virada mensal automática no fuso de São Paulo.</p></section><div class="help-box"><strong>Como o limite funciona</strong><p>O servidor reserva um valor conservador antes de cada chamada e confere o teto no banco. Depois registra os tokens retornados pela OpenAI. Em falhas incertas, mantém o custo reservado. Tarifas e câmbio são parâmetros de estimativa, não uma leitura do saldo da OpenAI.</p></div><section class="panel"><h2>Histórico de consumo</h2><div class="table-wrap"><table><thead><tr><th>Mês</th><th>Estimado</th><th>Chamadas</th></tr></thead><tbody>${data.usage.map((u) => `<tr><td>${esc(u.month.slice(0, 7))}</td><td>${money(Number(u.spent_brl) + Number(u.reserved_brl))}</td><td>${u.requests}</td></tr>`).join('') || '<tr><td colspan="3">Ainda não houve consumo.</td></tr>'}</tbody></table></div></section>${data.reservations.length ? `<div class="help-box"><strong>${data.reservations.length} reservas pendentes</strong><p>Elas continuam consumindo o limite por segurança. Veja a consulta de reconciliação no guia do chatbot antes de ajustar qualquer lançamento.</p></div>` : ''}</div></div>`;
  const fields = [
    ['enabled', 'Ativar chatbot no site', 'checkbox'],
    ['budget_brl', 'Teto mensal estimado (R$)', 'number'],
    ['model', 'Modelo', 'select', true, ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1-nano']],
    ['max_output_tokens', 'Limite de saída por resposta (100 a 800 tokens)', 'number'],
    ['usd_brl', 'Câmbio usado na estimativa (R$ por US$)', 'number'],
    ['input_usd', 'Entrada: US$ por milhão de tokens', 'number'],
    ['output_usd', 'Saída: US$ por milhão de tokens', 'number'],
    ['system_prompt', 'Orientação de atendimento', 'textarea', true],
  ];
  settingsForm('chat-settings', 'chatbot', fields);
  $('settings-form').elements.enabled.classList.add('switch');
  $('settings-form').elements.model.onchange = (e) => {
    const rates = {
      'gpt-4.1-mini': [0.4, 1.6],
      'gpt-4o-mini': [0.15, 0.6],
      'gpt-4.1-nano': [0.1, 0.4],
    }[e.target.value];
    $('settings-form').elements.input_usd.value = rates[0];
    $('settings-form').elements.output_usd.value = rates[1];
  };
}
function bindCommon() {
  document.querySelectorAll('[data-new]').forEach((b) => (b.onclick = () => edit(b.dataset.new)));
  document
    .querySelectorAll('[data-edit]')
    .forEach((b) => (b.onclick = () => edit(b.dataset.edit, b.dataset.id)));
  document
    .querySelectorAll('[data-lead]')
    .forEach((b) => (b.onclick = () => edit('leads', b.dataset.lead)));
  document.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => navigate(b.dataset.go)));
  if ($('load-more'))
    $('load-more').onclick = async () => {
      $('load-more').disabled = true;
      try {
        const r = await api('admin-data?entity=leads&page=' + (leadPage + 1));
        leadPage++;
        hasMore = r.rows.length === 200;
        const ids = new Set(data.leads.map((l) => l.id));
        data.leads.push(...r.rows.filter((l) => !ids.has(l.id)));
        render();
      } catch (e) {
        toast(e.message, true);
        $('load-more').disabled = false;
      }
    };
}
function passwordRecovery() {
  $('editor-content').innerHTML =
    '<h2>Definir nova senha</h2><form id="new-password-form" class="edit-form"><label>Nova senha<input name="password" type="password" minlength="12" autocomplete="new-password" required></label><label>Repita a senha<input name="confirmation" type="password" minlength="12" autocomplete="new-password" required></label><p id="recovery-status" role="status"></p><button class="btn primary" type="submit">Salvar nova senha</button></form>';
  $('editor').showModal();
  $('new-password-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.elements.password.value !== f.elements.confirmation.value) {
      $('recovery-status').textContent = 'As senhas precisam ser iguais.';
      return;
    }
    f.querySelector('button').disabled = true;
    const { error } = await client.auth.updateUser({ password: f.elements.password.value });
    if (error) {
      $('recovery-status').textContent = 'Não foi possível alterar. Solicite um novo link.';
      f.querySelector('button').disabled = false;
    } else {
      $('editor').close();
      toast('Senha atualizada.');
      refresh();
    }
  };
}
document
  .querySelectorAll('[data-page]')
  .forEach((b) => (b.onclick = () => navigate(b.dataset.page)));
$('sidebar-toggle').onclick = () => {
  const open = $('sidebar').classList.toggle('open');
  $('sidebar-toggle').setAttribute('aria-expanded', String(open));
};
$('logout').onclick = signOut;
$('refresh').onclick = refresh;
document.querySelector('.close-editor').onclick = () => $('editor').close();
$('login-form').onsubmit = async (e) => {
  e.preventDefault();
  if (!client) return;
  const f = e.target,
    b = f.querySelector('[type=submit]');
  b.disabled = true;
  $('login-status').textContent = 'Entrando…';
  try {
    const { error } = await client.auth.signInWithPassword({
      email: f.elements.email.value.trim(),
      password: f.elements.password.value,
    });
    if (error) throw new Error('Confira seu e-mail e sua senha.');
    await refresh();
  } catch (error) {
    $('login-status').textContent = error.message;
  } finally {
    b.disabled = false;
  }
};
$('forgot-password').onclick = async () => {
  const email = $('login-form').elements.email.value;
  if (!client || !email) {
    $('login-status').textContent = 'Informe seu e-mail acima para receber o link de recuperação.';
    return;
  }
  $('forgot-password').disabled = true;
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + '/admin/',
    });
    if (error) throw error;
    $('login-status').textContent =
      'Se o e-mail estiver cadastrado, você receberá um link de recuperação.';
  } catch {
    $('login-status').textContent =
      'Não foi possível enviar agora. Confira o e-mail e tente novamente.';
  } finally {
    $('forgot-password').disabled = false;
  }
};
try {
  const boot = await request('bootstrap');
  if (!boot.configured) {
    $('login-hint').textContent =
      'Configure as variáveis do Supabase no Netlify e execute os scripts SQL do projeto. O passo a passo está em docs/INSTALACAO.md.';
    $('login-form').querySelector('[type=submit]').disabled = true;
  } else {
    if (!window.supabase)
      throw new Error('Não foi possível carregar a autenticação. Recarregue a página.');
    client = window.supabase.createClient(boot.supabase_url, boot.supabase_key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setTimeout(passwordRecovery, 0);
    });
    const {
      data: { session },
    } = await client.auth.getSession();
    if (session && !location.search.includes('recovery')) await refresh();
  }
} catch (e) {
  $('login-status').textContent = e.message;
  $('login-form').querySelector('[type=submit]').disabled = true;
}
