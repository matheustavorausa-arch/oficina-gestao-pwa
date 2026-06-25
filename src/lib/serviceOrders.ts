import { supabase } from './supabase'
import type { ServiceOrder, ServiceStatus, UserProfile } from '../types'

type DbOrder = {
  id: string
  number: number
  status: string
  complaint: string
  diagnosis: string | null
  created_at: string
  customer_id: string
  vehicle_id: string
  customers: { full_name: string } | null
  vehicles: { make: string; model: string; year: number | null; plate: string; vehicle_model_catalog?: { image_url: string | null; body_type: string | null } | null } | null
}

const statusMap: Record<string, ServiceStatus> = {
  waiting: 'Aguardando',
  diagnosis: 'Diagnóstico',
  estimate: 'Orçamento',
  approved: 'Orçamento',
  in_progress: 'Em execução',
  quality_check: 'Em execução',
  completed: 'Finalizado',
  delivered: 'Finalizado',
  cancelled: 'Finalizado',
}

function progressFor(status: string) {
  return {
    waiting: 8,
    diagnosis: 25,
    estimate: 42,
    approved: 55,
    in_progress: 72,
    quality_check: 88,
    completed: 100,
    delivered: 100,
    cancelled: 100,
  }[status] ?? 15
}

export async function fetchServiceOrders(profile: UserProfile): Promise<ServiceOrder[]> {
  if (!supabase || !profile.workshopId) return []

  const { data: rows, error } = await supabase
    .from('service_orders')
    .select(`
      id,
      number,
      status,
      complaint,
      diagnosis,
      created_at,
      customer_id,
      vehicle_id,
      customers(full_name),
      vehicles(make, model, year, plate, vehicle_model_catalog(image_url, body_type))
    `)
    .eq('workshop_id', profile.workshopId)
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) throw error
  const orders = (rows ?? []) as unknown as DbOrder[]
  if (!orders.length) return []

  const orderIds = orders.map(order => order.id)
  const { data: assignments } = await supabase
    .from('service_assignments')
    .select('service_order_id, mechanic_id')
    .in('service_order_id', orderIds)
    .eq('active', true)

  const mechanicIds = [...new Set((assignments ?? []).map(item => item.mechanic_id).filter(Boolean))]
  const { data: mechanics } = mechanicIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', mechanicIds)
    : { data: [] }

  const { data: estimates } = await supabase
    .from('estimates')
    .select('service_order_id, total, status')
    .in('service_order_id', orderIds)

  const mechanicById = new Map((mechanics ?? []).map(item => [item.id, item.full_name]))
  const assignmentByOrder = new Map((assignments ?? []).map(item => [item.service_order_id, item.mechanic_id]))
  const estimateByOrder = new Map((estimates ?? []).map(item => [item.service_order_id, Number(item.total ?? 0)]))

  return orders.map(order => {
    const mechanicId = assignmentByOrder.get(order.id)
    const vehicle = order.vehicles
    return {
      id: order.id,
      code: `OS-${String(order.number).padStart(4, '0')}`,
      customer: order.customers?.full_name ?? 'Cliente',
      vehicle: vehicle ? `${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}` : 'Veículo',
      plate: vehicle?.plate ?? 'Sem placa',
      vehicleImage: vehicle?.vehicle_model_catalog?.image_url ?? undefined,
      vehicleBodyType: vehicle?.vehicle_model_catalog?.body_type ?? undefined,
      service: order.diagnosis || order.complaint,
      status: statusMap[order.status] ?? 'Aguardando',
      mechanic: mechanicId ? mechanicById.get(mechanicId) ?? 'Mecânico' : 'Sem responsável',
      progress: progressFor(order.status),
      total: estimateByOrder.get(order.id) ?? 0,
      date: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.created_at)),
    }
  })
}
