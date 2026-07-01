import { supabase } from './supabase'
import { vehicleImageForMakeModel } from './vehicles'

export interface CustomerVehicle {
  id: string
  make: string
  model: string
  year: number | null
  color: string | null
  plate: string
  imageUrl: string
}

type VehicleRow = {
  id: string
  make: string
  model: string
  year: number | null
  color: string | null
  plate: string
  vehicle_model_catalog?: { image_url: string | null } | null
}

export async function fetchCustomerVehicles(): Promise<CustomerVehicle[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('vehicles')
    .select('id, make, model, year, color, plate, vehicle_model_catalog(image_url)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as VehicleRow[]).map(vehicle => ({
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    plate: vehicle.plate,
    imageUrl: vehicleImageForMakeModel(vehicle.make, vehicle.model) || vehicle.vehicle_model_catalog?.image_url || '/catalog/generic-car.svg',
  }))
}

export async function saveCustomerVehicle(input: {
  id?: string | null
  make: string
  model: string
  year?: number | null
  color?: string
  plate?: string
}) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.rpc('save_customer_vehicle', {
    p_vehicle_id: input.id || null,
    p_make: input.make,
    p_model: input.model,
    p_year: input.year ?? null,
    p_color: input.color || null,
    p_plate: input.plate || null,
  })

  if (error) throw error
}

export async function deleteCustomerVehicle(vehicleId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.rpc('delete_customer_vehicle', {
    p_vehicle_id: vehicleId,
  })

  if (error) throw error
}
