import { supabase } from './supabase'

export interface EstimateItemInput {
  kind: 'part' | 'labor' | 'other'
  description: string
  quantity: number
  unitPrice: number
}

export interface RepairEstimateItem extends EstimateItemInput {
  id: string
  total: number
}

export interface RepairEstimate {
  id: string
  serviceOrderId: string
  version: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  subtotal: number
  discount: number
  total: number
  notes: string
  sentAt: string | null
  decidedAt: string | null
  decisionNote: string
  items: RepairEstimateItem[]
}

type EstimateRow = {
  id: string
  service_order_id: string
  version: number
  status: RepairEstimate['status']
  subtotal: number | string
  discount: number | string
  total: number | string
  notes: string | null
  sent_at: string | null
  decided_at: string | null
  decision_note: string | null
}

type EstimateItemRow = {
  id: string
  kind: EstimateItemInput['kind']
  description: string
  quantity: number | string
  unit_price: number | string
  total: number | string
}

export async function fetchLatestEstimate(serviceOrderId: string): Promise<RepairEstimate | null> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data: estimate, error } = await supabase
    .from('estimates')
    .select('id, service_order_id, version, status, subtotal, discount, total, notes, sent_at, decided_at, decision_note')
    .eq('service_order_id', serviceOrderId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!estimate) return null

  const row = estimate as EstimateRow
  const { data: items, error: itemsError } = await supabase
    .from('estimate_items')
    .select('id, kind, description, quantity, unit_price, total')
    .eq('estimate_id', row.id)
    .order('created_at', { ascending: true })

  if (itemsError) throw itemsError

  return {
    id: row.id,
    serviceOrderId: row.service_order_id,
    version: Number(row.version),
    status: row.status,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    notes: row.notes ?? '',
    sentAt: row.sent_at,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note ?? '',
    items: ((items ?? []) as EstimateItemRow[]).map(item => ({
      id: item.id,
      kind: item.kind,
      description: item.description,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      total: Number(item.total ?? 0),
    })),
  }
}

export async function sendRepairEstimate(input: { serviceOrderId: string; items: EstimateItemInput[]; notes?: string; discount?: number }) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.rpc('send_repair_estimate', {
    p_service_order_id: input.serviceOrderId,
    p_items: input.items.map(item => ({
      kind: item.kind,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_notes: input.notes ?? null,
    p_discount: input.discount ?? 0,
  })

  if (error) throw error
}

export async function decideEstimate(estimateId: string, approve: boolean, note?: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.rpc('decide_estimate', {
    p_estimate: estimateId,
    p_approve: approve,
    p_note: note ?? null,
  })

  if (error) throw error
}
