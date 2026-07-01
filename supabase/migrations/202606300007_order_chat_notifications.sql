create or replace function public.send_order_chat_message(
  p_service_order_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_workshop_id uuid;
  v_customer_user_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  if v_body is null then
    raise exception 'Message cannot be empty.';
  end if;

  if length(v_body) > 4000 then
    raise exception 'Message is too long.';
  end if;

  select so.workshop_id, c.user_id
  into v_workshop_id, v_customer_user_id
  from public.service_orders so
  left join public.customers c on c.id = so.customer_id
  where so.id = p_service_order_id;

  if v_workshop_id is null then
    raise exception 'Repair order not found.';
  end if;

  if not public.can_access_order(p_service_order_id) then
    raise exception 'You do not have access to this repair order.';
  end if;

  insert into public.chat_messages (workshop_id, service_order_id, sender_id, body)
  values (v_workshop_id, p_service_order_id, auth.uid(), v_body)
  returning id into v_message_id;

  insert into public.notifications (workshop_id, user_id, service_order_id, channel, title, body, metadata)
  select v_workshop_id, target_user_id, p_service_order_id, 'internal', 'New chat message', left(v_body, 180), jsonb_build_object('source', 'chat', 'message_id', v_message_id)
  from (
    select wm.user_id as target_user_id
    from public.workshop_members wm
    where wm.workshop_id = v_workshop_id
      and wm.active
      and wm.role = any(array['owner', 'mechanic']::public.app_role[])
    union
    select v_customer_user_id
  ) recipients
  where target_user_id is not null
    and target_user_id <> auth.uid();

  return v_message_id;
end;
$$;

grant execute on function public.send_order_chat_message(uuid, text) to authenticated;
