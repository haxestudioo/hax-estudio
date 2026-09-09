import { endpoint, json, configured, publicKey, method } from './lib/core.mjs';
export default endpoint(async (req) => {
  method(req, 'GET');
  return json({
    configured: configured() && Boolean(publicKey()),
    supabase_url: process.env.SUPABASE_URL || '',
    supabase_key: publicKey(),
  });
});
