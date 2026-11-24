import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash,createHmac} from 'node:crypto';

const origin='https://www.haxestudio.com.br';
Object.assign(process.env,{
 SUPABASE_URL:'https://example.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock_safe_test_key',
 R2_ACCOUNT_ID:'12345678901234567890123456789012',
 R2_BUCKET:'hax-fotos',
 R2_ACCESS_KEY_ID:'testaccessid',
 R2_SECRET_ACCESS_KEY:'testsecretaccesskey',
 MP_ACCESS_TOKEN:'APP_USR-fake',
 MP_WEBHOOK_SECRET:'mock-webhook-secret',
 PUBLIC_SITE_URL:origin,
 ADMIN_PASSWORD_HASH:'test-only-not-a-valid-password-hash',
 ADMIN_SESSION_SECRET:'test-admin-session-secret-with-at-least-32-characters'
});
const idEvent=randomUUID(),idPhoto=randomUUID(),idOrder=randomUUID(),idCustomer=randomUUID(),idOther=randomUUID();
const state={
 event:{id:idEvent,title:'Maratona',slug:'maratona',description:'',price_cents:1000,published:true,event_date:'2026-11-16'},
 photo:{id:idPhoto,event_id:idEvent,filename:'original.jpg',status:'ready',original_key:'originais/a/original.jpg',preview_key:'previas/a.webp'},
 customer:{id:idCustomer,name:'Cliente Teste',whatsapp:'44999999999',email:'cliente@example.com'},
 order:null, item:null, mpStatus:'pending',mpLiveMode:true,mpCreateError:false,lastPaymentPayload:null,lastOrderPayload:null
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const originalFetch=globalThis.fetch;
let previewReads=0,itemReads=0;
globalThis.fetch=async (input,options={})=>{
 const url=new URL(input),path=url.pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
 if(url.hostname==='example.supabase.co'){
  if(path==='/rest/v1/rpc/hax_create_order'){
   state.lastOrderPayload=body;
   state.order={id:idOrder,customer_id:idCustomer,event_id:idEvent,total_cents:1000,status:'pending',access_hash:body.p_access_hash,created_at:new Date().toISOString()};
   state.item={order_id:idOrder,photo_id:idPhoto,original_key_snapshot:state.photo.original_key,filename_snapshot:state.photo.filename,unit_price_cents:1000};
   return json({id:idOrder,total_cents:1000});
  }
  if(path==='/rest/v1/hax_events'){
   if(method==='PATCH'){Object.assign(state.event,body);return json([state.event]);}
   return json(url.searchParams.get('published')==='eq.true'&&!state.event.published?[]:[state.event]);
  }
  if(path==='/rest/v1/hax_photos')return json(url.searchParams.get('status')==='eq.ready'&&state.photo.status!=='ready'?[]:[state.photo]);
  if(path==='/rest/v1/hax_customers'){
   if(method==='PATCH'){Object.assign(state.customer,body);return json([state.customer]);}
   return json([state.customer]);
  }
  if(path==='/rest/v1/hax_orders'){
   if(method==='PATCH'){Object.assign(state.order,body);return json([state.order]);}
   return json(state.order?[state.order]:[]);
  }
  if(path==='/rest/v1/hax_order_items'){itemReads++;return json(state.item&&(!url.searchParams.has('photo_id')||url.searchParams.get('photo_id')==='eq.'+state.item.photo_id)?[state.item]:[]);}
  throw Error('Rota Supabase não simulada: '+path);
 }
 if(url.hostname.endsWith('.r2.cloudflarestorage.com')&&method==='GET'&&url.pathname.endsWith('/previas/a.webp')){previewReads++;return new Response('preview-only',{headers:{'Content-Type':'image/webp'}});}
 if(url.hostname.endsWith('.r2.cloudflarestorage.com') && method==='GET')return new Response('<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>',{status:404,headers:{'Content-Type':'application/xml'}});
 if(url.hostname==='api.mercadopago.com'){
  if(path==='/v1/payments'&&method==='POST'){state.lastPaymentPayload=body;if(state.mpCreateError)return json({error:'bad_request',message:'Collector user without key enabled for QR rendernull',cause:[{code:13253,description:'Error in Financial Identity Use Case'}]},400);return json({id:987654321,status:'pending',live_mode:true,external_reference:idOrder,payment_method_id:'pix',transaction_amount:10,point_of_interaction:{transaction_data:{qr_code:'PIXFAKE',qr_code_base64:'cGl4'}}});}
  if(path==='/v1/payments/987654321')return json({id:987654321,status:state.mpStatus,live_mode:state.mpLiveMode,external_reference:idOrder,payment_method_id:'pix',transaction_amount:10});
 }
 throw Error('Requisição não prevista: '+input);
};
const {default:handler}=await import('../netlify/functions/fotos.mjs');
const req=(route,{method='GET',body,token,originHeader=true}={})=>new Request(origin+route,{method,headers:{...(originHeader?{Origin:origin}:{}),...(token?{'x-hax-order-token':token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
test('PIX de produção: seleção → pedido pendente → bloqueio → aprovação → original',async()=>{
 const response=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:idEvent,photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'(44) 99999-9999',email:'cliente@example.com'}}));
 assert.equal(response.status,200);const created=await response.json();
 assert.equal(created.orderId,idOrder);assert.equal(created.pix_code,'PIXFAKE');
 assert.equal(state.lastPaymentPayload.payer.email,'cliente@example.com');
 assert.equal(state.lastOrderPayload.p_email,'cliente@example.com');
 assert.equal(Object.hasOwn(state.lastPaymentPayload.payer,'whatsapp'),false);
 assert.ok(created.token.length>32);
 const before=await handler(req('/api/fotos/order/'+idOrder,{token:created.token}));
 const pending=await before.json();assert.equal(pending.status,'pending');assert.equal(pending.items[0].download,null);assert.equal(pending.items[0].original,null);
 const forbidden=await handler(req('/api/fotos/download/'+idPhoto+'?pedido='+idOrder+'&chave='+encodeURIComponent(created.token)));
 assert.equal(forbidden.status,403);
 const pendingView=await handler(req('/api/fotos/download/'+idPhoto+'?pedido='+idOrder+'&chave='+encodeURIComponent(created.token)+'&modo=visualizar'));
 assert.equal(pendingView.status,403);
 const wrong=await handler(req('/api/fotos/order/'+idOrder,{token:'invalid-token-value-very-long-abc12345'}));
 assert.equal(wrong.status,403);
 state.mpStatus='approved';
 const paid=await handler(req('/api/fotos/order/'+idOrder,{token:created.token}));
 const details=await paid.json();assert.equal(details.status,'approved');assert.equal(details.items.length,1);
 const original=await handler(req('/api/fotos/download/'+idPhoto+'?pedido='+idOrder+'&chave='+encodeURIComponent(created.token)));
 assert.equal(original.status,302);assert.match(original.headers.get('Location'),/r2\.cloudflarestorage\.com/);
 assert.match(original.headers.get('Location'),/X-Amz-Signature=/);
 const signed=new URL(original.headers.get('Location'));
 assert.match(signed.searchParams.get('response-content-disposition'),/^attachment; filename="original.jpg"/);
 assert.equal(signed.searchParams.get('X-Amz-Expires'),'600');
 assert.equal(signed.searchParams.get('response-cache-control'),'private, no-store');
 assert.equal(original.headers.get('Cache-Control'),'private, no-store');
 const view=await handler(req(details.items[0].original));
 assert.equal(view.status,302);assert.match(new URL(view.headers.get('Location')).searchParams.get('response-content-disposition'),/^inline;/);
 const other=await handler(req('/api/fotos/download/'+idOther+'?pedido='+idOrder+'&chave='+encodeURIComponent(created.token)+'&modo=visualizar'));
 assert.equal(other.status,403);
 const wrongView=await handler(req('/api/fotos/download/'+idPhoto+'?pedido='+idOrder+'&chave=invalid-token-value-very-long-abc12345&modo=visualizar'));
 assert.equal(wrongView.status,403);
});
test('checkout recusa e-mail inválido antes de criar pagamento',async()=>{
 const before=state.lastPaymentPayload;
 const invalid=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:idEvent,photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'44999999999',email:'email-invalido'}}));
 assert.equal(invalid.status,400);
 assert.match((await invalid.json()).error,/e-mail/);
 assert.equal(state.lastPaymentPayload,before);
});
test('cliente não acessa CRM ou painel',async()=>{
 const response=await handler(req('/api/fotos/admin/dashboard'));
 assert.equal(response.status,401);
});
test('carrinho com identificador inválido é recusado antes do pagamento',async()=>{
 const invalid=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:'invalido',photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'44999999999',email:'cliente@example.com'}}));
 assert.equal(invalid.status,400);
});
test('pagamento em modo teste não libera originais, mesmo que o status seja aprovado',async()=>{
 state.mpStatus='pending';
 const response=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:idEvent,photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'44999999999',email:'cliente@example.com'}}));
 const {token}=await response.json();
 state.mpStatus='approved';state.mpLiveMode=false;
 const result=await handler(req('/api/fotos/order/'+idOrder,{token}));
 assert.equal((await result.json()).status,'pending');
 const forbidden=await handler(req('/api/fotos/download/'+idPhoto+'?pedido='+idOrder+'&chave='+encodeURIComponent(token)));
 assert.equal(forbidden.status,403);
 state.mpLiveMode=true;
});

