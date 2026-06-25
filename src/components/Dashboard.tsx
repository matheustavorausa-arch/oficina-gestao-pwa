import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, Car, Check, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, LayoutDashboard, Menu, MessageSquare, Plus, Search, Settings, Users, Wrench, X } from 'lucide-react'
import { demoOrders } from '../demoData'
import { fetchServiceOrders } from '../lib/serviceOrders'
import { supabase } from '../lib/supabase'
import { defaultMechanicAvatar, resolveAvatarUrl, uploadProfileAvatar } from '../lib/avatars'
import type { ServiceOrder, ServiceStatus, UserProfile } from '../types'

interface Props { profile: UserProfile; onLogout: () => void; onProfileChange?: (profile: UserProfile) => void }
interface MechanicProfile { id: string; name: string; phone: string; active: boolean; avatarPath?: string | null; avatarUrl: string }
interface DashboardAppointment { id: string; time: string; customer: string; vehicle: string; description: string; status: string }
type MetricModal = 'active' | 'approval' | 'appointments' | 'revenue' | null

const statusClass: Record<ServiceStatus, string> = { Aguardando: 'gray', Diagnóstico: 'blue', Orçamento: 'amber', 'Em execução': 'green', Finalizado: 'dark' }

function VehicleThumb({ order }: { order: ServiceOrder }) {
  return order.vehicleImage
    ? <img className="vehicle-thumb" src={order.vehicleImage} alt={order.vehicle} />
    : <span className="vehicle-thumb empty-thumb"><Car /></span>
}

function OrderModal({ order, onClose }: { order: ServiceOrder; onClose: () => void }) {
  const steps = ['Entrada do veículo', 'Checklist inicial', 'Diagnóstico', 'Aprovação do orçamento', 'Execução', 'Entrega']
  const current = Math.max(1, Math.ceil(order.progress / 17))
  return <div className="modal-backdrop" onClick={onClose}><article className="modal" onClick={event => event.stopPropagation()}>
    <button className="icon-btn modal-close" onClick={onClose}><X /></button>
    <VehicleThumb order={order} />
    <span className="eyebrow">{order.code}</span><h2>{order.vehicle}</h2><p>{order.customer} · {order.plate}</p>
    <div className="order-summary"><div><span>Serviço</span><strong>{order.service}</strong></div><div><span>Responsável</span><strong>{order.mechanic}</strong></div><div><span>Orçamento</span><strong>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div></div>
    <h3>Etapas do serviço</h3><div className="timeline">{steps.map((step, index) => <div className={index < current ? 'done' : ''} key={step}><span>{index < current ? <Check /> : index + 1}</span><p><strong>{step}</strong><small>{index < current ? 'Concluído' : 'Pendente'}</small></p></div>)}</div>
    <div className="modal-actions"><button className="secondary-btn"><MessageSquare /> Abrir chat</button><button className="primary-btn"><ClipboardCheck /> Ver ordem completa</button></div>
  </article></div>
}

