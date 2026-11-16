import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';

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
 order:null, item:null, mpStatus:'pending',mpLiveMode:true
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const originalFetch=globalThis.fetch;
globalThis.fetch=async (input,options={})=>{
 const url=new URL(input),path=url.pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
 if(url.hostname==='example.supabase.co'){
  if(path==='/rest/v1/rpc/hax_create_order'){
   state.order={id:idOrder,customer_id:idCustomer,event_id:idEvent,total_cents:1000,status:'pending',access_hash:body.p_access_hash,created_at:new Date().toISOString()};
   state.item={order_id:idOrder,photo_id:idPhoto,original_key_snapshot:state.photo.original_key,filename_snapshot:state.photo.filename,unit_price_cents:1000};
   return json({id:idOrder,total_cents:1000});
  }
  if(path==='/rest/v1/hax_events')return json([state.event]);
  if(path==='/rest/v1/hax_photos')return json([state.photo]);
  if(path==='/rest/v1/hax_customers'){
   if(method==='PATCH'){Object.assign(state.customer,body);return json([state.customer]);}
   return json([state.customer]);
  }
  if(path==='/rest/v1/hax_orders'){
   if(method==='PATCH'){Object.assign(state.order,body);return json([state.order]);}
   return json(state.order?[state.order]:[]);
  }
  if(path==='/rest/v1/hax_order_items')return json(state.item?[state.item]:[]);
  throw Error('Rota Supabase não simulada: '+path);
 }
 if(url.hostname.endsWith('.r2.cloudflarestorage.com') && method==='GET')return new Response('<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>',{status:404,headers:{'Content-Type':'application/xml'}});
 if(url.hostname==='api.mercadopago.com'){
  if(path==='/v1/payments'&&method==='POST')return json({id:987654321,status:'pending',live_mode:true,external_reference:idOrder,payment_method_id:'pix',transaction_amount:10,point_of_interaction:{transaction_data:{qr_code:'PIXFAKE',qr_code_base64:'cGl4'}}});
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
 assert.ok(created.token.length>32);
 const before=await handler(req('/api/fotos/order/'+idOrder,{token:created.token}));
 assert.equal((await before.json()).status,'pending');
 const forbidden=await handler(req('/api/fotos/download/'+idPhoto+'?pedido='+idOrder+'&chave='+encodeURIComponent(created.token)));
 assert.equal(forbidden.status,403);
 const wrong=await handler(req('/api/fotos/order/'+idOrder,{token:'invalid-token-value-very-long-abc12345'}));
 assert.equal(wrong.status,403);
 state.mpStatus='approved';
 const paid=await handler(req('/api/fotos/order/'+idOrder,{token:created.token}));
 const details=await paid.json();assert.equal(details.status,'approved');assert.equal(details.items.length,1);
 const original=await handler(req('/api/fotos/download/'+idPhoto+'?pedido='+idOrder+'&chave='+encodeURIComponent(created.token)));
 assert.equal(original.status,302);assert.match(original.headers.get('Location'),/r2\.cloudflarestorage\.com/);
 assert.match(original.headers.get('Location'),/X-Amz-Signature=/);
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
