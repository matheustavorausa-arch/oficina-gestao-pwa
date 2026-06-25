begin;

insert into public.vehicle_model_catalog (market, make, model, year_start, year_end, body_type, popularity_rank, image_url, notes)
values ('US','Other','Generic',1980,2030,'sedan',999,'/catalog/generic-car.svg','Imagem padrão para veículo sem modelo cadastrado.')
on conflict (market, make, model, year_start, year_end) do update
set image_url = excluded.image_url,
    notes = excluded.notes;

create or replace function public.set_vehicle_catalog_fallback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.catalog_model_id is null then
    select id
    into new.catalog_model_id
    from public.vehicle_model_catalog
    where lower(make) = lower(new.make)
      and lower(model) = lower(new.model)
      and (new.year is null or new.year between year_start and year_end)
    order by popularity_rank nulls last
    limit 1;
  end if;

  if new.catalog_model_id is null then
    select id
    into new.catalog_model_id
    from public.vehicle_model_catalog
    where market = 'US'
      and make = 'Other'
      and model = 'Generic'
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists vehicles_catalog_fallback on public.vehicles;
create trigger vehicles_catalog_fallback
before insert or update of make, model, year, catalog_model_id
on public.vehicles
for each row
execute function public.set_vehicle_catalog_fallback();

commit;
