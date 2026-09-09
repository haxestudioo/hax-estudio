import { endpoint, json, body, admin, db, method, HttpError, uuid } from './lib/core.mjs';
import { tables, validateEntity, validateSettings } from './lib/validation.mjs';
export default endpoint(async (req) => {
  method(req, 'POST', 'PATCH', 'DELETE');
  const user = await admin(req);
  const input = await body(req, 50000);
  if (input.entity === 'settings') {
    if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
    const value = validateSettings(input.key, input.data);
    const old = await db('site_settings?key=eq.' + encodeURIComponent(input.key));
    const rows = await db('site_settings?on_conflict=key', {
      method: 'POST',
      data: { key: input.key, value: { ...(old[0]?.value || {}), ...value } },
      prefer: 'resolution=merge-duplicates,return=representation',
    });
    return json({ rows });
  }
  if (!tables.includes(input.entity)) throw new HttpError(400, 'Entidade não permitida.');
  const table = input.entity;
  const id = input.id || input.data?.id,
    key = table === 'blocked_dates' ? 'date' : 'id';
  if (
    table === 'pipeline_stages' &&
    (req.method === 'DELETE' ||
      (req.method === 'PATCH' && input.data?.kind && input.data.kind !== 'open'))
  ) {
    const open = await db('pipeline_stages?kind=eq.open&select=id');
    if (open.length === 1 && open[0].id === id)
      throw new HttpError(
        400,
        'Mantenha pelo menos uma etapa em andamento para receber novos contatos.',
      );
  }
  if (req.method === 'DELETE') {
    if (table === 'lead_activities') throw new HttpError(403, 'O histórico é preservado.');
    if (!id) throw new HttpError(400, 'Identificador ausente.');
    await db(table + '?' + key + '=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    return json({ success: true });
  }
  const data = validateEntity(table, input.data, req.method === 'POST');
  if (table === 'lead_activities') data.created_by = user.id;
  if (table === 'leads') {
    data.updated_by = user.id;
    if (data.consent === true) data.consented_at = new Date().toISOString();
    if (data.consent === false) data.consented_at = null;
  }
  if (req.method === 'PATCH') {
    if (!id) throw new HttpError(400, 'Identificador ausente.');
    if (table === 'pipeline_stages' && data.id && data.id !== id)
      throw new HttpError(400, 'O identificador de uma etapa existente não pode ser alterado.');
    if (table === 'lead_activities') throw new HttpError(403, 'O histórico é preservado.');
    let path = table + '?' + key + '=eq.' + encodeURIComponent(id);
    if (table === 'leads') {
      if (!input.version || Number.isNaN(new Date(input.version).getTime()))
        throw new HttpError(400, 'Atualize o lead antes de salvar.');
      path += '&updated_at=eq.' + encodeURIComponent(input.version);
    }
    const rows = await db(path, { method: 'PATCH', data });
    if (!rows.length)
      throw new HttpError(
        409,
        'Este registro foi atualizado em outra sessão. Recarregue antes de salvar.',
      );
    return json({ rows });
  }
  const rows = await db(table, { method: 'POST', data });
  return json({ rows }, 201);
});
