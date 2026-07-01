create or replace function public.cancel_service_order(
  p_service_order uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_actor_role public.app_role;
  v_actor_name text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_title text;
  v_body text;
  v_recipient uuid;
begin
  select
    so.id,
    so.workshop_id,
    so.appointment_id,
    so.status,
    so.customer_id,
    so.vehicle_id,
    so.number,
    c.user_id as customer_user_id,
    c.full_name as customer_name,
    v.make,
    v.model,
    v.year,
    a.scheduled_at
  into v_order
  from public.service_orders so
  join public.customers c on c.id = so.customer_id
  join public.vehicles v on v.id = so.vehicle_id
  left join public.appointments a on a.id = so.appointment_id
  where so.id = p_service_order
  for update of so;

  if not found then
    raise exception 'Repair order not found.';
  end if;

  select wm.role
  into v_actor_role
  from public.workshop_members wm
  where wm.workshop_id = v_order.workshop_id
    and wm.user_id = auth.uid()
    and wm.active
  order by case wm.role when 'owner' then 1 when 'mechanic' then 2 else 3 end
  limit 1;

  if v_actor_role is null and v_order.customer_user_id = auth.uid() then
    v_actor_role := 'customer';
  end if;

  if v_actor_role is null then
    raise exception 'You are not allowed to cancel this appointment.';
  end if;

  if v_actor_role = 'mechanic' and not exists (
    select 1
    from public.service_assignments sa
    where sa.service_order_id = v_order.id
      and sa.mechanic_id = auth.uid()
      and sa.active
  ) then
    raise exception 'This repair order is not assigned to you.';
  end if;

  if v_order.status = 'cancelled' then
    return jsonb_build_object('service_order_id', v_order.id, 'status', 'cancelled');
  end if;

  select coalesce(p.full_name, au.email, 'User')
  into v_actor_name
  from auth.users au
  left join public.profiles p on p.id = au.id
  where au.id = auth.uid();

  update public.service_orders
  set status = 'cancelled', updated_at = now()
  where id = v_order.id;

  if v_order.appointment_id is not null then
    update public.appointments
    set status = 'cancelled', updated_at = now()
    where id = v_order.appointment_id;
  end if;

  insert into public.service_stage_events (workshop_id, service_order_id, from_status, to_status, note, changed_by)
  values (
    v_order.workshop_id,
    v_order.id,
    v_order.status,
    'cancelled',
    coalesce(v_reason, 'Appointment cancelled by ' || v_actor_role::text || '.'),
    auth.uid()
  );

  v_title := 'Appointment cancelled';
  v_body := case v_actor_role
    when 'owner' then 'The shop cancelled the appointment for ' || v_order.make || ' ' || v_order.model || '.'
    when 'mechanic' then coalesce(v_actor_name, 'The mechanic') || ' cancelled the appointment for ' || v_order.make || ' ' || v_order.model || '.'
    else coalesce(v_actor_name, v_order.customer_name, 'The customer') || ' cancelled the appointment for ' || v_order.make || ' ' || v_order.model || '.'
  end || case when v_reason is not null then ' Reason: ' || v_reason else '' end;

  for v_recipient in
    select distinct user_id
    from (
      select v_order.customer_user_id as user_id
      where v_actor_role in ('owner', 'mechanic')
      union all
      select wm.user_id
      from public.workshop_members wm
      where wm.workshop_id = v_order.workshop_id
        and wm.active
        and wm.role = 'owner'
        and v_actor_role in ('customer', 'mechanic')
      union all
      select sa.mechanic_id
      from public.service_assignments sa
      where sa.service_order_id = v_order.id
        and sa.active
        and v_actor_role in ('owner', 'customer')
    ) recipients
    where user_id is not null
      and user_id <> auth.uid()
  loop
    insert into public.notifications (workshop_id, user_id, service_order_id, channel, title, body, metadata)
    values (
      v_order.workshop_id,
      v_recipient,
      v_order.id,
      'internal',
      v_title,
      v_body,
      jsonb_build_object(
        'type', 'appointment_cancelled',
        'cancelled_by', v_actor_role,
        'reason', v_reason,
        'appointment_id', v_order.appointment_id
      )
    );
  end loop;

  return jsonb_build_object(
    'service_order_id', v_order.id,
    'appointment_id', v_order.appointment_id,
    'status', 'cancelled',
    'cancelled_by', v_actor_role
  );
end;
$$;

grant execute on function public.cancel_service_order(uuid, text) to authenticated;
