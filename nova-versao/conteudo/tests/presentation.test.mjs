import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import seed from '../src/content.json' with {type:'json'};
import {upgradeContent} from '../public/content-model.js';
import {validateContent} from '../netlify/lib/validate.mjs';
import {renderPage,renderPromotion} from '../public/ui.js';
import {schedulePromotion,promotionSeenKey} from '../public/promotion-popup.js';

function browser(html){
 const dom=new JSDOM(html,{url:'https://hax.test/',pretendToBeVisual:true});const w=dom.window;
 for(const k of ['window','document','location','localStorage','sessionStorage','HTMLElement','Event','MouseEvent','FormData'])globalThis[k]=k==='window'?w:w[k];
 globalThis.confirm=()=>true;w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 return dom;
}

test('Migração inclui os depoimentos existentes e preserva as edições e exclusões',()=>{
 const old=structuredClone(seed);old.version=3;delete old.testimonials;delete old.testimonialSettings;delete old.aboutAppearance;delete old.hero.overlay;delete old.promotion.autoOpen;
 old.texts.heroTitle='Título do proprietário';old.aboutPhoto='/assets/votos.webp';old.promotion.active=false;
 const next=upgradeContent(old);assert.equal(next.version,4);assert.equal(next.testimonials.length,2);assert.equal(next.hero.overlay,48);assert.equal(next.promotion.active,false);assert.equal(next.aboutPhoto,old.aboutPhoto);assert.equal(next.texts.heroTitle,old.texts.heroTitle);assert(validateContent(next));
 next.testimonials=[];next.hero.height='compact';next.aboutAppearance.size=165;next.promotion.delaySeconds=12;
 const again=upgradeContent(next);assert.deepEqual(again.testimonials,[]);assert.equal(again.aboutAppearance.size,165);assert.equal(again.hero.height,'compact');assert.equal(again.promotion.delaySeconds,12);assert(!renderPage(again).includes('id="depoimentos"'));
});

test('Pop-up adia abertura durante formulário, respeita frequência e não reabre após acesso manual',()=>{
 const dom=browser('<input id="name"><dialog id="promo-dialog"></dialog>');const doc=dom.window.document;
 const timeout=globalThis.setTimeout,clear=globalThis.clearTimeout;let id=0,opened=0;const timers=new Map();
 globalThis.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 const run=()=>{const now=[...timers.entries()];now.forEach(([id,{fn}])=>{if(timers.delete(id))fn();});};
 const show=el=>{opened++;el.showModal();el.dispatchEvent(new dom.window.Event('hax:promo-open'));};
 const p=structuredClone(seed.promotion);let cleanup=()=>{};
 try{
  cleanup=schedulePromotion(p,show,doc);assert.equal([...timers.values()][0].ms,5000);
  doc.querySelector('input').focus();run();assert.equal(opened,0);
  doc.querySelector('input').blur();run();assert.equal(opened,1);assert(doc.querySelector('dialog').open);doc.querySelector('dialog').close();cleanup();
  cleanup=schedulePromotion(p,show,doc);run();assert.equal(opened,1);cleanup();
  p.frequency='visit';cleanup=schedulePromotion(p,show,doc);run();assert.equal(opened,2);doc.querySelector('dialog').close();cleanup();
  cleanup=schedulePromotion(p,show,doc);show(doc.querySelector('dialog'));doc.querySelector('dialog').close();run();assert.equal(opened,3);cleanup();
  p.autoOpen=false;cleanup=schedulePromotion(p,show,doc);assert.equal(timers.size,0);run();assert.equal(opened,3);
  assert.notEqual(promotionSeenKey(p),promotionSeenKey({...p,discount:20}));
 }finally{cleanup();globalThis.setTimeout=timeout;globalThis.clearTimeout=clear;dom.window.close();}
});

