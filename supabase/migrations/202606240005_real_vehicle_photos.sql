-- Fotos reais licenciadas para modelos do catálogo.
-- Mantemos fonte/licença/atribuição para uso correto.

begin;

alter table public.vehicle_model_catalog
  add column if not exists image_source_url text,
  add column if not exists image_license text,
  add column if not exists image_attribution text;

update public.vehicle_model_catalog
set image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/2020%20Toyota%20Camry%202.5%20%28Front%20view%29.jpg',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:2020_Toyota_Camry_2.5_(Front_view).jpg',
    image_license = 'Wikimedia Commons license; verify attribution on source page',
    image_attribution = 'AIMHO''S REBELLION 8490s / Wikimedia Commons'
where market = 'US' and make = 'Toyota' and model = 'Camry';

update public.vehicle_model_catalog
set image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/2021%20Ford%20F-150%20Raptor%2C%20front.jpg',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:2021_Ford_F-150_Raptor,_front.jpg',
    image_license = 'Wikimedia Commons license; verify attribution on source page',
    image_attribution = 'Kevauto / Wikimedia Commons'
where market = 'US' and make = 'Ford' and model = 'F-150';

update public.vehicle_model_catalog
set image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Tesla%20Model%203%20Front%20View.jpg',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:Tesla_Model_3_Front_View.jpg',
    image_license = 'Wikimedia Commons license; verify attribution on source page',
    image_attribution = 'Ominae / Wikimedia Commons'
where market = 'US' and make = 'Tesla' and model = 'Model 3';

update public.vehicle_model_catalog
set image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/2023%20Honda%20CR-V%20EL%204WD.jpg',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:2023_Honda_CR-V_EL_4WD.jpg',
    image_license = 'Wikimedia Commons license; verify attribution on source page',
    image_attribution = 'Wikimedia Commons contributor; verify on source page'
where market = 'US' and make = 'Honda' and model = 'CR-V';

commit;
