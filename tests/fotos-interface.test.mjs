import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html=readFileSync(new URL('../public/fotos/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/fotos/fotos.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/fotos/fotos.js',import.meta.url),'utf8');
const id='10000000-1000-4000-8000-100000000000';
const p1='20000000-1000-4000-8000-100000000000';
const p2='20000000-1000-4000-8000-200000000000';

test('formulário inclui nome, WhatsApp e e-mail conforme Mercado Pago',()=>{
 const dom=new JSDOM(html,{url:'https://example.org/fotos/'});
 const document=dom.window.document;
 assert.equal(document.querySelector('a.brand')?.getAttribute('href'),'/fotos/');
 assert.match(document.querySelector('.hero h1')?.textContent||'',/ENCONTRE SUA FOTO!/);
 assert.ok(document.querySelector('#event-search'));
 assert.equal(document.querySelector('#filter'),null);
 assert.equal(document.querySelector('input[name=email]')?.required,true);
 assert.equal(document.querySelector('input[name=email]')?.type,'email');
 assert.ok(document.querySelector('input[name=name]'));
 assert.ok(document.querySelector('input[name=whatsapp]'));
 assert.equal(document.querySelector('input[name=waReceipt]'),null);
 assert.equal(document.querySelector('input[name=waReminder]'),null);
 assert.ok(document.querySelector('#approved.hidden #download-support-whatsapp'));
 assert.ok(document.querySelector('#card-option a'));
 assert.ok(document.querySelector('#light-prev'));
 assert.ok(document.querySelector('#light-next'));
 assert.ok(document.querySelector('#zoom-in'));
 assert.ok(document.querySelector('#zoom-out'));
 assert.ok(document.querySelector('#zoom-reset'));
 dom.window.close();
});

