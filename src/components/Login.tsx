import { FormEvent, useState } from 'react'
import { ArrowRight, ClipboardCheck, Eye, Loader2, Mail, UserRound } from 'lucide-react'
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
  const [phone, setPhone] = useState('')
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
    event.preventDefault()
    setLoading(true)
    setMessage('')

    if (!isSupabaseConfigured) {
      saveLoginPreference()
      setTimeout(() => {
        setLoading(false)
        onLogin({ name: ownerName || 'Demo Customer', role: 'customer', workshopName: 'JAS Motors' })
      }, 450)
      return
    }

    if (mode === 'forgot') {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      setMessage(error ? error.message : 'Password reset instructions were sent to your email.')
      setLoading(false)
      return
    }

    if (mode === 'register') {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: ownerName, phone, role: 'customer' } },
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      if (data.session) {
        const { error: accountError } = await supabase!.rpc('create_customer_account', {
          p_full_name: ownerName,
          p_phone: phone,
        })

        if (accountError) {
          setMessage(accountError.message)
          setLoading(false)
          return
        }

        await supabase!.auth.signOut()
      }

      saveLoginPreference()
      setMode('login')
      setPassword('')
      setOwnerName('')
      setPhone('')
      setMessage(data.session ? 'Account created successfully. Sign in to continue.' : 'Account created successfully. Confirm your email if requested, then sign in.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    saveLoginPreference(data.user.email ?? email)
    const { data: members } = await supabase!
      .from('workshop_members')
      .select('workshop_id, role, workshops(name)')
      .eq('user_id', data.user.id)
      .eq('active', true)
      .limit(1)
    const member = members?.[0] ?? null
    const { data: ownProfile } = await supabase!.from('profiles').select('full_name, workshop_id').eq('id', data.user.id).maybeSingle()
    const raw = member as unknown as { workshop_id: string; role: UserProfile['role']; workshops: { name: string } } | null

    onLogin({
      userId: data.user.id,
      workshopId: raw?.workshop_id ?? ownProfile?.workshop_id,
      name: ownProfile?.full_name ?? data.user.email!,
      role: raw?.role ?? 'customer',
      workshopName: raw?.workshops?.name ?? 'My Workshop',
    })
  }

  function changeMode(next: Mode) {
    setMode(next)
    setMessage('')
  }

  const submitText = mode === 'forgot' ? 'Send instructions' : mode === 'register' ? 'Create account' : 'Enter the shop'

  return <main className="login-shell premium-login-shell">
    <section className="login-panel premium-login-panel">
      <form className="login-card premium-login-card" onSubmit={submit}>
        <div className="premium-logo v0-logo" aria-label="JAS Motors">
          <img src="/jas-motors-logo.png" alt="JAS Motors" />
        </div>

        <span className="eyebrow login-eyebrow">{mode === 'register' ? 'GET STARTED' : 'WELCOME BACK'}</span>
        <h2>{mode === 'forgot' ? 'Recover access' : mode === 'register' ? 'Create customer account' : 'Enter your shop'}</h2>
        <p>{mode === 'forgot' ? 'Enter your email to receive reset instructions.' : mode === 'register' ? 'Create your customer account with basic details. Vehicle and appointment details are added after sign-in.' : 'Use your credentials to access your dashboard.'}</p>

        {mode === 'register' && <>
          <label>Full name<div className="input-wrap premium-input"><UserRound /><input value={ownerName} onChange={e => setOwnerName(e.target.value)} required /></div></label>
          <label>Phone<div className="input-wrap premium-input"><UserRound /><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(407) 555-1234" /></div></label>
        </>}

        <label className="email-field">Email<div className="input-wrap premium-input"><Mail /><input type="email" placeholder="you@email.com" value={email} autoComplete="email" onDoubleClick={() => setShowLoginHistory(true)} onFocus={() => setShowLoginHistory(false)} onChange={e => setEmail(e.target.value)} required /></div>{showLoginHistory && recentLogins.length > 0 && <div className="login-history">{recentLogins.map(item => <button type="button" key={item} onClick={() => { setEmail(item); setShowLoginHistory(false) }}>{item}</button>)}</div>}</label>

        {mode !== 'forgot' && <label>Password<div className="input-wrap premium-input"><ClipboardCheck /><input type={showPassword ? 'text' : 'password'} placeholder="Your password" minLength={6} value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} required /><button type="button" className="password-eye" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Eye /></button></div></label>}

        {mode !== 'forgot' && <label className="remember-login premium-remember"><input type="checkbox" checked={rememberLogin} onChange={e => { setRememberLogin(e.target.checked); if (!e.target.checked) localStorage.removeItem(rememberedLoginKey) }} /><span>Remember this login</span></label>}

        {message && <div className="form-message">{message}</div>}

        <button className="primary-btn premium-login-submit" disabled={loading}>{loading ? <Loader2 className="spin" /> : <>{submitText} <ArrowRight /></>}</button>

        <div className="login-links premium-login-links"><button type="button" className="link-btn" onClick={() => changeMode(mode === 'forgot' ? 'login' : 'forgot')}>{mode === 'forgot' ? 'Back to sign in' : 'Forgot password'}</button><button type="button" className="link-btn" onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'I already have an account' : 'Create account'}</button></div>

        {!isSupabaseConfigured && <div className="demo-note premium-demo-note"><strong>Demo mode</strong><span>Supabase is not configured. The app will open the customer area.</span></div>}
        <footer className="premium-login-footer"><ClipboardCheck />Your business. Your shop. Your control.<span>JAS MOTORS SYSTEM</span></footer>
      </form>
    </section>
  </main>
}
