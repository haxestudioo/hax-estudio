-- MIGRAÇÃO ADITIVA. Executar somente após autorização, no Supabase de HAX Fotos.
-- Não apaga pedidos, clientes, fotos nem modifica hashes existentes. Sem envio retroativo.
begin;
create or replace function public.hax_wa_normalize(value text) returns text language sql immutable set search_path=public as $$
 select case when length(d) in (10,11) then '55'||d when d ~ '^55[0-9]{10,11}$' then d else null end
 from (select regexp_replace(coalesce(value,''),'[^0-9]','','g') d) s;
$$;
create index if not exists hax_orders_wa_phone_idx on public.hax_orders(public.hax_wa_normalize(buyer_whatsapp),created_at desc);
create table if not exists public.hax_wa_jobs(
 order_id uuid primary key references public.hax_orders(id) on delete cascade,
 phone text not null check(phone ~ '^55[0-9]{10,11}$'),
 receipt_state text not null default 'disabled' check(receipt_state in ('disabled','waiting','sending','accepted','delivered','read','failed','uncertain','skipped')),
 reminder_state text not null default 'disabled' check(reminder_state in ('disabled','waiting','sending','accepted','delivered','read','failed','uncertain','skipped')),
 receipt_message_id text unique, reminder_message_id text unique,
 receipt_sent_at timestamptz, reminder_sent_at timestamptz,
 receipt_claim_at timestamptz, reminder_claim_at timestamptz,
 next_check_at timestamptz not null default now(),
 consent_version text not null default '2026-11-24-v1',
 created_at timestamptz not null default now()
);
create index if not exists hax_wa_jobs_phone_idx on public.hax_wa_jobs(phone,created_at desc);
create index if not exists hax_wa_jobs_due_idx on public.hax_wa_jobs(next_check_at) where receipt_state='waiting' or reminder_state='waiting';
create table if not exists public.hax_wa_optouts(phone text primary key,created_at timestamptz not null default now());
alter table public.hax_wa_jobs enable row level security;
alter table public.hax_wa_optouts enable row level security;
revoke all on public.hax_wa_jobs,public.hax_wa_optouts from anon,authenticated;
grant select,insert,update on public.hax_wa_jobs,public.hax_wa_optouts to service_role;
create or replace function public.hax_wa_register(p_order uuid,p_receipt boolean,p_reminder boolean) returns void language plpgsql security definer set search_path=public as $$
declare v_phone text;
begin
 select public.hax_wa_normalize(buyer_whatsapp) into v_phone from hax_orders where id=p_order and payment_id is not null;
 if v_phone is null then return; end if;
 if exists(select 1 from hax_wa_optouts where phone=v_phone) then return; end if;
 insert into hax_wa_jobs(order_id,phone,receipt_state,reminder_state) values(p_order,v_phone,case when p_receipt then 'waiting' else 'disabled' end,case when p_reminder then 'waiting' else 'disabled' end) on conflict(order_id) do nothing;
end;$$;
create or replace function public.hax_wa_candidates(p_limit int default 8) returns table(order_id uuid,phone text,kind text) language sql security definer set search_path=public as $$
 select j.order_id,j.phone,k.kind from hax_wa_jobs j join hax_orders o on o.id=j.order_id
 cross join lateral (select 'receipt'::text kind,case when o.status='approved' then 0 else 2 end priority where j.receipt_state='waiting' and o.status in ('approved','pending') and o.created_at>=now()-interval '7 days'
 union all select 'reminder',1 where j.reminder_state='waiting' and o.status in ('pending','rejected','cancelled') and o.payment_id is not null and o.created_at<=now()-interval '4 hours' and o.created_at>=now()-interval '24 hours') k
 where j.next_check_at<=now() and not exists(select 1 from hax_wa_optouts x where x.phone=j.phone)
 order by k.priority,j.next_check_at,j.order_id limit greatest(1,least(p_limit,20));
$$;
create or replace function public.hax_wa_related(p_order uuid,p_kind text) returns setof public.hax_orders language sql security definer set search_path=public as $$
 select o.* from hax_orders o join hax_wa_jobs j on j.order_id=p_order
 where o.id=p_order or (p_kind='reminder' and public.hax_wa_normalize(o.buyer_whatsapp)=j.phone and (o.status='pending' and o.payment_id is not null or o.created_at >= (select created_at from hax_orders where id=p_order) or o.paid_at >= (select created_at from hax_orders where id=p_order)))
 order by (o.id=p_order) desc,o.created_at desc limit 21;
$$;
create or replace function public.hax_wa_defer(p_order uuid) returns void language sql security definer set search_path=public as $$
 update hax_wa_jobs set next_check_at=now()+interval '5 minutes' where order_id=p_order;
