import { supabase } from './supabase'

export const defaultMechanicAvatar = '/mechanic-avatar.svg'

export async function resolveAvatarUrl(path?: string | null) {
  if (!path || !supabase) return defaultMechanicAvatar
  if (path.startsWith('http') || path.startsWith('/')) return path
  const { data, error } = await supabase.storage.from('service-photos').createSignedUrl(path, 60 * 60)
  if (error) return defaultMechanicAvatar
  return data.signedUrl
}

export async function uploadProfileAvatar(userId: string, file: File) {
  if (!supabase) throw new Error('Supabase não configurado.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `profiles/${userId}/avatar-${Date.now()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('service-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (uploadError) throw uploadError
  const { error: profileError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
  if (profileError) throw profileError
  return path
}
