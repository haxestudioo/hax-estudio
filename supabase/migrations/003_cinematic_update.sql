-- Atualização visual de 09/09/2026.
-- Banco existente: execute somente este arquivo, depois de publicar os arquivos novos.
-- Instalação nova: execute 001, 002 e este 003, nessa ordem.
-- Mantém leads, histórico, usuários, credenciais e os demais textos/configurações.
begin;
update public.site_settings
set value = value || jsonb_build_object(
  'hero_video', 'https://www.youtube.com/watch?v=AciOu04BxZg',
  'hero_cover', '/assets/covers/AciOu04BxZg.jpg',
  'second_video', 'https://www.youtube.com/watch?v=T0VN2ykadeg',
  'second_cover', '/assets/covers/T0VN2ykadeg.jpg'
)
where key = 'site';

update public.projects set position = case id
  when 'a0000000-0000-4000-8000-000000000003'::uuid then 0
  when 'a0000000-0000-4000-8000-000000000001'::uuid then 1
  when 'a0000000-0000-4000-8000-000000000002'::uuid then 2
end
where id in (
 'a0000000-0000-4000-8000-000000000003'::uuid,
 'a0000000-0000-4000-8000-000000000001'::uuid,
 'a0000000-0000-4000-8000-000000000002'::uuid
);
commit;
