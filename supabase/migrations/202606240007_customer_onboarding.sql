begin;

create or replace function public.default_workshop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.workshops
  where active = true
  order by created_at asc
  limit 1;
$$;

create or replace function public.create_customer_onboarding(
  p_full_name text,
  p_phone text,
  p_vehicle_make text,
  p_vehicle_model text,
  p_vehicle_year smallint,
  p_vehicle_color text,
  p_vehicle_plate text,
  p_problem text,
  p_scheduled_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop_id uuid;
  v_customer_id uuid;
  v_vehicle_id uuid;
  v_appointment_id uuid;
  v_order_id uuid;
  v_catalog_id uuid;
  v_mechanic_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_workshop_id := public.default_workshop_id();
  if v_workshop_id is null then
    raise exception 'Nenhuma oficina ativa encontrada.';
  end if;

  select id
  into v_catalog_id
  from public.vehicle_model_catalog
  where lower(make) = lower(trim(p_vehicle_make))
    and lower(model) = lower(trim(p_vehicle_model))
    and (p_vehicle_year is null or p_vehicle_year between year_start and year_end)
  order by popularity_rank nulls last
  limit 1;

  insert into public.profiles (id, workshop_id, full_name, phone)
  values (auth.uid(), v_workshop_id, trim(p_full_name), nullif(trim(coalesce(p_phone, '')), ''))
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        updated_at = now();

  insert into public.customers (workshop_id, user_id, full_name, email, phone)
  values (
    v_workshop_id,
    auth.uid(),
    trim(p_full_name),
    (select email from auth.users where id = auth.uid()),
    nullif(trim(coalesce(p_phone, '')), '')
  )
  returning id into v_customer_id;

  insert into public.vehicles (workshop_id, customer_id, plate, make, model, year, color, catalog_model_id)
  values (
    v_workshop_id,
    v_customer_id,
    upper(coalesce(nullif(trim(p_vehicle_plate), ''), 'NEW-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
    trim(p_vehicle_make),
    trim(p_vehicle_model),
    p_vehicle_year,
    nullif(trim(coalesce(p_vehicle_color, '')), ''),
    v_catalog_id
  )
  returning id into v_vehicle_id;

  insert into public.appointments (workshop_id, customer_id, vehicle_id, scheduled_at, description, status, created_by)
  values (v_workshop_id, v_customer_id, v_vehicle_id, coalesce(p_scheduled_at, now()), trim(p_problem), 'scheduled', auth.uid())
  returning id into v_appointment_id;

  insert into public.service_orders (workshop_id, customer_id, vehicle_id, appointment_id, status, complaint, created_by)
  values (v_workshop_id, v_customer_id, v_vehicle_id, v_appointment_id, 'waiting', trim(p_problem), auth.uid())
  returning id into v_order_id;

  select wm.user_id
  into v_mechanic_id
  from public.workshop_members wm
  where wm.workshop_id = v_workshop_id
    and wm.role = 'mechanic'
    and wm.active = true
  order by wm.created_at asc
  limit 1;

  if v_mechanic_id is not null then
    insert into public.service_assignments (workshop_id, service_order_id, mechanic_id, assigned_by)
    values (v_workshop_id, v_order_id, v_mechanic_id, v_mechanic_id)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'workshop_id', v_workshop_id,
    'customer_id', v_customer_id,
    'vehicle_id', v_vehicle_id,
    'appointment_id', v_appointment_id,
    'service_order_id', v_order_id,
    'mechanic_id', v_mechanic_id
  );
end;
$$;

grant execute on function public.default_workshop_id() to authenticated;
grant execute on function public.create_customer_onboarding(text,text,text,text,smallint,text,text,text,timestamptz) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['customers','vehicles','appointments','service_orders','service_assignments'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