test('GET autenticado do painel funciona sem cabeçalho Origin',async()=>{
 const {sessionToken}=await import('../netlify/lib/security.mjs');
 const response=await handler(new Request(origin+'/api/fotos/admin/dashboard',{headers:{Cookie:'hax_session='+sessionToken()}}));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.ok(Array.isArray(data.events));
 assert.ok(Array.isArray(data.customers));
});
test('POST autenticado sem Origin é bloqueado para evitar CSRF',async()=>{
 const {sessionToken}=await import('../netlify/lib/security.mjs');
 const response=await handler(new Request(origin+'/api/fotos/admin/event',{
  method:'POST',
  headers:{Cookie:'hax_session='+sessionToken(),'Content-Type':'application/json'},
  body:JSON.stringify({title:'Evento não autorizado',price:15})
 }));
 assert.equal(response.status,403);
 assert.equal((await response.json()).error,'Origem não autorizada.');
});

test('diagnóstico autenticado consulta Supabase e Cloudflare sem expor tokens',async()=>{
 const {sessionToken}=await import('../netlify/lib/security.mjs');
 const response=await handler(new Request(origin+'/api/fotos/admin/diagnostics',{headers:{Cookie:'hax_session='+sessionToken()}}));
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.database.ok,true);
 assert.equal(body.r2.ok,true);
 assert.equal(body.mercadoPago.configured,true);
 assert.equal(JSON.stringify(body).includes('sb_secret_mock_safe_test_key'),false);
 assert.equal(JSON.stringify(body).includes('testsecretaccesskey'),false);
});

