-- Evita conflito entre fotos de serviço e avatares em service-photos/profiles/{user_id}/...

begin;

drop policy if exists service_photos_upload on storage.objects;

create policy service_photos_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-photos'
  and (storage.foldername(name))[1] <> 'profiles'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.has_workshop_role((storage.foldername(name))[1]::uuid, array['owner','mechanic']::public.app_role[])
);

commit;
