drop function if exists public.send_order_chat_message(uuid, text);

create or replace function public.send_order_chat_message(
  p_service_order_id uuid,
  p_body text,
  p_attachment_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_attachment_path text := nullif(trim(coalesce(p_attachment_path, '')), '');
  v_workshop_id uuid;
  v_customer_user_id uuid;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'User is not authenticated.';
  end if;

  if v_body is null and v_attachment_path is null then
    raise exception 'Message cannot be empty.';
  end if;

  v_body := coalesce(v_body, 'Photo');

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

  if v_attachment_path is not null and v_attachment_path not like ('chat/' || p_service_order_id::text || '/%') then
    raise exception 'Invalid attachment path.';
  end if;

  insert into public.chat_messages (workshop_id, service_order_id, sender_id, body, attachment_path)
  values (v_workshop_id, p_service_order_id, auth.uid(), v_body, v_attachment_path)
  returning id into v_message_id;

  insert into public.notifications (workshop_id, user_id, service_order_id, channel, title, body, metadata)
  select v_workshop_id, target_user_id, p_service_order_id, 'internal', 'New chat message', left(v_body, 180), jsonb_build_object('source', 'chat', 'message_id', v_message_id, 'has_attachment', v_attachment_path is not null)
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

grant execute on function public.send_order_chat_message(uuid, text, text) to authenticated;

drop policy if exists chat_attachments_read on storage.objects;
drop policy if exists chat_attachments_upload on storage.objects;

create policy chat_attachments_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = 'chat'
  and exists (
    select 1
    from public.chat_messages cm
    where cm.attachment_path = name
      and public.can_access_order(cm.service_order_id)
  )
);

create policy chat_attachments_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] = 'chat'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[3] = auth.uid()::text
  and public.can_access_order((storage.foldername(name))[2]::uuid)
);