test('evento rascunho fica oculto ao público e disponível em prévia autenticada',async()=>{
 const {sessionToken}=await import('../netlify/lib/security.mjs');
 state.event.published=false;
 try{
  const list=await handler(req('/api/fotos/events'));
  assert.equal(list.status,200);
  assert.equal((await list.json()).events.length,0);
  const denied=await handler(req('/api/fotos/event/'+idEvent));
  assert.equal(denied.status,404);
  const draft=await handler(new Request(origin+'/api/fotos/event/'+idEvent,{headers:{Cookie:'hax_session='+sessionToken()}}));
  assert.equal(draft.status,200);
  const data=await draft.json();
  assert.equal(data.event.preview_only,true);
  assert.equal(data.photos.length,1);
 }finally{state.event.published=true;}
});
test('admin consegue publicar evento válido e capa é atribuída automaticamente',async()=>{
 const {sessionToken}=await import('../netlify/lib/security.mjs');
 state.event.published=false;state.event.cover_photo_id=null;
 const response=await handler(new Request(origin+'/api/fotos/admin/event',{
  method:'PATCH',headers:{Cookie:'hax_session='+sessionToken(),Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({id:idEvent,published:true})
 }));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.event.published,true);
 assert.equal(data.event.cover_photo_id,idPhoto);
});

