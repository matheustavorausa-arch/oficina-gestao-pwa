begin;

create or replace function public.create_customer_account(
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
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_workshop_id := public.default_workshop_id();

  if v_workshop_id is null then
    raise exception 'Nenhuma oficina ativa encontrada.';
  end if;

  insert into public.profiles (id, workshop_id, full_name, phone)
  values (
    auth.uid(),
    v_workshop_id,
    nullif(trim(coalesce(p_full_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), '')
  )
  on conflict (id) do update set
    workshop_id = excluded.workshop_id,
    full_name = excluded.full_name,
    phone = excluded.phone,
    updated_at = now();

  insert into public.customers (workshop_id, user_id, full_name, email, phone)
  values (
    v_workshop_id,
    auth.uid(),
    nullif(trim(coalesce(p_full_name, '')), ''),
    (select email from auth.users where id = auth.uid()),
    nullif(trim(coalesce(p_phone, '')), '')
  )
  returning id into v_customer_id;

  return jsonb_build_object(
    'workshop_id', v_workshop_id,
    'customer_id', v_customer_id
  );
end;
$$;

grant execute on function public.create_customer_account(text, text) to authenticated;

commit;
