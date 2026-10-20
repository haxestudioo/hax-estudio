export function setupPackageInteractions(container,{reduced=false}={}){
 if(!container)return ()=>{};
 const cards=[...container.querySelectorAll('.package')];if(!cards.length)return ()=>{};
 const preferred=cards.find(c=>c.classList.contains('featured'))||cards[0];
 let selected=preferred,hovered=false,focused=false;
 const emphasize=card=>{selected=card;cards.forEach(c=>c.classList.toggle('is-emphasized',c===card));container.classList.toggle('is-comparing',cards.length>1);};
 emphasize(preferred);
 const handlers=[];
 const listen=(el,type,fn)=>{el.addEventListener(type,fn);handlers.push(()=>el.removeEventListener(type,fn));};
 cards.forEach(card=>{
  listen(card,'pointerenter',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'){hovered=true;emphasize(card);}});
  listen(card,'pointerleave',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'){hovered=false;if(!focused)emphasize(preferred);}});
  listen(card,'focusin',()=>{focused=true;emphasize(card);});
  listen(card,'focusout',e=>{focused=!!e.relatedTarget&&container.contains(e.relatedTarget);if(!focused&&!hovered)emphasize(preferred);});
  listen(card,'click',()=>emphasize(card));
 });
 let observer;
 if(!reduced&&matchMedia('(max-width: 620px)').matches){const visible=new Set();observer=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?visible.add(e.target):visible.delete(e.target));if(focused||hovered||!visible.size)return;const midpoint=window.innerHeight*.5,best=[...visible].sort((a,b)=>{const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();return Math.abs(ra.top+ra.height/2-midpoint)-Math.abs(rb.top+rb.height/2-midpoint);})[0];if(best!==selected)emphasize(best);},{threshold:[0,.25,.5,.75]});cards.forEach(card=>observer.observe(card));}
 return ()=>{handlers.forEach(fn=>fn());observer?.disconnect();};
}