function MetricDetailsModal({ type, orders, appointments, onClose }: { type: Exclude<MetricModal, null>; orders: ServiceOrder[]; appointments: DashboardAppointment[]; onClose: () => void }) {
  const active = orders.filter(order => order.status !== 'Finalizado')
  const approvals = orders.filter(order => order.status === 'Orçamento')
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const averageTicket = orders.length ? revenue / orders.length : 0
  const config = {
    active: { title: 'Serviços ativos', subtitle: 'Ordens reais em andamento no Supabase', icon: <Wrench /> },
    approval: { title: 'Aguardando aprovação', subtitle: 'Orçamentos enviados ou pendentes de decisão', icon: <ClipboardCheck /> },
    appointments: { title: 'Agendamentos de hoje', subtitle: 'Agenda real cadastrada no banco de dados', icon: <CalendarDays /> },
    revenue: { title: 'Faturamento do mês', subtitle: 'Resumo calculado a partir dos orçamentos das ordens', icon: <CircleDollarSign /> },
  }[type]

  return <div className="modal-backdrop" onClick={onClose}>
    <article className="modal metric-modal" onClick={event => event.stopPropagation()}>
      <button className="icon-btn modal-close" onClick={onClose}><X /></button>
      <div className="metric-modal-title"><span>{config.icon}</span><div><span className="eyebrow">DADOS DO SUPABASE</span><h2>{config.title}</h2><p>{config.subtitle}</p></div></div>
      {type === 'active' && <div className="metric-detail-list">{active.map(order => <button key={order.id} className="metric-detail-row">
        <VehicleThumb order={order} /><strong>{order.code} · {order.customer}</strong><span>{order.vehicle} · {order.plate}</span><small>{order.status} · {order.progress}% · {order.mechanic}</small>
      </button>)}{active.length === 0 && <div className="empty">Nenhum serviço ativo agora.</div>}</div>}
      {type === 'approval' && <div className="metric-detail-list">{approvals.map(order => <button key={order.id} className="metric-detail-row">
        <VehicleThumb order={order} /><strong>{order.code} · {order.customer}</strong><span>{order.service}</span><small>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {order.vehicle}</small>
      </button>)}{approvals.length === 0 && <div className="empty">Nenhum orçamento aguardando aprovação.</div>}</div>}
      {type === 'appointments' && <div className="metric-detail-list">{appointments.map(item => <button key={item.id} className="metric-detail-row">
        <strong>{item.time} · {item.customer}</strong><span>{item.vehicle}</span><small>{item.description} · {item.status}</small>
      </button>)}{appointments.length === 0 && <div className="empty">Nenhum agendamento hoje.</div>}</div>}
      {type === 'revenue' && <div className="finance-breakdown">
        <article><span>Total em orçamentos</span><strong>{revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article>
        <article><span>Ordens consideradas</span><strong>{orders.length}</strong></article>
        <article><span>Ticket médio</span><strong>{averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article>
        <article><span>Em aprovação</span><strong>{approvals.reduce((sum, order) => sum + order.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article>
        <div className="metric-detail-list">{orders.map(order => <button key={order.id} className="metric-detail-row">
          <VehicleThumb order={order} /><strong>{order.code} · {order.customer}</strong><span>{order.service}</span><small>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {order.status}</small>
        </button>)}</div>
      </div>}
    </article>
  </div>
}

export function Dashboard({ profile, onLogout, onProfileChange }: Props) {
  const [active, setActive] = useState('Visão geral')
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
  const sourceOrders = remoteOrders.length ? remoteOrders : demoOrders
  const orders = useMemo(() => sourceOrders.filter(order => `${order.code} ${order.customer} ${order.vehicle} ${order.plate}`.toLowerCase().includes(query.toLowerCase())), [query, sourceOrders])
  const activeOrders = orders.filter(order => order.status !== 'Finalizado').length
  const pendingEstimates = orders.filter(order => order.status === 'Orçamento').length
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const nav = [
    ['Visão geral', LayoutDashboard], ['Agenda', CalendarDays], ['Ordens de serviço', FileText], ['Clientes', Users], ['Veículos', Car], ['Equipe', Wrench], ['Financeiro', CircleDollarSign], ['Configurações', Settings],
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
        vehicle: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}${vehicle.year ? ` ${vehicle.year}` : ''} · ${vehicle.plate ?? ''}`.trim() : 'Veículo',
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
        name: profileRow?.full_name ?? 'Mecânico',
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
      action('Foto do mecânico atualizada.')
    } catch (error) {
      action(error instanceof Error ? error.message : 'Não foi possível trocar a foto.')
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
      action(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.')
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
      .catch(error => { if (!ignore) setOrdersError(error.message ?? 'Não foi possível carregar ordens.') })
      .finally(() => { if (!ignore) setLoadingOrders(false) })
    loadAppointmentsToday().catch(() => undefined)
    return () => { ignore = true }
  }, [profile.userId, profile.workshopId])

  useEffect(() => { setOwnerName(profile.name); setWorkshopName(profile.workshopName) }, [profile.name, profile.workshopName])
  useEffect(() => { if (ownerProfileOpen) loadMechanics().catch(error => action(error.message ?? 'Não foi possível carregar mecânicos.')) }, [ownerProfileOpen])
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
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setMobileMenu(false); if (label !== 'Visão geral') action(`${label}: módulo em construção com Supabase.`) }}><Icon />{label}{label === 'Ordens de serviço' && <span className="nav-count">{orders.length}</span>}</button>)}</nav>
      <div className="support-card"><MessageSquare /><strong>Precisa de ajuda?</strong><span>Fale com nosso suporte</span><button onClick={() => action('Canal de suporte aberto.')}>Conversar</button></div>
      <button className="profile-block" onClick={() => setOwnerProfileOpen(true)}><span>{ownerName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span><p><strong>{ownerName}</strong><small>Perfil do dono</small></p><ChevronRight /></button>
      <button className="logout-block" onClick={onLogout}>Sair da conta</button>
    </aside>
    {mobileMenu && <div className="sidebar-shade" onClick={() => setMobileMenu(false)} />}
    <main className="dashboard">
      <header><button className="menu-btn" onClick={() => setMobileMenu(true)}><Menu /></button><div><strong>{workshopName}</strong><span>{remoteOrders.length ? 'Conectado ao Supabase' : 'Dados de demonstração'}</span></div><div className="header-actions"><label className="search"><Search /><input placeholder="Buscar OS, cliente, placa..." value={query} onChange={event => setQuery(event.target.value)} /></label><button className="icon-btn"><Bell /><i /></button><button className="primary-btn" onClick={() => action('Próximo passo: formulário real de nova OS no Supabase.')}><Plus /> Nova OS</button></div></header>
      <div className="content">
        <section className="welcome"><div><span className="eyebrow">PAINEL DA OFICINA</span><h1>Bom dia, {ownerName.split(' ')[0]}.</h1><p>{loadingOrders ? 'Carregando ordens do Supabase...' : <>A operação está em dia. Você tem <strong>{activeOrders} serviços ativos</strong> e <strong>{pendingEstimates} aprovações pendentes.</strong></>}{ordersError && <small> {ordersError}</small>}</p></div><button className="secondary-btn" onClick={() => action('Relatório diário preparado para exportação.')}><FileText /> Relatório do dia</button></section>
        <section className="metrics">
          <article className="metric-clickable" onClick={() => setMetricModal('active')}><span className="metric-icon green"><Wrench /></span><p>Serviços ativos<strong>{activeOrders}</strong><small>{remoteOrders.length ? 'Clique para ver as ordens reais' : 'Dados demonstrativos'}</small></p><div className="spark"><i/><i/><i/><i/><i/></div></article>
          <article className="metric-clickable" onClick={() => setMetricModal('approval')}><span className="metric-icon amber"><ClipboardCheck /></span><p>Aguardando aprovação<strong>{pendingEstimates}</strong><small>{orders.filter(order => order.status === 'Orçamento').reduce((sum, order) => sum + order.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em orçamentos</small></p></article>
          <article className="metric-clickable" onClick={() => setMetricModal('appointments')}><span className="metric-icon blue"><CalendarDays /></span><p>Agendamentos hoje<strong>{appointmentsToday.length}</strong><small>Clique para ver a agenda real</small></p></article>
          <article className="metric-clickable" onClick={() => setMetricModal('revenue')}><span className="metric-icon dark"><CircleDollarSign /></span><p>Faturamento no mês<strong>{revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><small>Baseado em orçamentos carregados</small></p></article>
        </section>
        <div className="dashboard-grid">
          <section className="panel orders-panel"><div className="panel-head"><div><h2>Ordens em andamento</h2><span>{remoteOrders.length ? 'Lendo do Supabase' : 'Fallback visual de demonstração'}</span></div><button onClick={() => action('Listagem completa disponível no módulo de OS.')}>Ver todas <ChevronRight /></button></div>
            <div className="table-wrap"><table><thead><tr><th>Ordem / Cliente</th><th>Veículo</th><th>Status</th><th>Progresso</th><th>Responsável</th><th></th></tr></thead><tbody>{orders.map(order => <tr key={order.id} onClick={() => setSelected(order)}><td><strong>{order.code}</strong><span>{order.customer}</span></td><td><div className="vehicle-cell"><VehicleThumb order={order} /><p><strong>{order.vehicle}</strong><span>{order.plate}</span></p></div></td><td><span className={`status ${statusClass[order.status]}`}>{order.status}</span></td><td><div className="progress"><i style={{ width: `${order.progress}%` }} /></div><small>{order.progress}%</small></td><td><span className="avatar">{order.mechanic.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>{order.mechanic}</td><td><ChevronRight /></td></tr>)}</tbody></table>{orders.length === 0 && <div className="empty">Nenhuma ordem encontrada.</div>}</div>
          </section>
          <aside className="panel agenda-panel"><div className="panel-head"><div><h2>Agenda de hoje</h2><span>{appointmentsToday.length} compromissos reais</span></div><button onClick={() => setMetricModal('appointments')}><Plus /></button></div>
            <div className="agenda-list">{appointmentsToday.slice(0, 4).map(item => <div key={item.id}><time>{item.time}</time><span className="agenda-line green"/><p><strong>{item.customer}</strong><span>{item.vehicle}</span><small>{item.description}</small></p></div>)}</div>
            <button className="agenda-footer" onClick={() => setMetricModal('appointments')}>Abrir agenda completa <ChevronRight /></button>
          </aside>
        </div>
      </div>
    </main>
    {selected && <OrderModal order={selected} onClose={() => setSelected(null)} />}
    {metricModal && <MetricDetailsModal type={metricModal} orders={orders} appointments={appointmentsToday} onClose={() => setMetricModal(null)} />}
    {ownerProfileOpen && <div className="modal-backdrop" onClick={() => setOwnerProfileOpen(false)}>
      <article className="modal owner-profile-modal" onClick={event => event.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={() => setOwnerProfileOpen(false)}><X /></button>
        <span className="eyebrow">PERFIL DO DONO</span><h2>Dados da oficina e equipe</h2><p>Edite seu nome, o nome da oficina e os perfis dos mecânicos. As alterações são salvas no Supabase.</p>
        <div className="owner-profile-grid"><label>Nome do dono<input value={ownerName} onChange={event => setOwnerName(event.target.value)} /></label><label>Nome da oficina<input value={workshopName} onChange={event => setWorkshopName(event.target.value)} /></label></div>
        <h3>Mecânicos</h3><div className="mechanics-editor">{mechanics.length === 0 && <div className="empty">Nenhum mecânico cadastrado nesta oficina.</div>}{mechanics.map((mechanic, index) => <div className="mechanic-edit-row" key={mechanic.id}><label className="mechanic-avatar-picker"><img src={mechanic.avatarUrl || defaultMechanicAvatar} alt={mechanic.name} /><input type="file" accept="image/*" onChange={event => changeMechanicAvatar(mechanic.id, event.target.files?.[0])} /><span>Trocar foto</span></label><label>Nome<input value={mechanic.name} onChange={event => setMechanics(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></label><label>Telefone<input value={mechanic.phone} onChange={event => setMechanics(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))} /></label><small>{mechanic.active ? 'Ativo' : 'Inativo'}</small></div>)}</div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setOwnerProfileOpen(false)}>Cancelar</button><button className="primary-btn" disabled={savingProfile} onClick={saveOwnerProfile}>{savingProfile ? 'Salvando...' : 'Salvar alterações'}</button></div>
      </article>
    </div>}
    {toast && <div className="toast"><Check />{toast}</div>}
  </div>
}
