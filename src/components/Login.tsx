import { FormEvent, useState } from 'react'
import { ArrowRight, ClipboardCheck, Eye, Loader2, Mail, UserRound, Wrench } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

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
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [rememberLogin, setRememberLogin] = useState(() => Boolean(localStorage.getItem(rememberedLoginKey)))
  const [recentLogins, setRecentLogins] = useState<string[]>(getRecentLogins)
  const [showLoginHistory, setShowLoginHistory] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
      saveLoginPreference()
      setTimeout(() => { setLoading(false); onLogin({ name: ownerName || 'Cliente Demo', role: 'customer', workshopName: 'JAS Motors' }) }, 450); return
    }
    if (mode === 'forgot') {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      setMessage(error ? error.message : 'Enviamos as instruções para o seu e-mail.'); setLoading(false); return
    }
    if (mode === 'register') {
      const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: ownerName, role: 'customer' } } })
      if (error) { setMessage(error.message); setLoading(false); return }
      if (!data.session) { setMessage('Conta criada. Confirme seu e-mail e depois entre como cliente.'); setLoading(false); return }
      saveLoginPreference()
      onLogin({ userId: data.user!.id, name: ownerName || data.user!.email || 'Cliente', role: 'customer', workshopName: 'JAS Motors' }); return
    }
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) { setMessage(error.message); setLoading(false); return }
    saveLoginPreference(data.user.email ?? email)
    const { data: members } = await supabase!.from('workshop_members').select('workshop_id, role, workshops(name)').eq('user_id', data.user.id).eq('active', true).limit(1)
    const member = members?.[0] ?? null
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

  const submitText = mode === 'forgot' ? 'Enviar instruções' : mode === 'register' ? 'Criar conta' : 'Entrar na oficina'

  return <main className="login-shell premium-login-shell">
    <section className="login-panel premium-login-panel">
      <form className="login-card premium-login-card" onSubmit={submit}>
        <div className="premium-logo" aria-label="JAS Motors">
          <div className="premium-car-line" />
          <strong>JAS</strong>
          <span>MOTORS</span>
          <small>AUTO REPAIR & SERVICE</small>
          <i><Wrench /></i>
        </div>

        <span className="eyebrow login-eyebrow">{mode === 'register' ? 'COMECE AGORA' : 'BEM-VINDO DE VOLTA'}</span>
        <h2>{mode === 'forgot' ? 'Recuperar acesso' : mode === 'register' ? 'Criar conta de cliente' : 'Entre na sua oficina'}</h2>
        <p>{mode === 'forgot' ? 'Informe seu e-mail para receber as instruções.' : mode === 'register' ? 'Cadastre-se para agendar e acompanhar seus serviços.' : 'Use seus dados para acessar o painel.'}</p>

        {mode === 'register' && <>
          <label>Seu nome<div className="input-wrap premium-input"><UserRound /><input value={ownerName} onChange={e => setOwnerName(e.target.value)} required /></div></label>
        </>}

        <label className="email-field">E-mail<div className="input-wrap premium-input"><Mail /><input type="email" placeholder="seu@email.com" value={email} autoComplete="email" onDoubleClick={() => setShowLoginHistory(true)} onFocus={() => setShowLoginHistory(false)} onChange={e => setEmail(e.target.value)} required /></div>{showLoginHistory && recentLogins.length > 0 && <div className="login-history">{recentLogins.map(item => <button type="button" key={item} onClick={() => { setEmail(item); setShowLoginHistory(false) }}>{item}</button>)}</div>}</label>

        {mode !== 'forgot' && <label>Senha<div className="input-wrap premium-input"><ClipboardCheck /><input type={showPassword ? 'text' : 'password'} placeholder="Sua senha" minLength={6} value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} required /><button type="button" className="password-eye" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><Eye /></button></div></label>}
        {mode !== 'forgot' && <label className="remember-login premium-remember"><input type="checkbox" checked={rememberLogin} onChange={e => { setRememberLogin(e.target.checked); if (!e.target.checked) localStorage.removeItem(rememberedLoginKey) }} /><span>Lembrar deste login</span></label>}

        {message && <div className="form-message">{message}</div>}

        <button className="primary-btn premium-login-submit" disabled={loading}>{loading ? <Loader2 className="spin" /> : <>{submitText} <ArrowRight /></>}</button>

        <div className="login-links premium-login-links"><button type="button" className="link-btn" onClick={() => changeMode(mode === 'forgot' ? 'login' : 'forgot')}>{mode === 'forgot' ? 'Voltar ao login' : 'Esqueci minha senha'}</button><button type="button" className="link-btn" onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Já tenho conta' : 'Criar conta'}</button></div>

        {!isSupabaseConfigured && <div className="demo-note premium-demo-note"><strong>Modo demonstração</strong><span>Sem Supabase configurado, o acesso abre a área do cliente.</span></div>}
        <footer className="premium-login-footer"><ClipboardCheck />Seu negócio. Sua oficina. Seu controle.<span>JAS MOTORS SYSTEM</span></footer>
      </form>
    </section>
  </main>
}
