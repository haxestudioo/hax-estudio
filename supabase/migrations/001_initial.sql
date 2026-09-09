-- Hax Estúdio Casamentos. Execute uma vez no SQL Editor do Supabase.
begin;
create extension if not exists pgcrypto;

create table public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Administrador',
 created_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.site_settings (key text primary key,value jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now());
create table public.projects (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null, category text not null default 'Casamento' check(category in ('Casamento','Pré-wedding')),
 video_url text not null,cover_url text not null,preview_url text not null default '',description text not null default '',location text not null default '',year text not null default '',
 position integer not null default 0,published boolean not null default false,featured boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.testimonials (id uuid primary key default gen_random_uuid(),couple text not null,quote text not null,project_slug text not null default '',published boolean not null default false,position integer not null default 0,updated_at timestamptz not null default now());
create table public.packages (id uuid primary key default gen_random_uuid(),name text not null,description text not null default '',price numeric(12,2) check(price>=0),items jsonb not null default '[]'::jsonb,position integer not null default 0,published boolean not null default false,updated_at timestamptz not null default now());
create table public.faqs (id uuid primary key default gen_random_uuid(),question text not null,answer text not null,position integer not null default 0,published boolean not null default false,updated_at timestamptz not null default now());
create table public.pipeline_stages (id text primary key check(id ~ '^[a-z0-9-]+$'),name text not null,position integer not null default 0,probability integer not null default 0 check(probability between 0 and 100),color text not null default '#c9b58e' check(color ~ '^#[0-9a-fA-F]{6}$'),kind text not null default 'open' check(kind in ('open','won','lost')));
create table public.leads (
 id uuid primary key default gen_random_uuid(),request_key uuid unique,
 name text not null,partner text not null default '',phone text not null,email text not null default '',event_date date,event_city text not null default '',venue text not null default '',
 origin text not null default 'manual',utm jsonb not null default '{}'::jsonb,stage_id text not null references public.pipeline_stages(id) on delete restrict,
 temperature text not null default 'warm' check(temperature in ('cold','warm','hot')),score integer not null default 30 check(score between 0 and 100),
 budget numeric(12,2) not null default 0 check(budget>=0),estimated_value numeric(12,2) not null default 0 check(estimated_value>=0),
 next_action text not null default '',next_action_at timestamptz,last_contact_at timestamptz,notes text not null default '',loss_reason text not null default '',
 updated_by uuid references auth.users(id) on delete set null,consent boolean not null default false,consented_at timestamptz,archived boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index leads_stage_idx on public.leads(stage_id,created_at desc);
create index leads_followup_idx on public.leads(next_action_at) where archived=false;
create table public.lead_activities (id uuid primary key default gen_random_uuid(),lead_id uuid not null references public.leads(id) on delete cascade,type text not null default 'note',content text not null,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
create index lead_activities_lead_idx on public.lead_activities(lead_id,created_at desc);
create table public.blocked_dates (date date primary key,label text not null default '',created_at timestamptz not null default now());
create table public.chat_usage (month date primary key,spent_brl numeric(16,6) not null default 0,reserved_brl numeric(16,6) not null default 0,requests integer not null default 0,input_tokens bigint not null default 0,output_tokens bigint not null default 0);
create table public.chat_reservations (id uuid primary key,month date not null references public.chat_usage(month),amount_brl numeric(16,6) not null,actual_brl numeric(16,6),status text not null default 'pending' check(status in ('pending','completed','uncertain','released')),created_at timestamptz not null default now(),settled_at timestamptz,model text not null);
create table public.rate_limits (bucket text primary key,hits integer not null default 0,expires_at timestamptz not null);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$begin new.updated_at=now();return new;end;$$;
do $$declare t text;begin foreach t in array array['site_settings','projects','testimonials','packages','faqs','leads'] loop execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);end loop;end;$$;
create or replace function public.log_lead_changes() returns trigger language plpgsql security definer set search_path=public as $$
declare old_name text;new_name text;
begin
 if tg_op='INSERT' then insert into public.lead_activities(lead_id,type,content,created_by) values(new.id,'created','Contato cadastrado. Origem: '||new.origin,new.updated_by);
 elsif old.stage_id is distinct from new.stage_id then
 select name into old_name from public.pipeline_stages where id=old.stage_id;select name into new_name from public.pipeline_stages where id=new.stage_id;
 insert into public.lead_activities(lead_id,type,content,created_by) values(new.id,'stage','Etapa alterada: '||coalesce(old_name,old.stage_id)||' → '||coalesce(new_name,new.stage_id),new.updated_by);
 end if;return new;
end;$$;
create trigger log_lead_changes after insert or update on public.leads for each row execute function public.log_lead_changes();

create or replace function public.track_lead_consent() returns trigger language plpgsql set search_path=public as $$
begin
 if not new.consent then new.consented_at=null;
 elsif tg_op='INSERT' then new.consented_at=coalesce(new.consented_at,now());
 elsif old.consent then new.consented_at=old.consented_at;
 else new.consented_at=now();end if;
 return new;
end;$$;
create trigger track_lead_consent before insert or update on public.leads for each row execute function public.track_lead_consent();

-- O funil precisa de ao menos uma etapa aberta para receber o formulário.
create or replace function public.keep_open_pipeline_stage() returns trigger language plpgsql set search_path=public as $$
begin
 if old.kind='open' and (tg_op='DELETE' or new.kind<>'open') then
  perform pg_advisory_xact_lock(1480672073);
  if not exists(select 1 from public.pipeline_stages where kind='open' and id<>old.id) then
   raise exception using errcode='23514',message='hax_pipeline_requires_open_stage';
  end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
create trigger keep_open_pipeline_stage before update or delete on public.pipeline_stages for each row execute function public.keep_open_pipeline_stage();

-- Nenhum visitante anônimo recebe acesso às tabelas ou ao CRM.
do $$declare t text;begin foreach t in array array['admin_users','site_settings','projects','testimonials','packages','faqs','pipeline_stages','leads','lead_activities','blocked_dates','chat_usage','chat_reservations','rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('revoke all on public.%I from authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;end;$$;
-- O SDK é usado apenas para autenticação e upload. Escritas de negócio passam pelo servidor.
grant select on public.admin_users to authenticated;
create policy admin_users_self on public.admin_users for select to authenticated using(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('portfolio','portfolio',true,8388608,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
create policy portfolio_admin_insert on storage.objects for insert to authenticated with check(bucket_id='portfolio' and public.is_admin());
create policy portfolio_admin_update on storage.objects for update to authenticated using(bucket_id='portfolio' and public.is_admin()) with check(bucket_id='portfolio' and public.is_admin());
create policy portfolio_admin_delete on storage.objects for delete to authenticated using(bucket_id='portfolio' and public.is_admin());
create policy portfolio_admin_select on storage.objects for select to authenticated using(bucket_id='portfolio' and public.is_admin());

create or replace function public.consume_rate_limit(p_bucket text,p_max integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path=public as $$declare n integer;
begin
 if p_max<1 or p_seconds<1 then return false;end if;
 insert into public.rate_limits(bucket,hits,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set hits=case when rate_limits.expires_at<=now() then 1 else rate_limits.hits+1 end,expires_at=case when rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else rate_limits.expires_at end returning hits into n;
 return n<=p_max;
end;$$;

-- Reserva atômica ANTES da chamada OpenAI: concorrência não ultrapassa o teto configurado.
create or replace function public.reserve_chat_budget(p_id uuid,p_amount numeric,p_model text) returns boolean
language plpgsql security definer set search_path=public as $$
declare m date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;s jsonb;u public.chat_usage%rowtype;cap numeric;
begin
 select value into s from public.site_settings where key='chatbot' for update;
 if s is null or coalesce((s->>'enabled')::boolean,false)=false or p_amount<=0 then return false;end if;
 cap:=coalesce((s->>'budget_brl')::numeric,0);
 insert into public.chat_usage(month) values(m) on conflict do nothing;
 select * into u from public.chat_usage where month=m for update;
 if u.spent_brl+u.reserved_brl+p_amount>cap then return false;end if;
 insert into public.chat_reservations(id,month,amount_brl,model) values(p_id,m,p_amount,p_model);
 update public.chat_usage set reserved_brl=reserved_brl+p_amount where month=m;return true;
end;$$;
-- Em timeout/resultado incerto, contabiliza a reserva integral por segurança.
create or replace function public.settle_chat_budget(p_id uuid,p_actual numeric,p_input bigint,p_output bigint,p_status text) returns void
language plpgsql security definer set search_path=public as $$declare r public.chat_reservations%rowtype;a numeric;
begin
 select * into r from public.chat_reservations where id=p_id for update;
 if not found or r.status<>'pending' then return;end if;
 if p_status not in ('completed','uncertain','released') then raise exception 'invalid status';end if;
 a:=case when p_status='uncertain' then r.amount_brl when p_status='released' then 0 else greatest(coalesce(p_actual,r.amount_brl),0) end;
 update public.chat_usage set reserved_brl=greatest(0,reserved_brl-r.amount_brl),spent_brl=spent_brl+a,requests=requests+case when p_status='released' then 0 else 1 end,input_tokens=input_tokens+greatest(coalesce(p_input,0),0),output_tokens=output_tokens+greatest(coalesce(p_output,0),0) where month=r.month;
 update public.chat_reservations set status=p_status,actual_brl=a,settled_at=now() where id=p_id;
end;$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.reserve_chat_budget(uuid,numeric,text) from public,anon,authenticated;
revoke all on function public.settle_chat_budget(uuid,numeric,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant execute on function public.reserve_chat_budget(uuid,numeric,text) to service_role;
grant execute on function public.settle_chat_budget(uuid,numeric,bigint,bigint,text) to service_role;
commit;
