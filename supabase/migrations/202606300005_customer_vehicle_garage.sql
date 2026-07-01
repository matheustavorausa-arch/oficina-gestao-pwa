create or replace function public.save_customer_vehicle(
  p_vehicle_id uuid default null,
  p_make text default null,
  p_model text default null,
  p_year smallint default null,
  p_color text default null,
  p_plate text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop_id uuid;
  v_customer_id uuid;
  v_catalog_id uuid;
  v_vehicle_id uuid;
  v_full_name text;
  v_email text;
  v_plate text;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  if nullif(trim(coalesce(p_make, '')), '') is null or nullif(trim(coalesce(p_model, '')), '') is null then
    raise exception 'Vehicle make and model are required.';
  end if;

  select c.workshop_id, c.id
  into v_workshop_id, v_customer_id
  from public.customers c
  where c.user_id = auth.uid()
  order by c.created_at asc
  limit 1;

  v_workshop_id := coalesce(v_workshop_id, public.default_workshop_id());

  if v_workshop_id is null then
    raise exception 'No active shop was found.';
  end if;

  select coalesce(nullif(raw_user_meta_data->>'full_name', ''), email), email
  into v_full_name, v_email
  from auth.users
  where id = auth.uid();

  insert into public.profiles (id, workshop_id, full_name)
  values (auth.uid(), v_workshop_id, coalesce(v_full_name, 'Customer'))
  on conflict (id) do update set
    workshop_id = excluded.workshop_id,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  if v_customer_id is null then
    insert into public.customers (workshop_id, user_id, full_name, email)
    values (v_workshop_id, auth.uid(), coalesce(v_full_name, 'Customer'), v_email)
    returning id into v_customer_id;
  end if;

  select id
  into v_catalog_id
  from public.vehicle_model_catalog
  where lower(make) = lower(trim(p_make))
    and lower(model) = lower(trim(p_model))
    and (p_year is null or p_year between year_start and year_end)
  order by popularity_rank nulls last, year_end desc
  limit 1;

  v_plate := upper(coalesce(nullif(trim(p_plate), ''), 'NEW-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)));

  if p_vehicle_id is not null then
    update public.vehicles
    set
      plate = v_plate,
      make = trim(p_make),
      model = trim(p_model),
      year = p_year,
      color = nullif(trim(coalesce(p_color, '')), ''),
      catalog_model_id = v_catalog_id,
      updated_at = now()
    where id = p_vehicle_id
      and workshop_id = v_workshop_id
      and customer_id = v_customer_id
    returning id into v_vehicle_id;

    if v_vehicle_id is null then
      raise exception 'Vehicle not found.';
    end if;
  else
    insert into public.vehicles (workshop_id, customer_id, plate, make, model, year, color, catalog_model_id)
    values (
      v_workshop_id,
      v_customer_id,
      v_plate,
      trim(p_make),
      trim(p_model),
      p_year,
      nullif(trim(coalesce(p_color, '')), ''),
      v_catalog_id
    )
    returning id into v_vehicle_id;
  end if;

  return v_vehicle_id;
end;
$$;

grant execute on function public.save_customer_vehicle(uuid, text, text, smallint, text, text) to authenticated;

create or replace function public.delete_customer_vehicle(
  p_vehicle_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle record;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  select v.id, v.workshop_id, v.customer_id
  into v_vehicle
  from public.vehicles v
  join public.customers c on c.id = v.customer_id
  where v.id = p_vehicle_id
    and c.user_id = auth.uid();

  if not found then
    raise exception 'Vehicle not found.';
  end if;

  if exists (
    select 1
    from public.service_orders so
    where so.vehicle_id = p_vehicle_id
  ) then
    raise exception 'This vehicle has service history and cannot be deleted.';
  end if;

  delete from public.vehicles
  where id = p_vehicle_id
    and customer_id = v_vehicle.customer_id;

  return true;
end;
$$;

grant execute on function public.delete_customer_vehicle(uuid) to authenticated;
