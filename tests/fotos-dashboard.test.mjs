import test from 'node:test';import assert from 'node:assert/strict';import {metrics,groupCustomers,normalizePhone,dateKey} from '../public/admin/fotos-data.js';
test('métricas ignoram pendências e estornos no faturamento e agrupam telefone',()=>{const orders=[{id:'1',status:'approved',total_cents:1000,buyer_whatsapp:'(44) 99999-9999',created_at:'2026-11-24T01:00:00Z'},{id:'2',status:'pending',total_cents:2000,buyer_whatsapp:'5544999999999',created_at:'2026-11-24T02:00:00Z'},{id:'3',status:'refunded',total_cents:3000,buyer_whatsapp:'5544999999999',created_at:'2026-11-24T03:00:00Z'}];const m=metrics(orders,[{order_id:'1'},{order_id:'2'}]);assert.equal(m.gross,1000);assert.equal(m.pendingValue,2000);assert.equal(m.photos,1);assert.equal(groupCustomers([],orders).length,1);assert.equal(normalizePhone('55 99999-9999'),'5555999999999');assert.equal(dateKey('2026-11-24T01:00:00Z'),'2026-11-23');});

import {JSDOM} from 'jsdom';import {mount} from '../public/admin/fotos-sales.js';
test('abas vendas e CRM exibem dados separados com histórico e filtros',async()=>{const dom=new JSDOM('<div id="panel"></div>');const panel=dom.window.document.querySelector('#panel'),prev=globalThis.fetch;
 const customer={id:'c',name:'Ana Teste',whatsapp:'44999999999',email:'ana@example.com',created_at:'2026-11-24T10:00:00Z'};
 const order={id:'o',customer_id:'c',buyer_name:customer.name,buyer_whatsapp:customer.whatsapp,buyer_email:customer.email,event_id:'ev',total_cents:1500,status:'approved',payment_id:'1',created_at:'2026-11-24T10:00:00Z',paid_at:'2026-11-24T10:05:00Z'};
 const sets={orders:[order],customers:[customer],items:[{order_id:'o',photo_id:'p',filename_snapshot:'foto.jpg',unit_price_cents:1500}],events:[{id:'ev',title:'Corrida'}]};
 globalThis.fetch=async u=>{const url=new URL(u,'https://example.org');return Response.json({rows:sets[url.searchParams.get('table')]||[],next:null});};
 try{await mount(panel,'sales');assert.match(panel.textContent,/Receita bruta aprovada/);assert.match(panel.textContent,/foto.jpg/);assert.match(panel.textContent,/Horário das aprovações/);assert.equal(panel.querySelector('#hs-create'),null);panel.querySelector('#hs-status').value='pending';panel.querySelector('#hs-apply').click();assert.equal(panel.querySelectorAll('tbody tr').length,0);await mount(panel,'crm');assert.match(panel.textContent,/Ana Teste/);assert.match(panel.textContent,/Clientes únicos/);assert.ok(panel.querySelector('#hs-create'));assert.match(panel.textContent,/foto.jpg/);}finally{globalThis.fetch=prev;dom.window.close();}
});

test('consulta paginada de fotos administrativas usa o filtro por evento',async()=>{
 const {loadRows}=await import('../public/admin/fotos-data.js');const prev=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;const p=new URL(url,'https://example.org');assert.equal(p.searchParams.get('table'),'photos');assert.equal(p.searchParams.get('event'),'evento-selecionado');assert.equal(p.searchParams.get('offset'),calls===1?'0':'200');return Response.json({rows:[{id:'p'+calls}],next:calls===1?200:null});};
 try{assert.equal((await loadRows('photos',{event:'evento-selecionado'})).length,2);assert.equal(calls,2);}finally{globalThis.fetch=prev;}
});
