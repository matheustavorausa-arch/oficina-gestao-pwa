export type BodyType = 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'coupe' | 'minivan'

export interface VehicleModel {
  make: string
  model: string
  bodyType: BodyType
  years: number[]
  imageUrl?: string
}

export const OTHER_VEHICLE_MAKE = 'Other'
export const OTHER_VEHICLE_MODEL = 'Other model'

export const BODY_TYPE_IMAGE: Record<BodyType, string> = {
  sedan: '/cars/sedan.png',
  suv: '/cars/suv.png',
  pickup: '/cars/pickup.png',
  hatchback: '/cars/hatchback.png',
  coupe: '/cars/coupe.png',
  minivan: '/cars/minivan.png',
}

export const BODY_TYPE_LABEL: Record<BodyType, string> = {
  sedan: 'Sedan',
  suv: 'SUV / Crossover',
  pickup: 'Pickup',
  hatchback: 'Hatchback',
  coupe: 'Coupe',
  minivan: 'Minivan',
}

function recentYears(start = 2015, end = new Date().getFullYear()) {
  const years: number[] = []
  for (let year = end; year >= start; year -= 1) years.push(year)
  return years
}

export const VEHICLES: VehicleModel[] = [
  { make: 'Ford', model: 'F-150', bodyType: 'pickup', years: recentYears() },
  { make: 'Chevrolet', model: 'Silverado 1500', bodyType: 'pickup', years: recentYears() },
  { make: 'Ram', model: '1500', bodyType: 'pickup', years: recentYears() },
  { make: 'GMC', model: 'Sierra 1500', bodyType: 'pickup', years: recentYears() },
  { make: 'Toyota', model: 'Tacoma', bodyType: 'pickup', years: recentYears() },
  { make: 'Toyota', model: 'Tundra', bodyType: 'pickup', years: recentYears() },
  { make: 'Chevrolet', model: 'Colorado', bodyType: 'pickup', years: recentYears() },
  { make: 'GMC', model: 'Canyon', bodyType: 'pickup', years: recentYears() },
  { make: 'Nissan', model: 'Frontier', bodyType: 'pickup', years: recentYears() },
  { make: 'Honda', model: 'Ridgeline', bodyType: 'pickup', years: recentYears() },
  { make: 'Jeep', model: 'Gladiator', bodyType: 'pickup', years: recentYears(2020) },
  { make: 'Ford', model: 'Maverick', bodyType: 'pickup', years: recentYears(2022) },
  { make: 'Toyota', model: 'RAV4', bodyType: 'suv', years: recentYears() },
  { make: 'Toyota', model: '4Runner', bodyType: 'suv', years: recentYears() },
  { make: 'Toyota', model: 'Corolla Cross', bodyType: 'suv', years: recentYears(2022) },
  { make: 'Honda', model: 'CR-V', bodyType: 'suv', years: recentYears() },
  { make: 'Honda', model: 'HR-V', bodyType: 'suv', years: recentYears() },
  { make: 'Honda', model: 'Pilot', bodyType: 'suv', years: recentYears() },
  { make: 'Honda', model: 'Passport', bodyType: 'suv', years: recentYears(2019) },
  { make: 'Nissan', model: 'Rogue', bodyType: 'suv', years: recentYears() },
  { make: 'Nissan', model: 'Pathfinder', bodyType: 'suv', years: recentYears() },
  { make: 'Nissan', model: 'Murano', bodyType: 'suv', years: recentYears() },
  { make: 'Nissan', model: 'Armada', bodyType: 'suv', years: recentYears() },
  { make: 'Chevrolet', model: 'Equinox', bodyType: 'suv', years: recentYears() },
  { make: 'Chevrolet', model: 'Tahoe', bodyType: 'suv', years: recentYears() },
  { make: 'Chevrolet', model: 'Suburban', bodyType: 'suv', years: recentYears() },
  { make: 'Chevrolet', model: 'Traverse', bodyType: 'suv', years: recentYears() },
  { make: 'Chevrolet', model: 'Blazer', bodyType: 'suv', years: recentYears(2019) },
  { make: 'Chevrolet', model: 'Trailblazer', bodyType: 'suv', years: recentYears(2021) },
  { make: 'Jeep', model: 'Grand Cherokee', bodyType: 'suv', years: recentYears() },
  { make: 'Jeep', model: 'Wrangler', bodyType: 'suv', years: recentYears() },
  { make: 'Jeep', model: 'Compass', bodyType: 'suv', years: recentYears() },
  { make: 'Jeep', model: 'Cherokee', bodyType: 'suv', years: recentYears(2015, 2023) },
  { make: 'Jeep', model: 'Wagoneer', bodyType: 'suv', years: recentYears(2022) },
  { make: 'Ford', model: 'Explorer', bodyType: 'suv', years: recentYears() },
  { make: 'Ford', model: 'Escape', bodyType: 'suv', years: recentYears() },
  { make: 'Ford', model: 'EcoSport', bodyType: 'suv', years: recentYears(2018, 2022) },
  { make: 'Ford', model: 'Expedition', bodyType: 'suv', years: recentYears() },
  { make: 'Ford', model: 'Bronco', bodyType: 'suv', years: recentYears(2021) },
  { make: 'Ford', model: 'Bronco Sport', bodyType: 'suv', years: recentYears(2021) },
  { make: 'Ford', model: 'Edge', bodyType: 'suv', years: recentYears(2015, 2024) },
  { make: 'Toyota', model: 'Highlander', bodyType: 'suv', years: recentYears() },
  { make: 'Toyota', model: 'Sequoia', bodyType: 'suv', years: recentYears() },
  { make: 'Hyundai', model: 'Tucson', bodyType: 'suv', years: recentYears() },
  { make: 'Hyundai', model: 'Santa Fe', bodyType: 'suv', years: recentYears() },
  { make: 'Hyundai', model: 'Palisade', bodyType: 'suv', years: recentYears(2020) },
  { make: 'Hyundai', model: 'Kona', bodyType: 'suv', years: recentYears(2018) },
  { make: 'Kia', model: 'Telluride', bodyType: 'suv', years: recentYears(2020) },
  { make: 'Kia', model: 'Sportage', bodyType: 'suv', years: recentYears() },
  { make: 'Kia', model: 'Sorento', bodyType: 'suv', years: recentYears() },
  { make: 'Kia', model: 'Seltos', bodyType: 'suv', years: recentYears(2021) },
  { make: 'Kia', model: 'Niro', bodyType: 'suv', years: recentYears() },
  { make: 'Subaru', model: 'Outback', bodyType: 'suv', years: recentYears() },
  { make: 'Subaru', model: 'Forester', bodyType: 'suv', years: recentYears() },
  { make: 'Subaru', model: 'Crosstrek', bodyType: 'suv', years: recentYears() },
  { make: 'Subaru', model: 'Ascent', bodyType: 'suv', years: recentYears(2019) },
  { make: 'Mazda', model: 'CX-5', bodyType: 'suv', years: recentYears() },
  { make: 'Mazda', model: 'CX-30', bodyType: 'suv', years: recentYears(2020) },
  { make: 'Mazda', model: 'CX-50', bodyType: 'suv', years: recentYears(2023) },
  { make: 'Mazda', model: 'CX-90', bodyType: 'suv', years: recentYears(2024) },
  { make: 'Mitsubishi', model: 'Outlander', bodyType: 'suv', years: recentYears() },
  { make: 'Mitsubishi', model: 'Outlander Sport', bodyType: 'suv', years: recentYears() },
  { make: 'GMC', model: 'Terrain', bodyType: 'suv', years: recentYears() },
  { make: 'GMC', model: 'Acadia', bodyType: 'suv', years: recentYears() },
  { make: 'GMC', model: 'Yukon', bodyType: 'suv', years: recentYears() },
  { make: 'Buick', model: 'Encore', bodyType: 'suv', years: recentYears() },
  { make: 'Buick', model: 'Enclave', bodyType: 'suv', years: recentYears() },
  { make: 'Cadillac', model: 'Escalade', bodyType: 'suv', years: recentYears() },
  { make: 'Cadillac', model: 'XT5', bodyType: 'suv', years: recentYears() },
  { make: 'Lincoln', model: 'Navigator', bodyType: 'suv', years: recentYears() },
  { make: 'Lincoln', model: 'Aviator', bodyType: 'suv', years: recentYears(2020) },
  { make: 'Lincoln', model: 'Nautilus', bodyType: 'suv', years: recentYears() },
  { make: 'Lexus', model: 'RX', bodyType: 'suv', years: recentYears() },
  { make: 'Lexus', model: 'NX', bodyType: 'suv', years: recentYears() },
  { make: 'Lexus', model: 'GX', bodyType: 'suv', years: recentYears() },
  { make: 'Acura', model: 'MDX', bodyType: 'suv', years: recentYears() },
  { make: 'Acura', model: 'RDX', bodyType: 'suv', years: recentYears() },
  { make: 'Infiniti', model: 'QX60', bodyType: 'suv', years: recentYears() },
  { make: 'Infiniti', model: 'QX80', bodyType: 'suv', years: recentYears() },
  { make: 'Volvo', model: 'XC90', bodyType: 'suv', years: recentYears() },
  { make: 'Volvo', model: 'XC60', bodyType: 'suv', years: recentYears() },
  { make: 'BMW', model: 'X3', bodyType: 'suv', years: recentYears() },
  { make: 'BMW', model: 'X5', bodyType: 'suv', years: recentYears() },
  { make: 'Mercedes-Benz', model: 'GLC', bodyType: 'suv', years: recentYears() },
  { make: 'Mercedes-Benz', model: 'GLE', bodyType: 'suv', years: recentYears() },
  { make: 'Audi', model: 'Q5', bodyType: 'suv', years: recentYears() },
  { make: 'Audi', model: 'Q7', bodyType: 'suv', years: recentYears() },
  { make: 'Porsche', model: 'Cayenne', bodyType: 'suv', years: recentYears() },
  { make: 'Porsche', model: 'Macan', bodyType: 'suv', years: recentYears() },
  { make: 'Tesla', model: 'Model Y', bodyType: 'suv', years: recentYears(2020) },
  { make: 'Tesla', model: 'Model X', bodyType: 'suv', years: recentYears(2016) },
  { make: 'Toyota', model: 'Camry', bodyType: 'sedan', years: recentYears() },
  { make: 'Toyota', model: 'Corolla', bodyType: 'sedan', years: recentYears() },
  { make: 'Toyota', model: 'Avalon', bodyType: 'sedan', years: recentYears(2015, 2022) },
  { make: 'Toyota', model: 'Crown', bodyType: 'sedan', years: recentYears(2023) },
  { make: 'Toyota', model: 'Prius', bodyType: 'hatchback', years: recentYears() },
  { make: 'Honda', model: 'Civic', bodyType: 'sedan', years: recentYears() },
  { make: 'Honda', model: 'Accord', bodyType: 'sedan', years: recentYears() },
  { make: 'Nissan', model: 'Altima', bodyType: 'sedan', years: recentYears() },
  { make: 'Nissan', model: 'Sentra', bodyType: 'sedan', years: recentYears() },
  { make: 'Nissan', model: 'Versa', bodyType: 'sedan', years: recentYears() },
  { make: 'Nissan', model: 'Maxima', bodyType: 'sedan', years: recentYears(2015, 2023) },
  { make: 'Chevrolet', model: 'Malibu', bodyType: 'sedan', years: recentYears(2015, 2024) },
  { make: 'Hyundai', model: 'Elantra', bodyType: 'sedan', years: recentYears() },
  { make: 'Hyundai', model: 'Sonata', bodyType: 'sedan', years: recentYears() },
  { make: 'Volkswagen', model: 'Jetta', bodyType: 'sedan', years: recentYears() },
  { make: 'Volkswagen', model: 'Passat', bodyType: 'sedan', years: recentYears(2015, 2022) },
  { make: 'BMW', model: '320i', bodyType: 'sedan', years: recentYears(2015, 2020) },
  { make: 'BMW', model: '330i', bodyType: 'sedan', years: recentYears() },
  { make: 'BMW', model: '530i', bodyType: 'sedan', years: recentYears() },
  { make: 'Mercedes-Benz', model: 'C-Class', bodyType: 'sedan', years: recentYears() },
  { make: 'Mercedes-Benz', model: 'E-Class', bodyType: 'sedan', years: recentYears() },
  { make: 'Audi', model: 'A4', bodyType: 'sedan', years: recentYears() },
  { make: 'Audi', model: 'A6', bodyType: 'sedan', years: recentYears() },
  { make: 'Lexus', model: 'ES', bodyType: 'sedan', years: recentYears() },
  { make: 'Lexus', model: 'IS', bodyType: 'sedan', years: recentYears() },
  { make: 'Acura', model: 'TLX', bodyType: 'sedan', years: recentYears() },
  { make: 'Acura', model: 'Integra', bodyType: 'hatchback', years: recentYears(2023) },
  { make: 'Kia', model: 'K5', bodyType: 'sedan', years: recentYears() },
  { make: 'Kia', model: 'Forte', bodyType: 'sedan', years: recentYears() },
  { make: 'Dodge', model: 'Charger', bodyType: 'sedan', years: recentYears(2015, 2023) },
  { make: 'Chrysler', model: '300', bodyType: 'sedan', years: recentYears(2015, 2023) },
  { make: 'Tesla', model: 'Model 3', bodyType: 'sedan', years: recentYears(2018) },
  { make: 'Tesla', model: 'Model S', bodyType: 'sedan', years: recentYears(2015) },
  { make: 'Volkswagen', model: 'Golf', bodyType: 'hatchback', years: recentYears(2015, 2021) },
  { make: 'Mazda', model: 'Mazda3 Hatchback', bodyType: 'hatchback', years: recentYears() },
  { make: 'Subaru', model: 'Impreza', bodyType: 'hatchback', years: recentYears() },
  { make: 'Kia', model: 'Soul', bodyType: 'hatchback', years: recentYears() },
  { make: 'Chevrolet', model: 'Bolt EV', bodyType: 'hatchback', years: recentYears(2017, 2023) },
  { make: 'Ford', model: 'Mustang', bodyType: 'coupe', years: recentYears() },
  { make: 'Dodge', model: 'Challenger', bodyType: 'coupe', years: recentYears() },
  { make: 'Chevrolet', model: 'Camaro', bodyType: 'coupe', years: recentYears() },
  { make: 'Chevrolet', model: 'Corvette', bodyType: 'coupe', years: recentYears() },
  { make: 'Honda', model: 'Odyssey', bodyType: 'minivan', years: recentYears() },
  { make: 'Chrysler', model: 'Pacifica', bodyType: 'minivan', years: recentYears() },
  { make: 'Toyota', model: 'Sienna', bodyType: 'minivan', years: recentYears() },
  { make: 'Kia', model: 'Carnival', bodyType: 'minivan', years: recentYears(2022) },
  { make: 'Dodge', model: 'Grand Caravan', bodyType: 'minivan', years: recentYears(2015, 2020) },
]

