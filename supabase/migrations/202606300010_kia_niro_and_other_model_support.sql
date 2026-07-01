begin;

insert into public.vehicle_model_catalog (market, make, model, year_start, year_end, body_type, popularity_rank, image_url, notes)
values
  ('US','Kia','Niro',2017,2026,'suv',115,'/catalog/generic-car.svg','Common hybrid/electric crossover in US shops.')
on conflict (market, make, model, year_start, year_end) do update
set body_type = excluded.body_type,
    popularity_rank = excluded.popularity_rank,
    image_url = excluded.image_url,
    notes = excluded.notes;

update public.vehicles v
set catalog_model_id = c.id
from public.vehicle_model_catalog c
where v.catalog_model_id is null
  and lower(v.make) = lower(c.make)
  and lower(v.model) = lower(c.model);

commit;
