import {env} from '../lib/security.mjs';
import {rpc,normalizePhone,verifyMetaSignature} from '../lib/fotos-whatsapp.mjs';
export default async req=>{
 const u=new URL(req.url);
 if(req.method==='GET'){
  const verify=env('WA_VERIFY_TOKEN');if(verify&&u.searchParams.get('hub.mode')==='subscribe'&&u.searchParams.get('hub.verify_token')===verify)return new Response(u.searchParams.get('hub.challenge')||'');
  return new Response('Forbidden',{status:403});
 }
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const raw=await req.text();
 if(!verifyMetaSignature(raw,req.headers.get('x-hub-signature-256')))return new Response('Forbidden',{status:403});
 if(env('CONTEXT')&&env('CONTEXT')!=='production')return new Response('OK');
 try{
  const data=JSON.parse(raw);
  for(const entry of data.entry||[])for(const change of entry.changes||[]){
   const v=change.value||{};if(String(v.metadata?.phone_number_id)!==env('WA_PHONE_NUMBER_ID'))continue;
   for(const m of v.messages||[]){
    const phone=normalizePhone(m.from),txt=String(m.text?.body||m.button?.text||'').trim().toUpperCase();
    if(phone&&['SAIR','STOP','PARAR','CANCELAR MENSAGENS'].includes(txt))await rpc('hax_wa_optout',{p_phone:phone});
   }
   for(const s of v.statuses||[])if(['delivered','read','failed'].includes(s.status)&&s.id)await rpc('hax_wa_delivery_status',{p_message_id:s.id,p_status:s.status});
  }
  return new Response('OK');
 }catch{console.error('HAX WhatsApp: falha ao processar webhook');return new Response('Retry',{status:500});}
};
export const config={path:'/api/fotos/whatsapp-webhook'};
