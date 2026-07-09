create or replace function public.send_service_order_update(
  p_service_order_id uuid,
  p_status public.order_status default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_from_status public.order_status;
  v_to_status public.order_status;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_body text;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  select so.id, so.workshop_id, so.status, so.customer_id, c.user_id as customer_user_id, v.make, v.model, v.year
  into v_order
  from public.service_orders so
  join public.vehicles v on v.id = so.vehicle_id
  left join public.customers c on c.id = so.customer_id
  where so.id = p_service_order_id
  for update;

  if v_order.id is null then
    raise exception 'Repair order not found.';
  end if;

  if not public.can_access_order(p_service_order_id)
     or not public.has_workshop_role(v_order.workshop_id, array['owner','mechanic']::public.app_role[]) then
    raise exception 'You do not have permission to update this repair order.';
  end if;

  v_from_status := v_order.status;
  v_to_status := coalesce(p_status, v_from_status);

  if v_to_status is distinct from v_from_status then
    update public.service_orders
    set status = v_to_status
    where id = p_service_order_id;
  end if;

  insert into public.service_stage_events (workshop_id, service_order_id, from_status, to_status, note, changed_by)
  values (v_order.workshop_id, p_service_order_id, v_from_status, v_to_status, v_note, auth.uid());

  v_body := coalesce(
    v_note,
    'Status changed to ' || replace(initcap(v_to_status::text), '_', ' ') || '.'
  );

  insert into public.notifications (workshop_id, user_id, service_order_id, channel, title, body, metadata)
  select v_order.workshop_id, target_user_id, p_service_order_id, 'internal', 'Service update', left(v_body, 220),
         jsonb_build_object('source', 'service_update', 'status', v_to_status, 'vehicle', trim(concat_ws(' ', v_order.make, v_order.model, v_order.year)))
  from (
    select wm.user_id as target_user_id
    from public.workshop_members wm
    where wm.workshop_id = v_order.workshop_id
      and wm.active
      and wm.role = any(array['owner','mechanic']::public.app_role[])
    union
    select v_order.customer_user_id
  ) recipients
  where target_user_id is not null
    and target_user_id <> auth.uid();
end;
$$;

grant execute on function public.send_service_order_update(uuid, public.order_status, text) to authenticated;
