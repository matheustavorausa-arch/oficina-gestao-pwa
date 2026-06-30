begin;

delete from auth.users u
where not exists (
  select 1
  from public.workshop_members wm
  where wm.user_id = u.id
    and wm.active = true
    and wm.role in ('owner', 'mechanic')
)
and not exists (
  select 1
  from public.workshops w
  where w.owner_id = u.id
);

commit;
