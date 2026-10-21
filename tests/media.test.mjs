import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import content from '../src/content.json' with {type:'json'};
import {upgradeContent,brandPalette,reorder,editorialPhotos} from '../public/content-model.js';
import {setupPackageInteractions} from '../public/interactions.js';
import {renderPackages,renderPage} from '../public/ui.js';
import {validateContent} from '../netlify/lib/validate.mjs';
import {savePreview,readPreview,clearPreview} from '../public/preview-store.js';

const nativeTimeout=globalThis.setTimeout;
function browser(html){
 const dom=new JSDOM(html,{url:'https://hax.test/',pretendToBeVisual:true});
 const w=dom.window;
 for(const key of ['window','document','location','localStorage','sessionStorage','HTMLElement','Event','MouseEvent','FormData'])globalThis[key]=key==='window'?w:w[key];
 globalThis.confirm=()=>true;
 globalThis.matchMedia=()=>({matches:true});
 globalThis.setTimeout=(fn,ms,...args)=>{const t=nativeTimeout(fn,ms,...args);if(ms>1000)t.unref();return t;};
 w.scrollTo=()=>{};
 return dom;
}

test('Atualização de identidade preserva conteúdo anterior e futuras cores personalizadas',()=>{
 const previous=structuredClone(content);previous.version=1;previous.colors.ink='#111111';previous.texts.heroTitle='Meu texto editado';
 const next=upgradeContent(previous);
 assert.deepEqual(next.colors,brandPalette);
 assert.equal(next.texts.heroTitle,'Meu texto editado');
 assert.deepEqual(next.photos,previous.photos);
 next.colors.highlight='#aabbcc';
 assert.equal(upgradeContent(next).colors.highlight,'#aabbcc');
 assert.equal(previous.colors.ink,'#111111');
});

test('Reordenar preserva os itens e recusa posições inválidas',()=>{
 const items=[{id:'a'},{id:'b'},{id:'c'}];
 assert(reorder(items,0,2));assert.deepEqual(items.map(x=>x.id),['b','c','a']);
 assert(reorder(items,2,0));assert.deepEqual(items.map(x=>x.id),['a','b','c']);
 for(const pair of [[-1,0],[0,3],[1,1],[0,.5]])assert.equal(reorder(items,...pair),false);
 assert.deepEqual(items.map(x=>x.id),['a','b','c']);
});

test('Pacotes respondem ao ponteiro e ao teclado mantendo um destaque por vez',()=>{
 const dom=browser('<div id="packages">'+renderPackages(content)+'</div>');
 const container=document.querySelector('#packages');
 const cards=[...container.querySelectorAll('.package')];
 const preferred=container.querySelector('.featured');
 const dispose=setupPackageInteractions(container,{reduced:true});
 const highlighted=()=>container.querySelector('.is-emphasized');
 assert.equal(highlighted(),preferred);
 const pointer=new dom.window.Event('pointerenter');Object.defineProperty(pointer,'pointerType',{value:'mouse'});
 cards[0].dispatchEvent(pointer);assert.equal(highlighted(),cards[0]);
 assert.equal(container.querySelectorAll('.is-emphasized').length,1);
 const leave=new dom.window.Event('pointerleave');Object.defineProperty(leave,'pointerType',{value:'mouse'});
 cards[0].dispatchEvent(leave);assert.equal(highlighted(),preferred);
 cards[2].focus();assert.equal(highlighted(),cards[2]);
 cards[2].blur();assert.equal(highlighted(),preferred);
 cards[0].click();assert.equal(highlighted(),cards[0]);
 dispose();cards[2].click();assert.equal(highlighted(),cards[0]);
 dom.window.close();
});

