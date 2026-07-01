import { supabase } from './supabase'

export interface OrderChatMessage {
  id: string
  serviceOrderId: string
  senderId: string
  body: string
  createdAt: string
  isMine: boolean
}

type DbChatMessage = {
  id: string
  service_order_id: string
  sender_id: string
  body: string
  created_at: string
}

export async function fetchOrderChatMessages(serviceOrderId: string, currentUserId?: string): Promise<OrderChatMessage[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, service_order_id, sender_id, body, created_at')
    .eq('service_order_id', serviceOrderId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return ((data ?? []) as DbChatMessage[]).map(message => ({
    id: message.id,
    serviceOrderId: message.service_order_id,
    senderId: message.sender_id,
    body: message.body,
    createdAt: message.created_at,
    isMine: Boolean(currentUserId && message.sender_id === currentUserId),
  }))
}

export async function sendOrderChatMessage(serviceOrderId: string, body: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.rpc('send_order_chat_message', {
    p_service_order_id: serviceOrderId,
    p_body: body,
  })

  if (error) throw error
}
