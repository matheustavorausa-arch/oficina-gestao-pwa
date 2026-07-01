create or replace function public.send_repair_estimate(
  p_service_order_id uuid,
  p_items jsonb,
  p_notes text default null,
  p_discount numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop_id uuid;
  v_customer_user_id uuid;
  v_estimate_id uuid;
  v_version smallint;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2) := greatest(coalesce(p_discount, 0), 0);
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  select so.workshop_id, c.user_id
  into v_workshop_id, v_customer_user_id
  from public.service_orders so
  left join public.customers c on c.id = so.customer_id
  where so.id = p_service_order_id;

  if v_workshop_id is null then
    raise exception 'Repair order not found.';
  end if;

  if not (
    public.can_access_order(p_service_order_id)
    and public.has_workshop_role(v_workshop_id, array['owner','mechanic']::public.app_role[])
  ) then
    raise exception 'You cannot send estimates for this repair order.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Estimate must have at least one item.';
  end if;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.estimates
  where service_order_id = p_service_order_id;

  select coalesce(sum(
    greatest(coalesce((item->>'quantity')::numeric, 1), 0)
    * greatest(coalesce((item->>'unit_price')::numeric, 0), 0)
  ), 0)
  into v_subtotal
  from jsonb_array_elements(p_items) item
  where nullif(trim(coalesce(item->>'description', '')), '') is not null;

  if v_subtotal <= 0 then
    raise exception 'Estimate total must be greater than zero.';
  end if;

  insert into public.estimates (workshop_id, service_order_id, version, status, subtotal, discount, notes, sent_at, created_by)
  values (v_workshop_id, p_service_order_id, v_version, 'sent', v_subtotal, least(v_discount, v_subtotal), nullif(trim(coalesce(p_notes, '')), ''), now(), auth.uid())
  returning id into v_estimate_id;

  insert into public.estimate_items (workshop_id, estimate_id, kind, description, quantity, unit_price)
  select
    v_workshop_id,
    v_estimate_id,
    case when item->>'kind' in ('part','labor','other') then item->>'kind' else 'other' end,
    trim(item->>'description'),
    greatest(coalesce((item->>'quantity')::numeric, 1), 0.01),
    greatest(coalesce((item->>'unit_price')::numeric, 0), 0)
  from jsonb_array_elements(p_items) item
  where nullif(trim(coalesce(item->>'description', '')), '') is not null;

  update public.service_orders
  set status = 'estimate',
      updated_at = now()
  where id = p_service_order_id;

  if v_customer_user_id is not null then
    insert into public.notifications (workshop_id, user_id, service_order_id, channel, title, body, metadata)
    values (v_workshop_id, v_customer_user_id, p_service_order_id, 'internal', 'Estimate ready for approval', 'Your repair estimate is ready to review.', jsonb_build_object('source', 'estimate', 'estimate_id', v_estimate_id));
  end if;

  return v_estimate_id;
end;
$$;

grant execute on function public.send_repair_estimate(uuid, jsonb, text, numeric) to authenticated;

create or replace function public.decide_estimate(p_estimate uuid, p_approve boolean, p_note text default null)
returns public.estimates
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.estimates;
begin
  select e.*
  into result
  from public.estimates e
  join public.service_orders so on so.id = e.service_order_id
  where e.id = p_estimate
    and e.status = 'sent'
    and public.is_customer_record(so.customer_id)
  for update;

  if not found then
    raise exception 'Estimate is not available for decision.';
  end if;

  update public.estimates
  set status = case when p_approve then 'approved'::public.estimate_status else 'rejected'::public.estimate_status end,
      decided_at = now(),
      decision_note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_estimate
  returning * into result;

  update public.service_orders
  set status = case when p_approve then 'in_progress'::public.order_status else 'estimate'::public.order_status end,
      updated_at = now()
  where id = result.service_order_id;

  insert into public.notifications (workshop_id, user_id, service_order_id, channel, title, body, metadata)
  select result.workshop_id, wm.user_id, result.service_order_id, 'internal',
    case when p_approve then 'Estimate approved' else 'Estimate rejected' end,
    case when p_approve then 'The customer approved the repair estimate.' else 'The customer rejected the repair estimate.' end,
    jsonb_build_object('source', 'estimate', 'estimate_id', result.id)
  from public.workshop_members wm
  where wm.workshop_id = result.workshop_id
    and wm.active
    and wm.role = any(array['owner','mechanic']::public.app_role[]);

  return result;
end;
$$;

grant execute on function public.decide_estimate(uuid, boolean, text) to authenticated;
