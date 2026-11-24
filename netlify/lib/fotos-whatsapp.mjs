import {createHmac,timingSafeEqual} from 'node:crypto';
import {env} from './security.mjs';
export const normalizePhone=value=>{const d=String(value||'').replace(/\D/g,'');const n=d.length===10||d.length===11?'55'+d:d;return /^55\d{10,11}$/.test(n)?n:null;};
export function deliveryToken(orderId){const secret=env('WA_DELIVERY_SECRET');return secret.length>=32?'wa_'+createHmac('sha256',secret).update('hax-fotos:delivery:v1:'+orderId).digest('base64url'):null;}
export function whatsappConfigured(){return !!(env('WA_ACCESS_TOKEN')&&/^\d+$/.test(env('WA_PHONE_NUMBER_ID'))&&/^v\d+\.\d+$/.test(env('WA_GRAPH_VERSION'))&&env('WA_TEMPLATE_RECEIPT')&&env('WA_TEMPLATE_REMINDER')&&env('WA_DELIVERY_SECRET').length>=32&&/^https:\/\/[a-z0-9.-]+\/?$/i.test(env('PUBLIC_SITE_URL'))&&env('WA_APP_SECRET')&&env('WA_VERIFY_TOKEN'));}
export const enabled=()=>env('WA_ENABLED')==='true'&&(!env('CONTEXT')||env('CONTEXT')==='production')&&whatsappConfigured();
async function db(path,body){
 const key=env('SUPABASE_SECRET_KEY')||env('SUPABASE_SERVICE_ROLE_KEY');
 const res=await fetch(env('SUPABASE_URL').replace(/\/$/,'')+'/rest/v1/'+path,{method:'POST',headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key}),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(6000)});
 if(!res.ok)throw Error('WhatsApp database '+res.status);const txt=await res.text();return txt?JSON.parse(txt):null;
}
export const rpc=(name,params={})=>db('rpc/'+name,params);
export async function registerConsent({orderId,phone,receipt,reminder}){
 if(!phone||(!receipt&&!reminder))return;
 return rpc('hax_wa_register',{p_order:orderId,p_receipt:receipt,p_reminder:reminder});
}
export function messagePayload(kind,order,phone){
 const name=String(order.buyer_name||'Cliente').trim().replace(/\s+/g,' ').slice(0,60)||'Cliente';
 const params=[{type:'text',text:name}];
 if(kind==='receipt'){
  const token=deliveryToken(order.id);if(!token)throw Error('Delivery key not configured');
  const url=env('PUBLIC_SITE_URL').replace(/\/$/,'')+'/fotos/?pedido='+encodeURIComponent(order.id)+'&chave='+encodeURIComponent(token);
  params.push({type:'text',text:url});
 }
 return {messaging_product:'whatsapp',recipient_type:'individual',to:phone,type:'template',template:{name:env(kind==='receipt'?'WA_TEMPLATE_RECEIPT':'WA_TEMPLATE_REMINDER'),language:{code:'pt_BR'},components:[{type:'body',parameters:params}]}};
}
export async function sendTemplate(kind,order,phone){
 const url='https://graph.facebook.com/'+env('WA_GRAPH_VERSION')+'/'+env('WA_PHONE_NUMBER_ID')+'/messages';
 const res=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+env('WA_ACCESS_TOKEN'),'Content-Type':'application/json'},body:JSON.stringify(messagePayload(kind,order,phone)),signal:AbortSignal.timeout(6500)});
 const data=await res.json().catch(()=>({}));if(!res.ok){return {state:res.status>=500?'uncertain':'failed',messageId:null};}
 const messageId=data.messages?.[0]?.id;
 return {state:messageId?'accepted':'uncertain',messageId:messageId||null};
}
export function verifyMetaSignature(raw,header,secret=env('WA_APP_SECRET')){
 if(!secret||!/^sha256=[0-9a-f]{64}$/i.test(header||''))return false;
 const actual=Buffer.from(header.slice(7),'hex'),expected=createHmac('sha256',secret).update(raw).digest();
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
// Conservador: qualquer pagamento aprovado após a tentativa, ou tentativa mais recente,
// invalida o lembrete antigo. O SQL repete essa condição sob lock antes do envio.
export function shouldRemind(order,related,now=Date.now()){
 const created=Date.parse(order.created_at);
 if(!Number.isFinite(created)||now-created<4*3600000||now-created>24*3600000||!order.payment_id||!['pending','rejected','cancelled'].includes(order.status))return false;
 return !related.some(o=>o.id!==order.id&&((o.payment_id&&Date.parse(o.created_at)>created)||(o.status==='approved'&&(Date.parse(o.created_at)>=created||Date.parse(o.paid_at)>=created))));
}
export async function runWhatsApp(reconcile,{call=rpc,send=sendTemplate,clock=()=>Date.now()}={}){
 if(!enabled())return {enabled:false,processed:0};
 const deadline=clock()+23000;await call('hax_wa_expire_claims');const candidates=await call('hax_wa_candidates',{p_limit:8});
 let processed=0;
 for(const candidate of candidates||[]){
  if(clock()>deadline-8500)break;
  const {order_id:orderId,kind,phone}=candidate;
  try{
   // Aguardar antes de consultar de novo candidatos ainda não pagos.
   await call('hax_wa_defer',{p_order:orderId});
   const related=await call('hax_wa_related',{p_order:orderId,p_kind:kind});
   if(!Array.isArray(related)||!related.length||related.length>20)continue; // fail closed
   const checked=[];
   for(const o of related){
    if(clock()>deadline-8500)throw Error('Time budget');
    checked.push(o.status==='pending'&&o.payment_id?await reconcile(o):o);
   }
   const order=checked.find(o=>o.id===orderId);
   if(!order)continue;
   if(kind==='receipt'&&order.status!=='approved')continue;
   if(kind==='reminder'&&!shouldRemind(order,checked,clock()))continue;
   // Claim transactionally immediately before the external request; never repeat an ambiguous send.
   if(clock()>deadline-8500)break;
   const claimed=await call('hax_wa_claim',{p_order:orderId,p_kind:kind});
   if(claimed!==true)continue;
   let result;
   try{result=await send(kind,order,phone);}catch{result={state:'uncertain',messageId:null};}
   await call('hax_wa_finish',{p_order:orderId,p_kind:kind,p_state:result.state,p_message_id:result.messageId});
   processed++;
  }catch{console.error('HAX WhatsApp: processamento adiado ou envio aguardando revisão.');}
 }
 return {enabled:true,processed};
}
