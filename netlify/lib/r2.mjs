import {createHmac,createHash} from 'node:crypto';
import {env} from './security.mjs';
function required(name){const value=env(name);if(!value)throw Error('Configuração pendente: '+name);return value;}
const sha=s=>createHash('sha256').update(s).digest('hex');
const hmac=(key,text)=>createHmac('sha256',key).update(text).digest();
const pct=x=>encodeURIComponent(x).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
function credentials(){return {account:env('R2_ACCOUNT_ID')||'1ed24f2eb14f7cc0e4ccaf9ef859fd1e',bucket:env('R2_BUCKET')||'hax-fotos',access:required('R2_ACCESS_KEY_ID'),secret:required('R2_SECRET_ACCESS_KEY')};}
export function signR2(method,key,expires=600){
 const {account,bucket,access,secret}=credentials();
 if(!['GET','PUT','HEAD'].includes(method)||!key||key.includes('..'))throw Error('Requisição de arquivo inválida.');
 const host=account+'.r2.cloudflarestorage.com';
 const path='/'+[bucket,...key.split('/')].map(pct).join('/');
 const now=new Date(),date=now.toISOString().replace(/[:-]|\.\d{3}/g,'').slice(0,15)+'Z',day=date.slice(0,8);
 const scope=day+'/auto/s3/aws4_request';
 const params={
 'X-Amz-Algorithm':'AWS4-HMAC-SHA256',
 'X-Amz-Credential':access+'/'+scope,
 'X-Amz-Date':date,
 'X-Amz-Expires':String(expires),
 'X-Amz-SignedHeaders':'host'
 };
 const query=Object.entries(params).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>pct(k)+'='+pct(v)).join('&');
 const canonical=[method,path,query,'host:'+host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
 const stringToSign=['AWS4-HMAC-SHA256',date,scope,sha(canonical)].join('\n');
 const kDay=hmac('AWS4'+secret,day),kRegion=hmac(kDay,'auto'),kService=hmac(kRegion,'s3'),kSigning=hmac(kService,'aws4_request');
 const signature=createHmac('sha256',kSigning).update(stringToSign).digest('hex');
 return 'https://'+host+path+'?'+query+'&X-Amz-Signature='+signature;
}
export async function headR2(key){const r=await fetch(signR2('HEAD',key,60),{method:'HEAD'});if(!r.ok)throw Error('Arquivo não recebido no R2: '+r.status);return {length:Number(r.headers.get('content-length'))};}
export async function readR2(key){const r=await fetch(signR2('GET',key,60));if(!r.ok)throw Error('Arquivo indisponível no armazenamento: '+r.status);return r;}
