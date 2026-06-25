-- Upload/leitura de avatares de perfil em service-photos/profiles/{user_id}/arquivo.

begin;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_read'
  ) then
    create policy profile_avatars_read
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'service-photos'
      and (storage.foldername(name))[1] = 'profiles'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[2]
          and (
            p.id = auth.uid()
            or public.has_workshop_role(p.workshop_id, array['owner']::public.app_role[])
            or public.has_workshop_role(p.workshop_id, array['mechanic']::public.app_role[])
          )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_insert'
  ) then
    create policy profile_avatars_insert
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'service-photos'
      and (storage.foldername(name))[1] = 'profiles'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[2]
          and (
            p.id = auth.uid()
            or public.has_workshop_role(p.workshop_id, array['owner']::public.app_role[])
          )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_update'
  ) then
    create policy profile_avatars_update
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'service-photos'
      and (storage.foldername(name))[1] = 'profiles'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[2]
          and (
            p.id = auth.uid()
            or public.has_workshop_role(p.workshop_id, array['owner']::public.app_role[])
          )
      )
    )
    with check (
      bucket_id = 'service-photos'
      and (storage.foldername(name))[1] = 'profiles'
      and exists (
        select 1
        from public.profiles p
        where p.id::text = (storage.foldername(name))[2]
          and (
            p.id = auth.uid()
            or public.has_workshop_role(p.workshop_id, array['owner']::public.app_role[])
          )
      )
    );
  end if;
end $$;

commit;
