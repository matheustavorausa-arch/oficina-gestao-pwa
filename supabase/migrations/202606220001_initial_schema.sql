-- Torque Oficina - schema inicial multi-tenant
-- Execute com `supabase db push` ou no SQL Editor de um projeto novo.
-- Transação única: qualquer falha desfaz todo o schema.
begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'mechanic', 'customer');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'in_service', 'completed', 'cancelled');
create type public.order_status as enum ('waiting', 'diagnosis', 'estimate', 'approved', 'in_progress', 'quality_check', 'completed', 'delivered', 'cancelled');
create type public.estimate_status as enum ('draft', 'sent', 'approved', 'rejected', 'expired');
create type public.notification_channel as enum ('internal', 'email');

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  legal_name text, document text, phone text, email text,
  address jsonb not null default '{}'::jsonb,
  logo_path text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  full_name text not null, phone text, avatar_path text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.workshop_members (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workshop_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null, document text, email text, phone text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workshop_id, document)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  plate text not null, make text not null, model text not null, year smallint,
  color text, vin text, odometer integer, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workshop_id, plate), unique (workshop_id, id)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid not null references public.customers(id), vehicle_id uuid not null references public.vehicles(id),
  assigned_to uuid references auth.users(id), scheduled_at timestamptz not null,
  expected_end_at timestamptz, description text not null, status public.appointment_status not null default 'scheduled',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  number bigint generated always as identity, customer_id uuid not null references public.customers(id),
  vehicle_id uuid not null references public.vehicles(id), appointment_id uuid references public.appointments(id),
  status public.order_status not null default 'waiting', complaint text not null, diagnosis text,
  odometer_in integer, fuel_level smallint check (fuel_level between 0 and 100),
  estimated_delivery_at timestamptz, delivered_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (workshop_id, number), unique (workshop_id, id)
);

