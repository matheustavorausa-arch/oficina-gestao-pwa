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

type DbOrderStatus = 'waiting' | 'diagnosis' | 'estimate' | 'approved' | 'in_progress' | 'quality_check' | 'completed' | 'delivered' | 'cancelled'

const statusMap: Record<string, ServiceStatus> = {
  waiting: 'Waiting',
  diagnosis: 'Diagnosis',
  estimate: 'Estimate',
  approved: 'Estimate',
  in_progress: 'In Progress',
  quality_check: 'Ready',
  completed: 'Completed',
  delivered: 'Completed',
  cancelled: 'Cancelled',
}

const dbStatusMap: Record<ServiceStatus, DbOrderStatus> = {
  Waiting: 'waiting',
  Diagnosis: 'diagnosis',
  Estimate: 'estimate',
  'In Progress': 'in_progress',
  Ready: 'quality_check',
  Completed: 'completed',
  Cancelled: 'cancelled',
}

function progressFor(status: string) {
  return {
    waiting: 8,
    diagnosis: 25,
    estimate: 42,
    approved: 55,
    in_progress: 72,
    quality_check: 92,
    completed: 100,
    delivered: 100,
    cancelled: 100,
  }[status] ?? 15
}

export function statusToDb(status: ServiceStatus): DbOrderStatus {
  return dbStatusMap[status]
}

export async function updateServiceOrderStatus(profile: UserProfile, order: ServiceOrder, nextStatus: ServiceStatus) {
  if (!supabase || !profile.workshopId) throw new Error('Supabase is not configured.')

  const fromStatus = statusToDb(order.status)
  const toStatus = statusToDb(nextStatus)

  const { error: updateError } = await supabase
    .from('service_orders')
    .update({ status: toStatus })
    .eq('id', order.id)
    .eq('workshop_id', profile.workshopId)

  if (updateError) throw updateError

  const { error: stageError } = await supabase
    .from('service_stage_events')
    .insert({
      workshop_id: profile.workshopId,
      service_order_id: order.id,
      from_status: fromStatus,
      to_status: toStatus,
      note: `Status changed to ${nextStatus}`,
    })

  if (stageError) throw stageError
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
    .order('version', { ascending: true })

  const mechanicById = new Map((mechanics ?? []).map(item => [item.id, item.full_name]))
  const assignmentByOrder = new Map((assignments ?? []).map(item => [item.service_order_id, item.mechanic_id]))
  const estimateByOrder = new Map((estimates ?? []).map(item => [item.service_order_id, Number(item.total ?? 0)]))

  return orders.map(order => {
    const mechanicId = assignmentByOrder.get(order.id)
    const vehicle = order.vehicles
    return {
      id: order.id,
      code: `RO-${String(order.number).padStart(4, '0')}`,
      customer: order.customers?.full_name ?? 'Customer',
      vehicleId: order.vehicle_id,
      vehicle: vehicle ? `${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}` : 'Vehicle',
      plate: vehicle?.plate ?? 'No plate',
      vehicleImage: vehicle?.vehicle_model_catalog?.image_url ?? undefined,
      vehicleBodyType: vehicle?.vehicle_model_catalog?.body_type ?? undefined,
      service: order.diagnosis || order.complaint,
      status: statusMap[order.status] ?? 'Waiting',
      mechanic: mechanicId ? mechanicById.get(mechanicId) ?? 'Mechanic' : 'Unassigned',
      progress: progressFor(order.status),
      total: estimateByOrder.get(order.id) ?? 0,
      date: new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.created_at)),
    }
  })
}
