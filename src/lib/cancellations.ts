import { supabase } from './supabase'

export async function cancelRepairOrder(serviceOrderId: string, reason?: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.rpc('cancel_service_order', {
    p_service_order: serviceOrderId,
    p_reason: reason?.trim() || null,
  })

  if (error) throw error
}