create table public.service_assignments (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  mechanic_id uuid not null references auth.users(id), assigned_by uuid not null default auth.uid() references auth.users(id),
  active boolean not null default true, created_at timestamptz not null default now(),
  unique (service_order_id, mechanic_id)
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  label text not null, category text not null default 'Geral', checked boolean not null default false,
  condition text check (condition in ('ok','attention','critical','not_applicable')), notes text,
  checked_by uuid references auth.users(id), checked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.service_photos (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  storage_path text not null, caption text, category text not null default 'service',
  uploaded_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

create table public.estimates (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  version smallint not null default 1, status public.estimate_status not null default 'draft',
  subtotal numeric(12,2) not null default 0, discount numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (subtotal - discount) stored,
  valid_until date, notes text, sent_at timestamptz, decided_at timestamptz, decision_note text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (service_order_id, version)
);

create table public.estimate_items (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  kind text not null check (kind in ('part','labor','other')), description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0), unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.service_stage_events (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  from_status public.order_status, to_status public.order_status not null, note text,
  changed_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id), body text not null check (length(body) between 1 and 4000),
  attachment_path text, read_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, service_order_id uuid references public.service_orders(id) on delete cascade,
  channel public.notification_channel not null default 'internal', title text not null, body text not null,
  metadata jsonb not null default '{}'::jsonb, read_at timestamptz, sent_at timestamptz, failed_at timestamptz, error text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key, workshop_id uuid not null references public.workshops(id) on delete cascade,
  table_name text not null, record_id text not null, operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  actor_id uuid references auth.users(id), old_data jsonb, new_data jsonb,
  ip_address inet, user_agent text, created_at timestamptz not null default now()
);

create index service_orders_workshop_status_idx on public.service_orders(workshop_id, status);
create index service_assignments_mechanic_idx on public.service_assignments(workshop_id, mechanic_id) where active;
create index appointments_schedule_idx on public.appointments(workshop_id, scheduled_at);
create index chat_order_created_idx on public.chat_messages(service_order_id, created_at);
create index notifications_user_idx on public.notifications(user_id, read_at, created_at desc);
create index audit_workshop_created_idx on public.audit_logs(workshop_id, created_at desc);

-- Helpers SECURITY DEFINER evitam recursão nas policies de membros.
create or replace function public.has_workshop_role(p_workshop uuid, p_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workshop_members m where m.workshop_id=p_workshop and m.user_id=auth.uid() and m.active and m.role=any(p_roles));
$$;
create or replace function public.is_customer_record(p_customer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.customers c where c.id=p_customer and c.user_id=auth.uid());
$$;
create or replace function public.can_access_order(p_order uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.service_orders so
    where so.id=p_order and (
      public.has_workshop_role(so.workshop_id, array['owner']::public.app_role[])
      or exists(select 1 from public.service_assignments a where a.service_order_id=so.id and a.mechanic_id=auth.uid() and a.active)
      or public.is_customer_record(so.customer_id)
    )
  );
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
create or replace function public.enforce_parent_workshop() returns trigger language plpgsql set search_path=public as $$
declare expected uuid;
begin
  execute format('select workshop_id from public.%I where id=$1', tg_argv[0]) into expected using (to_jsonb(new)->>tg_argv[1])::uuid;
  if expected is null then raise exception 'Registro pai inexistente'; end if;
  if new.workshop_id is distinct from expected then raise exception 'workshop_id diverge do registro pai'; end if;
  return new;
end$$;
create or replace function public.prevent_workshop_change() returns trigger language plpgsql as $$
begin if new.workshop_id is distinct from old.workshop_id then raise exception 'workshop_id é imutável'; end if; return new; end$$;
create or replace function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb; tenant uuid;
begin
  row_data=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  tenant=(row_data->>'workshop_id')::uuid;
  insert into public.audit_logs(workshop_id,table_name,record_id,operation,actor_id,old_data,new_data)
  values(tenant,tg_table_name,row_data->>'id',tg_op,auth.uid(),case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new,old);
end$$;
create or replace function public.audit_workshop_change() returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb;
begin
  row_data=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_logs(workshop_id,table_name,record_id,operation,actor_id,old_data,new_data)
  values((row_data->>'id')::uuid,tg_table_name,row_data->>'id',tg_op,auth.uid(),case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new,old);
end$$;

do $$ declare t text; begin
  foreach t in array array['workshops','profiles','workshop_members','customers','vehicles','appointments','service_orders','checklist_items','estimates','estimate_items','chat_messages'] loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()',t,t);
  end loop;
  foreach t in array array['profiles','workshop_members','customers','vehicles','appointments','service_orders','service_assignments','checklist_items','service_photos','estimates','estimate_items','service_stage_events','chat_messages','notifications'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_change()',t,t);
    execute format('create trigger %I_tenant_immutable before update on public.%I for each row execute function public.prevent_workshop_change()',t,t);
  end loop;
end $$;
create trigger workshops_audit after insert or update on public.workshops for each row execute function public.audit_workshop_change();

create trigger vehicles_parent_tenant before insert or update on public.vehicles for each row execute function public.enforce_parent_workshop('customers','customer_id');
create trigger appointments_parent_tenant before insert or update on public.appointments for each row execute function public.enforce_parent_workshop('vehicles','vehicle_id');
create trigger orders_parent_tenant before insert or update on public.service_orders for each row execute function public.enforce_parent_workshop('vehicles','vehicle_id');
create trigger assignments_parent_tenant before insert or update on public.service_assignments for each row execute function public.enforce_parent_workshop('service_orders','service_order_id');
create trigger checklist_parent_tenant before insert or update on public.checklist_items for each row execute function public.enforce_parent_workshop('service_orders','service_order_id');
create trigger photos_parent_tenant before insert or update on public.service_photos for each row execute function public.enforce_parent_workshop('service_orders','service_order_id');
create trigger estimates_parent_tenant before insert or update on public.estimates for each row execute function public.enforce_parent_workshop('service_orders','service_order_id');
create trigger estimate_items_parent_tenant before insert or update on public.estimate_items for each row execute function public.enforce_parent_workshop('estimates','estimate_id');
create trigger stages_parent_tenant before insert or update on public.service_stage_events for each row execute function public.enforce_parent_workshop('service_orders','service_order_id');
create trigger chat_parent_tenant before insert or update on public.chat_messages for each row execute function public.enforce_parent_workshop('service_orders','service_order_id');

alter table public.workshops enable row level security;
alter table public.profiles enable row level security;
alter table public.workshop_members enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.appointments enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_assignments enable row level security;
alter table public.checklist_items enable row level security;
alter table public.service_photos enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;
alter table public.service_stage_events enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Workshop bootstrap e administração pelo dono.
create policy workshop_insert on public.workshops for insert to authenticated with check (owner_id=auth.uid());
create policy workshop_select on public.workshops for select to authenticated using (owner_id=auth.uid() or public.has_workshop_role(id,array['owner','mechanic','customer']::public.app_role[]));
create policy workshop_owner_update on public.workshops for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());

create policy profile_select on public.profiles for select to authenticated using (id=auth.uid() or public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy profile_insert on public.profiles for insert to authenticated with check (id=auth.uid() or public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy profile_update on public.profiles for update to authenticated using (id=auth.uid() or public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));

create policy members_select on public.workshop_members for select to authenticated using (user_id=auth.uid() or public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy members_owner_write on public.workshop_members for all to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[])) with check (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy first_owner_membership on public.workshop_members for insert to authenticated with check (user_id=auth.uid() and role='owner' and exists(select 1 from public.workshops w where w.id=workshop_id and w.owner_id=auth.uid()));

create policy customers_select on public.customers for select to authenticated using (user_id=auth.uid() or public.has_workshop_role(workshop_id,array['owner']::public.app_role[]) or (public.has_workshop_role(workshop_id,array['mechanic']::public.app_role[]) and exists(select 1 from public.service_orders so join public.service_assignments a on a.service_order_id=so.id where so.customer_id=customers.id and a.mechanic_id=auth.uid() and a.active)));
create policy customers_owner_write on public.customers for all to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[])) with check (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));

