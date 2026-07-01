create or replace function public.get_customer_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  select
    coalesce(p.full_name, c.full_name, au.raw_user_meta_data->>'full_name', au.email) as full_name,
    coalesce(p.phone, c.phone, au.raw_user_meta_data->>'phone') as phone,
    au.email as email,
    coalesce(p.workshop_id, c.workshop_id, public.default_workshop_id()) as workshop_id
  into v_profile
  from auth.users au
  left join public.profiles p on p.id = au.id
  left join public.customers c on c.user_id = au.id
  where au.id = auth.uid()
  order by c.created_at asc
  limit 1;

  if not found then
    raise exception 'Profile not found.';
  end if;

  return jsonb_build_object(
    'full_name', v_profile.full_name,
    'phone', v_profile.phone,
    'email', v_profile.email,
    'workshop_id', v_profile.workshop_id
  );
end;
$$;

grant execute on function public.get_customer_profile() to authenticated;

create or replace function public.update_customer_profile(
  p_full_name text,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop_id uuid;
  v_customer_id uuid;
  v_email text;
  v_full_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  if v_full_name is null then
    raise exception 'Full name is required.';
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

  select email into v_email
  from auth.users
  where id = auth.uid();

  insert into public.profiles (id, workshop_id, full_name, phone)
  values (auth.uid(), v_workshop_id, v_full_name, v_phone)
  on conflict (id) do update set
    workshop_id = excluded.workshop_id,
    full_name = excluded.full_name,
    phone = excluded.phone,
    updated_at = now();

  if v_customer_id is null then
    insert into public.customers (workshop_id, user_id, full_name, email, phone)
    values (v_workshop_id, auth.uid(), v_full_name, v_email, v_phone)
    returning id into v_customer_id;
  else
    update public.customers
    set full_name = v_full_name,
        phone = v_phone,
        email = coalesce(email, v_email),
        updated_at = now()
    where id = v_customer_id
      and user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'full_name', v_full_name,
    'phone', v_phone,
    'email', v_email,
    'workshop_id', v_workshop_id,
    'customer_id', v_customer_id
  );
end;
$$;

grant execute on function public.update_customer_profile(text, text) to authenticated;