test('Webhook válido confirma Pix e assinatura adulterada é recusada',async()=>{
 state.mpStatus='pending';state.mpLiveMode=true;
 const created=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:idEvent,photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'44999999999',email:'cliente@example.com'}}));
 assert.equal(created.status,200);
 assert.equal(state.order.status,'pending');
 const url=origin+'/api/fotos/webhook?type=payment&data.id=987654321';
 const payload=JSON.stringify({type:'payment',data:{id:'987654321'}});
 const invalid=await handler(new Request(url,{method:'POST',headers:{'Content-Type':'application/json','x-signature':'ts=12345,v1=invalid','x-request-id':'test-webhook'},body:payload}));
 assert.equal(invalid.status,401);
 assert.equal(state.order.status,'pending');
 const timestamp=String(Date.now());
 const requestId='hax-test-notification-01';
 const manifest='id:987654321;request-id:'+requestId+';ts:'+timestamp+';';
 const signature=createHmac('sha256',process.env.MP_WEBHOOK_SECRET).update(manifest).digest('hex');
 state.mpStatus='approved';
 const accepted=await handler(new Request(url,{method:'POST',headers:{'Content-Type':'application/json','x-signature':'ts='+timestamp+',v1='+signature,'x-request-id':requestId},body:payload}));
 assert.equal(accepted.status,200);
 assert.equal((await accepted.json()).ok,true);
 assert.equal(state.order.status,'approved');
});
test('Pix da prévia envia notificação à própria prévia, não ao domínio de produção',async()=>{
 process.env.CONTEXT='deploy-preview';
 process.env.DEPLOY_PRIME_URL='https://deploy-preview-1--hasestudio.netlify.app';
 try{
  const created=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:idEvent,photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'44999999999',email:'cliente@example.com'}}));
  assert.equal(created.status,200);
  assert.equal(state.lastPaymentPayload.notification_url,'https://deploy-preview-1--hasestudio.netlify.app/api/fotos/webhook');
 }finally{
  delete process.env.CONTEXT;
  delete process.env.DEPLOY_PRIME_URL;
 }
});

test('Mercado Pago 13253 explica falta de chave Pix e cancela pedido sem cobrança',async()=>{
 state.mpCreateError=true;
 try{
  const response=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:idEvent,photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'44999999999',email:'cliente@example.com'}}));
  assert.equal(response.status,503);
  const body=await response.json();
  assert.match(body.error,/chave Pix ativa/i);
  assert.match(body.error,/13253/);
  assert.equal(state.order.status,'cancelled');
  assert.equal(state.order.payment_status,'pix_key_unavailable');
  assert.equal(state.order.payment_id,undefined);
 }finally{state.mpCreateError=false;}
});