create policy vehicles_select on public.vehicles for select to authenticated using (public.is_customer_record(customer_id) or public.has_workshop_role(workshop_id,array['owner']::public.app_role[]) or exists(select 1 from public.service_orders so join public.service_assignments a on a.service_order_id=so.id where so.vehicle_id=vehicles.id and a.mechanic_id=auth.uid() and a.active));
create policy vehicles_owner_write on public.vehicles for all to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[])) with check (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));

create policy appointments_select on public.appointments for select to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]) or assigned_to=auth.uid() or public.is_customer_record(customer_id));
create policy appointments_owner_write on public.appointments for all to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[])) with check (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy appointments_customer_insert on public.appointments for insert to authenticated with check (public.is_customer_record(customer_id));

create policy orders_select on public.service_orders for select to authenticated using (public.can_access_order(id));
create policy orders_owner_write on public.service_orders for all to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[])) with check (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy orders_mechanic_update on public.service_orders for update to authenticated using (public.can_access_order(id) and public.has_workshop_role(workshop_id,array['mechanic']::public.app_role[])) with check (public.can_access_order(id));

create policy assignments_select on public.service_assignments for select to authenticated using (mechanic_id=auth.uid() or public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy assignments_owner_write on public.service_assignments for all to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[])) with check (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));

