begin;

do $$
declare
  v_workshop_id uuid;
  v_owner_id uuid;
  v_mechanic_id uuid;
begin
  select id
  into v_workshop_id
  from public.workshops
  where active = true
  order by created_at asc
  limit 1;

  select user_id
  into v_owner_id
  from public.workshop_members
  where workshop_id = v_workshop_id
    and role = 'owner'
    and active = true
  order by created_at asc
  limit 1;

  select user_id
  into v_mechanic_id
  from public.workshop_members
  where workshop_id = v_workshop_id
    and role = 'mechanic'
    and active = true
  order by created_at asc
  limit 1;

  delete from public.notifications;
  delete from public.chat_messages;
  delete from public.service_stage_events;
  delete from public.estimate_items;
  delete from public.estimates;
  delete from public.service_photos;
  delete from public.checklist_items;
  delete from public.service_assignments;
  delete from public.service_orders;
  delete from public.appointments;
  delete from public.vehicles;
  delete from public.customers;

  delete from public.workshop_members
  where role = 'customer'
     or (v_workshop_id is not null and workshop_id <> v_workshop_id)
     or (role = 'owner' and (v_owner_id is null or user_id <> v_owner_id))
     or (role = 'mechanic' and (v_mechanic_id is null or user_id <> v_mechanic_id));

  delete from public.profiles
  where id <> all(array_remove(array[v_owner_id, v_mechanic_id], null::uuid));
end $$;

create or replace function public.create_customer_booking(
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
  v_full_name text;
  v_email text;
  v_plate text;
  v_scheduled_at timestamptz := coalesce(p_scheduled_at, now());
  v_slot_capacity integer := 1;
  v_slot_count integer;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select c.workshop_id, c.id
  into v_workshop_id, v_customer_id
  from public.customers c
  where c.user_id = auth.uid()
  order by c.created_at asc
  limit 1;

  v_workshop_id := coalesce(v_workshop_id, public.default_workshop_id());

  if v_workshop_id is null then
    raise exception 'Nenhuma oficina ativa encontrada.';
  end if;

  lock table public.appointments in share row exclusive mode;

  select count(*)
  into v_slot_count
  from public.appointments
  where workshop_id = v_workshop_id
    and scheduled_at = v_scheduled_at
    and status not in ('completed', 'cancelled');

  if v_slot_count >= v_slot_capacity then
    raise exception 'Este horário já está ocupado. Escolha outro horário.';
  end if;

  select
    coalesce(nullif(raw_user_meta_data->>'full_name', ''), email),
    email
  into v_full_name, v_email
  from auth.users
  where id = auth.uid();

  insert into public.profiles (id, workshop_id, full_name)
  values (auth.uid(), v_workshop_id, coalesce(v_full_name, 'Cliente'))
  on conflict (id) do update set
    workshop_id = excluded.workshop_id,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  if v_customer_id is null then
    insert into public.customers (workshop_id, user_id, full_name, email)
    values (v_workshop_id, auth.uid(), coalesce(v_full_name, 'Cliente'), v_email)
    returning id into v_customer_id;
  end if;

  select id
  into v_catalog_id
  from public.vehicle_model_catalog
  where lower(make) = lower(trim(p_vehicle_make))
    and lower(model) = lower(trim(p_vehicle_model))
    and (p_vehicle_year is null or p_vehicle_year between year_start and year_end)
  order by popularity_rank nulls last
  limit 1;

  v_plate := upper(coalesce(nullif(trim(p_vehicle_plate), ''), 'NEW-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)));

  select id
  into v_vehicle_id
  from public.vehicles
  where workshop_id = v_workshop_id
    and customer_id = v_customer_id
    and upper(plate) = v_plate
  limit 1;

  if v_vehicle_id is null then
    insert into public.vehicles (workshop_id, customer_id, plate, make, model, year, color, catalog_model_id)
    values (
      v_workshop_id,
      v_customer_id,
      v_plate,
      trim(p_vehicle_make),
      trim(p_vehicle_model),
      p_vehicle_year,
      nullif(trim(coalesce(p_vehicle_color, '')), ''),
      v_catalog_id
    )
    returning id into v_vehicle_id;
  end if;

  insert into public.appointments (workshop_id, customer_id, vehicle_id, scheduled_at, description, status, created_by)
  values (v_workshop_id, v_customer_id, v_vehicle_id, v_scheduled_at, trim(p_problem), 'scheduled', auth.uid())
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

grant execute on function public.create_customer_booking(text, text, smallint, text, text, text, timestamptz) to authenticated;

commit;
