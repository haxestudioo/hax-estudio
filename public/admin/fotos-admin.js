const api=async(path,method='GET',body)=>{const r=await fetch('/api/fotos/admin/'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});const data=await r.json();if(!r.ok)throw Error(data.error||'Erro na operação');return data;};
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let state={events:[],photos:[],orders:[],customers:[],items:[]},activeEvent=null;
const notice=(message,error=false)=>{const p=document.querySelector('#hax-fotos-feedback');if(p){p.textContent=message;p.style.color=error?'#b02b2b':'#417641';}};
function eventOptions(){return state.events.map(x=>'<option value="'+x.id+'" '+(activeEvent===x.id?'selected':'')+'>'+e(x.title)+'</option>').join('');}
function draw(container){
 const orders=state.orders;const approved=orders.filter(o=>o.status==='approved');const turnover=approved.reduce((t,o)=>t+o.total_cents,0);
 const selectedEvent=state.events.find(x=>x.id===activeEvent);
 const selectedReady=state.photos.filter(p=>p.event_id===activeEvent&&p.status==='ready').length;
 container.innerHTML='<style>.hf-box{background:#fff;border:1px solid #d9d9d5;border-radius:9px;padding:18px;margin:16px 0}.hf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.hf-grid label{display:grid;gap:5px;font-size:13px}.hf-grid input,.hf-grid select,.hf-grid textarea{width:100%;padding:10px;border:1px solid #b6b6b2;border-radius:5px;background:white;color:#202020}.hf-table{width:100%;border-collapse:collapse;font-size:12px}.hf-table th,.hf-table td{text-align:left;padding:10px;border-bottom:1px solid #e1e1df;vertical-align:top}.hf-scroll{overflow-x:auto}.hf-status{font-weight:700}.hf-button{padding:9px 12px;border:1px solid #818778;border-radius:5px;background:#253128;color:white;cursor:pointer;margin:3px;font-size:12px}.hf-button.secondary{background:white;color:#24322b}.hf-summary{background:#f4f5ef;padding:18px;border-radius:8px}.hf-summary strong{font-size:24px;display:block}.hf-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:12px}.hf-thumbs img{width:100%;aspect-ratio:1;object-fit:cover}.hf-photo{border:1px solid #e1e1e1;padding:7px}.hf-photo small{display:block;overflow-wrap:anywhere}.hf-box h3{margin:0 0 13px}.hf-tip{color:#626e66;font-size:12px}.hf-upload{border:2px dashed #bdc6bc;padding:20px;text-align:center}.hf-upload input{max-width:100%}@media(max-width:650px){.hf-box{padding:12px}.hf-table{min-width:650px}}#panel .hf-box{display:flow-root;clear:both;min-width:0;padding:clamp(14px,2.5vw,24px);margin:20px 0;box-sizing:border-box} #panel .hf-box h3{font-family:inherit;font-size:clamp(19px,2.3vw,26px);font-weight:700;line-height:1.2;letter-spacing:0;margin:0 0 14px} #panel .hf-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,174px),1fr));gap:14px;align-items:stretch;margin-top:18px;width:100%;min-width:0} #panel .hf-photo{display:flex;flex-direction:column;min-width:0;gap:7px;border:1px solid #d8ded9;border-radius:8px;padding:10px;overflow:hidden;box-sizing:border-box} #panel .hf-thumbs .hf-photo img{display:block;height:auto!important;width:100%;max-width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:5px;background:#edf0ed} #panel .hf-photo small{display:block;min-width:0;line-height:1.4;font-size:11px;overflow-wrap:anywhere;word-break:break-word} #panel .hf-photo .hf-photo-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:auto} #panel .hf-photo .hf-button{width:100%;margin:0;min-height:40px;padding:8px 4px;font-size:11px} #panel .hf-photo .hf-original-link{display:block;text-align:center;padding:9px 5px;border:1px solid #d1d8d2;border-radius:5px;font-size:11px;font-weight:700;line-height:1.4} #panel .hf-photo .hf-original-link:hover{border-color:#253128} #panel .hf-event-hint{margin:0 0 16px;padding:14px 16px;border:1px solid #e6d4a2;background:#fff8e6;color:#443819;border-radius:7px;font-size:12px;line-height:1.5} #panel .hf-event-hint.published{border-color:#b9d9b8;background:#eef9ee;color:#254e24} #panel .hf-event-hint strong{display:block;margin-bottom:3px} #panel .hf-event-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 2px} #panel .hf-event-actions .hf-button{margin:0} #panel .hf-tag{display:inline-block;padding:3px 8px;border-radius:20px;font-weight:700;white-space:normal;font-size:11px} #panel .hf-tag.published{color:#1d5d38;background:#e5f5e9} #panel .hf-tag.draft{color:#74520c;background:#fff0c2} #panel .hf-table td{min-width:100px} #panel .hf-scroll{width:100%;max-width:100%;overflow-x:auto} #panel .hf-grid>*{min-width:0} #panel .hf-box p{overflow-wrap:anywhere} @media(max-width:700px){#panel .hf-thumbs{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#panel .hf-photo{padding:7px;gap:5px}#panel .hf-photo .hf-photo-actions{grid-template-columns:1fr}#panel .hf-box{padding:13px}#panel .hf-event-actions{flex-direction:column;align-items:stretch}#panel .hf-event-actions .hf-button{width:100%}} @media(max-width:360px){#panel .hf-thumbs{grid-template-columns:1fr}} </style>'
 +'<h2>Venda de fotos / HAX Fotos</h2><p>Gerencie seus eventos, fotos originais, clientes e pagamentos. Os arquivos comerciais ficam em armazenamento privado.</p><p id="hax-fotos-feedback" role="status"></p>'
 +'<div class="hf-grid"><div class="hf-summary"><span>Pedidos registrados</span><strong>'+orders.length+'</strong></div><div class="hf-summary"><span>Vendas aprovadas</span><strong>'+approved.length+'</strong></div><div class="hf-summary"><span>Receita bruta aprovada</span><strong>'+money(turnover)+'</strong></div><div class="hf-summary"><span>Clientes cadastrados</span><strong>'+state.customers.length+'</strong></div></div>'
 +'<section class="hf-box"><h3>Verificar serviços e marca d\'água</h3><p class="hf-tip">Consulta autorizada ao Supabase e R2. Não mostra suas chaves ou segredos. O upload real confirma o CORS.</p><button class="hf-button secondary" id="hf-diagnostics" type="button">VERIFICAR CONEXÕES</button><div id="hf-diagnostic-result" role="status"></div></section>'
 +'<section class="hf-box"><h3>Novo evento</h3><form id="hf-create"><div class="hf-grid"><label>Nome do evento<input name="title" required minlength="3" placeholder="Ex.: Corrida de Rua 2026"></label><label>Data do evento<input type="date" name="event_date"></label><label>Preço por foto (R$)<input name="price" type="number" min="1" max="100000" step=".01" value="15.00" required></label><label>Descrição<input name="description" maxlength="1000"></label></div><button class="hf-button" type="submit">CRIAR EVENTO</button></form></section>'
 +'<section class="hf-box"><h3>Eventos</h3><p class="hf-tip">Os eventos começam como RASCUNHO. Depois de enviar as fotos, clique em PUBLICAR NA LOJA para que clientes possam encontrá-los em /fotos/. Você pode fazer uma prévia privada antes da publicação.</p><div class="hf-scroll"><table class="hf-table"><thead><tr><th>Evento</th><th>Preço/foto</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+state.events.map(x=>'<tr><td>'+e(x.title)+'</td><td>'+money(x.price_cents)+'</td><td>'+(x.published?'<span class="hf-tag published">Publicado na loja</span>':'<span class="hf-tag draft">Rascunho — oculto</span>')+'</td><td><button class="hf-button secondary" data-manage="'+x.id+'">Gerenciar fotos</button><button class="hf-button" data-toggle="'+x.id+'" data-published="'+String(!x.published)+'">'+(x.published?'DESPUBLICAR':'PUBLICAR NA LOJA')+'</button><button class="hf-button secondary" data-edit="'+x.id+'">Editar</button><a class="hf-button secondary" target="_blank" rel="noopener" href="/fotos/#evento='+x.id+'">'+(x.published?'Abrir na loja ↗':'Prévia privada ↗')+'</a></td></tr>').join('')+'</tbody></table></div></section>'
 +'<section class="hf-box" id="hf-photo-box"><h3>Upload de fotografias originais</h3><div class="hf-event-hint '+(selectedEvent?.published?'published':'')+'"><strong>'+(selectedEvent?'Evento selecionado: '+e(selectedEvent.title):'Selecione um evento abaixo')+'</strong>'+(selectedEvent?(selectedEvent.published?'PUBLICADO — visível aos clientes na loja.':'RASCUNHO — as fotos estão armazenadas, mas o público ainda não consegue ver o evento.')+' Fotografias disponíveis: '+selectedReady+'.':'O upload só fica disponível quando um evento é selecionado.')+(selectedEvent?'<div class="hf-event-actions"><a class="hf-button secondary" target="_blank" rel="noopener" href="/fotos/#evento='+selectedEvent.id+'">'+(selectedEvent.published?'VISUALIZAR NA LOJA ↗':'PRÉVIA PRIVADA ↗')+'</a>'+(selectedEvent.published?'<button class="hf-button secondary" data-toggle="'+selectedEvent.id+'" data-published="false">DESPUBLICAR</button>':'<button class="hf-button" data-toggle="'+selectedEvent.id+'" data-published="true">PUBLICAR NA LOJA</button>')+'</div>':'')+'</div><p class="hf-tip">Selecione um evento, escolha as fotos e envie. Os arquivos originais nunca são reduzidos nem recebem marca d’água. Somente as prévias públicas são comprimidas e marcadas.</p><label>Evento <select id="hf-event"><option value="">Selecione</option>'+eventOptions()+'</select></label><div class="hf-upload"><input id="hf-files" type="file" accept="image/jpeg,image/png,image/webp" multiple><p class="hf-tip">JPG, PNG ou WebP. Até 70 MB por arquivo. Envio direto para o Cloudflare R2.</p><button class="hf-button" id="hf-upload" type="button">ENVIAR FOTOS</button><p id="hf-progress" role="status"></p></div><div class="hf-thumbs">'+state.photos.filter(p=>p.event_id===activeEvent).map(p=>'<article class="hf-photo"><img loading="lazy" src="/api/fotos/preview/'+p.id+'" alt=""><small>'+e(p.filename)+'</small><small>'+e(p.status)+'</small><div class="hf-photo-actions"><button class="hf-button secondary" data-hide="'+p.id+'" data-hidden="'+String(p.status!=='hidden')+'">'+(p.status==='hidden'?'Exibir':'Ocultar')+'</button><button class="hf-button secondary" data-cover="'+p.id+'">Capa</button></div><a class="hf-original-link" href="/api/fotos/download/'+p.id+'" target="_blank" rel="noopener">BAIXAR ORIGINAL ↓</a></article>').join('')+'</div></section>'
 +'<section class="hf-box"><h3>Pedidos e pagamentos</h3><button class="hf-button secondary" id="hf-refresh">ATUALIZAR PAGAMENTOS</button><div class="hf-scroll"><table class="hf-table"><thead><tr><th>Data / pedido</th><th>Cliente</th><th>WhatsApp</th><th>Fotos</th><th>Valor</th><th>Pagamento</th><th>Entrega manual</th></tr></thead><tbody>'+orders.map(o=>{const c=state.customers.find(x=>x.id===o.customer_id),items=state.items.filter(x=>x.order_id===o.id);return '<tr><td>'+new Date(o.created_at).toLocaleString('pt-BR')+'<br><small>'+o.id+'</small></td><td>'+e(o.buyer_name||c?.name)+'</td><td><a href="https://wa.me/'+e((o.buyer_whatsapp||c?.whatsapp||'').startsWith('55')?(o.buyer_whatsapp||c?.whatsapp||''):'55'+(o.buyer_whatsapp||c?.whatsapp||''))+'" target="_blank" rel="noopener">'+e(o.buyer_whatsapp||c?.whatsapp)+'</a></td><td>'+items.length+'<details><summary>Ver fotos</summary>'+items.map(i=>'<p>'+e(i.filename_snapshot)+'</p>').join('')+'</details></td><td>'+money(o.total_cents)+'</td><td><strong class="hf-status">'+e(o.status)+'</strong><br><small>'+e(o.payment_status)+'</small><br><button class="hf-button secondary" data-check="'+o.id+'">Conferir Mercado Pago</button></td><td>'+items.map(i=>'<a class="hf-button secondary" href="/api/fotos/download/'+i.photo_id+'?pedido='+o.id+'" target="_blank" rel="noopener">Baixar '+e(i.filename_snapshot)+'</a>').join('')+'</td></tr>';}).join('')+'</tbody></table></div></section>'
 +'<section class="hf-box"><h3>CRM / Clientes</h3><div class="hf-scroll"><table class="hf-table"><thead><tr><th>Nome</th><th>WhatsApp</th><th>E-mail</th><th>Compras</th><th>Última compra</th></tr></thead><tbody>'+state.customers.map(c=>'<tr><td>'+e(c.name)+'</td><td><a target="_blank" rel="noopener" href="https://wa.me/'+e(c.whatsapp.startsWith('55')?c.whatsapp:'55'+c.whatsapp)+'">'+e(c.whatsapp)+'</a></td><td>'+e(c.email)+'</td><td>'+orders.filter(o=>o.customer_id===c.id).length+'</td><td>'+e(c.last_purchase_at?new Date(c.last_purchase_at).toLocaleString('pt-BR'):'—')+'</td></tr>').join('')+'</tbody></table></div></section>';
 bind(container);
}
async function refresh(container){state=await api('dashboard');if(!activeEvent&&state.events.length)activeEvent=state.events[0].id;draw(container);}
// Marca d'água original fornecida pelo estúdio. O PNG permanece em public/fotos/marca-dagua.png.
let watermarkImagePromise;
function getWatermarkImage(){
 if(!watermarkImagePromise){
  watermarkImagePromise=new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>img.naturalWidth>0?resolve(img):reject(Error('Marca d\'água inválida.'));
   img.onerror=()=>reject(Error('Marca d\'água ausente. Publique o arquivo fornecido em public/fotos/marca-dagua.png na branch teste.'));
   img.src='/fotos/marca-dagua.png';
  }).catch(error=>{watermarkImagePromise=undefined;throw error;});
 }
 return watermarkImagePromise;
}
async function watermarkPreview(file){
 let bitmap;
 try{
  // Carregamos antes de criar a prévia para impedir qualquer imagem pública sem marca d'água.
  const mark=await getWatermarkImage();
  bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1500/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Navegador sem suporte a edição de imagens.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  // Preserve a proporção original do padrão enviado e cubra toda a imagem.
  const patternScale=Math.max(canvas.width/mark.naturalWidth,canvas.height/mark.naturalHeight);
  const markWidth=mark.naturalWidth*patternScale;
  const markHeight=mark.naturalHeight*patternScale;
  ctx.save();
  ctx.globalAlpha=.68;
  ctx.drawImage(mark,(canvas.width-markWidth)/2,(canvas.height-markHeight)/2,markWidth,markHeight);
  ctx.restore();
  const preview=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Falha ao exportar a prévia.')),'image/webp',.78));
  return preview;
 }finally{bitmap?.close();}
}
async function uploadFiles(container){
 if(!activeEvent)return notice('Selecione um evento antes de enviar.',true);
 const files=[...container.querySelector('#hf-files').files];if(!files.length)return notice('Escolha uma ou mais fotos.',true);
 const button=container.querySelector('#hf-upload');button.disabled=true;
 let done=0;for(const file of files){try{
  container.querySelector('#hf-progress').textContent='Preparando '+(done+1)+' / '+files.length+': '+file.name;
  const preview=await watermarkPreview(file);
  const sign=await api('sign-upload','POST',{eventId:activeEvent,filename:file.name,type:file.type,size:file.size});
  for(const [url,blob] of [[sign.originalUrl,file],[sign.previewUrl,preview]]){const resp=await fetch(url,{method:'PUT',headers:{'Content-Type':blob===file?file.type:'image/webp',...(blob===file?{'Content-Disposition':'attachment; filename="'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')+'"'}:{})},body:blob});if(!resp.ok)throw Error('Falha de envio ao Cloudflare R2: '+resp.status);}
  await api('finish-upload','POST',{photoId:sign.photoId});done++;
 }catch(err){notice('Erro em '+file.name+': '+err.message,true);break;}}
 button.disabled=false;container.querySelector('#hf-progress').textContent=done+' de '+files.length+' fotografias enviadas com sucesso.';
 if(done)await refresh(container);
}
async function diagnostics(container){
 const out=container.querySelector('#hf-diagnostic-result');
 if(!out)return;
 out.textContent='Verificando Supabase, R2 e arquivo de marca d\'água...';
 try{
  const d=await api('diagnostics');
  let markOkay=false;
  try{await getWatermarkImage();markOkay=true;}catch{}
  const checks=[
   ['Supabase',d.database],
   ['Cloudflare R2',d.r2],
   ['Mercado Pago', {ok:d.mercadoPago?.configured,message:d.mercadoPago?.message||'Credenciais pendentes'}],
   ['Arquivo da marca d\'água',{ok:markOkay,message:markOkay?'Marca Hax Estúdio carregada': 'Falta enviar public/fotos/marca-dagua.png ao GitHub'}]
  ];
  out.innerHTML='<ul>'+checks.map(([name,check])=>'<li><strong>'+e(name)+': '+(check.ok?'OK':'PENDENTE')+'</strong> — '+e(check.message||'')+'</li>').join('')+'</ul><p class="hf-tip">'+e(d.notes||'')+'</p>';
 }catch(error){out.textContent='Falha no diagnóstico: '+error.message;}
}
function bind(container){
 container.querySelector('#hf-diagnostics')?.addEventListener('click',()=>diagnostics(container));
 container.querySelector('#hf-create').onsubmit=async(ev)=>{ev.preventDefault();const b=Object.fromEntries(new FormData(ev.target));try{const d=await api('event','POST',b);activeEvent=d.event.id;await refresh(container);notice('Evento criado! Envie as fotos antes de publicar.');}catch(x){notice(x.message,true);}};
 container.querySelector('#hf-event').onchange=ev=>{activeEvent=ev.target.value;draw(container);};
 container.querySelector('#hf-upload').onclick=()=>uploadFiles(container);
 container.querySelector('#hf-refresh').onclick=async()=>{const pending=state.orders.filter(o=>o.status==='pending');for(const p of pending){try{await api('order-status','POST',{id:p.id});}catch{}}await refresh(container);notice('Consulta de pagamentos concluída.');};
 container.querySelectorAll('[data-manage]').forEach(b=>b.onclick=()=>{activeEvent=b.dataset.manage;draw(container);container.querySelector('#hf-photo-box').scrollIntoView({behavior:'smooth'});});
 container.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{
  const publish=b.dataset.published==='true';
  if(publish&&!confirm('Publicar este evento e liberar suas prévias para todos os visitantes da loja?'))return;
  b.disabled=true;
  try{
   await api('event','PATCH',{id:b.dataset.toggle,published:publish});
   await refresh(container);
   notice(publish?'Evento publicado! Agora aparece em /fotos/.':'Evento despublicado; permanece salvo para o administrador.');
  }catch(x){b.disabled=false;notice(x.message,true);}
 });
 container.querySelectorAll('[data-edit]').forEach(b=>b.onclick=async()=>{const x=state.events.find(e=>e.id===b.dataset.edit);const title=prompt('Nome do evento:',x.title),price=prompt('Preço por fotografia em R$:',String(x.price_cents/100));if(title===null||price===null)return;try{await api('event','PATCH',{id:x.id,title,price});await refresh(container);}catch(error){notice(error.message,true);}});
 container.querySelectorAll('[data-hide]').forEach(b=>b.onclick=async()=>{try{await api('hide-photo','POST',{id:b.dataset.hide,hidden:b.dataset.hidden==='true'});await refresh(container);}catch(x){notice(x.message,true);}});
 container.querySelectorAll('[data-cover]').forEach(b=>b.onclick=async()=>{try{await api('event','PATCH',{id:activeEvent,cover_photo_id:b.dataset.cover});await refresh(container);notice('Capa atualizada.');}catch(x){notice(x.message,true);}});
 container.querySelectorAll('[data-check]').forEach(b=>b.onclick=async()=>{try{const v=await api('order-status','POST',{id:b.dataset.check});await refresh(container);notice('Status: '+v.status);}catch(x){notice(x.message,true);}});
}
export async function mount(container){container.innerHTML='<p>Carregando eventos e vendas...</p>';try{await refresh(container);}catch(e){container.innerHTML='<p style="color:#b2342b">Não foi possível carregar HAX Fotos: '+e.message+'</p><p>Confira as variáveis e as tabelas antes de começar.</p><button class="hf-button" id="hf-diagnostics">Verificar conexões</button><div id="hf-diagnostic-result"></div>';container.querySelector('#hf-diagnostics').onclick=()=>diagnostics(container);}}
