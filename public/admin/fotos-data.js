export async function shopApi(path,method='GET',body){
 const r=await fetch('/api/fotos/admin/'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store'});
 const d=await r.json();if(!r.ok)throw Error(d.error||'Falha ao consultar a loja');return d;
}
export async function loadRows(table){
 const all=[];let offset=0;
 do{const d=await shopApi('data?table='+encodeURIComponent(table)+'&offset='+offset);all.push(...d.rows);offset=d.next;}while(offset!==null);
 return all;
}
export function normalizePhone(value){const d=String(value||'').replace(/\D/g,'');return d.length===10||d.length===11?'55'+d:d;}
export const dateKey=value=>{if(!value)return '';const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return parts.year+'-'+parts.month+'-'+parts.day;};
export function metrics(orders,items){
 const paid=orders.filter(o=>o.status==='approved'),pending=orders.filter(o=>o.status==='pending'),ids=new Set(paid.map(o=>o.id));
 const gross=paid.reduce((s,o)=>s+Number(o.total_cents),0);
 return {orders:orders.length,paid:paid.length,pending:pending.length,other:orders.length-paid.length-pending.length,gross,pendingValue:pending.reduce((s,o)=>s+Number(o.total_cents),0),photos:items.filter(i=>ids.has(i.order_id)).length,ticket:paid.length?gross/paid.length:0,conversion:orders.length?paid.length/orders.length:0,buyers:new Set(paid.map(o=>normalizePhone(o.buyer_whatsapp)||o.customer_id)).size};
}
export function groupCustomers(customers,orders){
 const groups=new Map();
 for(const c of customers){const key=normalizePhone(c.whatsapp)||c.id;const g=groups.get(key)||{key,phone:normalizePhone(c.whatsapp),name:c.name,email:c.email,registered:c.created_at,orders:[]};if(c.created_at<g.registered)g.registered=c.created_at;groups.set(key,g);}
 for(const o of orders){const c=customers.find(c=>c.id===o.customer_id),key=normalizePhone(o.buyer_whatsapp||c?.whatsapp)||o.customer_id;const g=groups.get(key)||{key,phone:normalizePhone(o.buyer_whatsapp),name:o.buyer_name,email:o.buyer_email,registered:o.created_at,orders:[]};g.orders.push(o);if(o.created_at<g.registered)g.registered=o.created_at;groups.set(key,g);}
 return [...groups.values()].map(g=>{g.orders.sort((a,b)=>b.created_at.localeCompare(a.created_at));const paid=g.orders.filter(o=>o.status==='approved');return {...g,paid:paid.length,pending:g.orders.filter(o=>o.status==='pending').length,total:paid.reduce((s,o)=>s+o.total_cents,0),last:paid.map(o=>o.paid_at||o.created_at).sort().at(-1)||null};}).sort((a,b)=>(b.last||b.registered||'').localeCompare(a.last||a.registered||''));
}
