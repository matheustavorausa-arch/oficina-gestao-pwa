-- Sincronização de perfis/oficina entre app do dono, mecânico e cliente.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workshops'
      and policyname = 'workshop_customer_select'
  ) then
    create policy workshop_customer_select
    on public.workshops
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.customers c
        where c.workshop_id = workshops.id
          and c.user_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workshops'
  ) then
    alter publication supabase_realtime add table public.workshops;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workshop_members'
  ) then
    alter publication supabase_realtime add table public.workshop_members;
  end if;
end $$;

commit;