test('Painel adiciona, reordena e remove mídias; miniatura acompanha o vídeo durante envio',async()=>{
 const dom=browser(await fs.readFile(new URL('../dist/admin/index.html',import.meta.url),'utf8'));
 let saved,uploads=0,waitBitmap=null;
 globalThis.createImageBitmap=async()=>{if(waitBitmap)await waitBitmap;return {width:2400,height:1600,close(){}};};
 dom.window.HTMLCanvasElement.prototype.getContext=function(){assert.equal(this.width,1800);return {drawImage(){}};};
 dom.window.HTMLCanvasElement.prototype.toBlob=function(callback,type){callback(new Blob(['webp'],{type}));};
 globalThis.fetch=async(url,opt={})=>{
  if(url==='/api/auth')return Response.json({configured:true,authenticated:true});
  if(url==='/api/calendar-settings')return Response.json({connected:false});
  if(url==='/api/upload'){assert.equal(opt.headers['Content-Type'],'image/webp');uploads++;return Response.json({url:'/api/media/'+String(uploads).padStart(32,'0')});}
  if(url==='/api/content'&&opt.method==='PUT'){saved=JSON.parse(opt.body);validateContent(saved.content);return Response.json({ok:true,revision:'rev2'});}
  if(url==='/api/content')return Response.json({content:structuredClone(content),revision:'rev1'});
  return Response.json(structuredClone(content));
 };
 await import('../dist/admin/admin.js?media-test');
 const $=s=>document.querySelector(s);
 const input=(selector,value)=>{const el=$(selector);el.value=value;el.dispatchEvent(new dom.window.Event('input'));};
 const files=el=>Object.defineProperty(el,'files',{value:[{name:'Minha-foto.png',type:'image/png',size:100}]});
 const save=async()=>{await $('#save').onclick();assert(saved);return saved.content;};
 $('[data-tab="photos"]').click();
 $('[data-move-list="photos"][data-move="0"][data-direction="1"]').click();
 let result=await save();assert.equal(result.photos[1].id,content.photos[0].id);
 const position=$('[data-position-list="photos"][data-position-index="1"]');position.value='0';position.onchange();
 $('[data-remove="photos"][data-index="1"]').click();
 $('#upload-category').value='shows';files($('#photo-upload'));await $('#photo-upload').onchange();
 result=await save();assert.equal(result.photos.length,content.photos.length);assert.equal(result.photos[0].id,content.photos[0].id);
 assert.equal(result.photos.at(-1).category,'shows');assert.equal(result.photos.at(-1).alt,'Minha foto');assert(result.photos.at(-1).src.startsWith('/api/media/'));
 assert(!result.photos.some(p=>p.id===content.photos[1].id));

 $('[data-tab="videos"]').click();
 const thumb=$('[data-thumb-upload="videos.0.poster"]');files(thumb);
 let release;waitBitmap=new Promise(resolve=>{release=resolve});
 const uploading=thumb.onchange();
 $('[data-move-list="videos"][data-move="0"][data-direction="1"]').click();
 release();await uploading;waitBitmap=null;
 result=await save();assert.equal(result.videos[1].id,content.videos[0].id);assert(result.videos[1].poster.startsWith('/api/media/'));
 assert.equal(result.videos[0].poster,content.videos[1].poster);
 assert.equal($('[data-path="videos.1.poster"]').selectedOptions[0].textContent,'Miniatura atual (personalizada)');
 files($('[data-thumb-upload="hero.poster"]'));await $('[data-thumb-upload="hero.poster"]').onchange();
 $('[data-youtube-thumb="videos.0.poster"]').click();
 $('[data-add="video"]').click();
 const added=content.videos.length;
 input(`[data-path="videos.${added}.url"]`,'https://youtu.be/IjHimRHuBoA');
 input(`[data-path="videos.${added}.title"]`,'Nosso novo filme');
 input(`[data-path="videos.${added}.category"]`,'prewedding');
 const visible=$(`[data-path="videos.${added}.active"]`);visible.checked=true;visible.dispatchEvent(new dom.window.Event('input'));
 const videoPosition=$(`[data-position-list="videos"][data-position-index="${added}"]`);videoPosition.value='0';videoPosition.onchange();
 $('[data-remove="videos"][data-index="3"]').click();
 result=await save();assert.equal(result.videos.length,content.videos.length);assert.equal(result.videos[0].title,'Nosso novo filme');assert.equal(result.videos[0].category,'prewedding');
 assert(result.videos[1].poster.startsWith('https://i.ytimg.com/'));assert(result.hero.poster.startsWith('/api/media/'));assert.equal(uploads,3);
 const publicPage=renderPage(result);assert(publicPage.includes(result.hero.poster));assert(publicPage.includes(result.videos[2].poster));
 $('[data-tab="colors"]').click();input('[data-path="colors.highlight"]','#eac78d');
 assert.equal(document.documentElement.style.getPropertyValue('--highlight'),'#eac78d');
 result=await save();assert.equal(result.colors.highlight,'#eac78d');
 dom.window.close();
});

test('Demonstração lê edições anteriores e salva no fallback quando IndexedDB está ausente',async()=>{
 const dom=browser('');
 const draft={...structuredClone(content),photos:[{id:'foto',src:'data:image/webp;base64,aGk='}]};
 await savePreview(draft);assert.deepEqual(await readPreview(),draft);
 await clearPreview();assert.equal(await readPreview(),null);
 dom.window.close();
});

test('Migração para capítulos importa as novas fotos uma única vez e preserva remoções posteriores',()=>{
 const old=structuredClone(content);old.version=2;old.photos=old.photos.filter(p=>!editorialPhotos.some(n=>n.id===p.id));old.videos.forEach(v=>delete v.category);
 const next=upgradeContent(old);assert.equal(next.version,5);assert.equal(next.photos.length,old.photos.length+editorialPhotos.length);
 assert.equal(next.videos.find(v=>v.url.includes('81_ixFOdWSs')).category,'prewedding');assert.equal(next.videos.find(v=>v.url.includes('T0VN2ykadeg')).category,'casamento');
 next.photos=next.photos.filter(p=>p.id!=='show-palco');assert(!upgradeContent(next).photos.some(p=>p.id==='show-palco'));assert(validateContent(next));
});
