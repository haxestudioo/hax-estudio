import {getStore} from '@netlify/blobs';
export function store(context){const ctx=context?.deploy?.context||'dev';const suffix=ctx==='production'?'production':(ctx+'-'+(context?.deploy?.id||'local')).replace(/[^a-zA-Z0-9-]/g,'').slice(0,40);return getStore({name:'hax-estudio-'+suffix,consistency:'strong'});}
