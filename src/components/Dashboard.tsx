import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, Car, Check, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, LayoutDashboard, Menu, MessageSquare, Settings, Users, Wrench, X } from 'lucide-react'
import { fetchServiceOrders } from '../lib/serviceOrders'
import { supabase } from '../lib/supabase'
import { defaultMechanicAvatar, resolveAvatarUrl, uploadProfileAvatar } from '../lib/avatars'
import { vehicleImageForText } from '../lib/vehicles'
import { cancelRepairOrder } from '../lib/cancellations'
import type { ServiceOrder, ServiceStatus, UserProfile } from '../types'

interface Props { profile: UserProfile; onLogout: () => void; onProfileChange?: (profile: UserProfile) => void }
interface MechanicProfile { id: string; name: string; phone: string; active: boolean; avatarPath?: string | null; avatarUrl: string }
interface DashboardAppointment { id: string; time: string; customer: string; vehicle: string; description: string; status: string }
type MetricModal = 'active' | 'approval' | 'appointments' | 'revenue' | null

const statusClass: Record<ServiceStatus, string> = {
  Waiting: 'gray',
  Diagnosis: 'blue',
  Estimate: 'amber',
  'In Progress': 'green',
  Completed: 'dark',
  Cancelled: 'gray',
}

function VehicleThumb({ order }: { order: ServiceOrder }) {
  const image = order.vehicleImage || vehicleImageForText(order.vehicle, order.vehicleBodyType)
  return image
    ? <img className="vehicle-thumb" src={image} alt={order.vehicle} />
    : <span className="vehicle-thumb empty-thumb"><Car /></span>
}

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function OrderModal({ order, onClose, onCancel }: { order: ServiceOrder; onClose: () => void; onCancel: (order: ServiceOrder) => void }) {
  const steps = ['Vehicle intake', 'Initial checklist', 'Diagnosis', 'Estimate approval', 'Repair in progress', 'Delivery']
  const current = Math.max(1, Math.ceil(order.progress / 17))
  return <div className="modal-backdrop" onClick={onClose}><article className="modal" onClick={event => event.stopPropagation()}>
    <button className="icon-btn modal-close" onClick={onClose}><X /></button>
    <VehicleThumb order={order} />
    <span className="eyebrow">{order.code}</span><h2>{order.vehicle}</h2><p>{order.customer} · {order.plate}</p>
    <div className="order-summary"><div><span>Service</span><strong>{order.service}</strong></div><div><span>Assigned to</span><strong>{order.mechanic}</strong></div><div><span>Estimate</span><strong>{money(order.total)}</strong></div></div>
    <h3>Service stages</h3><div className="timeline">{steps.map((step, index) => <div className={index < current ? 'done' : ''} key={step}><span>{index < current ? <Check /> : index + 1}</span><p><strong>{step}</strong><small>{index < current ? 'Completed' : 'Pending'}</small></p></div>)}</div>
    <div className="modal-actions"><button className="secondary-btn"><MessageSquare /> Open chat</button><button className="secondary-btn danger-btn" onClick={() => onCancel(order)}><X /> Cancel appointment</button><button className="primary-btn"><ClipboardCheck /> View repair order</button></div>
  </article></div>
}

