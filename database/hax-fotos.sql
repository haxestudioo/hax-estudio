-- HAX Fotos — executar no SQL Editor do Supabase (projeto exclusivo).
-- Todas as tabelas usam RLS sem policies públicas. Apenas o backend com service role acessa.
create extension if not exists pgcrypto;
create table if not exists public.hax_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 3 and 160),
 slug text not null unique,
 description text not null default '',
 event_date date,
 cover_photo_id uuid,
 price_cents integer not null check(price_cents between 100 and 10000000),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.hax_photos (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.hax_events(id) on delete cascade,
 original_key text not null unique,
 preview_key text not null unique,
 filename text not null,
 mime_type text not null default 'image/jpeg',
 size_bytes bigint not null default 0,
 status text not null default 'uploading' check(status in ('uploading','ready','hidden')),
 created_at timestamptz not null default now()
);
alter table public.hax_events add constraint hax_event_cover_fk foreign key (cover_photo_id) references public.hax_photos(id) on delete set null;
create index if not exists hax_photos_event_idx on public.hax_photos(event_id,status);
create table if not exists public.hax_customers (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 whatsapp text not null,
 email text not null,
 created_at timestamptz not null default now(),
 last_purchase_at timestamptz,
 unique(whatsapp)
);
create table if not exists public.hax_orders (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.hax_customers(id),
 buyer_name text not null,
 buyer_whatsapp text not null,
 buyer_email text not null,
 event_id uuid not null references public.hax_events(id),
 access_hash text not null,
 total_cents integer not null check(total_cents>0),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','refunded','charged_back')),
 payment_id text unique,
 payment_status text,
 pix_code text,
 pix_qr_base64 text,
 expires_at timestamptz,
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists hax_orders_customer_idx on public.hax_orders(customer_id,created_at desc);
create index if not exists hax_orders_created_idx on public.hax_orders(created_at desc);
create table if not exists public.hax_order_items (
 order_id uuid not null references public.hax_orders(id) on delete cascade,
 photo_id uuid not null references public.hax_photos(id),
 unit_price_cents integer not null check(unit_price_cents>0),
 original_key_snapshot text not null,
 filename_snapshot text not null,
 primary key(order_id,photo_id)
);
create or replace function public.hax_create_order(
 p_event_id uuid, p_photo_ids uuid[], p_name text, p_whatsapp text, p_email text,
 p_access_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_event public.hax_events%rowtype;
 v_count integer;
 v_customer uuid;
 v_order uuid;
 v_ids uuid[];
begin
 select * into v_event from public.hax_events where id=p_event_id and published=true;
 if not found then raise exception 'Evento indisponível'; end if;
 select array_agg(distinct id), count(distinct id) into v_ids,v_count
 from public.hax_photos
 where id=any(p_photo_ids) and event_id=p_event_id and status='ready';
 if coalesce(v_count,0)=0 or v_count<>coalesce(array_length(p_photo_ids,1),0) or v_count>100
 then raise exception 'Seleção de fotos inválida'; end if;
 insert into public.hax_customers(name,whatsapp,email)
 values(p_name,p_whatsapp,p_email)
 on conflict(whatsapp) do update set name=excluded.name,email=excluded.email
 returning id into v_customer;
 insert into public.hax_orders(customer_id,buyer_name,buyer_whatsapp,buyer_email,event_id,access_hash,total_cents)
 values(v_customer,p_name,p_whatsapp,p_email,p_event_id,p_access_hash,v_event.price_cents*v_count)
 returning id into v_order;
 insert into public.hax_order_items(order_id,photo_id,unit_price_cents,original_key_snapshot,filename_snapshot)
 select v_order,id,v_event.price_cents,original_key,filename
 from public.hax_photos where id=any(v_ids);
 return jsonb_build_object('id',v_order,'total_cents',v_event.price_cents*v_count);
end; $$;
revoke all on function public.hax_create_order(uuid,uuid[],text,text,text,text) from public, anon, authenticated;
grant execute on function public.hax_create_order(uuid,uuid[],text,text,text,text) to service_role;
alter table public.hax_events enable row level security;
alter table public.hax_photos enable row level security;
alter table public.hax_customers enable row level security;
alter table public.hax_orders enable row level security;
alter table public.hax_order_items enable row level security;
revoke all on public.hax_events,public.hax_photos,public.hax_customers,public.hax_orders,public.hax_order_items from anon,authenticated;
-- A função acima deve ser executada somente em um projeto Supabase exclusivo para HAX Fotos.
