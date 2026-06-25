-- Troca fotos reais por ilustrações internas padronizadas 3D-style.
-- Sem marcas/logotipos oficiais; imagens geradas para o app.

begin;

update public.vehicle_model_catalog
set image_url = '/catalog/toyota-camry.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Toyota' and model = 'Camry';

update public.vehicle_model_catalog
set image_url = '/catalog/toyota-corolla.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Toyota' and model = 'Corolla';

update public.vehicle_model_catalog
set image_url = '/catalog/toyota-rav4.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Toyota' and model = 'RAV4';

update public.vehicle_model_catalog
set image_url = '/catalog/honda-civic.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Honda' and model = 'Civic';

update public.vehicle_model_catalog
set image_url = '/catalog/honda-accord.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Honda' and model = 'Accord';

update public.vehicle_model_catalog
set image_url = '/catalog/honda-cr-v.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Honda' and model = 'CR-V';

update public.vehicle_model_catalog
set image_url = '/catalog/ford-f-150.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Ford' and model = 'F-150';

update public.vehicle_model_catalog
set image_url = '/catalog/chevrolet-silverado.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Chevrolet' and model = 'Silverado 1500';

update public.vehicle_model_catalog
set image_url = '/catalog/ram-1500.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Ram' and model = '1500';

update public.vehicle_model_catalog
set image_url = '/catalog/tesla-model-3.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Tesla' and model = 'Model 3';

update public.vehicle_model_catalog
set image_url = '/catalog/tesla-model-y.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Tesla' and model = 'Model Y';

update public.vehicle_model_catalog
set image_url = '/catalog/nissan-altima.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Nissan' and model = 'Altima';

update public.vehicle_model_catalog
set image_url = '/catalog/jeep-grand-cherokee.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Jeep' and model = 'Grand Cherokee';

update public.vehicle_model_catalog
set image_url = '/catalog/hyundai-elantra.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Hyundai' and model = 'Elantra';

update public.vehicle_model_catalog
set image_url = '/catalog/kia-telluride.svg',
    image_source_url = null,
    image_license = 'Internal app illustration',
    image_attribution = 'Generated for Torque PWA'
where market = 'US' and make = 'Kia' and model = 'Telluride';

commit;