$$;
create or replace function public.hax_wa_claim(p_order uuid,p_kind text) returns boolean language plpgsql security definer set search_path=public as $$
declare j hax_wa_jobs%rowtype; o hax_orders%rowtype; n int;
begin
 select * into j from hax_wa_jobs where order_id=p_order;
 if not found then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(j.phone,0));
 select * into j from hax_wa_jobs where order_id=p_order for update;
 select * into o from hax_orders where id=p_order;
 if not found or exists(select 1 from hax_wa_optouts x where x.phone=j.phone) then return false; end if;
 if p_kind='receipt' then
  if j.receipt_state<>'waiting' or o.status<>'approved' then return false; end if;
  update hax_wa_jobs set receipt_state='sending',receipt_claim_at=now() where order_id=p_order;
 elsif p_kind='reminder' then
  if j.reminder_state<>'waiting' or o.status not in ('pending','rejected','cancelled') or o.payment_id is null or o.created_at>now()-interval '4 hours' or o.created_at<now()-interval '24 hours' then return false; end if;
  if exists(select 1 from hax_orders a where a.id<>p_order and public.hax_wa_normalize(a.buyer_whatsapp)=j.phone and ((a.payment_id is not null and (a.created_at>o.created_at or (a.created_at=o.created_at and a.id>o.id))) or (a.status='approved' and (a.created_at>=o.created_at or a.paid_at>=o.created_at))))
    or exists(select 1 from hax_wa_jobs a where a.phone=j.phone and a.order_id<>p_order and a.reminder_state in ('sending','accepted','delivered','read','uncertain') and coalesce(a.reminder_sent_at,a.reminder_claim_at)>=now()-interval '24 hours') then
   update hax_wa_jobs set reminder_state='skipped' where order_id=p_order;return false;
  end if;
  update hax_wa_jobs set reminder_state='sending',reminder_claim_at=now() where order_id=p_order;
 else return false;end if;
 return true;
end;$$;
create or replace function public.hax_wa_finish(p_order uuid,p_kind text,p_state text,p_message_id text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_state not in ('accepted','failed','uncertain') then return;end if;
 if p_kind='receipt' then update hax_wa_jobs set receipt_state=p_state,receipt_message_id=p_message_id,receipt_sent_at=case when p_state='accepted' then now() else null end where order_id=p_order and receipt_state='sending';
 elsif p_kind='reminder' then update hax_wa_jobs set reminder_state=p_state,reminder_message_id=p_message_id,reminder_sent_at=case when p_state='accepted' then now() else null end where order_id=p_order and reminder_state='sending';end if;
end;$$;
create or replace function public.hax_wa_expire_claims() returns void language plpgsql security definer set search_path=public as $$
begin
 update hax_wa_jobs set receipt_state='uncertain' where receipt_state='sending' and receipt_claim_at<now()-interval '30 minutes';
 update hax_wa_jobs set reminder_state='uncertain' where reminder_state='sending' and reminder_claim_at<now()-interval '30 minutes';
 update hax_wa_jobs j set reminder_state='skipped' from hax_orders o where o.id=j.order_id and j.reminder_state='waiting' and (o.status in ('approved','refunded','charged_back') or o.created_at<now()-interval '24 hours');
 update hax_wa_jobs j set receipt_state='skipped' from hax_orders o where o.id=j.order_id and j.receipt_state='waiting' and (o.status in ('rejected','cancelled','refunded','charged_back') or o.created_at<now()-interval '7 days');
end;$$;
create or replace function public.hax_wa_optout(p_phone text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_phone !~ '^55[0-9]{10,11}$' then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_phone,0));
 insert into hax_wa_optouts(phone) values(p_phone) on conflict do nothing;
 update hax_wa_jobs set receipt_state=case when receipt_state='waiting' then 'skipped' else receipt_state end,reminder_state=case when reminder_state='waiting' then 'skipped' else reminder_state end where phone=p_phone;
end;$$;
create or replace function public.hax_wa_delivery_status(p_message_id text,p_status text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_status not in ('delivered','read','failed') then return; end if;
 update hax_wa_jobs set receipt_state=p_status where receipt_message_id=p_message_id and (receipt_state='accepted' or (receipt_state='delivered' and p_status='read'));
 update hax_wa_jobs set reminder_state=p_status where reminder_message_id=p_message_id and (reminder_state='accepted' or (reminder_state='delivered' and p_status='read'));
end;$$;
do $$ declare fn text;begin foreach fn in array array['hax_wa_normalize(text)','hax_wa_register(uuid,boolean,boolean)','hax_wa_candidates(integer)','hax_wa_related(uuid,text)','hax_wa_defer(uuid)','hax_wa_claim(uuid,text)','hax_wa_finish(uuid,text,text,text)','hax_wa_expire_claims()','hax_wa_optout(text)','hax_wa_delivery_status(text,text)'] loop execute 'revoke all on function public.'||fn||' from public,anon,authenticated'; execute 'grant execute on function public.'||fn||' to service_role';end loop;end $$;
commit;
