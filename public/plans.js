import {esc,icon,money,wa,packagePrice,isQuoteOnly} from './ui.js';
import {serviceCategories} from './content-model.js';

export function inquiryMessage(d,p,{name,date,context=''}){
 const price=packagePrice(p,d),sale=price!==null&&price<p.price;
 return [`Olá, Leanderson! Meu nome é ${name.trim()}.`,
  `Gostaria de mais informações sobre ${serviceCategories[p.category]}.`,
  context==='prewedding'?'Meu interesse é no pré-wedding.':'',
  `Data desejada: ${date.split('-').reverse().join('/')}.`,
  `Plano escolhido: ${p.name}.`,
  `Investimento: ${isQuoteOnly(p)?'a combinar':money(price)}.`,
  sale?`Quero reivindicar o desconto de ${d.promotion.discount}% da Black November neste pacote.`:'',
  'Podemos confirmar a disponibilidade e os detalhes da proposta?'
 ].filter(Boolean).join('\n');
}

export function setupPlans(d,showDialog,{doc=document,getDate=()=>''}={}){
 const dialog=doc.querySelector('#plans-dialog');if(!dialog)return;
 const $=s=>dialog.querySelector(s),win=doc.defaultView;
 const form=$('#plan-inquiry'),formPanel=$('#plan-form-panel'),browser=$('#plan-browser');
 let category='foto',selected='',context='',list=[];
 const current=()=>list.find(p=>p.id===selected);
 const priceLabel=p=>isQuoteOnly(p)?'A combinar':money(packagePrice(p,d));
 const featured=()=>list.find(p=>p.featured);
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 form.elements.date.min=today();
 function refreshForm(){
  form.elements.plan.innerHTML=list.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} — ${priceLabel(p)}</option>`).join('');
  form.elements.plan.value=selected;
  const p=current();$('#plan-form-summary').textContent=p?`${p.name} · ${priceLabel(p)}${packagePrice(p,d)!==null&&packagePrice(p,d)<p.price?' · Black November: '+d.promotion.discount+'% de desconto':''}`:'';
 }
 function render(){
  const recommended=featured(),p=current();
  $('#plan-choices').innerHTML=list.map(x=>`<button type="button" class="plan-choice ${x.id===selected?'is-selected':''}" data-select-plan="${esc(x.id)}" aria-pressed="${x.id===selected}"><span class="plan-choice-tag">${x===recommended?'NOSSA RECOMENDAÇÃO':isQuoteOnly(x)?'SOB MEDIDA':'O SEU MOMENTO'}</span><strong>${esc(x.name)}</strong><span>${priceLabel(x)}</span></button>`).join('');
  if(p){
   const price=packagePrice(p,d),sale=price!==null&&price<p.price;
   $('#plan-detail').innerHTML=`<article class="plan-spotlight ${p===recommended?'recommended':''}"><div class="plan-heading"><div><span class="plan-kicker">${p===recommended?'NOSSA RECOMENDAÇÃO PARA VOCÊ':'CADA HISTÓRIA TEM O SEU PLANO'}</span><h3>${esc(p.name)}</h3><p>${esc(p.subtitle)}</p></div><div class="plan-price">${sale?`<del>${money(p.price)}</del><span class="plan-sale">BLACK NOVEMBER · ${d.promotion.discount}% OFF</span>`:`<span>${isQuoteOnly(p)?'PROPOSTA PERSONALIZADA':'INVESTIMENTO'}</span>`}<strong>${priceLabel(p)}</strong></div></div><ul class="plan-features">${p.features.map(f=>`<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}</ul><details class="plan-conditions"><summary>Entrega e condições <span>+</span></summary><p>${esc(p.details)}</p></details><div class="plan-action"><span>${isQuoteOnly(p)?'Vamos construir a cobertura do seu show.':'A sua data é o começo. Vamos conversar?'}</span><button type="button" class="btn btn-dark" data-plan-inquire>Solicitar mais informações ${icon('arrow')}</button></div></article>`;
  }else{
   $('#plan-detail').innerHTML=`<div class="plans-empty"><h3>Uma proposta feita para você.</h3><p>Vamos conversar sobre a cobertura e a disponibilidade para o seu momento.</p><a class="btn btn-dark" href="${wa(d,'Olá, Leanderson! Gostaria de uma proposta para '+serviceCategories[category]+'.')}" target="_blank" rel="noopener noreferrer">Conversar no WhatsApp ${icon('whatsapp')}</a></div>`;
  }
  $('#plan-counter').textContent=list.length?`${list.findIndex(x=>x.id===selected)+1} de ${list.length} planos`:'';
  $('[data-plan-prev]').disabled=list.length<2;
  $('[data-plan-next]').disabled=list.length<2;
  refreshForm();
 }
 function select(id){if(!list.some(p=>p.id===id))return;selected=id;render();}
 function setService(cat,id){
  category=Object.hasOwn(serviceCategories,cat)?cat:'foto';
  list=d.packages.filter(p=>p.active&&p.category===category);
  selected=(list.find(p=>p.id===id)||featured()||list[0])?.id||'';
  $('#plans-service').value=category;
  dialog.querySelectorAll('[data-plan-service]').forEach(b=>{const active=b.dataset.planService===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#plans-context').textContent=context==='prewedding'&&category==='video'?'O pré-wedding em filme está incluído nos pacotes Essencial e Promessa. Para um ensaio fotográfico, conheça os Ensaios externos.':category==='shows'?'Seu palco, seu público, sua proposta. O valor é combinado conforme a cobertura.':'Compare os planos e escolha o que combina com a sua história.';
  if(!list.length){formPanel.hidden=true;browser.hidden=false;}
  render();
 }
 function requestInfo(){
  if(!current())return;
  browser.hidden=true;formPanel.hidden=false;refreshForm();
  form.elements.name.focus({preventScroll:true});dialog.scrollTop=0;
 }
 function open(cat,id,ctx=''){
  context=ctx;formPanel.hidden=true;browser.hidden=false;
  const date=getDate();if(date&&date>=today())form.elements.date.value=date;
  setService(cat,id);showDialog(dialog);dialog.scrollTop=0;
 }
 doc.addEventListener('click',e=>{const button=e.target.closest('[data-open-plans]');if(button){e.preventDefault();open(button.dataset.openPlans,button.dataset.planId,button.dataset.planContext);}});
 dialog.addEventListener('click',e=>{
  const service=e.target.closest('[data-plan-service]');if(service)setService(service.dataset.planService);
  const choice=e.target.closest('[data-select-plan]');if(choice){select(choice.dataset.selectPlan);dialog.querySelector(`[data-select-plan="${selected}"]`)?.focus({preventScroll:true});}
  if(e.target.closest('[data-plan-inquire]'))requestInfo();
  const direction=e.target.closest('[data-plan-prev]')?-1:e.target.closest('[data-plan-next]')?1:0;
  if(direction&&list.length)select(list[(list.findIndex(x=>x.id===selected)+direction+list.length)%list.length].id);
 });
 $('#plans-service').addEventListener('change',e=>setService(e.target.value));
 form.elements.plan.addEventListener('change',e=>select(e.target.value));
 $('#back-to-plans').addEventListener('click',()=>{formPanel.hidden=true;browser.hidden=false;$('[data-plan-inquire]')?.focus({preventScroll:true});});
 form.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''));
 form.addEventListener('submit',e=>{
  e.preventDefault();form.elements.date.min=today();
  form.elements.name.setCustomValidity(form.elements.name.value.trim()?'':'Por favor, informe seu nome.');
  if(!form.reportValidity()||!current())return;
  win.open(wa(d,inquiryMessage(d,current(),{name:form.elements.name.value,date:form.elements.date.value,context:category==='video'?context:''})),'_blank','noopener,noreferrer');
 });
 return {open};
}

