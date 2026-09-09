import { request, applyTheme } from './utils.js';
try {
  const r = await request('public-config');
  applyTheme(r.settings?.theme || {});
  const site = r.settings?.site || {},
    link = document.getElementById('privacy-contact');
  if (site.privacy_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.privacy_email))
    link.href = 'mailto:' + site.privacy_email;
  else if (site.whatsapp) link.href = 'https://wa.me/' + site.whatsapp.replace(/\D/g, '');
} catch {}
