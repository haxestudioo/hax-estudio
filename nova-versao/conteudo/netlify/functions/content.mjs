import seed from '../../src/content.json' with {type:'json'};
import {store} from '../lib/storage.mjs';
import {authenticated,sameOrigin,json} from '../lib/security.mjs';
import {validateContent} from '../lib/validate.mjs';
import {upgradeContent} from '../../public/content-model.js';
export default async(req,context)=>{try{const storage=store(context);if(req.method==='GET'){const saved=await storage.getWithMetadata('site-content',{type:'json'});return json({content:upgradeContent(saved?.data||seed),revision:saved?.etag||'initial'});}
if(!authenticated(req))return json({error:'Entre no painel para continuar.'},401);if(!sameOrigin(req))return json({error:'Origem não autorizada.'},403);if(req.method!=='PUT')return json({error:'Método não permitido.'},405);const raw=await req.text();if(raw.length>230000)return json({error:'Conteúdo muito grande.'},413);const {content,revision}=JSON.parse(raw);validateContent(content);if(!revision)return json({error:'Recarregue os dados antes de salvar.'},409);const options=revision==='initial'?{onlyIfNew:true}:{onlyIfMatch:revision};const result=await storage.setJSON('site-content',content,options);if(!result.modified)return json({error:'O conteúdo mudou em outra sessão. Exporte suas alterações e recarregue o painel.'},409);return json({ok:true,revision:result.etag});}catch(e){return json({error:e.message||'Não foi possível salvar o conteúdo.'},400);}};
export const config={path:'/api/content'};
