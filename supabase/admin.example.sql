-- Execute DEPOIS de criar seu usuário no painel Authentication do Supabase.
-- Troque o e-mail abaixo pelo mesmo e-mail usado no cadastro.
-- Não coloque uma senha neste arquivo.
do $$
declare admin_email text := 'SEU-EMAIL@EXEMPLO.COM'; account_id uuid;
begin
 select id into account_id from auth.users where lower(email)=lower(admin_email);
 if account_id is null then
  raise exception 'Usuário não encontrado em Authentication. Crie o usuário e confira o e-mail deste script.';
 end if;
 insert into public.admin_users(user_id,name) values(account_id,'Leanderson')
 on conflict(user_id) do update set name=excluded.name;
end;
$$;
