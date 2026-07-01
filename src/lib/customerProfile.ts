import { supabase } from './supabase'

export interface CustomerProfileSettings {
  fullName: string
  phone: string
  email: string
}

type RawCustomerProfile = {
  full_name?: string | null
  phone?: string | null
  email?: string | null
}

export async function fetchCustomerProfile(): Promise<CustomerProfileSettings> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.rpc('get_customer_profile')
  if (error) throw error

  const row = data as RawCustomerProfile
  return {
    fullName: row.full_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
  }
}

export async function updateCustomerProfile(input: { fullName: string; phone?: string }) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.rpc('update_customer_profile', {
    p_full_name: input.fullName,
    p_phone: input.phone || null,
  })

  if (error) throw error
  const row = data as RawCustomerProfile

  return {
    fullName: row.full_name ?? input.fullName,
    phone: row.phone ?? input.phone ?? '',
    email: row.email ?? '',
  }
}