test('CSS protege largura da página e oferece visor móvel com imagens proporcionais',()=>{
 assert.match(css,/overflow-x:clip/);
 assert.match(css,/\.photo-viewer\[open\]/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(css,/\.photo-viewer\.is-portrait #large-photo/);
 assert.match(css,/font-family:'Barlow Condensed'/);
});

test('busca de eventos e navegação das fotos por botão e gesto',async()=>{
 const dom=new JSDOM(html,{url:'https://example.org/fotos/',runScripts:'outside-only',pretendToBeVisual:true});
 const {window}=dom,document=window.document;
 window.HTMLElement.prototype.scrollIntoView=function(){};
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 window.fetch=async(url)=>{
  const path=String(url).replace('/api/fotos/','');
  if(path==='events')return {ok:true,json:async()=>({events:[{id,title:'Corrida da Serra',description:'Prova de montanha',price_cents:1500,cover_photo_id:null},{id:'30000000-1000-4000-8000-300000000000',title:'Festival',description:'Shows',price_cents:1000,cover_photo_id:null}]})};
  if(path==='event/'+id)return {ok:true,json:async()=>({event:{id,title:'Corrida da Serra',description:'',price_cents:1500,preview_only:false},photos:[{id:p1,filename:'01.jpg',preview:'/api/fotos/preview/'+p1},{id:p2,filename:'02.jpg',preview:'/api/fotos/preview/'+p2}]})};
  throw Error('Unexpected test request '+path);
 };
 window.eval(js);
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(document.querySelectorAll('[data-event]').length,2);
 const query=document.querySelector('#event-search');
 query.value='serra';query.dispatchEvent(new window.Event('input',{bubbles:true}));
 assert.equal(document.querySelectorAll('[data-event]').length,1);
 document.querySelector('[data-event]').click();
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(document.querySelectorAll('[data-preview]').length,2);
 document.querySelector('[data-preview]').click();
 assert.equal(document.querySelector('#lightbox').open,true);
 assert.equal(document.querySelector('#light-position').textContent,'1 / 2');
 assert.equal(document.querySelector('#light-select').textContent,'SELECIONAR FOTO');
 document.querySelector('#light-select').click();
 assert.equal(document.querySelector('#light-select').textContent,'REMOVER FOTO');
 assert.equal(document.querySelector('#light-select').classList.contains('is-selected'),true);
 document.querySelector('#light-select').click();
 assert.equal(document.querySelector('#light-select').textContent,'SELECIONAR FOTO');
 document.querySelector('#zoom-in').click();
 assert.equal(document.querySelector('#zoom-reset').textContent,'150%');
 assert.equal(document.querySelector('#large-photo').style.getPropertyValue('--photo-zoom'),'1.5');
 assert.equal(document.querySelector('#zoom-out').disabled,false);
 document.querySelector('#zoom-out').click();
 assert.equal(document.querySelector('#zoom-reset').textContent,'100%');
 document.querySelector('#zoom-in').click();
 document.querySelector('#zoom-in').click();
 assert.equal(document.querySelector('#zoom-reset').textContent,'200%');
 document.querySelector('#light-next').click();
 assert.equal(document.querySelector('#light-position').textContent,'2 / 2');
 assert.equal(document.querySelector('#zoom-reset').textContent,'100%');
 const stage=document.querySelector('#viewer-stage');
 const from=new window.Event('touchstart',{bubbles:true});
 Object.defineProperty(from,'touches',{value:[{clientX:280,clientY:280}]});
 stage.dispatchEvent(from);
 const to=new window.Event('touchend',{bubbles:true});
 Object.defineProperty(to,'changedTouches',{value:[{clientX:85,clientY:285}]});
 stage.dispatchEvent(to);
 assert.equal(document.querySelector('#light-position').textContent,'2 / 2');
 document.querySelector('#light-prev').click();
 assert.equal(document.querySelector('#light-position').textContent,'1 / 2');
 const swipeStart=new window.Event('touchstart',{bubbles:true});
 Object.defineProperty(swipeStart,'touches',{value:[{clientX:265,clientY:290}]});
 stage.dispatchEvent(swipeStart);
 const swipeEnd=new window.Event('touchend',{bubbles:true});
 Object.defineProperty(swipeEnd,'changedTouches',{value:[{clientX:55,clientY:292}]});
 stage.dispatchEvent(swipeEnd);
 assert.equal(document.querySelector('#light-position').textContent,'2 / 2');
 // Quando há ampliação, deslizar move a imagem, sem passar de fotografia por acidente.
 document.querySelector('#zoom-in').click();
 const panStart=new window.Event('touchstart',{bubbles:true});
 Object.defineProperty(panStart,'touches',{value:[{clientX:260,clientY:210}]});
 stage.dispatchEvent(panStart);
 const panMove=new window.Event('touchmove',{bubbles:true,cancelable:true});
 Object.defineProperty(panMove,'touches',{value:[{clientX:110,clientY:210}]});
 stage.dispatchEvent(panMove);
 const panEnd=new window.Event('touchend',{bubbles:true});
 Object.defineProperty(panEnd,'changedTouches',{value:[{clientX:110,clientY:210}]});
 stage.dispatchEvent(panEnd);
 assert.equal(document.querySelector('#light-position').textContent,'2 / 2');
 document.querySelector('#zoom-reset').click();
 assert.equal(document.querySelector('#zoom-reset').textContent,'100%');
 window.clearInterval?.(0);
 window.close();
});

test('pedido aprovado recuperado mostra originais e botões de download, não a tela Pix',async()=>{
 const token='test-token-for-approved-order-1234567890';
 const download='/api/fotos/download/'+p1+'?pedido='+id+'&chave='+token;
 const original=download+'&modo=visualizar';
 const dom=new JSDOM(html,{url:'https://example.org/fotos/?pedido='+id+'&chave='+token,runScripts:'outside-only',pretendToBeVisual:true});
 const {window}=dom,document=window.document;
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 window.fetch=async(url)=>{
  const path=String(url).replace('/api/fotos/','');
  if(path==='events')return {ok:true,json:async()=>({events:[]})};
  if(path==='order/'+id)return {ok:true,json:async()=>({id,event_id:id,status:'approved',items:[{id:p1,name:'Original.jpg',download,original}]})};
  throw Error('Unexpected test request '+path);
 };
 try{
  window.eval(js);await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(document.querySelector('#checkout').open,true);
  assert.equal(document.querySelector('#checkout-title').textContent,'Fotos liberadas!');
  assert.equal(document.querySelector('#approved').classList.contains('hidden'),false);
  assert.equal(document.querySelector('#payment').classList.contains('hidden'),true);
  assert.equal(document.querySelector('#checkout-items').classList.contains('hidden'),true);
  assert.equal(document.querySelector('.purchased-image img').getAttribute('src'),original);
  assert.equal(document.querySelector('.purchased-download').getAttribute('href'),download);
  assert.match(document.querySelector('.purchased-download').textContent,/BAIXAR FOTO/);
  assert.equal(document.querySelector('.purchased-alternatives a').getAttribute('href'),download);
  document.querySelector('.purchased-image img').dispatchEvent(new window.Event('error'));
  assert.equal(document.querySelector('.purchased-image-error').classList.contains('hidden'),false);
 }finally{window.close();}
});

test('suporte manual aparece só depois da aprovação e não compartilha o token do pedido',async()=>{
 const token='private-order-token-never-share-123456789';
 const dom=new JSDOM(html,{url:'https://example.org/fotos/?pedido='+id+'&chave='+token,runScripts:'outside-only',pretendToBeVisual:true});
 const {window}=dom,document=window.document;window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let status='pending';
 const download='/api/fotos/download/'+p1+'?pedido='+id+'&chave='+token;
 window.fetch=async url=>{const p=String(url);if(p==='/api/content')return {ok:true,json:async()=>({content:{site:{whatsapp:'5544991234567'}}})};if(p==='/api/fotos/events')return {ok:true,json:async()=>({events:[]})};if(p==='/api/fotos/order/'+id)return {ok:true,json:async()=>({id,event_id:id,status,items:status==='approved'?[{id:p1,name:'Foto.jpg',download,original:download+'&modo=visualizar'}]:[]})};throw Error('Unexpected test request '+p);};
 try{window.eval(js);await new Promise(r=>setTimeout(r,25));assert.ok(document.querySelector('#approved').classList.contains('hidden'));assert.equal(document.querySelector('#card-option').classList.contains('hidden'),false);
 status='approved';window.dispatchEvent(new window.Event('focus'));await new Promise(r=>setTimeout(r,25));assert.equal(document.querySelector('#approved').classList.contains('hidden'),false);assert.ok(document.querySelector('#card-option').classList.contains('hidden'));const url=new URL(document.querySelector('#download-support-whatsapp').href);assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/5544991234567');assert.match(url.searchParams.get('text'),/preciso de ajuda/);assert.ok(url.searchParams.get('text').includes(id));assert.ok(!url.searchParams.get('text').includes(token));assert.ok(document.querySelector('.purchased-download'));}finally{window.close();}
});

test('galeria progressiva preserva imagens carregadas, carrinho, ampliação e fallback',async()=>{
 const dom=new JSDOM(html,{url:'https://example.org/fotos/',runScripts:'outside-only',pretendToBeVisual:true});
 const {window}=dom,document=window.document;window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const photos=Array.from({length:65},(_,i)=>({id:'20000000-1000-4000-8000-'+String(i+1).padStart(12,'0'),filename:'Foto '+(i+1)+'.jpg',preview:'https://example.r2.cloudflarestorage.com/hax/previas/'+i+'.webp?signature=abc&v=1',preview_expires_at:new Date(Date.now()+600000).toISOString()}));
 let requests=0;window.fetch=async url=>{requests++;const path=String(url);if(path==='/api/fotos/events')return {ok:true,json:async()=>({events:[{id,title:'Evento',price_cents:1000}]})};if(path==='/api/fotos/event/'+id)return {ok:true,json:async()=>({event:{id,title:'Evento',price_cents:1000},photos})};if(path==='/api/content')return {ok:true,json:async()=>({content:{site:{whatsapp:'5544991234567'}}})};throw Error('Unexpected '+path);};
 try{window.eval(js);await new Promise(r=>setTimeout(r,20));document.querySelector('[data-event]').click();await new Promise(r=>setTimeout(r,20));
 assert.equal(document.querySelectorAll('#photos .tile').length,48);assert.match(document.querySelector('#gallery-progress').textContent,/48 de 65/);const image=document.querySelector('#photos img');assert.match(image.src,/r2.cloudflarestorage.com/);
 document.querySelector('[data-select]').click();assert.equal(document.querySelector('#photos img'),image);assert.equal(document.querySelector('#count').textContent,'1');
 image.dispatchEvent(new window.Event('error'));assert.equal(image.getAttribute('src'),'/api/fotos/preview/'+photos[0].id);
 const calls=requests;document.querySelector('#load-more').click();assert.equal(document.querySelectorAll('#photos .tile').length,65);assert.equal(document.querySelector('#photos img'),image);assert.equal(requests,calls);
 document.querySelectorAll('[data-select]')[64].click();document.querySelector('#open-cart').click();assert.match(document.querySelector('#checkout-items').textContent,/Foto 1.jpg/);assert.match(document.querySelector('#checkout-items').textContent,/Foto 65.jpg/);assert.equal(document.querySelector('#count').textContent,'2');
 }finally{window.close();}
});
test('consulta manual de Pix agrupa requisições simultâneas sem bloquear confirmação',async()=>{
 const token='test-order-token-for-polling-1234567890',dom=new JSDOM(html,{url:'https://example.org/fotos/?pedido='+id+'&chave='+token,runScripts:'outside-only',pretendToBeVisual:true});
 const {window}=dom,document=window.document;window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let calls=0,release,approved=false,compact=false;
 const response=()=>({ok:true,json:async()=>({id,event_id:id,status:approved?'approved':'pending',pix_code:approved?undefined:'PIX123',items:approved?[{id:p1,name:'Foto.jpg',download:'/api/fotos/download/'+p1}]:[]})});
 window.fetch=async (url,opt)=>{const p=String(url);if(p==='/api/fotos/events')return {ok:true,json:async()=>({events:[]})};if(p==='/api/content')return {ok:true,json:async()=>({})};if(p==='/api/fotos/order/'+id){calls++;if(calls===1)return response();compact=opt.headers['x-hax-status-only']==='1';return new Promise(resolve=>{release=()=>resolve(response());});}throw Error(p);};
 try{window.eval(js);await new Promise(r=>setTimeout(r,25));assert.equal(calls,1);assert.equal(document.querySelector('#pix-code').value,'PIX123');document.querySelector('#check-payment').click();window.dispatchEvent(new window.Event('focus'));assert.equal(calls,2);assert.equal(compact,true);approved=true;release();await new Promise(r=>setTimeout(r,25));assert.equal(document.querySelector('#approved').classList.contains('hidden'),false);assert.equal(calls,2);}finally{window.close();}
});
