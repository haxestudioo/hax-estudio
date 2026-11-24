import {runWhatsApp} from '../lib/fotos-whatsapp.mjs';
import {reconcileForWhatsApp} from './fotos.mjs';
export default async ()=>{try{const result=await runWhatsApp(reconcileForWhatsApp);return Response.json(result);}catch{console.error('HAX WhatsApp: falha no processamento da fila');return new Response('Retry on next scheduled execution',{status:500});}};
export const config={schedule:'*/5 * * * *'};
