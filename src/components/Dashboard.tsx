import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, Car, Check, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, LayoutDashboard, Menu, MessageSquare, Settings, Users, Wrench, X } from 'lucide-react'
import { fetchServiceOrders } from '../lib/serviceOrders'
import { supabase } from '../lib/supabase'
import { defaultMechanicAvatar, resolveAvatarUrl, uploadProfileAvatar } from '../lib/avatars'
import type { ServiceOrder, ServiceStatus, UserProfile } from '../types'

interface Props { profile: UserProfile; onLogout: () => void; onProfileChange?: (profile: UserProfile) => void }
interface MechanicProfile { id: string; name: string; phone: string; active: boolean; avatarPath?: string | null; avatarUrl: string }
interface DashboardAppointment { id: string; time: string; customer: string; vehicle: string; description: string; status: string }
type MetricModal = 'active' | 'approval' | 'appointments' | 'revenue' | null

const statusClass: Record<ServiceStatus, string> = {
  Aguardando: 'gray',
  'Diagnóstico': 'blue',
  'Orçamento': 'amber',
  'Em execução': 'green',
  Finalizado: 'dark',
}

function VehicleThumb({ order }: { order: ServiceOrder }) {
  return order.vehicleImage
    ? <img className="vehicle-thumb" src={order.vehicleImage} alt={order.vehicle} />
    : <span className="vehicle-thumb empty-thumb"><Car /></span>
}

function OrderModal({ order, onClose }: { order: ServiceOrder; onClose: () => void }) {
  const steps = ['Entrada do veÃ­culo', 'Checklist inicial', 'DiagnÃ³stico', 'AprovaÃ§Ã£o do orÃ§amento', 'ExecuÃ§Ã£o', 'Entrega']
  const current = Math.max(1, Math.ceil(order.progress / 17))
  return <div className="modal-backdrop" onClick={onClose}><article className="modal" onClick={event => event.stopPropagation()}>
    <button className="icon-btn modal-close" onClick={onClose}><X /></button>
    <VehicleThumb order={order} />
    <span className="eyebrow">{order.code}</span><h2>{order.vehicle}</h2><p>{order.customer} Â· {order.plate}</p>
    <div className="order-summary"><div><span>ServiÃ§o</span><strong>{order.service}</strong></div><div><span>ResponsÃ¡vel</span><strong>{order.mechanic}</strong></div><div><span>OrÃ§amento</span><strong>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div></div>
    <h3>Etapas do serviÃ§o</h3><div className="timeline">{steps.map((step, index) => <div className={index < current ? 'done' : ''} key={step}><span>{index < current ? <Check /> : index + 1}</span><p><strong>{step}</strong><small>{index < current ? 'ConcluÃ­do' : 'Pendente'}</small></p></div>)}</div>
    <div className="modal-actions"><button className="secondary-btn"><MessageSquare /> Abrir chat</button><button className="primary-btn"><ClipboardCheck /> Ver ordem completa</button></div>
  </article></div>
}

