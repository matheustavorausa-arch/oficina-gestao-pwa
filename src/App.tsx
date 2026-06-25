import { useCallback, useEffect, useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { CustomerDashboard, MechanicDashboard } from './components/RoleDashboards'
import { supabase } from './lib/supabase'
import type { UserProfile } from './types'

async function resolveSupabaseProfile(): Promise<UserProfile | null> {
  if (!supabase) return null
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) return null

  const { data: ownProfile } = await supabase
    .from('profiles')
    .select('full_name, workshop_id')
    .eq('id', user.id)
    .maybeSingle()

  const { data: members } = await supabase
    .from('workshop_members')
    .select('workshop_id, role, workshops(name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)

  const member = members?.[0] as unknown as { workshop_id: string; role: UserProfile['role']; workshops: { name: string } } | undefined
  const workshopId = member?.workshop_id ?? ownProfile?.workshop_id
  let workshopName = member?.workshops?.name ?? 'Minha oficina'

  if (workshopId && !member?.workshops?.name) {
    const { data: workshop } = await supabase
      .from('workshops')
      .select('name')
      .eq('id', workshopId)
      .maybeSingle()
    workshopName = workshop?.name ?? workshopName
  }

  return {
    userId: user.id,
    workshopId,
    name: ownProfile?.full_name ?? user.email ?? 'Usuário',
    role: member?.role ?? 'customer',
    workshopName,
  }
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = sessionStorage.getItem('torque_demo_profile')
    return saved ? JSON.parse(saved) : null
  })

  const updateProfile = useCallback((value: UserProfile | null) => {
    if (value) sessionStorage.setItem('torque_demo_profile', JSON.stringify(value))
    else sessionStorage.removeItem('torque_demo_profile')
    setProfile(value)
  }, [])

  const refreshProfile = useCallback(async () => {
    const fresh = await resolveSupabaseProfile()
    if (fresh) updateProfile(fresh)
  }, [updateProfile])

  useEffect(() => { refreshProfile().catch(() => undefined) }, [refreshProfile])

  useEffect(() => {
    if (!supabase || !profile?.userId) return
    const client = supabase
    const channel = client
      .channel(`profile-sync-${profile.userId}-${profile.workshopId ?? 'none'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.userId}` }, () => { refreshProfile().catch(() => undefined) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_members', filter: `user_id=eq.${profile.userId}` }, () => { refreshProfile().catch(() => undefined) })

    if (profile.workshopId) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'workshops', filter: `id=eq.${profile.workshopId}` }, () => { refreshProfile().catch(() => undefined) })
    }

    channel.subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile?.userId, profile?.workshopId, refreshProfile])

  function login(value: UserProfile) { updateProfile(value); refreshProfile().catch(() => undefined) }
  function logout() { updateProfile(null); supabase?.auth.signOut() }

  if (!profile) return <Login onLogin={login} />
  if (profile.role === 'mechanic') return <MechanicDashboard profile={profile} onLogout={logout} />
  if (profile.role === 'customer') return <CustomerDashboard profile={profile} onLogout={logout} />
  return <Dashboard profile={profile} onLogout={logout} onProfileChange={updateProfile} />
}