export function promotionSeenKey(p){
 const campaign=JSON.stringify([p.title,p.headline,p.discount,p.packageIds,p.endDate]);
 let hash=0;for(const char of campaign)hash=(Math.imul(hash,31)+char.charCodeAt(0))|0;
 return 'hax-promo-v4-'+(hash>>>0).toString(36);
}
export function schedulePromotion(p,openDialog,doc=document){
 const dialog=doc.querySelector('#promo-dialog');
 if(!dialog||!p.autoOpen)return ()=>{};
 let due=false,shown=false;const key=promotionSeenKey(p);
 const seen=()=>{try{return p.frequency==='session'&&!!doc.defaultView.sessionStorage.getItem(key);}catch{return false;}};
 const cleanup=()=>{clearTimeout(timer);doc.removeEventListener('visibilitychange',tryOpen);doc.removeEventListener('focusout',afterFocus);doc.removeEventListener('close',tryOpen,true);dialog.removeEventListener('hax:promo-open',markShown);};
 function markShown(){shown=true;try{doc.defaultView.sessionStorage.setItem(key,'1');}catch{}cleanup();}
 function tryOpen(){
  if(!due||shown||seen()||doc.hidden||doc.querySelector('dialog[open]')||doc.activeElement?.matches('input,textarea,select'))return;
  shown=true;openDialog(dialog);markShown();
 }
 function afterFocus(){setTimeout(tryOpen,0);}
 const timer=setTimeout(()=>{due=true;tryOpen();},Math.max(0,Math.min(120,Number(p.delaySeconds)||0))*1000);
 doc.addEventListener('visibilitychange',tryOpen);doc.addEventListener('focusout',afterFocus);doc.addEventListener('close',tryOpen,true);dialog.addEventListener('hax:promo-open',markShown);
 return cleanup;
}
