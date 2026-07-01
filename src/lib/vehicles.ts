export type BodyType = 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'coupe' | 'minivan'

export interface VehicleModel {
  make: string
  model: string
  bodyType: BodyType
  years: number[]
}

export const OTHER_VEHICLE_MAKE = 'Other'

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
  { make: 'Toyota', model: 'RAV4', bodyType: 'suv', years: recentYears() },
  { make: 'Honda', model: 'CR-V', bodyType: 'suv', years: recentYears() },
  { make: 'Nissan', model: 'Rogue', bodyType: 'suv', years: recentYears() },
  { make: 'Chevrolet', model: 'Equinox', bodyType: 'suv', years: recentYears() },
  { make: 'Jeep', model: 'Grand Cherokee', bodyType: 'suv', years: recentYears() },
  { make: 'Ford', model: 'Explorer', bodyType: 'suv', years: recentYears() },
  { make: 'Ford', model: 'Escape', bodyType: 'suv', years: recentYears() },
  { make: 'Ford', model: 'EcoSport', bodyType: 'suv', years: recentYears(2018, 2022) },
  { make: 'Toyota', model: 'Highlander', bodyType: 'suv', years: recentYears() },
  { make: 'Hyundai', model: 'Tucson', bodyType: 'suv', years: recentYears() },
  { make: 'Hyundai', model: 'Santa Fe', bodyType: 'suv', years: recentYears() },
  { make: 'Kia', model: 'Telluride', bodyType: 'suv', years: recentYears(2020) },
  { make: 'Kia', model: 'Sportage', bodyType: 'suv', years: recentYears() },
  { make: 'Subaru', model: 'Outback', bodyType: 'suv', years: recentYears() },
  { make: 'Subaru', model: 'Forester', bodyType: 'suv', years: recentYears() },
  { make: 'Mazda', model: 'CX-5', bodyType: 'suv', years: recentYears() },
  { make: 'Mitsubishi', model: 'Outlander', bodyType: 'suv', years: recentYears() },
  { make: 'Buick', model: 'Encore', bodyType: 'suv', years: recentYears() },
  { make: 'Cadillac', model: 'Escalade', bodyType: 'suv', years: recentYears() },
  { make: 'Lincoln', model: 'Navigator', bodyType: 'suv', years: recentYears() },
  { make: 'Lexus', model: 'RX', bodyType: 'suv', years: recentYears() },
  { make: 'Acura', model: 'MDX', bodyType: 'suv', years: recentYears() },
  { make: 'Infiniti', model: 'QX60', bodyType: 'suv', years: recentYears() },
  { make: 'Volvo', model: 'XC90', bodyType: 'suv', years: recentYears() },
  { make: 'Porsche', model: 'Cayenne', bodyType: 'suv', years: recentYears() },
  { make: 'Tesla', model: 'Model Y', bodyType: 'suv', years: recentYears(2020) },
  { make: 'Toyota', model: 'Camry', bodyType: 'sedan', years: recentYears() },
  { make: 'Toyota', model: 'Corolla', bodyType: 'sedan', years: recentYears() },
  { make: 'Honda', model: 'Civic', bodyType: 'sedan', years: recentYears() },
  { make: 'Honda', model: 'Accord', bodyType: 'sedan', years: recentYears() },
  { make: 'Nissan', model: 'Altima', bodyType: 'sedan', years: recentYears() },
  { make: 'Nissan', model: 'Sentra', bodyType: 'sedan', years: recentYears() },
  { make: 'Chevrolet', model: 'Malibu', bodyType: 'sedan', years: recentYears(2015, 2024) },
  { make: 'Hyundai', model: 'Elantra', bodyType: 'sedan', years: recentYears() },
  { make: 'Volkswagen', model: 'Jetta', bodyType: 'sedan', years: recentYears() },
  { make: 'BMW', model: '320i', bodyType: 'sedan', years: recentYears(2015, 2020) },
  { make: 'Mercedes-Benz', model: 'C-Class', bodyType: 'sedan', years: recentYears() },
  { make: 'Audi', model: 'A4', bodyType: 'sedan', years: recentYears() },
  { make: 'Lexus', model: 'ES', bodyType: 'sedan', years: recentYears() },
  { make: 'Acura', model: 'TLX', bodyType: 'sedan', years: recentYears() },
  { make: 'Kia', model: 'K5', bodyType: 'sedan', years: recentYears() },
  { make: 'Tesla', model: 'Model 3', bodyType: 'sedan', years: recentYears(2018) },
  { make: 'Volkswagen', model: 'Golf', bodyType: 'hatchback', years: recentYears(2015, 2021) },
  { make: 'Mazda', model: 'Mazda3 Hatchback', bodyType: 'hatchback', years: recentYears() },
  { make: 'Subaru', model: 'Impreza', bodyType: 'hatchback', years: recentYears() },
  { make: 'Ford', model: 'Mustang', bodyType: 'coupe', years: recentYears() },
  { make: 'Dodge', model: 'Challenger', bodyType: 'coupe', years: recentYears() },
  { make: 'Chevrolet', model: 'Camaro', bodyType: 'coupe', years: recentYears() },
  { make: 'Honda', model: 'Odyssey', bodyType: 'minivan', years: recentYears() },
  { make: 'Chrysler', model: 'Pacifica', bodyType: 'minivan', years: recentYears() },
  { make: 'Toyota', model: 'Sienna', bodyType: 'minivan', years: recentYears() },
]

export const VEHICLE_MAKE_OPTIONS = [
  ...Array.from(new Set(VEHICLES.map(vehicle => vehicle.make))).filter(make => make !== OTHER_VEHICLE_MAKE).sort(),
  OTHER_VEHICLE_MAKE,
]

export function vehicleImageForBodyType(bodyType?: string | null) {
  return bodyType && bodyType in BODY_TYPE_IMAGE ? BODY_TYPE_IMAGE[bodyType as BodyType] : '/car-sedan.png'
}

export function findVehicleModel(make?: string, model?: string) {
  const cleanMake = make?.trim().toLowerCase()
  const cleanModel = model?.trim().toLowerCase()
  return VEHICLES.find(vehicle => vehicle.make.toLowerCase() === cleanMake && vehicle.model.toLowerCase() === cleanModel)
}

export function vehicleImageForMakeModel(make?: string, model?: string) {
  return vehicleImageForBodyType(findVehicleModel(make, model)?.bodyType)
}

export function vehicleImageForText(vehicleText?: string, bodyType?: string | null) {
  if (bodyType) return vehicleImageForBodyType(bodyType)
  const text = vehicleText?.toLowerCase() ?? ''
  const match = VEHICLES.find(vehicle => text.includes(vehicle.make.toLowerCase()) && text.includes(vehicle.model.toLowerCase()))
  return vehicleImageForBodyType(match?.bodyType)
}