const SPECIFIC_VEHICLE_IMAGES: Record<string, string> = {
  'chevrolet|silverado 1500': '/catalog/chevrolet-silverado.svg',
  'ford|ecosport': '/catalog/ford-ecosport.svg',
  'ford|f-150': '/catalog/ford-f-150.svg',
  'honda|accord': '/catalog/honda-accord.svg',
  'honda|civic': '/catalog/honda-civic.svg',
  'honda|cr-v': '/catalog/honda-cr-v.svg',
  'hyundai|elantra': '/catalog/hyundai-elantra.svg',
  'jeep|grand cherokee': '/catalog/jeep-grand-cherokee.svg',
  'kia|telluride': '/catalog/kia-telluride.svg',
  'nissan|altima': '/catalog/nissan-altima.svg',
  'ram|1500': '/catalog/ram-1500.svg',
  'tesla|model 3': '/catalog/tesla-model-3.svg',
  'tesla|model y': '/catalog/tesla-model-y.svg',
  'toyota|camry': '/catalog/toyota-camry.svg',
  'toyota|corolla': '/catalog/toyota-corolla.svg',
  'toyota|rav4': '/catalog/toyota-rav4.svg',
}

export const VEHICLE_MAKE_OPTIONS = [
  ...Array.from(new Set(VEHICLES.map(vehicle => vehicle.make))).filter(make => make !== OTHER_VEHICLE_MAKE).sort(),
  OTHER_VEHICLE_MAKE,
]

export function vehicleImageForBodyType(bodyType?: string | null) {
  if (bodyType === 'truck') return BODY_TYPE_IMAGE.pickup
  if (bodyType === 'ev') return BODY_TYPE_IMAGE.sedan
  if (bodyType === 'van') return BODY_TYPE_IMAGE.minivan
  return bodyType && bodyType in BODY_TYPE_IMAGE ? BODY_TYPE_IMAGE[bodyType as BodyType] : '/car-sedan.png'
}

export function findVehicleModel(make?: string, model?: string) {
  const cleanMake = make?.trim().toLowerCase()
  const cleanModel = model?.trim().toLowerCase()
  return VEHICLES.find(vehicle => vehicle.make.toLowerCase() === cleanMake && vehicle.model.toLowerCase() === cleanModel)
}

export function vehicleSpecificImageForMakeModel(make?: string, model?: string) {
  void make
  void model
  return undefined
}

export function vehicleImageForMakeModel(make?: string, model?: string) {
  void make
  void model
  return '/catalog/generic-car.svg'
}

export function vehicleImageForText(vehicleText?: string, bodyType?: string | null, preferredImage?: string | null) {
  void vehicleText
  void bodyType
  void preferredImage
  return '/catalog/generic-car.svg'
}
