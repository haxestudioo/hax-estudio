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
