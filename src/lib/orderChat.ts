import { supabase } from './supabase'

export interface OrderChatMessage {
  id: string
  serviceOrderId: string
  senderId: string
  body: string
  attachmentPath?: string | null
  attachmentUrl?: string | null
  createdAt: string
  isMine: boolean
}

type DbChatMessage = {
  id: string
  service_order_id: string
  sender_id: string
  body: string
  attachment_path: string | null
  created_at: string
}

export async function fetchOrderChatMessages(serviceOrderId: string, currentUserId?: string): Promise<OrderChatMessage[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, service_order_id, sender_id, body, attachment_path, created_at')
    .eq('service_order_id', serviceOrderId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const messages = (data ?? []) as DbChatMessage[]

  return Promise.all(messages.map(async message => ({
    id: message.id,
    serviceOrderId: message.service_order_id,
    senderId: message.sender_id,
    body: message.body,
    attachmentPath: message.attachment_path,
    attachmentUrl: await resolveChatAttachmentUrl(message.attachment_path),
    createdAt: message.created_at,
    isMine: Boolean(currentUserId && message.sender_id === currentUserId),
  })))
}

async function resolveChatAttachmentUrl(path?: string | null) {
  if (!path || !supabase) return null
  const { data, error } = await supabase.storage.from('service-photos').createSignedUrl(path, 60 * 60)
  if (error) return null
  return data.signedUrl
}

export async function uploadOrderChatPhoto(serviceOrderId: string, userId: string, file: File) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg'
  const path = `chat/${serviceOrderId}/${userId}/photo-${Date.now()}.${safeExtension}`
  const { error } = await supabase.storage.from('service-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  return path
}

export async function sendOrderChatMessage(serviceOrderId: string, body: string, attachmentPath?: string | null) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { error } = await supabase.rpc('send_order_chat_message', {
    p_service_order_id: serviceOrderId,
    p_body: body,
    p_attachment_path: attachmentPath ?? null,
  })

  if (error) throw error
}