function MetricDetailsModal({ type, orders, appointments, onClose }: { type: Exclude<MetricModal, null>; orders: ServiceOrder[]; appointments: DashboardAppointment[]; onClose: () => void }) {
  const active = orders.filter(order => order.status !== 'Completed' && order.status !== 'Cancelled')
  const approvals = orders.filter(order => order.status === 'Estimate')
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const averageTicket = orders.length ? revenue / orders.length : 0
  const config = {
    active: { title: 'Active services', subtitle: 'Live repair orders from Supabase', icon: <Wrench /> },
    approval: { title: 'Waiting for approval', subtitle: 'Estimates sent or pending customer approval', icon: <ClipboardCheck /> },
    appointments: { title: "Today's appointments", subtitle: 'Live schedule from the database', icon: <CalendarDays /> },
    revenue: { title: 'Monthly revenue', subtitle: 'Summary calculated from repair order estimates', icon: <CircleDollarSign /> },
  }[type]

  return <div className="modal-backdrop" onClick={onClose}>
    <article className="modal metric-modal" onClick={event => event.stopPropagation()}>
      <button className="icon-btn modal-close" onClick={onClose}><X /></button>
      <div className="metric-modal-title"><span>{config.icon}</span><div><span className="eyebrow">LIVE DATA</span><h2>{config.title}</h2><p>{config.subtitle}</p></div></div>
      {type === 'active' && <div className="metric-detail-list">{active.map(order => <button key={order.id} className="metric-detail-row">
        <VehicleThumb order={order} /><strong>{order.code} · {order.customer}</strong><span>{order.vehicle} · {order.plate}</span><small>{order.status} · {order.progress}% · {order.mechanic}</small>
      </button>)}{active.length === 0 && <div className="empty">No active services right now.</div>}</div>}
      {type === 'approval' && <div className="metric-detail-list">{approvals.map(order => <button key={order.id} className="metric-detail-row">
        <VehicleThumb order={order} /><strong>{order.code} · {order.customer}</strong><span>{order.service}</span><small>{money(order.total)} · {order.vehicle}</small>
      </button>)}{approvals.length === 0 && <div className="empty">No estimates waiting for approval.</div>}</div>}
      {type === 'appointments' && <div className="metric-detail-list">{appointments.map(item => <button key={item.id} className="metric-detail-row">
        <strong>{item.time} · {item.customer}</strong><span>{item.vehicle}</span><small>{item.description} · {item.status}</small>
      </button>)}{appointments.length === 0 && <div className="empty">No appointments today.</div>}</div>}
      {type === 'revenue' && <div className="finance-breakdown">
        <article><span>Total estimates</span><strong>{money(revenue)}</strong></article>
        <article><span>Repair orders</span><strong>{orders.length}</strong></article>
        <article><span>Average ticket</span><strong>{money(averageTicket)}</strong></article>
        <article><span>Pending approval</span><strong>{money(approvals.reduce((sum, order) => sum + order.total, 0))}</strong></article>
        <div className="metric-detail-list">{orders.map(order => <button key={order.id} className="metric-detail-row">
          <VehicleThumb order={order} /><strong>{order.code} · {order.customer}</strong><span>{order.service}</span><small>{money(order.total)} · {order.status}</small>
        </button>)}</div>
      </div>}
    </article>
  </div>
}