-- Filhos de OS: leitura por can_access_order; escrita operacional por dono/mecânico atribuído.
create policy checklist_select on public.checklist_items for select to authenticated using (public.can_access_order(service_order_id));
create policy checklist_staff_write on public.checklist_items for all to authenticated using (public.can_access_order(service_order_id) and public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[])) with check (public.can_access_order(service_order_id) and public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[]));
create policy photos_select on public.service_photos for select to authenticated using (public.can_access_order(service_order_id));
create policy photos_staff_write on public.service_photos for all to authenticated using (public.can_access_order(service_order_id) and public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[])) with check (public.can_access_order(service_order_id) and public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[]));
create policy estimates_select on public.estimates for select to authenticated using (public.can_access_order(service_order_id));
create policy estimates_staff_write on public.estimates for all to authenticated using (public.can_access_order(service_order_id) and public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[])) with check (public.can_access_order(service_order_id) and public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[]));
create policy estimate_items_select on public.estimate_items for select to authenticated using (exists(select 1 from public.estimates e where e.id=estimate_id and public.can_access_order(e.service_order_id)));
create policy estimate_items_staff_write on public.estimate_items for all to authenticated using (public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[]) and exists(select 1 from public.estimates e where e.id=estimate_id and public.can_access_order(e.service_order_id))) with check (public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[]));
create policy stages_select on public.service_stage_events for select to authenticated using (public.can_access_order(service_order_id));
create policy stages_staff_insert on public.service_stage_events for insert to authenticated with check (public.can_access_order(service_order_id) and public.has_workshop_role(workshop_id,array['owner','mechanic']::public.app_role[]));
create policy chat_select on public.chat_messages for select to authenticated using (public.can_access_order(service_order_id));
create policy chat_insert on public.chat_messages for insert to authenticated with check (sender_id=auth.uid() and public.can_access_order(service_order_id));
create policy chat_own_update on public.chat_messages for update to authenticated using (sender_id=auth.uid()) with check (sender_id=auth.uid());

create policy notifications_own_select on public.notifications for select to authenticated using (user_id=auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy notifications_owner_insert on public.notifications for insert to authenticated with check (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));
create policy audit_owner_select on public.audit_logs for select to authenticated using (public.has_workshop_role(workshop_id,array['owner']::public.app_role[]));

-- Realtime para chat, etapas e notificações internas.
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.service_stage_events;
alter publication supabase_realtime add table public.notifications;

-- Bucket privado. Caminho obrigatório: workshop_id/order_id/arquivo.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('service-photos','service-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy service_photos_read on storage.objects for select to authenticated using (
  bucket_id='service-photos' and exists(select 1 from public.service_photos p where p.storage_path=name and public.can_access_order(p.service_order_id))
);
create policy service_photos_upload on storage.objects for insert to authenticated with check (
  bucket_id='service-photos' and public.has_workshop_role((storage.foldername(name))[1]::uuid,array['owner','mechanic']::public.app_role[])
);

comment on table public.notifications is 'Registros internal aparecem no app; registros email são processados por Edge Function com service role.';
comment on table public.audit_logs is 'Imutável para clientes; somente triggers SECURITY DEFINER gravam e donos leem.';

-- Decisão do cliente por função fechada: impede alteração de preço/itens pela API.
create or replace function public.decide_estimate(p_estimate uuid, p_approve boolean, p_note text default null)
returns public.estimates language plpgsql security definer set search_path=public as $$
declare result public.estimates;
begin
  select e.* into result from public.estimates e join public.service_orders so on so.id=e.service_order_id
  where e.id=p_estimate and e.status='sent' and public.is_customer_record(so.customer_id) for update;
  if not found then raise exception 'Orçamento indisponível para decisão'; end if;
  update public.estimates set status=case when p_approve then 'approved'::public.estimate_status else 'rejected'::public.estimate_status end,
    decided_at=now(), decision_note=p_note where id=p_estimate returning * into result;
  return result;
end$$;
revoke all on function public.decide_estimate(uuid,boolean,text) from public;
grant execute on function public.decide_estimate(uuid,boolean,text) to authenticated;

-- Supabase Data API (projetos novos não expõem tabelas automaticamente).
-- Os GRANTs habilitam as operações; as policies RLS continuam decidindo cada linha.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.has_workshop_role(uuid,public.app_role[]) to authenticated;
grant execute on function public.is_customer_record(uuid) to authenticated;
grant execute on function public.can_access_order(uuid) to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

commit;