test('galeria e capas publicadas usam links R2 temporários, sem ler bytes no Netlify',async()=>{
 state.event.published=true;state.event.cover_photo_id=idPhoto;state.photo.status='ready';const before=previewReads;
 const response=await handler(req('/api/fotos/event/'+idEvent));assert.equal(response.status,200);const d=await response.json();
 const photo=d.photos[0],url=new URL(photo.preview);assert.equal(url.hostname,process.env.R2_ACCOUNT_ID+'.r2.cloudflarestorage.com');assert.equal(url.pathname,'/hax-fotos/previas/a.webp');assert.ok(url.searchParams.has('X-Amz-Signature'));assert.equal(url.searchParams.get('X-Amz-Expires'),'900');assert.equal(url.searchParams.get('response-content-disposition'),'inline');assert.equal(photo.preview_fallback,'/api/fotos/preview/'+idPhoto);assert.ok(Date.parse(photo.preview_expires_at)>Date.now());assert.ok(!JSON.stringify(d).includes('originais/'));assert.ok(!JSON.stringify(d).includes('testsecretaccesskey'));
 const events=await handler(req('/api/fotos/events'));assert.equal(events.status,200);const cover=(await events.json()).events[0];assert.match(cover.cover_preview,/r2.cloudflarestorage.com/);
 const fallback=await handler(req(photo.preview_fallback));assert.equal(fallback.status,302);assert.match(fallback.headers.get('Location'),/\/previas\/a\.webp\?/);assert.equal(fallback.headers.get('Cache-Control'),'private, no-store');assert.equal(previewReads,before);
});
test('rascunhos e fotos ocultas não recebem URL assinada pública; admin mantém prévia privada',async()=>{
 const {sessionToken}=await import('../netlify/lib/security.mjs');const headers={Cookie:'hax_session='+sessionToken()};
 const route='/api/fotos/preview/'+idPhoto;
 state.event.published=false;state.photo.status='ready';
 try{
  const draft=await handler(new Request(origin+'/api/fotos/event/'+idEvent,{headers}));assert.equal(draft.status,200);assert.equal((await draft.json()).photos[0].preview,route);
  const denied=await handler(req(route));assert.equal(denied.status,404);
  const privatePhoto=await handler(new Request(origin+route,{headers}));assert.equal(privatePhoto.status,200);assert.equal(privatePhoto.headers.get('Cache-Control'),'private, no-store');assert.equal(privatePhoto.headers.get('Vary'),'Cookie');
  state.event.published=true;state.photo.status='hidden';
  assert.equal((await handler(req(route))).status,404);
  const hiddenGallery=await handler(req('/api/fotos/event/'+idEvent));assert.deepEqual((await hiddenGallery.json()).photos,[]);
  const hidden=await handler(new Request(origin+route,{headers}));assert.equal(hidden.status,200);assert.equal(hidden.headers.get('Cache-Control'),'private, no-store');
 }finally{state.event.published=true;state.photo.status='ready';}
});
test('flag de contingência restaura entrega por proxy sem mudar banco',async()=>{
 process.env.HAX_DIRECT_PREVIEWS='false';
 try{const route='/api/fotos/preview/'+idPhoto;const gallery=await handler(req('/api/fotos/event/'+idEvent));assert.equal((await gallery.json()).photos[0].preview,route);const proxied=await handler(req(route));assert.equal(proxied.status,200);assert.equal(await proxied.text(),'preview-only');}finally{delete process.env.HAX_DIRECT_PREVIEWS;}
});
test('URLs estáveis por janela e assinatura restrita ao caminho de prévia',async()=>{
 const {previewLink,isPreviewKey}=await import('../netlify/lib/fotos-previews.mjs');
 const now=Date.parse('2026-11-24T12:01:00Z');
 const first=previewLink('previas/a.webp',now);assert.equal(first.url,previewLink('previas/a.webp',now+120000).url);
 assert.notEqual(first.url,previewLink('previas/a.webp',now+300000).url);
 assert.equal(previewLink('originais/a.jpg',now),null);assert.equal(isPreviewKey('previas/../originais/a.webp'),false);
});
test('consulta compacta de Pix não envia QR nem consulta itens enquanto pendente e entrega itens na aprovação',async()=>{
 state.mpStatus='pending';state.mpLiveMode=true;
 const created=await handler(req('/api/fotos/checkout',{method:'POST',body:{eventId:idEvent,photoIds:[idPhoto],name:'Cliente Teste',whatsapp:'44999999999',email:'cliente@example.com'}}));const data=await created.json();assert.equal(created.status,200);
 const headers={'x-hax-order-token':data.token,'x-hax-status-only':'1'},url=origin+'/api/fotos/order/'+idOrder,before=itemReads;
 const pending=await handler(new Request(url,{headers}));const body=await pending.json();assert.equal(body.status,'pending');assert.equal(body.pix_qr_base64,undefined);assert.equal(body.items,undefined);assert.equal(itemReads,before);
 state.mpStatus='approved';const approved=await handler(new Request(url,{headers}));const paid=await approved.json();assert.equal(paid.status,'approved');assert.equal(paid.items.length,1);assert.ok(paid.items[0].original);assert.equal(itemReads,before+1);
});
test('consulta administrativa filtra pelo evento, não vaza chaves, exige login',async()=>{
 const {sessionToken}=await import('../netlify/lib/security.mjs');const route='/api/fotos/admin/data?table=photos&event='+idEvent+'&offset=0';
 assert.equal((await handler(req(route))).status,401);
 const response=await handler(new Request(origin+route,{headers:{Cookie:'hax_session='+sessionToken()}}));assert.equal(response.status,200);const d=await response.json();assert.equal(d.rows.length,1);assert.match(d.rows[0].preview,/r2.cloudflarestorage.com/);assert.equal(d.rows[0].preview_key,undefined);
});