export function Dashboard({ profile, onLogout, onProfileChange }: Props) {
  const [active, setActive] = useState('Overview')
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
  const orders = useMemo(() => remoteOrders.filter(order => `${order.code} ${order.customer} ${order.vehicle} ${order.plate}`.toLowerCase().includes(query.toLowerCase())), [query, remoteOrders])
  const activeOrders = orders.filter(order => order.status !== 'Completed' && order.status !== 'Cancelled').length
  const completedOrders = orders.filter(order => order.status === 'Completed').length
  const pendingEstimates = orders.filter(order => order.status === 'Estimate').length
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const averageTicket = orders.length ? revenue / orders.length : 0
  const nav = [
    ['Overview', LayoutDashboard], ['Schedule', CalendarDays], ['Repair Orders', FileText], ['Customers', Users], ['Vehicles', Car], ['Team', Wrench], ['Finance', CircleDollarSign], ['Settings', Settings],
  ] as const

  function action(message: string) { setToast(message); setTimeout(() => setToast(''), 2600) }

  async function cancelOrderAsOwner(order: ServiceOrder) {
    if (!confirm(`Cancel appointment ${order.code} for ${order.customer}?`)) return
    try {
      await cancelRepairOrder(order.id, 'Cancelled by shop owner.')
      setSelected(null)
      setRemoteOrders(await fetchServiceOrders(profile))
      await loadAppointmentsToday()
      action('Appointment cancelled. Customer was notified.')
    } catch (error) {
      action(error instanceof Error ? error.message : 'Could not cancel appointment.')
    }
  }

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
      .neq('status', 'cancelled')
      .order('scheduled_at')
    if (error) throw error
    setAppointmentsToday((data ?? []).map(item => {
      const customer = item.customers as { full_name?: string } | null
      const vehicle = item.vehicles as { make?: string; model?: string; year?: number | null; plate?: string } | null
      return {
        id: item.id,
        time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.scheduled_at)),
        customer: customer?.full_name ?? 'Customer',
        vehicle: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}${vehicle.year ? ` ${vehicle.year}` : ''} · ${vehicle.plate ?? ''}`.trim() : 'Vehicle',
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
        name: profileRow?.full_name ?? 'Mechanic',
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
      action('Mechanic photo updated.')
    } catch (error) {
      action(error instanceof Error ? error.message : 'Could not update the mechanic photo.')
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
      action('Profile and team updated in Supabase.')
      setOwnerProfileOpen(false)
    } catch (error) {
      action(error instanceof Error ? error.message : 'Could not save profile changes.')
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
      .catch(error => { if (!ignore) setOrdersError(error.message ?? 'Could not load repair orders.') })
      .finally(() => { if (!ignore) setLoadingOrders(false) })
    loadAppointmentsToday().catch(() => undefined)
    return () => { ignore = true }
  }, [profile.userId, profile.workshopId])

  useEffect(() => { setOwnerName(profile.name); setWorkshopName(profile.workshopName) }, [profile.name, profile.workshopName])
  useEffect(() => { if (ownerProfileOpen) loadMechanics().catch(error => action(error.message ?? 'Could not load mechanics.')) }, [ownerProfileOpen])
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders', filter: `workshop_id=eq.${profile.workshopId}` }, refreshOwnerData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.userId}` }, payload => {
        const notification = payload.new as { title?: string; body?: string }
        action(`${notification.title ?? 'Notification'}: ${notification.body ?? ''}`)
        refreshOwnerData()
      })
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile.userId, profile.workshopId, ownerProfileOpen])

  return <div className="app-shell">
    <aside className={mobileMenu ? 'sidebar open' : 'sidebar'}>
      <div className="brand jas-brand"><span className="brand-mark"><Wrench /></span><span><b>JAS</b> MOTORS</span></div>
      <button className="mobile-close" onClick={() => setMobileMenu(false)}><X /></button>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setMobileMenu(false); if (label !== 'Overview') action(`${label}: module connected to Supabase next.`) }}><Icon />{label}{label === 'Repair Orders' && <span className="nav-count">{orders.length}</span>}</button>)}</nav>
      <div className="support-card"><MessageSquare /><strong>Need help?</strong><span>Contact support</span><button onClick={() => action('Support channel opened.')}>Chat</button></div>
      <button className="profile-block" onClick={() => setOwnerProfileOpen(true)}><span>{ownerName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span><p><strong>{ownerName}</strong><small>Owner profile</small></p><ChevronRight /></button>
      <button className="logout-block" onClick={onLogout}>Log out</button>
    </aside>
    {mobileMenu && <div className="sidebar-shade" onClick={() => setMobileMenu(false)} />}
    <main className="dashboard owner-dashboard">
      <header className="owner-topbar"><button className="menu-btn" onClick={() => setMobileMenu(true)}><Menu /></button><div className="owner-title"><strong>Dashboard</strong><span>Shop overview</span></div><div className="owner-top-actions"><button className="icon-btn"><Bell /><i /></button><button className="icon-btn"><CalendarDays /></button><button className="owner-date"><CalendarDays />Today</button><button className="owner-user" onClick={() => setOwnerProfileOpen(true)}><span>{ownerName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span><p><strong>{ownerName}</strong><small>Owner / Administrator</small></p><ChevronRight /></button></div></header>
      <div className="content">
        <section className="owner-kpis">
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('revenue')}><span className="kpi-icon kpi-green"><CircleDollarSign /></span><p>Today's Revenue<strong>{money(revenue)}</strong><small>Live data</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('active')}><span className="kpi-icon kpi-blue"><ClipboardCheck /></span><p>Completed Services<strong>{completedOrders}</strong><small>Live data</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('active')}><span className="kpi-icon kpi-orange"><Wrench /></span><p>In Progress<strong>{activeOrders}</strong><small className="negative">Live data</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('appointments')}><span className="kpi-icon kpi-purple"><CalendarDays /></span><p>Today's Appointments<strong>{appointmentsToday.length}</strong><small>Live data</small></p></article>
          <article className="owner-kpi metric-clickable" onClick={() => setMetricModal('revenue')}><span className="kpi-icon kpi-gray"><CircleDollarSign /></span><p>Average Ticket<strong>{money(averageTicket)}</strong><small>Live data</small></p></article>
        </section>
        <section className="owner-main-grid">
          <article className="owner-card revenue-chart-card"><h2>Revenue - Last 7 Days</h2><div className="chart-area"><span>$6,000</span><span>$4,000</span><span>$2,000</span><svg viewBox="0 0 640 240" preserveAspectRatio="none"><defs><linearGradient id="jasLineFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ed111c" stopOpacity=".45"/><stop offset="100%" stopColor="#ed111c" stopOpacity="0"/></linearGradient></defs><path d="M30 180 L120 135 L210 158 L300 102 L390 124 L500 82 L610 45 L610 220 L30 220 Z" fill="url(#jasLineFill)" /><path d="M30 180 L120 135 L210 158 L300 102 L390 124 L500 82 L610 45" fill="none" stroke="#ed111c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="610" cy="45" r="8" fill="#ed111c"/></svg><strong>{money(revenue)}</strong><div className="chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div></div></article>
          <article className="owner-card status-donut-card"><h2>Services by Status</h2><div className="status-donut-wrap"><div className="status-donut"><strong>{orders.length}</strong><span>Total</span></div><ul><li><b className="dot done" />Completed <span>{completedOrders}</span></li><li><b className="dot progress-dot" />In Progress <span>{activeOrders}</span></li><li><b className="dot parts" />Waiting Parts <span>0</span></li><li><b className="dot approval" />Waiting Approval <span>{pendingEstimates}</span></li></ul></div></article>
          <article className="owner-card next-appointments-card"><div className="owner-card-head"><h2>Upcoming Appointments</h2><button onClick={() => setMetricModal('appointments')}>View all</button></div><div className="next-appointments-list">{appointmentsToday.slice(0, 5).map(item => <button key={item.id} onClick={() => setMetricModal('appointments')}><time>{item.time}</time><strong>{item.vehicle}</strong><span>{item.customer}</span><em className={item.status === 'in_service' ? 'hot' : ''}>{item.status}</em></button>)}{appointmentsToday.length === 0 && <div className="empty">No appointments yet.</div>}</div></article>
        </section>
        <section className="owner-lower-grid">
          <div className="owner-alerts">{appointmentsToday[0] ? <article className="owner-alert success"><Check /><p><strong>New Appointment</strong><span>{appointmentsToday[0].customer} scheduled {appointmentsToday[0].description}.</span></p><small>Now</small></article> : <article className="owner-alert blue"><Wrench /><p><strong>Clean workspace</strong><span>Ready for the first live tests.</span></p><small>Now</small></article>}</div>
          <section className="owner-card orders-panel"><div className="owner-card-head"><h2>Active Repair Orders</h2><button onClick={() => action('Full repair order list will open here.')}>View all</button></div>
            <div className="table-wrap"><table><thead><tr><th>Order</th><th>Vehicle</th><th>Customer</th><th>Mechanic</th><th>Status</th></tr></thead><tbody>{orders.slice(0, 4).map(order => <tr key={order.id} onClick={() => setSelected(order)}><td><strong>{order.code}</strong></td><td><div className="vehicle-cell"><VehicleThumb order={order} /><p><strong>{order.vehicle}</strong><span>{order.plate}</span></p></div></td><td>{order.customer}</td><td>{order.mechanic}</td><td><span className={`status ${statusClass[order.status]}`}>{order.status}</span></td></tr>)}</tbody></table>{orders.length === 0 && <div className="empty">No repair orders found.</div>}</div>
          </section>
          <article className="owner-card finance-summary"><div className="owner-card-head"><h2>Finance Summary</h2><button>This Month</button></div><div className="finance-values"><p><span>Total Revenue</span><strong>{money(revenue)}</strong></p><p><span>Expenses</span><strong>$0.00</strong></p><p><span>Net Profit</span><strong>{money(revenue)}</strong></p></div><div className="mini-bars">{Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ height: `${orders.length ? 20 + ((index * 17) % 72) : 4}%` }} />)}</div></article>
          <aside className="privacy-card normal"><span><CircleDollarSign /></span><p><strong>Normal Mode</strong><small>Click to hide values</small></p></aside>
        </section>
      </div>
    </main>
    {selected && <OrderModal order={selected} onClose={() => setSelected(null)} onCancel={cancelOrderAsOwner} />}
    {metricModal && <MetricDetailsModal type={metricModal} orders={orders} appointments={appointmentsToday} onClose={() => setMetricModal(null)} />}
    {ownerProfileOpen && <div className="modal-backdrop" onClick={() => setOwnerProfileOpen(false)}>
      <article className="modal owner-profile-modal" onClick={event => event.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={() => setOwnerProfileOpen(false)}><X /></button>
        <span className="eyebrow">OWNER PROFILE</span><h2>Shop and team settings</h2><p>Edit the owner name, shop name, and mechanic profiles. Changes are saved to Supabase.</p>
        <div className="owner-profile-grid"><label>Owner name<input value={ownerName} onChange={event => setOwnerName(event.target.value)} /></label><label>Shop name<input value={workshopName} onChange={event => setWorkshopName(event.target.value)} /></label></div>
        <h3>Mechanics</h3><div className="mechanics-editor">{mechanics.length === 0 && <div className="empty">No mechanics registered for this shop.</div>}{mechanics.map((mechanic, index) => <div className="mechanic-edit-row" key={mechanic.id}><label className="mechanic-avatar-picker"><img src={mechanic.avatarUrl || defaultMechanicAvatar} alt={mechanic.name} /><input type="file" accept="image/*" onChange={event => changeMechanicAvatar(mechanic.id, event.target.files?.[0])} /><span>Change photo</span></label><label>Name<input value={mechanic.name} onChange={event => setMechanics(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></label><label>Phone<input value={mechanic.phone} onChange={event => setMechanics(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))} /></label><small>{mechanic.active ? 'Active' : 'Inactive'}</small></div>)}</div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setOwnerProfileOpen(false)}>Cancel</button><button className="primary-btn" disabled={savingProfile} onClick={saveOwnerProfile}>{savingProfile ? 'Saving...' : 'Save changes'}</button></div>
      </article>
    </div>}
    {toast && <div className="toast"><Check />{toast}</div>}
    {ordersError && <div className="toast"><X />{ordersError}</div>}
    {loadingOrders && <div className="toast"><Check />Loading repair orders...</div>}
  </div>
}