test('Painel salva banner, retrato, depoimentos e campanha; uploads acompanham a ordem dos relatos',async()=>{
 const dom=browser(await fs.readFile(new URL('../dist/admin/index.html',import.meta.url),'utf8'));let saved,waitBitmap=null,uploads=0;
 const timeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>{const t=timeout(fn,ms,...args);if(ms>1000)t.unref();return t;};
 globalThis.createImageBitmap=async()=>{if(waitBitmap)await waitBitmap;return {width:1200,height:1500,close(){}};};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
 dom.window.HTMLCanvasElement.prototype.toBlob=function(cb,type){cb(new Blob(['webp'],{type}));};
 globalThis.fetch=async(url,opt={})=>{
  if(url==='/api/auth')return Response.json({configured:true,authenticated:true});
  if(url==='/api/calendar-settings')return Response.json({connected:false});
  if(url==='/api/upload')return Response.json({url:'/api/media/'+String(++uploads).padStart(32,'0')});
  if(url==='/api/content'&&opt.method==='PUT'){saved=JSON.parse(opt.body);validateContent(saved.content);return Response.json({revision:'rev2'});}
  if(url==='/api/content')return Response.json({content:structuredClone(seed),revision:'rev1'});
  return Response.json(structuredClone(seed));
 };
 const $=s=>document.querySelector(s);
 const input=(path,v)=>{const el=$(`[data-path="${path}"]`);if(el.type==='checkbox')el.checked=v;else el.value=v;el.dispatchEvent(new dom.window.Event('input'));};
 const file=el=>Object.defineProperty(el,'files',{value:[{name:'foto.jpg',type:'image/jpeg',size:100}]});
 const save=async()=>{await $('#save').onclick();assert(saved);return saved.content;};
 try{
  await import('../dist/admin/admin.js?presentation-test');
  $('[data-tab="hero"]').click();input('hero.alignment','left');input('hero.overlay',55);input('hero.showInquiry',false);input('texts.heroTitle','Um título editado');
  $('[data-tab="about"]').click();input('aboutAppearance.size',170);input('aboutAppearance.positionY',30);input('texts.aboutBody','Minha apresentação editada.');file($('[data-image-upload="aboutPhoto"]'));await $('[data-image-upload="aboutPhoto"]').onchange();
  $('[data-tab="testimonials"]').click();input('texts.testimonialsTitle','As palavras dos meus clientes');
  const thumb=$('[data-image-upload="testimonials.0.photo"]');file(thumb);let release;waitBitmap=new Promise(resolve=>release=resolve);const uploading=thumb.onchange();
  $('[data-move-list="testimonials"][data-move="0"][data-direction="1"]').click();release();await uploading;waitBitmap=null;
  let result=await save();assert.equal(result.testimonials[1].id,seed.testimonials[0].id);assert(result.testimonials[1].photo.startsWith('/api/media/'));assert.equal(result.testimonials[0].photo,seed.testimonials[1].photo);
  $('[data-add="testimonial"]').click();input('testimonials.2.name','Cliente de teste');input('testimonials.2.quote','Texto para verificar a edição.');input('testimonials.2.context','Ensaio');input('testimonials.2.active',true);
  const position=$('[data-position-list="testimonials"][data-position-index="2"]');position.value='0';position.onchange();
  $('[data-remove="testimonials"][data-index="1"]').click();input('testimonials.1.active',false);
  result=await save();assert.equal(result.testimonials.length,2);let doc=new JSDOM(renderPage(result)).window.document;assert.equal(doc.querySelectorAll('.testimonial-card').length,1);assert(doc.querySelector('.testimonial-card').textContent.includes('Texto para verificar'));assert(doc.querySelector('.testimonial-avatar span'));assert.equal(doc.querySelector('#quick-inquiry'),null);assert.equal(doc.querySelector('.hero-actions a').getAttribute('href'),'#agenda');assert.equal(doc.querySelector('h1').textContent,'Um título editado');assert(doc.querySelector('.about-image').getAttribute('style').includes('170px'));assert(doc.querySelector('.about-image img').src.includes('/api/media/'));
  input('testimonialSettings.enabled',false);result=await save();assert(!renderPage(result).includes('id="depoimentos"'));input('testimonialSettings.enabled',true);
  $('[data-tab="promotion"]').click();input('promotion.delaySeconds',2);input('promotion.frequency','visit');input('promotion.whatsappMessage','Quero os {desconto}% para {pacotes}.');file($('[data-image-upload="promotion.image"]'));await $('[data-image-upload="promotion.image"]').onchange();
  $('#preview-promotion').click();assert($('#promo-dialog').open);$('#promo-dialog [data-close-dialog]').click();assert(!$('#promo-dialog'));
  result=await save();doc=new JSDOM(renderPromotion(result)).window.document;assert(doc.querySelector('.promo-art img').src.includes('/api/media/'));const message=new URL(doc.querySelector('.promo-content .btn').href).searchParams.get('text');assert(message.includes('30%'));assert(message.includes('Romance'));assert(!message.includes('{pacotes}'));assert.equal(result.promotion.delaySeconds,2);assert.equal(result.promotion.frequency,'visit');
  input('promotion.active',false);result=await save();assert.equal(renderPromotion(result),'');assert(renderPromotion(result,true).includes('525'));assert(!renderPage(result).includes('hero-promo-badge'));assert.equal(uploads,3);
 }finally{globalThis.setTimeout=timeout;dom.window.close();}
});

test('Depoimentos e configurações recusam dados inválidos e escapam o texto público',async()=>{
 const d=structuredClone(seed);d.testimonials[0].name='<img src=x onerror=alert(1)>';d.testimonials[0].quote='<script>alert(1)</script>';const doc=new JSDOM(renderPage(d)).window.document;assert.equal(doc.querySelector('.testimonial-card script'),null);assert(doc.querySelector('.testimonial-card').textContent.includes('<script>'));assert.equal(doc.querySelector('.testimonial-avatar img').getAttribute('alt'),d.testimonials[0].name);
 for(const change of [x=>x.aboutAppearance.size=900,x=>x.hero.overlay=99,x=>x.promotion.delaySeconds=-1,x=>x.testimonials[0].photo='javascript:alert(1)',x=>x.testimonials[0].quote='',x=>x.testimonials.push({...x.testimonials[0]})]){const invalid=structuredClone(seed);change(invalid);assert.throws(()=>validateContent(invalid));}
 for(const t of seed.testimonials)await fs.access(new URL('../public'+t.photo,import.meta.url));
 assert.equal(doc.querySelectorAll('.hero-shade').length,1);
 assert(doc.querySelector('#promo-dialog').getAttribute('aria-labelledby'));
});
