const $=s=>document.querySelector(s),fmt=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let events=[],event=null,photos=[],selected=new Set(),lightId=null,lightIndex=-1,order=null,poll=null;
const savedCartKey=id=>'hax-cart-'+id;
function escapeHTML(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function api(path,options={}){const r=await fetch('/api/fotos/'+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})},cache:'no-store'});const b=await r.json();if(!r.ok)throw Error(b.error||'Falha na operação.');return b;}
function notify(s){$('#checkout-message').textContent=s||'';}
function renderEvents(){
 const term=($('#event-search')?.value||'').trim().toLocaleLowerCase('pt-BR');
 const matching=events.filter(x=>[x.title,x.description,x.event_date].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(term)));
 $('#events').innerHTML=matching.length?matching.map(e=>'<button class="event" data-event="'+e.id+'"><div class="event-image">'+(e.cover_photo_id?'<img loading="lazy" src="/api/fotos/preview/'+e.cover_photo_id+'" alt="">':'HAX')+'</div><div class="event-body"><small>'+escapeHTML(e.event_date?new Date(e.event_date+'T12:00:00').toLocaleDateString('pt-BR'):'GALERIA DISPONÍVEL')+'</small><h3>'+escapeHTML(e.title)+'</h3><span>VER FOTOGRAFIAS</span></div></button>').join(''):'<p class="muted">'+(term?'Nenhum evento encontrado. Tente outro nome.':'Novos eventos em breve.')+'</p>';
}
async function loadEvents(){try{({events}=await api('events'));renderEvents();}catch(e){$('#events').textContent=e.message;}}
function persistCart(){if(event)localStorage.setItem(savedCartKey(event.id),JSON.stringify([...selected]));}
function updateCart(){const count=selected.size;$('#count').textContent=count;$('#sticky-count').textContent=count+' foto'+(count===1?'':'s');$('#sticky-total').textContent=event?fmt(count*event.price_cents):'';$('#sticky-cart').classList.toggle('hidden',!count||!!event?.preview_only);$('#checkout-button').disabled=!count||!!event?.preview_only;}
function tiles(){
 $('#photos').innerHTML=photos.map(p=>'<article class="tile '+(selected.has(p.id)?'selected':'')+'"><button class="preview" data-preview="'+p.id+'" aria-label="Ampliar '+escapeHTML(p.filename)+'"><img loading="lazy" src="'+p.preview+'" alt="'+escapeHTML(p.filename)+'" draggable="false"></button><div class="tile-details"><span title="'+escapeHTML(p.filename)+'">'+escapeHTML(p.filename)+'</span><button data-select="'+p.id+'">'+(selected.has(p.id)?'✓ ESCOLHIDA':'+ ESCOLHER')+'</button></div></article>').join('')||'<p class="muted">Nenhuma fotografia disponível neste evento.</p>';
}
function select(id){selected.has(id)?selected.delete(id):selected.add(id);persistCart();tiles();updateCart();}
async function openEvent(id){try{const data=await api('event/'+id);event=data.event;photos=data.photos;const all=new Set(photos.map(p=>p.id));try{selected=new Set(JSON.parse(localStorage.getItem(savedCartKey(id))||'[]').filter(i=>all.has(i)));}catch{selected=new Set();}$('#event-title').textContent=event.title;$('#event-description').textContent=event.description||'';$('#draft-preview').classList.toggle('hidden',!event.preview_only);$('#photo-total').textContent=photos.length+' fotografias';$('#unit-price').textContent=fmt(event.price_cents)+' por foto';$('#gallery').classList.remove('hidden');$('#events').closest('section').classList.add('hidden');tiles();updateCart();history.replaceState({},'',location.pathname+'#evento='+id);$('#gallery').scrollIntoView({behavior:'smooth'});}catch(e){alert(e.message);}}
function cartOpen(){if(event?.preview_only){alert('Este evento está em rascunho. Publique no painel para habilitar compras.');return;}if(!selected.size){alert('Selecione uma ou mais fotos primeiro.');return;}$('#checkout-title').textContent='Finalizar pedido';$('#buyer').classList.remove('hidden');$('#payment').classList.add('hidden');$('#approved').classList.add('hidden');const list=photos.filter(p=>selected.has(p.id));$('#checkout-items').innerHTML='<div><strong>'+list.length+' fotografia(s)</strong><strong>'+fmt(list.length*event.price_cents)+'</strong></div><p class="sub">'+list.map(p=>escapeHTML(p.filename)).join(' · ')+'</p>';notify('');$('#checkout').showModal();}
function orderLink(){return location.origin+'/fotos/?pedido='+order.id+'&chave='+encodeURIComponent(order.token);}
function copyLink(){navigator.clipboard.writeText(orderLink()).then(()=>notify('Link do pedido copiado. Guarde para acessar depois.'),()=>notify('Não foi possível copiar automaticamente.'));}
function saveOrder(o){order=o;localStorage.setItem('hax-last-order',JSON.stringify(o));history.replaceState({},'',location.pathname+'?pedido='+o.id+'&chave='+encodeURIComponent(o.token));}
async function buyerSubmit(e){e.preventDefault();const button=$('#pay');button.disabled=true;notify('Gerando pagamento...');const form=new FormData(e.currentTarget);try{const data=await api('checkout',{method:'POST',body:JSON.stringify({eventId:event.id,photoIds:[...selected],name:String(form.get('name')).trim(),whatsapp:String(form.get('whatsapp'))})});saveOrder({id:data.orderId,token:data.token});$('#buyer').classList.add('hidden');$('#payment').classList.remove('hidden');notify('');renderPix(data);await refreshOrder();startPolling();}catch(e){notify(e.message);}finally{button.disabled=false;}}
function renderPix(data){$('#pix-code').value=data.pix_code||'';$('#qr').classList.toggle('hidden',!data.pix_qr_base64);if(data.pix_qr_base64)$('#qr').src='data:image/png;base64,'+data.pix_qr_base64;$('#payment-status').textContent='Pix gerado. Pague pelo aplicativo do seu banco. A confirmação acontece automaticamente.';}
async function refreshOrder(){if(!order)return;const d=await api('order/'+order.id,{headers:{'x-hax-order-token':order.token}});if(d.status==='approved'){clearInterval(poll);poll=null;$('#buyer').classList.add('hidden');$('#payment').classList.add('hidden');$('#approved').classList.remove('hidden');$('#checkout-title').textContent='Fotos liberadas!';$('#download-list').innerHTML=d.items.map(i=>'<a href="'+i.download+'" download rel="noreferrer">'+escapeHTML(i.name)+' <strong>BAIXAR ORIGINAL ↓</strong></a>').join('');notify('');localStorage.removeItem(savedCartKey(event?.id));selected.clear();updateCart();}else{$('#approved').classList.add('hidden');$('#payment').classList.remove('hidden');if(d.pix_code)renderPix(d);$('#payment-status').textContent=d.status==='pending'?'Aguardando confirmação do Pix. Seus arquivos estão reservados no pedido.':'Pagamento: '+d.status+'. Em caso de dúvida, fale com a HAX Estúdio.';}return d;}
function startPolling(){if(poll)clearInterval(poll);poll=setInterval(()=>{if(order&&document.visibilityState==='visible')refreshOrder().catch(()=>{})},9000);}
async function resume(id,token){if(!id||!token)return;saveOrder({id,token});$('#checkout').showModal();$('#checkout-title').textContent='Seu pedido';$('#buyer').classList.add('hidden');$('#payment').classList.remove('hidden');$('#approved').classList.add('hidden');notify('Consultando seu pedido...');try{await refreshOrder();startPolling();}catch(e){notify(e.message);}}
function recover(){let last;try{last=JSON.parse(localStorage.getItem('hax-last-order')||'null');}catch{}if(last?.id&&last?.token){resume(last.id,last.token);return;}const url=prompt('Cole aqui o link do seu pedido salvo ou recuperado:');if(!url)return;try{const u=new URL(url);if(u.origin!==location.origin)throw Error('Link inválido.');resume(u.searchParams.get('pedido'),u.searchParams.get('chave'));}catch{alert('Link inválido. Contate a HAX Estúdio e informe seu nome e WhatsApp.');}}
function updateViewer(){
 const p=photos[lightIndex];if(!p)return;
 lightId=p.id;
 const image=$('#large-photo');
 image.src=p.preview;
 image.alt='Foto '+(lightIndex+1)+' de '+photos.length+': '+p.filename;
 $('#viewer-blur').style.backgroundImage='url("'+p.preview+'")';
 $('#light-title').textContent=p.filename;
 $('#light-position').textContent=(lightIndex+1)+' / '+photos.length;
 $('#light-select').textContent=selected.has(lightId)?'✓ FOTO SELECIONADA':'SELECIONAR FOTO';
 $('#light-prev').disabled=lightIndex===0;
 $('#light-next').disabled=lightIndex===photos.length-1;
}
function openViewer(id){
 const index=photos.findIndex(x=>x.id===id);
 if(index===-1)return;
 lightIndex=index;updateViewer();$('#lightbox').showModal();
}
function navigateViewer(delta){
 if(!$('#lightbox').open)return;
 const next=lightIndex+delta;
 if(next>=0&&next<photos.length){lightIndex=next;updateViewer();}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-event],[data-select],[data-preview],[data-close]');
 if(!b)return;
 if(b.hasAttribute('data-event'))openEvent(b.dataset.event);
 if(b.hasAttribute('data-select')){select(b.dataset.select);if($('#lightbox').open&&lightId===b.dataset.select)updateViewer();}
 if(b.hasAttribute('data-preview'))openViewer(b.dataset.preview);
 if(b.hasAttribute('data-close'))b.closest('dialog')?.close();
});
$('#light-select').onclick=()=>{if(lightId)select(lightId);updateViewer();};
$('#light-prev').onclick=()=>navigateViewer(-1);
$('#light-next').onclick=()=>navigateViewer(1);
let swipeStart=null;
$('#viewer-stage').addEventListener('touchstart',e=>{
 if(e.touches.length!==1||e.target.closest('button'))return;
 swipeStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
},{passive:true});
$('#viewer-stage').addEventListener('touchend',e=>{
 if(!swipeStart||!e.changedTouches.length)return;
 const dx=e.changedTouches[0].clientX-swipeStart.x;
 const dy=e.changedTouches[0].clientY-swipeStart.y;
 swipeStart=null;
 if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.25)navigateViewer(dx<0?1:-1);
},{passive:true});
$('#viewer-stage').addEventListener('touchcancel',()=>{swipeStart=null;},{passive:true});
document.addEventListener('keydown',e=>{
 if(!$('#lightbox').open)return;
 if(e.key==='ArrowLeft'){e.preventDefault();navigateViewer(-1);}
 if(e.key==='ArrowRight'){e.preventDefault();navigateViewer(1);}
});
$('#open-cart').onclick=cartOpen;$('#checkout-button').onclick=cartOpen;$('#event-search').oninput=renderEvents;
$('#buyer').onsubmit=buyerSubmit;$('#recover').onclick=recover;$('#copy-link').onclick=copyLink;$('#download-again').onclick=copyLink;
$('#copy').onclick=()=>navigator.clipboard.writeText($('#pix-code').value).then(()=>notify('Código Pix copiado!'),()=>notify('Selecione o código e copie manualmente.'));
$('#back').onclick=()=>{event=null;selected.clear();$('#gallery').classList.add('hidden');$('#events').closest('section').classList.remove('hidden');updateCart();history.replaceState({},'',location.pathname+'#eventos');$('#events').scrollIntoView();};
$('#checkout').addEventListener('close',()=>{if(order)startPolling();});window.addEventListener('focus',()=>{if(order)refreshOrder().catch(()=>{});});
const params=new URLSearchParams(location.search);if(params.get('pedido')&&params.get('chave'))resume(params.get('pedido'),params.get('chave'));else{const id=location.hash.match(/evento=([0-9a-f-]+)/)?.[1];if(id)loadEvents().then(()=>openEvent(id));else loadEvents();}
