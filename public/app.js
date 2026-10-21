import {schedulePromotion,setupPlans} from './plans.js';
import { renderPage, renderGallery, wa, icon, packagePrice, isQuoteOnly } from './ui.js';
import { preview } from './build-config.js';
import {upgradeContent} from './content-model.js';
import {readPreview} from './preview-store.js';
let data=await fetch('/content.json').then(r=>r.json());
if(preview){data=(await readPreview())||data;}
else{try{const r=await fetch('/api/content',{signal:AbortSignal.timeout(5000)});if(r.ok){const payload=await r.json();data=payload.content||data;}}catch{}}
data=upgradeContent(data);
const app=document.querySelector('#app');
app.innerHTML=renderPage(data);
for(const [key,value] of Object.entries(data.colors))document.documentElement.style.setProperty('--'+key,value);
document.title=data.site.seoTitle;
document.querySelector('meta[name="description"]').content=data.site.seoDescription;
for(const [property,value] of [['og:title',data.site.seoTitle],['og:description',data.site.seoDescription]]){const meta=document.querySelector('meta[property="'+property+'"]');if(meta)meta.content=value;}
const schemaNode=document.querySelector('script[type="application/ld+json"]');
if(schemaNode){try{const schema=JSON.parse(schemaNode.textContent);schema.name=data.site.brand;schema.description=data.site.seoDescription;schema.telephone='+'+data.site.whatsapp;schema.sameAs=['https://www.instagram.com/'+data.site.instagram+'/'];schema.hasOfferCatalog.itemListElement=data.packages.filter(p=>p.active).map(p=>({'@type':'Offer',...(isQuoteOnly(p)?{}:{price:packagePrice(p,data),priceCurrency:'BRL'}),itemOffered:{'@type':'Service',name:p.name,description:p.features.join('. ')}}));schemaNode.textContent=JSON.stringify(schema);}catch{}}