function MetricDetailsModal({ type, orders, appointments, onClose }: { type: Exclude<MetricModal, null>; orders: ServiceOrder[]; appointments: DashboardAppointment[]; onClose: () => void }) {
  const active = orders.filter(order => order.status !== 'Finalizado')
  const approvals = orders.filter(order => order.status === 'Orçamento')
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const averageTicket = orders.length ? revenue / orders.length : 0
  const config = {
    active: { title: 'ServiÃ§os ativos', subtitle: 'Ordens reais em andamento no Supabase', icon: <Wrench /> },
    approval: { title: 'Aguardando aprovaÃ§Ã£o', subtitle: 'OrÃ§amentos enviados ou pendentes de decisÃ£o', icon: <ClipboardCheck /> },
    appointments: { title: 'Agendamentos de hoje', subtitle: 'Agenda real cadastrada no banco de dados', icon: <CalendarDays /> },
    revenue: { title: 'Faturamento do mÃªs', subtitle: 'Resumo calculado a partir dos orÃ§amentos das ordens', icon: <CircleDollarSign /> },
  }[type]

  return <div className="modal-backdrop" onClick={onClose}>
    <article className="modal metric-modal" onClick={event => event.stopPropagation()}>
      <button className="icon-btn modal-close" onClick={onClose}><X /></button>
      <div className="metric-modal-title"><span>{config.icon}</span><div><span className="eyebrow">DADOS DO SUPABASE</span><h2>{config.title}</h2><p>{config.subtitle}</p></div></div>
      {type === 'active' && <div className="metric-detail-list">{active.map(order => <button key={order.id} className="metric-detail-row">
        <VehicleThumb order={order} /><strong>{order.code} Â· {order.customer}</strong><span>{order.vehicle} Â· {order.plate}</span><small>{order.status} Â· {order.progress}% Â· {order.mechanic}</small>
      </button>)}{active.length === 0 && <div className="empty">Nenhum serviÃ§o ativo agora.</div>}</div>}
      {type === 'approval' && <div className="metric-detail-list">{approvals.map(order => <button key={order.id} className="metric-detail-row">
        <VehicleThumb order={order} /><strong>{order.code} Â· {order.customer}</strong><span>{order.service}</span><small>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} Â· {order.vehicle}</small>
      </button>)}{approvals.length === 0 && <div className="empty">Nenhum orÃ§amento aguardando aprovaÃ§Ã£o.</div>}</div>}
      {type === 'appointments' && <div className="metric-detail-list">{appointments.map(item => <button key={item.id} className="metric-detail-row">
        <strong>{item.time} Â· {item.customer}</strong><span>{item.vehicle}</span><small>{item.description} Â· {item.status}</small>
      </button>)}{appointments.length === 0 && <div className="empty">Nenhum agendamento hoje.</div>}</div>}
      {type === 'revenue' && <div className="finance-breakdown">
        <article><span>Total em orÃ§amentos</span><strong>{revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article>
        <article><span>Ordens consideradas</span><strong>{orders.length}</strong></article>
        <article><span>Ticket mÃ©dio</span><strong>{averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article>
        <article><span>Em aprovaÃ§Ã£o</span><strong>{approvals.reduce((sum, order) => sum + order.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article>
        <div className="metric-detail-list">{orders.map(order => <button key={order.id} className="metric-detail-row">
          <VehicleThumb order={order} /><strong>{order.code} Â· {order.customer}</strong><span>{order.service}</span><small>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} Â· {order.status}</small>
        </button>)}</div>
      </div>}
    </article>
  </div>
}

export function Dashboard({ profile, onLogout, onProfileChange }: Props) {
  const [active, setActive] = useState('VisÃ£o geral')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selected, setSelected] = useState<ServiceOrder | null>(null)
  const [metricModal, setMetricModal] = useState<MetricModal>(null)
  const [ownerProfileOpen, setOwnerProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [ownerName, setOwnerName] = useState(profile.name)
  const [workshopName, setWorkshopName] = useState(profile.workshopName)
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([])
  const [savingProfile, setSavingProfile] = useState(false)
  const [remoteOrders, setRemoteOrders] = useState<ServiceOrder[]>([])
  const [appointmentsToday, setAppointmentsToday] = useState<DashboardAppointment[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const sourceOrders = remoteOrders
  const orders = useMemo(() => sourceOrders.filter(order => `${order.code} ${order.customer} ${order.vehicle} ${order.plate}`.toLowerCase().includes(query.toLowerCase())), [query, sourceOrders])
  const activeOrders = orders.filter(order => order.status !== 'Finalizado').length
  const completedOrders = orders.filter(order => order.status === 'Finalizado').length
  const pendingEstimates = orders.filter(order => order.status === 'Orçamento').length
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const averageTicket = orders.length ? revenue / orders.length : 0
  const nav = [
    ['VisÃ£o geral', LayoutDashboard], ['Agenda', CalendarDays], ['Ordens de serviÃ§o', FileText], ['Clientes', Users], ['VeÃ­culos', Car], ['Equipe', Wrench], ['Financeiro', CircleDollarSign], ['ConfiguraÃ§Ãµes', Settings],
  ] as const
  function action(message: string) { setToast(message); setTimeout(() => setToast(''), 2600) }

  async function loadAppointmentsToday() {
    if (!supabase || !profile.workshopId) return
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(end.getDate() + 1)
    const { data, error } = await supabase
      .from('appointments')
      .select('id, scheduled_at, description, status, customers(full_name), vehicles(make, model, year, plate)')
      .eq('workshop_id', profile.workshopId)
      .gte('scheduled_at', start.toISOString())
      .lt('scheduled_at', end.toISOString())
      .order('scheduled_at')
    if (error) throw error
    setAppointmentsToday((data ?? []).map(item => {
      const customer = item.customers as { full_name?: string } | null
      const vehicle = item.vehicles as { make?: string; model?: string; year?: number | null; plate?: string } | null
      return {
        id: item.id,
        time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.scheduled_at)),
        customer: customer?.full_name ?? 'Cliente',
        vehicle: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}${vehicle.year ? ` ${vehicle.year}` : ''} Â· ${vehicle.plate ?? ''}`.trim() : 'VeÃ­culo',
        description: item.description,
        status: item.status,
      }
    }))
  }

  async function loadMechanics() {
    if (!supabase || !profile.workshopId) return
    const { data: members, error: membersError } = await supabase.from('workshop_members').select('user_id, active').eq('workshop_id', profile.workshopId).eq('role', 'mechanic')
    if (membersError) throw membersError
    const ids = (members ?? []).map(item => item.user_id)
    if (!ids.length) { setMechanics([]); return }
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name, phone, avatar_path').in('id', ids)
    if (profilesError) throw profilesError
    const resolved = await Promise.all(ids.map(async id => {
      const profileRow = profiles?.find(item => item.id === id)
      const member = members?.find(item => item.user_id === id)
      return {
        id,
        name: profileRow?.full_name ?? 'MecÃ¢nico',
        phone: profileRow?.phone ?? '',
        active: Boolean(member?.active),
        avatarPath: profileRow?.avatar_path,
        avatarUrl: await resolveAvatarUrl(profileRow?.avatar_path),
      }
    }))
    setMechanics(resolved)
  }

  async function changeMechanicAvatar(mechanicId: string, file?: File) {
    if (!file) return
    try {
      const path = await uploadProfileAvatar(mechanicId, file)
      const url = await resolveAvatarUrl(path)
      setMechanics(current => current.map(item => item.id === mechanicId ? { ...item, avatarPath: path, avatarUrl: url } : item))
      action('Foto do mecÃ¢nico atualizada.')
    } catch (error) {
      action(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel trocar a foto.')
    }
  }

  function persistLocalProfile(nextName: string, nextWorkshop: string) {
    const nextProfile = { ...profile, name: nextName, workshopName: nextWorkshop }
    sessionStorage.setItem('torque_demo_profile', JSON.stringify(nextProfile))
    onProfileChange?.(nextProfile)
  }

  async function saveOwnerProfile() {
    if (!supabase || !profile.userId || !profile.workshopId) return
    setSavingProfile(true)
    try {
      const cleanOwnerName = ownerName.trim()
      const cleanWorkshopName = workshopName.trim()
      const { error: profileError } = await supabase.from('profiles').update({ full_name: cleanOwnerName }).eq('id', profile.userId)
      if (profileError) throw profileError
      const { error: workshopError } = await supabase.from('workshops').update({ name: cleanWorkshopName }).eq('id', profile.workshopId)
      if (workshopError) throw workshopError
      for (const mechanic of mechanics) {
        const { error } = await supabase.from('profiles').update({ full_name: mechanic.name.trim(), phone: mechanic.phone.trim() || null }).eq('id', mechanic.id)
        if (error) throw error
      }
      persistLocalProfile(cleanOwnerName, cleanWorkshopName)
      setRemoteOrders(await fetchServiceOrders({ ...profile, name: cleanOwnerName, workshopName: cleanWorkshopName }))
      await loadMechanics()
      action('Perfil e equipe atualizados no Supabase.')
      setOwnerProfileOpen(false)
    } catch (error) {
      action(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel salvar o perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  useEffect(() => {
    let ignore = false
    setLoadingOrders(true)
    setOrdersError('')
    fetchServiceOrders(profile)
      .then(items => { if (!ignore) setRemoteOrders(items) })
      .catch(error => { if (!ignore) setOrdersError(error.message ?? 'NÃ£o foi possÃ­vel carregar ordens.') })
      .finally(() => { if (!ignore) setLoadingOrders(false) })
    loadAppointmentsToday().catch(() => undefined)
    return () => { ignore = true }
  }, [profile.userId, profile.workshopId])

  useEffect(() => { setOwnerName(profile.name); setWorkshopName(profile.workshopName) }, [profile.name, profile.workshopName])
  useEffect(() => { if (ownerProfileOpen) loadMechanics().catch(error => action(error.message ?? 'NÃ£o foi possÃ­vel carregar mecÃ¢nicos.')) }, [ownerProfileOpen])
  useEffect(() => {
    if (!supabase || !profile.workshopId) return
    const client = supabase
    const refreshOwnerData = () => {
      fetchServiceOrders(profile).then(setRemoteOrders).catch(() => undefined)
      loadAppointmentsToday().catch(() => undefined)
      if (ownerProfileOpen) loadMechanics().catch(() => undefined)
    }
    const channel = client
      .channel(`owner-dashboard-sync-${profile.workshopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `workshop_id=eq.${profile.workshopId}` }, refreshOwnerData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshops', filter: `id=eq.${profile.workshopId}` }, refreshOwnerData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `workshop_id=eq.${profile.workshopId}` }, refreshOwnerData)
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile.workshopId, ownerProfileOpen])

  return <div className="app-shell">
    <aside className={mobileMenu ? 'sidebar open' : 'sidebar'}>
      <div className="brand jas-brand"><span className="brand-mark"><Wrench /></span><span><b>JAS</b> MOTORS</span></div>
      <button className="mobile-close" onClick={() => setMobileMenu(false)}><X /></button>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setMobileMenu(false); if (label !== 'VisÃ£o geral') action(`${label}: mÃ³dulo em construÃ§Ã£o com Supabase.`) }}><Icon />{label}{label === 'Ordens de serviÃ§o' && <span className="nav-count">{orders.length}</span>}</button>)}</nav>
      <div className="support-card"><MessageSquare /><strong>Precisa de ajuda?</strong><span>Fale com nosso suporte</span><button onClick={() => action('Canal de suporte aberto.')}>Conversar</button></div>
      <button className="profile-block" onClick={() => setOwnerProfileOpen(true)}><span>{ownerName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span><p><strong>{ownerName}</strong><small>Perfil do dono</small></p><ChevronRight /></button>
      <button className="logout-block" onClick={onLogout}>Sair da conta</button>
    </aside>
    {mobileMenu && <div className="sidebar-shade" onClick={() => setMobileMenu(false)} />}
    <main className="dashboard owner-dashboard">
      <header className="owner-topbar"><button className="menu-btn" onClick={() => setMobileMenu(true)}><Menu /></button><div className="owner-title"><strong>Dashboard</strong><span>VisÃ£o geral da oficina</span></div><div className="owner-top-actions"><button className="icon-btn"><Bell /><i /></button><button className="icon-btn"><CalendarDays /></button><button className="owner-date"><CalendarDays />Hoje, 24 de Maio de 2025</button><button className="owner-user" onClick={() => setOwnerProfileOpen(true)}><span>{ownerName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span><p><strong>{ownerName}</strong><small>Dono / Administrador</small></p><ChevronRight /></button></div></header>
      <div className="content">
        <section className="owner-kpis">
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('revenue')}><span className="kpi-icon kpi-green"><CircleDollarSign /></span><p>Faturamento Hoje<strong>{revenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong><small>+ 18% vs ontem</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('active')}><span className="kpi-icon kpi-blue"><ClipboardCheck /></span><p>ServiÃ§os ConcluÃ­dos<strong>{completedOrders}</strong><small>+ 12% vs ontem</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('active')}><span className="kpi-icon kpi-orange"><Wrench /></span><p>Em Andamento<strong>{activeOrders}</strong><small className="negative">- 2 vs ontem</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('appointments')}><span className="kpi-icon kpi-purple"><CalendarDays /></span><p>Agendamentos Hoje<strong>{appointmentsToday.length}</strong><small>+ 5 vs ontem</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('revenue')}><span className="kpi-icon kpi-gray"><CircleDollarSign /></span><p>Ticket MÃ©dio<strong>{averageTicket.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong><small>+ 9% vs ontem</small></p></article>
        </section>
        <section className="owner-main-grid">
          <article className="owner-card revenue-chart-card"><h2>Faturamento dos Ãšltimos 7 Dias</h2><div className="chart-area"><span>$6.000</span><span>$4.000</span><span>$2.000</span><svg viewBox="0 0 640 240" preserveAspectRatio="none"><defs><linearGradient id="jasLineFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ed111c" stopOpacity=".45"/><stop offset="100%" stopColor="#ed111c" stopOpacity="0"/></linearGradient></defs><path d="M30 180 L120 135 L210 158 L300 102 L390 124 L500 82 L610 45 L610 220 L30 220 Z" fill="url(#jasLineFill)" /><path d="M30 180 L120 135 L210 158 L300 102 L390 124 L500 82 L610 45" fill="none" stroke="#ed111c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="610" cy="45" r="8" fill="#ed111c"/></svg><strong>$4.850</strong><div className="chart-days"><span>19/05</span><span>21/05</span><span>22/05</span><span>23/05</span><span>24/05</span></div></div></article>
          <article className="owner-card status-donut-card"><h2>ServiÃ§os por Status</h2><div className="status-donut-wrap"><div className="status-donut"><strong>{orders.length}</strong><span>Total</span></div><ul><li><b className="dot done" />ConcluÃ­dos <span>{completedOrders} (56%)</span></li><li><b className="dot progress-dot" />Em Andamento <span>{activeOrders} (22%)</span></li><li><b className="dot parts" />Aguardando PeÃ§as <span>4 (12%)</span></li><li><b className="dot approval" />Aguardando AprovaÃ§Ã£o <span>{pendingEstimates} (10%)</span></li></ul></div></article>
          <article className="owner-card next-appointments-card"><div className="owner-card-head"><h2>PrÃ³ximos Agendamentos</h2><button onClick={() => setMetricModal('appointments')}>Ver todos</button></div><div className="next-appointments-list">{appointmentsToday.slice(0, 5).map(item => <button key={item.id} onClick={() => setMetricModal('appointments')}><time>{item.time}</time><strong>{item.vehicle}</strong><span>{item.customer}</span><em className={item.status === 'Em Andamento' ? 'hot' : ''}>{item.status}</em></button>)}{appointmentsToday.length === 0 && <div className="empty">Nenhum agendamento criado ainda.</div>}</div></article>
        </section>
        <section className="owner-lower-grid">
          <div className="owner-alerts">{appointmentsToday[0] ? <article className="owner-alert success"><Check /><p><strong>Novo Agendamento!</strong><span>{appointmentsToday[0].customer} agendou {appointmentsToday[0].description}.</span></p><small>Agora</small></article> : <article className="owner-alert blue"><Wrench /><p><strong>Ambiente limpo</strong><span>Pronto para criar os primeiros testes práticos.</span></p><small>Agora</small></article>}</div>
          <section className="owner-card orders-panel"><div className="owner-card-head"><h2>ServiÃ§os em Andamento</h2><button onClick={() => action('Listagem completa disponÃ­vel no mÃ³dulo de OS.')}>Ver todos</button></div>
            <div className="table-wrap"><table><thead><tr><th>Ordem</th><th>VeÃ­culo</th><th>Cliente</th><th>MecÃ¢nico</th><th>Status</th></tr></thead><tbody>{orders.slice(0, 4).map(order => <tr key={order.id} onClick={() => setSelected(order)}><td><strong>{order.code}</strong></td><td><div className="vehicle-cell"><VehicleThumb order={order} /><p><strong>{order.vehicle}</strong><span>{order.plate}</span></p></div></td><td>{order.customer}</td><td>{order.mechanic}</td><td><span className={`status ${statusClass[order.status]}`}>{order.status}</span></td></tr>)}</tbody></table>{orders.length === 0 && <div className="empty">Nenhuma ordem encontrada.</div>}</div>
          </section>
          <article className="owner-card finance-summary"><div className="owner-card-head"><h2>Financeiro - Resumo</h2><button>Este MÃªs</button></div><div className="finance-values"><p><span>Receita Total</span><strong>{revenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></p><p><span>Despesas</span><strong>$0.00</strong></p><p><span>Lucro LÃ­quido</span><strong>{revenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></p></div><div className="mini-bars">{Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ height: `${orders.length ? 20 + ((index * 17) % 72) : 4}%` }} />)}</div></article>
          <aside className="privacy-card normal"><span><CircleDollarSign /></span><p><strong>Modo Normal</strong><small>Clique para ocultar os valores</small></p></aside>
        </section>
      </div>
    </main>
    {selected && <OrderModal order={selected} onClose={() => setSelected(null)} />}
    {metricModal && <MetricDetailsModal type={metricModal} orders={orders} appointments={appointmentsToday} onClose={() => setMetricModal(null)} />}
    {ownerProfileOpen && <div className="modal-backdrop" onClick={() => setOwnerProfileOpen(false)}>
      <article className="modal owner-profile-modal" onClick={event => event.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={() => setOwnerProfileOpen(false)}><X /></button>
        <span className="eyebrow">PERFIL DO DONO</span><h2>Dados da oficina e equipe</h2><p>Edite seu nome, o nome da oficina e os perfis dos mecÃ¢nicos. As alteraÃ§Ãµes sÃ£o salvas no Supabase.</p>
        <div className="owner-profile-grid"><label>Nome do dono<input value={ownerName} onChange={event => setOwnerName(event.target.value)} /></label><label>Nome da oficina<input value={workshopName} onChange={event => setWorkshopName(event.target.value)} /></label></div>
        <h3>MecÃ¢nicos</h3><div className="mechanics-editor">{mechanics.length === 0 && <div className="empty">Nenhum mecÃ¢nico cadastrado nesta oficina.</div>}{mechanics.map((mechanic, index) => <div className="mechanic-edit-row" key={mechanic.id}><label className="mechanic-avatar-picker"><img src={mechanic.avatarUrl || defaultMechanicAvatar} alt={mechanic.name} /><input type="file" accept="image/*" onChange={event => changeMechanicAvatar(mechanic.id, event.target.files?.[0])} /><span>Trocar foto</span></label><label>Nome<input value={mechanic.name} onChange={event => setMechanics(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></label><label>Telefone<input value={mechanic.phone} onChange={event => setMechanics(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))} /></label><small>{mechanic.active ? 'Ativo' : 'Inativo'}</small></div>)}</div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setOwnerProfileOpen(false)}>Cancelar</button><button className="primary-btn" disabled={savingProfile} onClick={saveOwnerProfile}>{savingProfile ? 'Salvando...' : 'Salvar alteraÃ§Ãµes'}</button></div>
      </article>
    </div>}
    {toast && <div className="toast"><Check />{toast}</div>}
  </div>
}

