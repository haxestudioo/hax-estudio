import {signR2} from './r2.mjs';
import {env} from './security.mjs';
export const directPreviewsEnabled=()=>env('HAX_DIRECT_PREVIEWS')!=='false';
export const isPreviewKey=key=>typeof key==='string'&&/^previas\/[a-zA-Z0-9_/-]+\.webp$/.test(key)&&!key.includes('..');
export function previewLink(key,now=Date.now()){
 if(!directPreviewsEnabled()||!isPreviewKey(key))return null;
 // Same URL within each 5-minute signing window for browser reuse.
 // Valid for 15 minutes from the beginning of the window (at least 10 minutes on issue).
 const issued=Math.floor(now/300000)*300000;
 return {url:signR2('GET',key,900,{disposition:'inline',cacheControl:'private, max-age=120'},new Date(issued)),expires_at:new Date(issued+900000).toISOString()};
}