let chosenDate='';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const header=$('.header'),menu=$('.menu-toggle');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');$('#main-nav').classList.toggle('open',open);});
$$('#main-nav a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');$('#main-nav').classList.remove('open');}));
let ticking=false;window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{header.classList.toggle('scrolled',scrollY>140);ticking=false;});ticking=true;}},{passive:true});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.protected-image,.gallery-item,.video-poster'))e.preventDefault();});
document.addEventListener('dragstart',e=>{if(e.target.closest('.protected-image'))e.preventDefault();});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');reveal.unobserve(e.target);}}),{threshold:.08});
if(!reduced)$$('.reveal').forEach((e,i)=>{e.classList.add('will-reveal');e.style.setProperty('--reveal-delay',(i%2)*100+'ms');reveal.observe(e);});
$$('[data-more-photos]').forEach(button=>button.addEventListener('click',()=>{
 const cat=button.dataset.morePhotos,target=$('#gallery-'+cat);
 if(!target)return;
 target.innerHTML=renderGallery(data,cat,true,Number(button.dataset.limit),Number(button.dataset.offset));
 button.setAttribute('aria-expanded','true');button.hidden=true;
}));
const chapterObserver=new IntersectionObserver(entries=>{
 const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
 if(!active)return;
 $$('[data-chapter-link]').forEach(link=>{const current=link.dataset.chapterLink===active.target.id;link.classList.toggle('is-current',current);if(current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
},{rootMargin:'-15% 0px -45% 0px',threshold:[0,.1,.25,.5]});
$$('[data-story-chapter]').forEach(section=>chapterObserver.observe(section));
const inquiry=$('#quick-inquiry');
if(inquiry){
 const dateInput=inquiry.querySelector('[name="date"]');
 dateInput.min=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 inquiry.addEventListener('submit',e=>{
  e.preventDefault();if(!inquiry.reportValidity())return;
  const name=inquiry.querySelector('[name="name"]').value.trim(),date=dateInput.value.split('-').reverse().join('/'),service=inquiry.querySelector('[name="service"]').value;
  if(!name){inquiry.querySelector('[name="name"]').focus();return;}
  window.open(wa(data,`Olá, Leanderson! Meu nome é ${name}. Tenho interesse em ${service.toLowerCase()} para ${date}. Gostaria de consultar a disponibilidade e receber um orçamento.`),'_blank','noopener,noreferrer');
 });
}
const dialogFocus=new WeakMap();
function showDialog(dialog){
 if(!dialog||dialog.open)return;
 const other=$('dialog[open]');
 const trigger=other?dialogFocus.get(other):document.activeElement;
 if(other)other.close();
 dialogFocus.set(dialog,trigger);dialog.showModal();document.body.classList.add('dialog-open');
 if(dialog.id==='promo-dialog')dialog.dispatchEvent(new Event('hax:promo-open'));
}
setupPlans(data,showDialog,{getDate:()=>chosenDate});
$$('[data-open-promo]').forEach(b=>b.addEventListener('click',()=>showDialog($('#promo-dialog'))));
$('#privacy-open').addEventListener('click',()=>showDialog($('#privacy-dialog')));
$$('dialog').forEach(d=>{d.querySelector('[data-close-dialog]').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>{if(!$('dialog[open]')){document.body.classList.remove('dialog-open');dialogFocus.get(d)?.focus();}});});
schedulePromotion(data.promotion,showDialog);
// Load players only when a film is close to view. One player runs at a time.
let ytPromise;function loadYT(){if(window.YT?.Player)return Promise.resolve(window.YT);if(ytPromise)return ytPromise;ytPromise=new Promise((resolve,reject)=>{window.onYouTubeIframeAPIReady=()=>resolve(window.YT);const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=reject;document.head.append(s);setTimeout(()=>{if(!window.YT?.Player)reject(new Error('player unavailable'));},15000);});return ytPromise;}
const players=new Map(),ratios=new Map();let activeVideo=null;
function labelSound(el,on){const b=el.querySelector('[data-sound]');b.innerHTML=icon(on?'sound':'mute')+'<span>'+(on?'Silenciar':'Ativar som')+'</span>';b.setAttribute('aria-label',on?'Silenciar vídeo':'Reproduzir vídeo com som');}
function pauseOthers(except){players.forEach((state,el)=>{if(el!==except&&state.ready){state.player.pauseVideo();state.player.mute();labelSound(el,false);}});}
async function ensurePlayer(el){if(players.has(el))return players.get(el);const state={player:null,ready:false,userPaused:false,wantSound:false,failed:false};players.set(el,state);try{const YT=await loadYT();const mount=document.createElement('div');el.querySelector('.player-mount').append(mount);state.player=new YT.Player(mount,{host:'https://www.youtube-nocookie.com',videoId:el.dataset.video,playerVars:{autoplay:0,mute:1,controls:0,playsinline:1,rel:0,fs:0,disablekb:1,loop:1,playlist:el.dataset.video,origin:location.origin},events:{onReady:()=>{state.ready=true;state.player.mute();state.player.getIframe().setAttribute('tabindex','-1');state.player.getIframe().setAttribute('title',el.dataset.title);if(state.wantSound){pauseOthers(el);state.player.unMute();state.player.playVideo();labelSound(el,true);}else chooseVideo();},onStateChange:e=>{el.classList.toggle('playing',e.data===1);el.querySelector('[data-pause]').innerHTML=icon(e.data===1?'pause':'play');el.querySelector('[data-pause]').setAttribute('aria-label',e.data===1?'Pausar vídeo':'Reproduzir vídeo');if(e.data===1)el.querySelector('.video-feedback').textContent='';},onAutoplayBlocked:()=>{el.querySelector('.video-feedback').textContent='Toque para assistir';},onError:()=>{state.failed=true;el.classList.remove('playing');el.querySelector('.video-feedback').textContent='Este filme está indisponível no momento.';}}});}catch{state.failed=true;el.querySelector('.video-feedback').textContent='Toque para tentar reproduzir o filme.';}return state;}
function chooseVideo(){if(document.hidden)return;const best=[...ratios.entries()].filter(([el,r])=>r>.25&&!players.get(el)?.userPaused).sort((a,b)=>b[1]-a[1])[0]?.[0];players.forEach((s,el)=>{if(s.ready&&el!==best){s.player.pauseVideo();s.player.mute();labelSound(el,false);}});if(best&&!reduced){const s=players.get(best);if(s?.ready&&!s.userPaused&&!s.failed){activeVideo=best;s.player.playVideo();}}}
const videoObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{ratios.set(e.target,e.intersectionRatio);if(e.isIntersecting)ensurePlayer(e.target);});chooseVideo();},{threshold:[0,.25,.5,.75,1]});
$$('.video-shell').forEach(el=>{if(!el.dataset.video)return;videoObserver.observe(el);const sound=async()=>{let s=players.get(el);if(s?.failed){s.player?.destroy?.();players.delete(el);ytPromise=null;el.querySelector('.player-mount').innerHTML='';}s=await ensurePlayer(el);s.userPaused=false;if(!s.ready){s.wantSound=true;el.querySelector('.video-feedback').textContent='Carregando o filme…';return;}pauseOthers(el);activeVideo=el;const muted=s.player.isMuted();s.player.playVideo();if(muted)s.player.unMute();else s.player.mute();labelSound(el,muted);};el.querySelector('[data-sound]').addEventListener('click',e=>{e.stopPropagation();sound();});el.addEventListener('click',e=>{if(!e.target.closest('button'))sound();});el.querySelector('[data-pause]').addEventListener('click',async e=>{e.stopPropagation();const s=await ensurePlayer(el);if(!s.ready)return;if(s.player.getPlayerState()===1){s.userPaused=true;s.player.pauseVideo();}else{s.userPaused=false;pauseOthers(el);s.player.playVideo();}});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(s=>{if(s.ready)s.player.pauseVideo();});else chooseVideo();});
// The calendar never infers availability from an offline/error response.
if($('#calendar-days')){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const [y,m]=today.split('-').map(Number);let cursor=new Date(Date.UTC(y,m-1,1)),statuses={},connected=false,requestNo=0,loading=false;
 const monthKey=()=>cursor.toISOString().slice(0,7);
 function paint(){const year=cursor.getUTCFullYear(),month=cursor.getUTCMonth(),days=new Date(Date.UTC(year,month+1,0)).getUTCDate(),first=cursor.getUTCDay();$('#calendar-month').textContent=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(cursor);$('#prev-month').disabled=monthKey()<=today.slice(0,7);$('#next-month').disabled=(year-y)*12+month-(m-1)>=18;$('#calendar-days').innerHTML='<span></span>'.repeat(first)+Array.from({length:days},(_,i)=>{const date=monthKey()+'-'+String(i+1).padStart(2,'0'),s=connected?(statuses[date]||'unknown'):'unknown',past=date<today;return `<button class="${s}${date===chosenDate?' selected':''}${date===today?' today':''}" ${past?'disabled':''} data-date="${date}" aria-pressed="${date===chosenDate}" aria-label="${i+1} de ${$('#calendar-month').textContent}: ${past?'data passada':s==='available'?'disponível':s==='busy'?'indisponível':'a consultar'}">${i+1}</button>`;}).join('');$('#calendar-days').querySelectorAll('button:not(:disabled)').forEach(b=>b.addEventListener('click',()=>{chosenDate=b.dataset.date;paint();selectedStatus();}));}
 function selectedStatus(){const status=statuses[chosenDate],date=chosenDate?.split('-').reverse().join('/');$('#calendar-status').textContent=chosenDate?(connected?status==='available'?`${date} está disponível. Vamos conversar sobre a sua reserva?`:status==='busy'?`${date} está indisponível. Vamos encontrar outra data?`:`Vamos confirmar a disponibilidade de ${date} pelo WhatsApp.`:`Vamos confirmar a disponibilidade de ${date} pelo WhatsApp.`):(loading?'Consultando a agenda…':connected?'Escolha uma data para conversar sobre sua celebração.':'Consulte sua data diretamente com a Hax Estúdio pelo WhatsApp.');$('#date-whatsapp').href=wa(data,chosenDate?`Olá, Leanderson! Gostaria de ${connected&&status==='busy'?'conversar sobre outras datas, pois vi que':'consultar a disponibilidade para'} ${date}${connected&&status==='busy'?' está indisponível.':'.'} Tenho interesse nos serviços da Hax Estúdio.`:'Olá, Leanderson! Gostaria de consultar uma data para meu evento.');}
 async function loadMonth(){const n=++requestNo;connected=false;statuses={};loading=true;paint();selectedStatus();if(!preview){try{const r=await fetch('/api/availability?month='+monthKey(),{signal:AbortSignal.timeout(12000)});const result=await r.json();if(n!==requestNo)return;if(r.ok&&result.connected===true){connected=true;statuses=result.days||{};}}catch{}}if(n!==requestNo)return;loading=false;paint();selectedStatus();}
 $('#prev-month').addEventListener('click',()=>{cursor.setUTCMonth(cursor.getUTCMonth()-1);loadMonth();});$('#next-month').addEventListener('click',()=>{cursor.setUTCMonth(cursor.getUTCMonth()+1);loadMonth();});loadMonth();
}
