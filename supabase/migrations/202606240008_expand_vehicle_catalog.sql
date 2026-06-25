begin;

insert into public.vehicle_model_catalog (market, make, model, year_start, year_end, body_type, popularity_rank, image_url, notes)
values
  ('US','Ford','EcoSport',2018,2022,'suv',30,'/catalog/ford-ecosport.svg','SUV compacto vendido nos EUA.'),
  ('US','Ford','Escape',2018,2026,'suv',17,'/catalog/generic-car.svg','SUV compacto comum nos EUA.'),
  ('US','Ford','Explorer',2018,2026,'suv',18,'/catalog/generic-car.svg','SUV médio comum nos EUA.'),
  ('US','Chevrolet','Equinox',2018,2026,'suv',19,'/catalog/generic-car.svg','SUV compacto comum nos EUA.'),
  ('US','Chevrolet','Malibu',2016,2024,'sedan',20,'/catalog/generic-car.svg','Sedã comum nos EUA.'),
  ('US','Nissan','Rogue',2018,2026,'suv',21,'/catalog/generic-car.svg','SUV compacto muito vendido nos EUA.'),
  ('US','Nissan','Sentra',2018,2026,'sedan',22,'/catalog/generic-car.svg','Sedã compacto comum nos EUA.'),
  ('US','Hyundai','Tucson',2018,2026,'suv',23,'/catalog/generic-car.svg','SUV compacto comum nos EUA.'),
  ('US','Hyundai','Santa Fe',2018,2026,'suv',24,'/catalog/generic-car.svg','SUV comum nos EUA.'),
  ('US','Kia','Sportage',2018,2026,'suv',25,'/catalog/generic-car.svg','SUV compacto comum nos EUA.'),
  ('US','Subaru','Outback',2018,2026,'suv',26,'/catalog/generic-car.svg','Wagon/SUV comum nos EUA.'),
  ('US','Subaru','Forester',2018,2026,'suv',27,'/catalog/generic-car.svg','SUV compacto comum nos EUA.'),
  ('US','Mazda','CX-5',2018,2026,'suv',28,'/catalog/generic-car.svg','SUV compacto comum nos EUA.'),
  ('US','Volkswagen','Jetta',2018,2026,'sedan',29,'/catalog/generic-car.svg','Sedã comum nos EUA.'),
  ('US','BMW','320i',2016,2024,'sedan',31,'/catalog/generic-car.svg','Sedã premium comum em oficinas.'),
  ('US','Mercedes-Benz','C-Class',2016,2026,'sedan',32,'/catalog/generic-car.svg','Sedã premium comum em oficinas.'),
  ('US','Audi','A4',2016,2026,'sedan',33,'/catalog/generic-car.svg','Sedã premium comum em oficinas.')
on conflict (market, make, model, year_start, year_end) do update
set year_end = excluded.year_end,
    body_type = excluded.body_type,
    popularity_rank = excluded.popularity_rank,
    image_url = excluded.image_url,
    notes = excluded.notes;

commit;
