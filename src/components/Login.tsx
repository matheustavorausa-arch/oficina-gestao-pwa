import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, Gauge, Loader2, Mail, Wrench } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Role, UserProfile } from '../types'

interface Props { onLogin: (profile: UserProfile) => void }
type Mode = 'login' | 'forgot' | 'register'
const rememberedLoginKey = 'torque_remembered_login'
const recentLoginsKey = 'torque_recent_logins'

function getRecentLogins() {
  try {
    const value = localStorage.getItem(recentLoginsKey)
    return value ? JSON.parse(value) as string[] : []
  } catch {
    return []
  }
}

export function Login({ onLogin }: Props) {
  const [email, setEmail] = useState(() => localStorage.getItem(rememberedLoginKey) ?? '')
  const [password, setPassword] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [workshopName, setWorkshopName] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [demoRole, setDemoRole] = useState<Role>('owner')
  const [rememberLogin, setRememberLogin] = useState(() => Boolean(localStorage.getItem(rememberedLoginKey)))
  const [recentLogins, setRecentLogins] = useState<string[]>(getRecentLogins)
  const [showLoginHistory, setShowLoginHistory] = useState(false)

  function saveLoginPreference(loginEmail = email) {
    const normalized = loginEmail.trim().toLowerCase()
    if (!normalized) return
    const next = [normalized, ...recentLogins.filter(item => item !== normalized)].slice(0, 5)
    setRecentLogins(next)
    localStorage.setItem(recentLoginsKey, JSON.stringify(next))
    if (rememberLogin) localStorage.setItem(rememberedLoginKey, normalized)
    else localStorage.removeItem(rememberedLoginKey)
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('')
    if (!isSupabaseConfigured) {
      const demoNames: Record<Role, string> = { owner: 'Eduardo Martins', mechanic: 'Carlos Lima', customer: 'Marina Alves' }
      saveLoginPreference()
      setTimeout(() => { setLoading(false); onLogin({ name: ownerName || demoNames[demoRole], role: demoRole, workshopName: workshopName || 'Oficina Martins' }) }, 450); return
    }
    if (mode === 'forgot') {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      setMessage(error ? error.message : 'Enviamos as instruções para o seu e-mail.'); setLoading(false); return
    }
    if (mode === 'register') {
      const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: ownerName, workshop_name: workshopName } } })
      if (error) { setMessage(error.message); setLoading(false); return }
      if (!data.session) { setMessage('Confirme seu e-mail e depois entre para concluir o cadastro.'); setLoading(false); return }
      const { data: workshop, error: workshopError } = await supabase!.from('workshops').insert({ owner_id: data.user!.id, name: workshopName, email }).select('id').single()
      if (workshopError) { setMessage(workshopError.message); setLoading(false); return }
      const { error: profileError } = await supabase!.from('profiles').insert({ id: data.user!.id, workshop_id: workshop.id, full_name: ownerName })
      if (!profileError) await supabase!.from('workshop_members').insert({ workshop_id: workshop.id, user_id: data.user!.id, role: 'owner' })
      if (profileError) { setMessage(profileError.message); setLoading(false); return }
      saveLoginPreference()
      onLogin({ userId: data.user!.id, workshopId: workshop.id, name: ownerName, role: 'owner', workshopName }); return
    }
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) { setMessage(error.message); setLoading(false); return }
    saveLoginPreference(data.user.email ?? email)
    const { data: members } = await supabase!.from('workshop_members').select('workshop_id, role, workshops(name)').eq('user_id', data.user.id).eq('active', true).limit(1)
    const member = members?.[0] ?? null
    if (!member && data.user.user_metadata?.role === 'owner' && data.user.user_metadata?.workshop_name) {
      const name = String(data.user.user_metadata.full_name ?? data.user.email)
      const shopName = String(data.user.user_metadata.workshop_name)
      const { data: shop } = await supabase!.from('workshops').insert({ owner_id: data.user.id, name: shopName, email }).select('id').single()
      if (shop) { await supabase!.from('profiles').insert({ id: data.user.id, workshop_id: shop.id, full_name: name }); await supabase!.from('workshop_members').insert({ workshop_id: shop.id, user_id: data.user.id, role: 'owner' }); onLogin({ userId: data.user.id, workshopId: shop.id, name, role: 'owner', workshopName: shopName }); return }
    }
    const { data: ownProfile } = await supabase!.from('profiles').select('full_name, workshop_id').eq('id', data.user.id).maybeSingle()
    const raw = member as unknown as { workshop_id: string; role: UserProfile['role']; workshops: { name: string } } | null
    onLogin({
      userId: data.user.id,
      workshopId: raw?.workshop_id ?? ownProfile?.workshop_id,
      name: ownProfile?.full_name ?? data.user.email!,
      role: raw?.role ?? 'customer',
      workshopName: raw?.workshops?.name ?? 'Minha oficina',
    })
  }

  function changeMode(next: Mode) { setMode(next); setMessage('') }
  return <main className="login-shell">
    <section className="login-brand"><div className="brand jas-brand"><span className="brand-mark"><Wrench /></span><span><b>JAS</b> MOTORS</span></div><div className="brand-copy"><span className="eyebrow">AUTO REPAIR & SERVICE</span><h1>Controle total.<br /><em>Mais lucro.</em></h1><p>Ordens, clientes, equipe e resultados em um só lugar — no computador ou no celular.</p></div><div className="brand-metrics"><div><strong>+32%</strong><span>produtividade</span></div><div><strong>4.9</strong><span>satisfação</span></div><div><strong>24/7</strong><span>acesso</span></div></div><Gauge className="brand-gauge" /></section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}>
      <div className="mobile-brand jas-brand"><span className="brand-mark"><Wrench /></span> <span><b>JAS</b> MOTORS</span></div>
      <span className="eyebrow">{mode === 'register' ? 'COMECE AGORA' : 'BEM-VINDO DE VOLTA'}</span><h2>{mode === 'forgot' ? 'Recuperar acesso' : mode === 'register' ? 'Cadastre sua oficina' : 'Entre na sua oficina'}</h2><p>{mode === 'forgot' ? 'Informe seu e-mail para receber as instruções.' : mode === 'register' ? 'Crie o primeiro acesso do proprietário.' : 'Use seus dados para acessar o painel.'}</p>
      {mode === 'register' && <><label>Seu nome<div className="input-wrap"><input value={ownerName} onChange={e => setOwnerName(e.target.value)} required /></div></label><label>Nome da oficina<div className="input-wrap"><Wrench /><input value={workshopName} onChange={e => setWorkshopName(e.target.value)} required /></div></label></>}
      <label className="email-field">E-mail<div className="input-wrap"><Mail /><input type="email" value={email} autoComplete="email" onDoubleClick={() => setShowLoginHistory(true)} onFocus={() => setShowLoginHistory(false)} onChange={e => setEmail(e.target.value)} required /></div>{showLoginHistory && recentLogins.length > 0 && <div className="login-history">{recentLogins.map(item => <button type="button" key={item} onClick={() => { setEmail(item); setShowLoginHistory(false) }}>{item}</button>)}</div>}</label>
      {mode !== 'forgot' && <label>Senha<div className="input-wrap"><input type="password" minLength={6} value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} required /><Eye /></div></label>}
      {mode !== 'forgot' && <label className="remember-login"><input type="checkbox" checked={rememberLogin} onChange={e => { setRememberLogin(e.target.checked); if (!e.target.checked) localStorage.removeItem(rememberedLoginKey) }} /><span>Lembrar deste login</span></label>}
      {message && <div className="form-message">{message}</div>}
      <button className="primary-btn" disabled={loading}>{loading ? <Loader2 className="spin" /> : <>{mode === 'forgot' ? 'Enviar instruções' : mode === 'register' ? 'Criar minha oficina' : 'Entrar na oficina'} <ArrowRight /></>}</button>
      <div className="login-links"><button type="button" className="link-btn" onClick={() => changeMode(mode === 'forgot' ? 'login' : 'forgot')}>{mode === 'forgot' ? 'Voltar ao login' : 'Esqueci minha senha'}</button><button type="button" className="link-btn" onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Já tenho conta' : 'Cadastrar oficina'}</button></div>
      {!isSupabaseConfigured && <div className="demo-note"><strong>Modo demonstração</strong><span>Escolha a experiência que deseja visualizar.</span><div className="role-picker">{([['owner','Dono'],['mechanic','Mecânico'],['customer','Cliente']] as const).map(([role,label]) => <button type="button" className={demoRole === role ? 'active' : ''} onClick={() => setDemoRole(role)} key={role}>{label}</button>)}</div></div>}
    </form></section>
  </main>
}
