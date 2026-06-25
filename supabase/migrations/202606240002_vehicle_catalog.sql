-- Catálogo compartilhado de veículos para seleção e exibição nos apps.
-- Dados globais, não operacionais: não pertencem a uma oficina específica.

begin;

create table if not exists public.vehicle_model_catalog (
  id uuid primary key default gen_random_uuid(),
  market text not null default 'US',
  make text not null,
  model text not null,
  year_start smallint not null,
  year_end smallint,
  body_type text not null check (body_type in ('sedan','suv','truck','van','coupe','hatchback','ev')),
  popularity_rank smallint,
  image_url text,
  notes text,
  created_at timestamptz not null default now(),
  unique (market, make, model, year_start, year_end)
);

alter table public.vehicle_model_catalog enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vehicle_model_catalog'
      and policyname = 'vehicle_catalog_authenticated_read'
  ) then
    create policy vehicle_catalog_authenticated_read
    on public.vehicle_model_catalog
    for select
    to authenticated
    using (true);
  end if;
end $$;

alter table public.vehicles
  add column if not exists catalog_model_id uuid references public.vehicle_model_catalog(id);

insert into public.vehicle_model_catalog (market, make, model, year_start, year_end, body_type, popularity_rank, image_url, notes)
values
  ('US','Toyota','Camry',2018,2024,'sedan',1,'/catalog/toyota-camry.svg','Sedã muito comum nos EUA.'),
  ('US','Toyota','Corolla',2020,2024,'sedan',2,'/catalog/toyota-corolla.svg','Sedã compacto popular.'),
  ('US','Toyota','RAV4',2019,2024,'suv',3,'/catalog/toyota-rav4.svg','SUV compacto muito vendido.'),
  ('US','Honda','Civic',2016,2024,'sedan',4,'/catalog/honda-civic.svg','Sedã compacto popular.'),
  ('US','Honda','Accord',2018,2024,'sedan',5,'/catalog/honda-accord.svg','Sedã médio comum.'),
  ('US','Honda','CR-V',2017,2024,'suv',6,'/catalog/honda-cr-v.svg','SUV familiar muito comum.'),
  ('US','Ford','F-150',2015,2024,'truck',7,'/catalog/ford-f-150.svg','Picape mais comum no mercado americano.'),
  ('US','Chevrolet','Silverado 1500',2019,2024,'truck',8,'/catalog/chevrolet-silverado.svg','Picape full-size.'),
  ('US','Ram','1500',2019,2024,'truck',9,'/catalog/ram-1500.svg','Picape full-size.'),
  ('US','Tesla','Model 3',2017,2024,'ev',10,'/catalog/tesla-model-3.svg','Elétrico popular.'),
  ('US','Tesla','Model Y',2020,2024,'ev',11,'/catalog/tesla-model-y.svg','SUV elétrico popular.'),
  ('US','Nissan','Altima',2019,2024,'sedan',12,'/catalog/nissan-altima.svg','Sedã médio comum.'),
  ('US','Jeep','Grand Cherokee',2016,2024,'suv',13,'/catalog/jeep-grand-cherokee.svg','SUV médio.'),
  ('US','Hyundai','Elantra',2021,2024,'sedan',14,'/catalog/hyundai-elantra.svg','Sedã compacto.'),
  ('US','Kia','Telluride',2020,2024,'suv',15,'/catalog/kia-telluride.svg','SUV familiar grande.')
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

grant select on public.vehicle_model_catalog to authenticated;

commit;
