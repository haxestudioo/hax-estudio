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
