import {randomUUID,randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {signR2,headR2,readR2} from '../lib/r2.mjs';
import {authenticated,sameOrigin,json,env} from '../lib/security.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const err=(message,status=400)=>Object.assign(new Error(message),{status});
const required=(key)=>{const v=env(key);if(!v)throw err('Configuração pendente: '+key,503);return v;};
function dbBase(){return required('SUPABASE_URL').replace(/\/$/,'')+'/rest/v1/';}
async function db(table,{method='GET',query='',body,headers={}}={}){
 const key=env('SUPABASE_SECRET_KEY')||env('SUPABASE_SERVICE_ROLE_KEY')||required('SUPABASE_SECRET_KEY');
 const r=await fetch(dbBase()+table+query,{method,headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key}),'Content-Type':'application/json',Accept:'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok){console.error('HAX DB',r.status,(await r.text()).slice(0,700));throw err('Erro ao consultar os dados da loja.',502);}
 const txt=await r.text();return txt?JSON.parse(txt):null;
}
const q=(v)=>encodeURIComponent(v);
const list=(t,query)=>db(t,{query});
const single=async(t,query)=>{const a=await list(t,query+'&limit=1');return a?.[0]||null;};
const change=(t,where,body)=>db(t,{method:'PATCH',query:where,body,headers:{Prefer:'return=representation'}});
function okAdmin(req){if(!authenticated(req))throw err('Entre no painel.',401);if(!sameOrigin(req))throw err('Origem não autorizada.',403);}
function checkOrigin(req){if(!sameOrigin(req))throw err('Origem não autorizada.',403);}
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x||'');
const noCache={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const secureEqual=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
function access(req){return req.headers.get('x-hax-order-token')||new URL(req.url).searchParams.get('chave')||'';}
async function authorizedOrder(req,id){
 if(!uuid(id))throw err('Pedido inválido.',400);
 const order=await single('hax_orders','?id=eq.'+q(id)+'&select=*');
 if(!order)throw err('Pedido não encontrado.',404);
 const token=access(req);
 if(token.length<32||!secureEqual(hash(token),order.access_hash))throw err('Acesso ao pedido não autorizado.',403);
 return order;
}
function safeName(s,max=120){return String(s||'').replace(/[<>\r\n]/g,'').trim().slice(0,max);}
function publicEvent(e){return {id:e.id,title:e.title,slug:e.slug,description:e.description,event_date:e.event_date,price_cents:e.price_cents,cover_photo_id:e.cover_photo_id};}
function publicPhoto(p){return {id:p.id,event_id:p.event_id,filename:p.filename,preview:'/api/fotos/preview/'+p.id};}
async function getEvent(id){return single('hax_events','?id=eq.'+q(id)+'&select=*');}
async function getPayment(id){
 const resp=await fetch('https://api.mercadopago.com/v1/payments/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+required('MP_ACCESS_TOKEN')}});
 if(!resp.ok)throw err('Não foi possível confirmar o pagamento no Mercado Pago.',502);
 return resp.json();
}
async function syncPayment(order,payment){
 if(String(payment.id)!==String(order.payment_id)||String(payment.external_reference)!==order.id||payment.payment_method_id!=='pix')
   throw err('Pagamento não corresponde ao pedido.',409);
 if(Number(payment.transaction_amount)!==order.total_cents/100)throw err('Valor do pagamento inconsistente.',409);
 if(env('MP_REQUIRE_LIVE')!=='false'&&payment.live_mode!==true)throw err('Pagamento não é de produção.',409);
 const statuses={approved:'approved',rejected:'rejected',cancelled:'cancelled',refunded:'refunded',charged_back:'charged_back'};
 const next=statuses[payment.status]||'pending';
 if(order.status==='approved'&&next==='pending')return order;
 if(order.status===next&&order.payment_status===payment.status)return order;
 const rows=await change('hax_orders','?id=eq.'+q(order.id),{status:next,payment_status:payment.status,...(next==='approved'?{paid_at:order.paid_at||new Date().toISOString()}: {})});
 if(next==='approved'){const customer=await single('hax_customers','?id=eq.'+q(order.customer_id)+'&select=id');if(customer)await change('hax_customers','?id=eq.'+q(customer.id),{last_purchase_at:new Date().toISOString()});}
 return rows[0]||order;
}
function verifyWebhook(req,dataId){
 const header=req.headers.get('x-signature')||'',reqid=req.headers.get('x-request-id')||'';
 const parts=Object.fromEntries(header.split(',').map(s=>s.trim().split('=')));
 if(!parts.v1||!parts.ts||!reqid||!/^[0-9]+$/.test(parts.ts))return false;
 const time=Number(parts.ts),stamp=time<1e11?time*1000:time;
 if(Math.abs(Date.now()-stamp)>10*60*1000)return false;
 const manifest='id:'+String(dataId).toLowerCase()+';request-id:'+reqid+';ts:'+parts.ts+';';
 const expected=createHmac('sha256',required('MP_WEBHOOK_SECRET')).update(manifest).digest('hex');
 return secureEqual(parts.v1,expected);
}
async function checkOrderPayment(order){
 if(!order.payment_id)return order;
 try{return await syncPayment(order,await getPayment(order.payment_id));}catch(e){console.error('Payment reconcile',e.message);return order;}
}
async function serveR2(key,type,name,download=false){
 const obj=await readR2(key);
 const stream=obj.body;
 if(!stream)throw err('Arquivo não disponível.',404);
 const h={...noCache,'Content-Type':type||'application/octet-stream'};
 if(download)h['Content-Disposition']='attachment; filename*=UTF-8\'\''+encodeURIComponent(name||'foto.jpg');
 else h['Cache-Control']='public,max-age=300,s-maxage=3600';
 return new Response(stream,{status:200,headers:h});
}
function filesForOrder(orderId){return list('hax_order_items','?order_id=eq.'+q(orderId)+'&select=photo_id,filename_snapshot,unit_price_cents&order=filename_snapshot.asc');}
async function handler(req){
 const u=new URL(req.url),path=u.pathname.split('/').filter(Boolean),kind=path[2]||'',id=path[3]||'';
 if(kind==='webhook'){
  if(req.method!=='POST')throw err('Método não permitido.',405);
  const body=await req.json(); const paymentId=String(u.searchParams.get('data.id')||body?.data?.id||'');
  if(body?.type!=='payment'||!/^\d+$/.test(paymentId))return json({ok:true});
  if(!verifyWebhook(req,paymentId))throw err('Assinatura inválida.',401);
  const order=await single('hax_orders','?payment_id=eq.'+q(paymentId)+'&select=*');
  if(order)await syncPayment(order,await getPayment(paymentId));
  return json({ok:true});
 }
 if(kind==='events'&&req.method==='GET'){
  const events=await list('hax_events','?published=eq.true&select=id,title,slug,description,event_date,price_cents,cover_photo_id&order=event_date.desc.nullslast');
  return json({events});
 }
 if(kind==='event'&&req.method==='GET'){
  if(!uuid(id))throw err('Evento inválido.');
  const event=await getEvent(id);if(!event?.published)throw err('Evento não encontrado.',404);
  const photos=await list('hax_photos','?event_id=eq.'+q(id)+'&status=eq.ready&select=id,event_id,filename&order=created_at.asc&limit=2000');
  return json({event:publicEvent(event),photos:photos.map(publicPhoto)});
 }
 if(kind==='preview'&&req.method==='GET'){
  if(!uuid(id))throw err('Imagem inválida.',404);
  const photo=await single('hax_photos','?id=eq.'+q(id)+'&status=eq.ready&select=id,event_id,preview_key');
  if(!photo)throw err('Imagem não encontrada.',404);
  const event=await getEvent(photo.event_id);if(!event?.published&&!authenticated(req))throw err('Imagem indisponível.',404);
  return serveR2(photo.preview_key,'image/webp','preview.webp');
 }
 if(kind==='checkout'&&req.method==='POST'){
  checkOrigin(req);required('MP_ACCESS_TOKEN');
  if(!required('MP_ACCESS_TOKEN').startsWith('APP_USR-'))throw err('Configure uma credencial de produção do Mercado Pago.',503);
  const body=await req.json();const eventId=body.eventId,ids=body.photoIds;
  if(!uuid(eventId)||!Array.isArray(ids)||ids.length<1||ids.length>100||new Set(ids).size!==ids.length||!ids.every(uuid))throw err('Seleção de fotos inválida.');
  const name=safeName(body.name,100),whatsapp=String(body.whatsapp||'').replace(/\D/g,''),email=String(body.email||'').trim().toLowerCase().slice(0,160);
  if(name.length<3||whatsapp.length<10||whatsapp.length>13||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw err('Informe nome, WhatsApp e e-mail válidos.');
  const token=randomBytes(32).toString('base64url');
  const created=await db('rpc/hax_create_order',{method:'POST',body:{p_event_id:eventId,p_photo_ids:ids,p_name:name,p_whatsapp:whatsapp,p_email:email,p_access_hash:hash(token)}});
  const orderId=created.id;
  const mpr=await fetch('https://api.mercadopago.com/v1/payments',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+required('MP_ACCESS_TOKEN'),'X-Idempotency-Key':orderId},body:JSON.stringify({transaction_amount:created.total_cents/100,description:'HAX Fotos - Pedido '+orderId.slice(0,8),payment_method_id:'pix',external_reference:orderId,payer:{email,first_name:name},notification_url:required('PUBLIC_SITE_URL').replace(/\/$/,'')+'/api/fotos/webhook'})});
  const payment=await mpr.json();
  if(!mpr.ok||!payment.id){console.error('MP create failed',mpr.status,JSON.stringify(payment).slice(0,800));throw err('O Pix não pôde ser gerado. Nenhuma foto foi liberada; tente novamente.',502);}
  const qr=payment.point_of_interaction?.transaction_data||{};
  await change('hax_orders','?id=eq.'+q(orderId),{payment_id:String(payment.id),payment_status:payment.status||'pending',pix_code:qr.qr_code||null,pix_qr_base64:qr.qr_code_base64||null,expires_at:payment.date_of_expiration||null});
  return json({orderId,token,total_cents:created.total_cents,pix_code:qr.qr_code||null,pix_qr_base64:qr.qr_code_base64||null,expires_at:payment.date_of_expiration||null});
 }
 if(kind==='order'&&req.method==='GET'){
  let order=await authorizedOrder(req,id);
  if(order.status==='pending')order=await checkOrderPayment(order);
  const items=await filesForOrder(order.id);
  return json({id:order.id,status:order.status,total_cents:order.total_cents,created_at:order.created_at,paid_at:order.paid_at,pix_code:order.pix_code,pix_qr_base64:order.pix_qr_base64,expires_at:order.expires_at,items:items.map(i=>({id:i.photo_id,name:i.filename_snapshot,download:order.status==='approved'?'/api/fotos/download/'+i.photo_id+'?pedido='+order.id+'&chave='+encodeURIComponent(access(req)):null}))});
 }
 if(kind==='download'&&req.method==='GET'){
  if(!uuid(id))throw err('Foto inválida.',400);
  const orderId=u.searchParams.get('pedido');const admin=authenticated(req);
  if(!admin&&!uuid(orderId))throw err('Pedido necessário.',400);
  let items,filename,key;
  if(admin&&!orderId){const p=await single('hax_photos','?id=eq.'+q(id)+'&select=original_key,filename');if(!p)throw err('Foto não encontrada.',404);key=p.original_key;filename=p.filename;}
  else{
   const order=admin?await single('hax_orders','?id=eq.'+q(orderId)+'&select=*'):await authorizedOrder(req,orderId);
   if(!order||(!admin&&order.status!=='approved'))throw err('O arquivo será liberado após a confirmação do Pix.',403);
   items=await single('hax_order_items','?order_id=eq.'+q(orderId)+'&photo_id=eq.'+q(id)+'&select=original_key_snapshot,filename_snapshot');
   if(!items)throw err('Foto não pertence a este pedido.',403);key=items.original_key_snapshot;filename=items.filename_snapshot;
  }
  // URL assinada por prazo curto: download direto do R2 preserva arquivos grandes em resolução original.
  return new Response(null,{status:302,headers:{Location:signR2('GET',key,120),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }
 if(kind==='admin'){
  okAdmin(req);
  if(id==='dashboard'&&req.method==='GET'){
   const [events,photos,orders,customers,items]=await Promise.all([
    list('hax_events','?select=*&order=created_at.desc&limit=100'),
    list('hax_photos','?select=id,event_id,filename,status,created_at&order=created_at.desc&limit=2000'),
    list('hax_orders','?select=*&order=created_at.desc&limit=500'),
    list('hax_customers','?select=*&order=created_at.desc&limit=500'),
    list('hax_order_items','?select=*&limit=2000')
   ]);
   return json({events,photos,orders:orders.map(o=>({...o,access_hash:undefined,pix_qr_base64:undefined,pix_code:undefined})),customers,items});
  }
  if(id==='event'&&req.method==='POST'){
   checkOrigin(req);const b=await req.json();const title=safeName(b.title,160);const price=Math.round(Number(b.price)*100);
   if(title.length<3||!Number.isSafeInteger(price)||price<100||price>10000000)throw err('Informe título e preço válido (mínimo R$ 1).');
   const row={title,slug:'evento-'+randomUUID().slice(0,8),description:safeName(b.description||'',1000),event_date:b.event_date||null,price_cents:price,published:false};
   const added=await db('hax_events',{method:'POST',body:row,headers:{Prefer:'return=representation'}});
   return json({event:added[0]});
  }
  if(id==='event'&&req.method==='PATCH'){
   checkOrigin(req);const b=await req.json();if(!uuid(b.id))throw err('Evento inválido.');
   const patch={};if(typeof b.title==='string'&&safeName(b.title).length>=3)patch.title=safeName(b.title);
   if(typeof b.published==='boolean')patch.published=b.published;
   if(typeof b.description==='string')patch.description=safeName(b.description,1000);
   if(b.price!==undefined){const cents=Math.round(Number(b.price)*100);if(!Number.isSafeInteger(cents)||cents<100||cents>10000000)throw err('Preço inválido.');patch.price_cents=cents;}
   if(b.cover_photo_id!==undefined){if(b.cover_photo_id!==null&&!uuid(b.cover_photo_id))throw err('Capa inválida.');patch.cover_photo_id=b.cover_photo_id;}
   patch.updated_at=new Date().toISOString();
   const rows=await change('hax_events','?id=eq.'+q(b.id),patch);
   return json({event:rows[0]});
  }
  if(id==='sign-upload'&&req.method==='POST'){
   checkOrigin(req);const b=await req.json(),event=await getEvent(b.eventId);
   if(!event)throw err('Evento não encontrado.',404);
   const filename=safeName(b.filename,180),size=Number(b.size),type=String(b.type||'');
   if(!/\.(jpe?g|png|webp)$/i.test(filename)||!['image/jpeg','image/png','image/webp'].includes(type)||!Number.isFinite(size)||size<100||size>70*1024*1024)throw err('Use fotos JPG/PNG/WebP de até 70 MB.');
   const photoId=randomUUID(),original='originais/'+event.id+'/'+photoId+'/'+filename.replace(/[^a-zA-Z0-9._-]/g,'_'),preview='previas/'+event.id+'/'+photoId+'.webp';
   const originalUrl=signR2('PUT',original,900),previewUrl=signR2('PUT',preview,900);
   await db('hax_photos',{method:'POST',body:{id:photoId,event_id:event.id,original_key:original,preview_key:preview,filename,mime_type:type,size_bytes:size},headers:{Prefer:'return=minimal'}});
   return json({photoId,originalUrl,previewUrl});
  }
  if(id==='finish-upload'&&req.method==='POST'){
   checkOrigin(req);const b=await req.json();const p=await single('hax_photos','?id=eq.'+q(b.photoId)+'&select=*');
   if(!p)throw err('Foto inexistente.',404);
   const [orig,prev]=await Promise.all([headR2(p.original_key),headR2(p.preview_key)]);
   if(Number(orig.length)!==Number(p.size_bytes)||!Number(prev.length))throw err('Envio incompleto: tente novamente.');
   await change('hax_photos','?id=eq.'+q(p.id),{status:'ready'});
   return json({ok:true,id:p.id});
  }
  if(id==='hide-photo'&&req.method==='POST'){
   checkOrigin(req);const b=await req.json();if(!uuid(b.id))throw err('Foto inválida.');
   await change('hax_photos','?id=eq.'+q(b.id),{status:b.hidden?'hidden':'ready'});return json({ok:true});
  }
  if(id==='order-status'&&req.method==='POST'){
   checkOrigin(req);const b=await req.json();const order=await single('hax_orders','?id=eq.'+q(b.id)+'&select=*');
   if(!order)throw err('Pedido inexistente.',404);
   const next=await checkOrderPayment(order);return json({status:next.status});
  }
  throw err('Ação não encontrada.',404);
 }
 throw err('Rota não encontrada.',404);
}
export default async (req)=>{try{return await handler(req);}catch(e){console.error('Fotos API',e.message);return json({error:e.status?e.message:'Não foi possível concluir esta operação. Tente novamente.'},e.status||500);}};
export const config={path:['/api/fotos/events','/api/fotos/event/:id','/api/fotos/preview/:id','/api/fotos/checkout','/api/fotos/order/:id','/api/fotos/download/:id','/api/fotos/admin/:action','/api/fotos/webhook']};
