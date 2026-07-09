import { useEffect, useState } from 'react'
import { Bell, CalendarDays, Camera, Car, Check, ChevronRight, ClipboardCheck, Clock3, FileText, Gauge, History, Home, LogOut, MessageCircle, Plus, ReceiptText, Send, Settings2, UserRound, Wrench } from 'lucide-react'
import { defaultMechanicAvatar, resolveAvatarUrl, uploadProfileAvatar } from '../lib/avatars'
import { fetchServiceOrders, updateServiceOrderStatus } from '../lib/serviceOrders'
import { supabase } from '../lib/supabase'
import { workshopSchedulingConfig } from '../config/workshop'
import { OTHER_VEHICLE_MAKE, OTHER_VEHICLE_MODEL, VEHICLES, VEHICLE_MAKE_OPTIONS, findVehicleModel, vehicleImageForText } from '../lib/vehicles'
import { cancelRepairOrder } from '../lib/cancellations'
import { deleteCustomerVehicle, fetchCustomerVehicles, saveCustomerVehicle, type CustomerVehicle } from '../lib/customerVehicles'
import { fetchCustomerProfile, updateCustomerProfile, type CustomerProfileSettings } from '../lib/customerProfile'
import { fetchOrderChatMessages, sendOrderChatMessage, uploadOrderChatPhoto, type OrderChatMessage } from '../lib/orderChat'
import { decideEstimate, fetchLatestEstimate, sendRepairEstimate, type EstimateItemInput, type RepairEstimate } from '../lib/estimates'
import type { ServiceOrder, ServiceStatus, UserProfile } from '../types'

interface Props { profile: UserProfile; onLogout: () => void; onProfileChange?: (profile: UserProfile) => void }

function RoleHeader({ profile, onLogout, title }: Props & { title: string }) {
  return <header className="role-header"><div className="role-logo jas-brand"><span className="brand-mark"><Wrench /></span><div><strong><b>JAS</b> MOTORS</strong><small>{profile.workshopName}</small></div></div><span className="role-title">{title}</span><div className="role-head-actions"><button><Bell /><i /></button><button onClick={onLogout} title="Log out"><LogOut /></button></div></header>
}

function Toast({ text }: { text: string }) { return text ? <div className="toast"><Check />{text}</div> : null }

function OrderVehicleImage({ order, className = 'vehicle-thumb' }: { order: ServiceOrder; className?: string }) {
  return <img className={className} src={vehicleImageForText(order.vehicle, order.vehicleBodyType, order.vehicleImage)} alt={order.vehicle} />
}

export function MechanicDashboard({ profile, onLogout }: Props) {
  const [remoteOrders, setRemoteOrders] = useState<ServiceOrder[]>([])
  const [selected, setSelected] = useState<ServiceOrder | null>(null)
  const [toast, setToast] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(defaultMechanicAvatar)
  const [view, setView] = useState<'services' | 'chat' | 'estimate'>('services')
  const tasks = remoteOrders.filter(order => order.status !== 'Completed' && order.status !== 'Cancelled')
  const mechanicSteps: { label: string; status: ServiceStatus }[] = [
    { label: 'Arrived', status: 'Waiting' },
    { label: 'Evaluation', status: 'Diagnosis' },
    { label: 'Waiting Approval', status: 'Estimate' },
    { label: 'In Progress', status: 'In Progress' },
    { label: 'Ready', status: 'Ready' },
  ]
  const selectedStepIndex = selected ? mechanicSteps.findIndex(step => step.status === selected.status) : -1
  function action(text: string) { setToast(text); setTimeout(() => setToast(''), 2300) }

  async function refreshOrders(keepOrderId?: string) {
    const items = await fetchServiceOrders(profile)
    setRemoteOrders(items)
    setSelected(current => items.find(item => item.id === (keepOrderId ?? current?.id)) ?? items.find(item => item.status !== 'Completed' && item.status !== 'Cancelled') ?? null)
    return items
  }

  async function changeSelectedStatus(nextStatus: ServiceStatus) {
    if (!selected || savingStatus || selected.status === nextStatus) return
    setSavingStatus(true)
    try {
      await updateServiceOrderStatus(profile, selected, nextStatus)
      setRemoteOrders(current => current.map(order => order.id === selected.id ? { ...order, status: nextStatus } : order))
      setSelected(current => current ? { ...current, status: nextStatus } : current)
      await refreshOrders(selected.id)
      action(`Status saved: ${nextStatus}.`)
    } catch (error) {
      action(error instanceof Error ? error.message : 'Could not update service status.')
    } finally {
      setSavingStatus(false)
    }
  }

  async function cancelSelectedOrder() {
    if (!selected) return
    if (!confirm(`Cancel service ${selected.code} for ${selected.customer}?`)) return
    try {
      await cancelRepairOrder(selected.id, 'Cancelled by mechanic.')
      await refreshOrders()
      action('Service cancelled. Owner and customer were notified.')
      setView('services')
    } catch (error) {
      action(error instanceof Error ? error.message : 'Could not cancel service.')
    }
  }

  async function changeOwnAvatar(file?: File) {
    if (!file || !profile.userId) return
    try {
      const path = await uploadProfileAvatar(profile.userId, file)
      setAvatarUrl(await resolveAvatarUrl(path))
      action('Your photo was updated.')
    } catch (error) {
      action(error instanceof Error ? error.message : 'Could not update your photo.')
    }
  }

  useEffect(() => {
    if (!supabase || !profile.userId) return
    async function loadAvatar() {
      try {
        const { data } = await supabase!.from('profiles').select('avatar_path').eq('id', profile.userId).maybeSingle()
        setAvatarUrl(await resolveAvatarUrl(data?.avatar_path))
      } catch {
        setAvatarUrl(defaultMechanicAvatar)
      }
    }
    loadAvatar()
  }, [profile.userId])

  useEffect(() => {
    if (!supabase || !profile.workshopId) return
    const loadOrders = () => refreshOrders().catch(() => undefined)
    loadOrders()
    const client = supabase
    const channel = client
      .channel(`mechanic-orders-${profile.userId}-${profile.workshopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders', filter: `workshop_id=eq.${profile.workshopId}` }, loadOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_assignments', filter: `workshop_id=eq.${profile.workshopId}` }, loadOrders)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.userId}` }, payload => {
        const notification = payload.new as { title?: string; body?: string }
        action(`${notification.title ?? 'Notification'}: ${notification.body ?? ''}`)
        loadOrders()
      })
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile.userId, profile.workshopId])

  return <div className="role-app mechanic-app">
    <RoleHeader profile={profile} onLogout={onLogout} title="Mechanic Area" />
    <main className="role-content">
      {view === 'chat' ? <OrderChatView profile={profile} orders={tasks} activeOrder={selected} audience="staff" onBack={() => setView('services')} /> : view === 'estimate' && selected ? <EstimateComposer order={selected} onBack={() => setView('services')} onSent={async () => { const items = await fetchServiceOrders(profile); setRemoteOrders(items); setSelected(items.find(item => item.id === selected.id) ?? selected); setView('services'); action('Estimate sent to the customer.') }} /> : <>
      <section className="role-welcome">
        <div className="mechanic-profile-hero">
          <label className="mechanic-self-avatar"><img src={avatarUrl} alt={profile.name} /><input type="file" accept="image/*" onChange={event => changeOwnAvatar(event.target.files?.[0])} /><span>Change photo</span></label>
          <div><span className="eyebrow">TODAY'S WORKFLOW</span><h1>Good morning, {profile.name.split(' ')[0]}.</h1><p>Update each service stage to keep the shop and customer informed.</p></div>
        </div>
        <button className="primary-btn" onClick={() => action('New service request sent to the owner.')}><Plus /> New service</button>
      </section>
      <section className="mechanic-stats"><article><CalendarDays /><div><strong>{tasks.length}</strong><span>Appointments today</span></div></article><article><Wrench /><div><strong>{tasks.filter(order => order.status === 'In Progress').length}</strong><span>In progress</span></div></article><article><Clock3 /><div><strong>{tasks.filter(order => order.status === 'Estimate').length}</strong><span>Waiting approval</span></div></article></section>
      <div className="mechanic-grid">
        <section className="role-panel task-list"><div className="role-panel-head"><div><h2>My schedule</h2><span>Services assigned to you</span></div><div className="tabs"><button className="active">Today</button><button>Completed</button></div></div>{tasks.map((order, index) => <button key={order.id} className={selected?.id === order.id ? 'task active' : 'task'} onClick={() => setSelected(order)}><time>{['08:30','10:00','11:30'][index] ?? '--:--'}</time><span className="task-car"><OrderVehicleImage order={order} className="task-car-image" /></span><p><strong>{order.vehicle}</strong><span>{order.customer} · {order.service}</span><small className={`tag tag-${index}`}>{order.status}</small></p><ChevronRight /></button>)}{tasks.length === 0 && <div className="empty">No assigned services yet.</div>}</section>
        {selected ? <section className="role-panel service-detail"><div className="service-hero"><div><span className="eyebrow">SERVICE IN PROGRESS</span><h2>{selected.vehicle}</h2><p>{selected.plate} · {selected.customer}</p></div><span className="big-car"><OrderVehicleImage order={selected} className="big-car-image" /></span></div>
          <div className="service-meta"><div><span>Service</span><strong>{selected.service}</strong></div><div><span>Order</span><strong>{selected.code}</strong></div><div><span>ETA</span><strong>Today, 5:30 PM</strong></div></div>
          <div className="status-steps">{mechanicSteps.map((step, index) => {
            const isActive = selected.status === step.status
            const isDone = selectedStepIndex > index
            return <button key={step.label} disabled={savingStatus} className={`${isActive ? 'active' : isDone ? 'done' : ''} ${isActive && step.status === 'Ready' ? 'ready' : ''}`} onClick={() => changeSelectedStatus(step.status)}><span>{isDone ? <Check /> : index + 1}</span><small>{step.label}</small></button>
          })}</div>
          <label className="notes-label">Comments / notes<textarea defaultValue="Vehicle is under evaluation. Add service notes here." /></label>
          <div className="photo-strip"><button onClick={() => action('Camera ready to attach a photo.')}><Camera /><span>Add photo</span></button><span><Wrench /></span><span><Gauge /></span><span><Car /></span></div>
          <div className="stacked-actions"><button className="primary-btn full" onClick={() => action('Update sent to the customer.')}><Send /> Send update</button><button className="secondary-btn full" onClick={() => setView('estimate')}><ReceiptText /> Send estimate</button><button className="secondary-btn full" onClick={() => setView('chat')}><MessageCircle /> Chat with customer</button><button className="secondary-btn danger-btn full" onClick={cancelSelectedOrder}>Cancel service</button></div>
        </section> : <section className="role-panel service-detail"><div className="empty">Waiting for the first customer appointment.</div></section>}
      </div>
      </>}
    </main>
    <nav className="role-bottom-nav"><button className={view === 'services' ? 'active' : ''} onClick={() => setView('services')}><Home />Home</button><button><CalendarDays />Schedule</button><button className="nav-main"><Plus /></button><button className={view === 'chat' ? 'active' : ''} onClick={() => setView('chat')}><MessageCircle />Messages</button><button><UserRound />Profile</button></nav><Toast text={toast} />
  </div>
}

export function CustomerDashboard({ profile, onLogout, onProfileChange }: Props) {
  const [toast, setToast] = useState('')
  const [view, setView] = useState<'home' | 'booking' | 'history' | 'vehicles' | 'profile' | 'messages' | 'estimate'>('home')
  const [remoteOrders, setRemoteOrders] = useState<ServiceOrder[]>([])
  const [customerVehicles, setCustomerVehicles] = useState<CustomerVehicle[]>([])
  const [customerSettings, setCustomerSettings] = useState<CustomerProfileSettings | null>(null)
  const activeOrder = remoteOrders.find(order => order.status !== 'Completed' && order.status !== 'Cancelled') ?? null
  function action(text: string) { setToast(text); setTimeout(() => setToast(''), 2300) }
  const loadCustomerOrders = () => fetchServiceOrders(profile).then(setRemoteOrders).catch(() => undefined)
  const loadCustomerVehicles = () => fetchCustomerVehicles().then(setCustomerVehicles).catch(error => action(error.message ?? 'Could not load vehicles.'))
  const loadCustomerProfile = () => fetchCustomerProfile().then(setCustomerSettings).catch(error => action(error.message ?? 'Could not load profile.'))

  useEffect(() => {
    if (!supabase || !profile.workshopId) return
    loadCustomerOrders()
    loadCustomerVehicles()
    loadCustomerProfile()
    const client = supabase
    const channel = client
      .channel(`customer-orders-${profile.userId}-${profile.workshopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders', filter: `workshop_id=eq.${profile.workshopId}` }, loadCustomerOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `workshop_id=eq.${profile.workshopId}` }, loadCustomerOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: `workshop_id=eq.${profile.workshopId}` }, () => { loadCustomerVehicles(); loadCustomerOrders() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.userId}` }, () => { loadCustomerProfile() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.userId}` }, payload => {
        const notification = payload.new as { title?: string; body?: string }
        action(`${notification.title ?? 'Notification'}: ${notification.body ?? ''}`)
        loadCustomerOrders()
        loadCustomerVehicles()
      })
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile.userId, profile.workshopId])

  return <div className="role-app customer-app">
    <RoleHeader profile={profile} onLogout={onLogout} title="Customer Area" />
    <main className="role-content customer-content">
      <section className="customer-hero"><div><span className="eyebrow">WELCOME TO YOUR GARAGE</span><h1>Hello, {profile.name.split(' ')[0]}.</h1><p>Track your vehicle and schedule services without calling the shop.</p><button className="primary-btn" onClick={() => setView('booking')}><CalendarDays /> Schedule service</button></div><button type="button" className="vehicle-card vehicle-card-button" onClick={() => setView('vehicles')}><span className="vehicle-art">{activeOrder ? <OrderVehicleImage order={activeOrder} className="vehicle-art-image" /> : customerVehicles[0] ? <img className="vehicle-art-image" src={customerVehicles[0].imageUrl} alt={`${customerVehicles[0].make} ${customerVehicles[0].model}`} /> : <Car />}</span><p><small>{activeOrder ? 'ACTIVE VEHICLE' : customerVehicles.length ? 'MY GARAGE' : 'FIRST STEP'}</small><strong>{activeOrder?.vehicle ?? (customerVehicles[0] ? `${customerVehicles[0].make} ${customerVehicles[0].model}` : 'Add your vehicle')}</strong><span>{activeOrder ? `${activeOrder.plate} · ${activeOrder.status}` : customerVehicles.length ? `${customerVehicles.length} vehicle${customerVehicles.length === 1 ? '' : 's'} saved` : 'Create your garage before scheduling'}</span></p><ChevronRight /></button></section>
      {view === 'booking' ? <Booking profile={profile} vehicles={customerVehicles} onBack={() => setView('home')} onConfirm={() => { loadCustomerVehicles(); loadCustomerOrders(); setView('home'); action('Appointment sent to the shop. Owner and mechanic can see it now.') }} /> : view === 'history' ? <HistoryView orders={remoteOrders} vehicles={customerVehicles} onBack={() => setView('home')} onSchedule={() => setView('booking')} /> : view === 'vehicles' ? <MyVehicles vehicles={customerVehicles} onBack={() => setView('home')} onChanged={async message => { await loadCustomerVehicles(); await loadCustomerOrders(); action(message) }} /> : view === 'profile' ? <CustomerProfileView profile={profile} settings={customerSettings} onBack={() => setView('home')} onSaved={settings => { setCustomerSettings(settings); onProfileChange?.({ ...profile, name: settings.fullName || profile.name }); action('Profile updated.') }} /> : view === 'messages' ? <OrderChatView profile={profile} orders={remoteOrders} activeOrder={activeOrder} onBack={() => setView('home')} onSchedule={() => setView('booking')} /> : view === 'estimate' && activeOrder ? <EstimateDecisionView order={activeOrder} onBack={() => setView('home')} onDecided={async message => { setRemoteOrders(await fetchServiceOrders(profile)); setView('home'); action(message) }} /> : <>
        <section className="customer-grid"><article className="role-panel live-service">{activeOrder ? <><div className="role-panel-head"><div><span className="eyebrow">REAL-TIME SERVICE TRACKING</span><h2>{activeOrder.service}</h2><p>{activeOrder.code} · {activeOrder.vehicle}</p></div><span className="status green">{activeOrder.status}</span></div><div className="customer-timeline">{['Appointment created','Vehicle received','Checklist and diagnosis','Service in progress','Ready for pickup'].map((step,index) => <div className={index === 0 ? 'done' : ''} key={step}><span>{index === 0 ? <Check /> : index + 1}</span><p><strong>{step}</strong><small>{index === 0 ? 'Now' : 'Pending'}</small></p></div>)}</div><div className="live-actions"><button className="secondary-btn" onClick={() => setView('messages')}><MessageCircle /> Message the shop</button><button className="secondary-btn danger-btn" onClick={async () => { if (!confirm(`Cancel appointment ${activeOrder.code}?`)) return; try { await cancelRepairOrder(activeOrder.id, 'Cancelled by customer.'); setRemoteOrders(await fetchServiceOrders(profile)); action('Appointment cancelled. The shop was notified.') } catch (error) { action(error instanceof Error ? error.message : 'Could not cancel appointment.') } }}>Cancel appointment</button><button className="primary-btn" onClick={() => action('Repair order details loaded.')}><FileText /> View details</button></div></> : <div className="empty">No service created yet. Click Schedule service to begin.</div>}</article>
          <aside className="customer-side"><article className="role-panel estimate-card"><ReceiptText /><span>{activeOrder ? 'Repair order estimate' : 'No estimate'}</span><strong>{activeOrder ? activeOrder.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00'}</strong><small>{activeOrder ? activeOrder.status : 'Waiting for first service'}</small><button onClick={() => activeOrder ? setView('estimate') : action('No estimate created yet.')}>View estimate <ChevronRight /></button></article><article className="role-panel quick-card"><h2>Quick access</h2><button onClick={() => setView('vehicles')}><Car />My vehicles<ChevronRight /></button><button onClick={() => setView('history')}><History />Vehicle history<ChevronRight /></button><button onClick={() => action('Vehicle documents loaded.')}><ClipboardCheck />Documents and checklists<ChevronRight /></button><button onClick={() => setView('profile')}><Settings2 />Profile settings<ChevronRight /></button></article></aside>
        </section>
        <section className="role-panel next-care"><div><span className="eyebrow">NEXT CARE</span><h2>{activeOrder ? 'Track the next service steps' : 'No service scheduled yet'}</h2><p>{activeOrder ? 'The shop updates the status in real time.' : 'Create the first appointment to start the vehicle history.'}</p></div><Gauge /><button className="secondary-btn" onClick={() => setView('booking')}>Schedule now</button></section>
      </>}
    </main>
    <nav className="role-bottom-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Home />Home</button><button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}><CalendarDays />Schedule</button><button className={view === 'vehicles' ? 'active' : ''} onClick={() => setView('vehicles')}><Car />Vehicles</button><button className={view === 'messages' ? 'active' : ''} onClick={() => setView('messages')}><MessageCircle />Messages</button><button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}><UserRound />Profile</button></nav><Toast text={toast} />
  </div>
}

function EstimateComposer({ order, onBack, onSent }: { order: ServiceOrder; onBack: () => void; onSent: () => Promise<void> }) {
  const [items, setItems] = useState<EstimateItemInput[]>([
    { kind: 'part', description: 'Parts', quantity: 1, unitPrice: 0 },
    { kind: 'labor', description: 'Labor', quantity: 1, unitPrice: 0 },
  ])
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
  const total = Math.max(0, subtotal - (Number(discount) || 0))

  function updateItem(index: number, patch: Partial<EstimateItemInput>) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  async function submitEstimate() {
    setSaving(true)
    setError('')
    try {
      const cleanItems = items
        .map(item => ({ ...item, description: item.description.trim(), quantity: Number(item.quantity) || 1, unitPrice: Number(item.unitPrice) || 0 }))
        .filter(item => item.description && item.unitPrice > 0)
      await sendRepairEstimate({ serviceOrderId: order.id, items: cleanItems, notes, discount })
      await onSent()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not send estimate.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="role-panel estimate-composer">
    <button className="back-link" onClick={onBack}>Back</button>
    <span className="eyebrow">SEND ESTIMATE</span>
    <h1>{order.vehicle}</h1>
    <p>{order.code} · {order.customer} · {order.service}</p>
    <div className="estimate-line-items">
      {items.map((item, index) => <article key={index} className="estimate-line-item">
        <label>Type<select value={item.kind} onChange={event => updateItem(index, { kind: event.target.value as EstimateItemInput['kind'] })}><option value="part">Part</option><option value="labor">Labor</option><option value="other">Other</option></select></label>
        <label className="wide">Description<input value={item.description} onChange={event => updateItem(index, { description: event.target.value })} placeholder="Brake pads, diagnostic labor..." /></label>
        <label>Qty<input type="number" min="0.01" step="0.01" value={item.quantity} onChange={event => updateItem(index, { quantity: Number(event.target.value) })} /></label>
        <label>Unit price<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={event => updateItem(index, { unitPrice: Number(event.target.value) })} /></label>
        <button className="secondary-btn danger-btn" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
      </article>)}
    </div>
    <button className="secondary-btn" onClick={() => setItems(current => [...current, { kind: 'other', description: '', quantity: 1, unitPrice: 0 }])}><Plus /> Add item</button>
    <div className="booking-form estimate-notes">
      <label className="wide">Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Explain what is included in this estimate..." /></label>
      <label>Discount<input type="number" min="0" step="0.01" value={discount} onChange={event => setDiscount(Number(event.target.value))} /></label>
    </div>
    <div className="estimate-total-box"><span>Subtotal <strong>{subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></span><span>Total <strong>{total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></span></div>
    {error && <div className="form-message">{error}</div>}
    <div className="modal-actions"><button className="secondary-btn" onClick={onBack}>Cancel</button><button className="primary-btn" disabled={saving || total <= 0} onClick={submitEstimate}>{saving ? 'Sending...' : 'Send estimate to customer'}</button></div>
  </section>
}

function EstimateDecisionView({ order, onBack, onDecided }: { order: ServiceOrder; onBack: () => void; onDecided: (message: string) => Promise<void> }) {
  const [estimate, setEstimate] = useState<RepairEstimate | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    fetchLatestEstimate(order.id)
      .then(item => { if (!ignore) setEstimate(item) })
      .catch(error => { if (!ignore) setError(error.message ?? 'Could not load estimate.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [order.id])

  async function decide(approve: boolean) {
    if (!estimate) return
    setSaving(true)
    setError('')
    try {
      await decideEstimate(estimate.id, approve, note)
      await onDecided(approve ? 'Estimate approved. The shop was notified.' : 'Estimate rejected. The shop was notified.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update estimate.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="role-panel estimate-decision">
    <button className="back-link" onClick={onBack}>Back</button>
    <span className="eyebrow">REPAIR ESTIMATE</span>
    <h1>{order.vehicle}</h1>
    <p>{order.code} · {order.service}</p>
    {loading && <div className="empty">Loading estimate...</div>}
    {!loading && !estimate && <div className="empty">No estimate has been sent yet.</div>}
    {estimate && <>
      <div className="estimate-review-head"><span className={`status ${estimate.status === 'approved' ? 'green' : estimate.status === 'rejected' ? 'gray' : 'amber'}`}>{estimate.status}</span><strong>{estimate.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></div>
      <div className="estimate-review-items">{estimate.items.map(item => <article key={item.id}><div><strong>{item.description}</strong><span>{item.kind} · Qty {item.quantity}</span></div><span>{item.unitPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span><strong>{item.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></article>)}</div>
      <div className="estimate-total-box"><span>Subtotal <strong>{estimate.subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></span><span>Discount <strong>{estimate.discount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></span><span>Total <strong>{estimate.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></span></div>
      {estimate.notes && <article className="estimate-notes-card"><h3>Shop notes</h3><p>{estimate.notes}</p></article>}
      {estimate.status === 'sent' ? <><label className="notes-label estimate-decision-note">Decision note<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Optional message to the shop..." /></label><div className="modal-actions"><button className="secondary-btn danger-btn" disabled={saving} onClick={() => decide(false)}>Reject estimate</button><button className="primary-btn" disabled={saving} onClick={() => decide(true)}>{saving ? 'Saving...' : 'Approve estimate'}</button></div></> : <div className="form-message">This estimate was already {estimate.status}.</div>}
    </>}
    {error && <div className="form-message">{error}</div>}
  </section>
}

function OrderChatView({ profile, orders, activeOrder, onBack, onSchedule, audience = 'customer' }: { profile: UserProfile; orders: ServiceOrder[]; activeOrder: ServiceOrder | null; onBack: () => void; onSchedule?: () => void; audience?: 'customer' | 'staff' }) {
  const chatOrders = orders.filter(order => order.status !== 'Cancelled')
  const [selectedOrderId, setSelectedOrderId] = useState(activeOrder?.id ?? chatOrders[0]?.id ?? '')
  const [messages, setMessages] = useState<OrderChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const selectedOrder = chatOrders.find(order => order.id === selectedOrderId) ?? null
  const ownAvatar = audience === 'staff' ? defaultMechanicAvatar : '/customer-avatar.svg'
  const otherAvatar = audience === 'staff' ? '/customer-avatar.svg' : defaultMechanicAvatar
  const otherLabel = audience === 'staff' ? 'Customer' : 'Shop'

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('')
      return
    }
    const nextPreview = URL.createObjectURL(photoFile)
    setPhotoPreview(nextPreview)
    return () => URL.revokeObjectURL(nextPreview)
  }, [photoFile])

  useEffect(() => {
    if (!selectedOrderId && chatOrders[0]) setSelectedOrderId(chatOrders[0].id)
  }, [selectedOrderId, chatOrders])

  useEffect(() => {
    if (!supabase || !selectedOrderId) return
    let ignore = false
    const loadMessages = () => {
      setLoading(true)
      fetchOrderChatMessages(selectedOrderId, profile.userId)
        .then(items => { if (!ignore) setMessages(items) })
        .catch(error => { if (!ignore) setError(error.message ?? 'Could not load messages.') })
        .finally(() => { if (!ignore) setLoading(false) })
    }
    loadMessages()
    const client = supabase
    const channel = client
      .channel(`order-chat-${selectedOrderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `service_order_id=eq.${selectedOrderId}` }, loadMessages)
      .subscribe()
    return () => {
      ignore = true
      client.removeChannel(channel)
    }
  }, [selectedOrderId, profile.userId])

  async function sendMessage() {
    const body = draft.trim()
    if (!selectedOrder || (!body && !photoFile)) return
    if (photoFile && !profile.userId) {
      setError('User profile is not ready for photo upload.')
      return
    }
    setSending(true)
    setError('')
    try {
      const attachmentPath = photoFile ? await uploadOrderChatPhoto(selectedOrder.id, profile.userId!, photoFile) : null
      await sendOrderChatMessage(selectedOrder.id, body || 'Photo', attachmentPath)
      setDraft('')
      setPhotoFile(null)
      setMessages(await fetchOrderChatMessages(selectedOrder.id, profile.userId))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  if (!chatOrders.length) {
    return <section className="role-panel chat-view">
      <button className="back-link" onClick={onBack}>Back</button>
      <span className="eyebrow">MESSAGES</span>
      <h1>Chat with the shop</h1>
      <div className="empty chat-empty"><MessageCircle /><strong>No repair order yet.</strong><p>{audience === 'staff' ? 'No assigned service is available for chat.' : 'Schedule a service to start messaging the shop.'}</p>{onSchedule && <button className="primary-btn" onClick={onSchedule}><CalendarDays /> Schedule service</button>}</div>
    </section>
  }

  return <section className="role-panel chat-view">
    <div className="history-head"><button className="back-link" onClick={onBack}>Back</button>{selectedOrder && <span className="status green">{selectedOrder.status}</span>}</div>
    <span className="eyebrow">MESSAGES</span>
    <h1>Chat with the shop</h1>
    <p>Messages are saved inside the repair order and update in real time.</p>
    <div className="chat-layout">
      <aside className="chat-orders">
        {chatOrders.map(order => <button key={order.id} className={selectedOrderId === order.id ? 'active' : ''} onClick={() => setSelectedOrderId(order.id)}>
          <OrderVehicleImage order={order} className="chat-order-image" />
          <span><strong>{order.code}</strong><small>{order.vehicle}</small></span>
        </button>)}
      </aside>
      <div className="chat-panel">
        {selectedOrder && <div className="chat-title"><OrderVehicleImage order={selectedOrder} className="chat-title-image" /><div><strong>{selectedOrder.vehicle}</strong><span>{selectedOrder.code} · {selectedOrder.plate}</span></div></div>}
        <div className="chat-messages">
          {loading && <div className="empty">Loading messages...</div>}
          {!loading && messages.map(message => <div key={message.id} className={message.isMine ? 'chat-row mine' : 'chat-row'}>
            <span className={message.isMine ? 'chat-avatar shop' : 'chat-avatar customer'}><img src={message.isMine ? ownAvatar : otherAvatar} alt={message.isMine ? 'You' : otherLabel} /></span>
            <article className={message.isMine ? 'chat-bubble mine' : 'chat-bubble'}>
              <small>{message.isMine ? 'You' : otherLabel} · {new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.createdAt))}</small>
              {message.attachmentUrl && <a href={message.attachmentUrl} target="_blank" rel="noreferrer"><img className="chat-photo" src={message.attachmentUrl} alt="Chat attachment" /></a>}
              <p>{message.body}</p>
            </article>
          </div>)}
          {!loading && messages.length === 0 && <div className="empty">No messages yet. Send the first update to the shop.</div>}
        </div>
        {error && <div className="form-message">{error}</div>}
        {photoPreview && <div className="chat-photo-preview"><img src={photoPreview} alt="Selected attachment" /><span>{photoFile?.name}</span><button className="secondary-btn" onClick={() => setPhotoFile(null)}>Remove</button></div>}
        <div className="chat-composer">
          <label className="chat-photo-button"><Camera /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhotoFile(event.target.files?.[0] ?? null)} /></label>
          <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Type your message to the shop..." onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} />
          <button className="primary-btn" disabled={sending || (!draft.trim() && !photoFile)} onClick={sendMessage}><Send /> {sending ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </div>
  </section>
}

function CustomerProfileView({ profile, settings, onBack, onSaved }: { profile: UserProfile; settings: CustomerProfileSettings | null; onBack: () => void; onSaved: (settings: CustomerProfileSettings) => void }) {
  const [fullName, setFullName] = useState(settings?.fullName || profile.name)
  const [phone, setPhone] = useState(settings?.phone ?? '')
  const [email, setEmail] = useState(settings?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFullName(settings?.fullName || profile.name)
    setPhone(settings?.phone ?? '')
    setEmail(settings?.email ?? '')
  }, [settings, profile.name])

  async function saveProfile() {
    setSaving(true)
    setError('')
    try {
      const updated = await updateCustomerProfile({ fullName, phone })
      onSaved(updated)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="role-panel profile-view">
    <button className="back-link" onClick={onBack}>Back</button>
    <span className="eyebrow">CUSTOMER PROFILE</span>
    <h1>Edit your profile</h1>
    <p>Keep your contact information updated so the shop can reach you about appointments, estimates, and pickup updates.</p>
    <div className="profile-layout">
      <aside className="profile-summary-card">
        <span className="profile-avatar"><UserRound /></span>
        <strong>{fullName || 'Customer'}</strong>
        <small>{email || 'Account email'}</small>
        <p>Changes here update the customer dashboard and the shop records connected to this login.</p>
      </aside>
      <div className="profile-form-card">
        <div className="booking-form">
          <label className="wide">Full name<input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="John Silva" /></label>
          <label className="wide">Phone<input value={phone} onChange={event => setPhone(event.target.value)} placeholder="(407) 555-1234" /></label>
          <label className="wide">Email<input value={email} readOnly className="readonly-input" /></label>
        </div>
        <small className="profile-note">Email is used for login. Email and password changes will be added in a separate account security step.</small>
        {error && <div className="form-message">{error}</div>}
        <div className="modal-actions"><button className="secondary-btn" onClick={onBack}>Cancel</button><button className="primary-btn" disabled={saving} onClick={saveProfile}>{saving ? 'Saving...' : 'Save profile'}</button></div>
      </div>
    </div>
  </section>
}

function MyVehicles({ vehicles, onBack, onChanged }: { vehicles: CustomerVehicle[]; onBack: () => void; onChanged: (message: string) => Promise<void> }) {
  const [editing, setEditing] = useState<CustomerVehicle | null>(null)
  const [showForm, setShowForm] = useState(vehicles.length === 0)

  async function removeVehicle(vehicle: CustomerVehicle) {
    if (!confirm(`Delete ${vehicle.make} ${vehicle.model}?`)) return
    try {
      await deleteCustomerVehicle(vehicle.id)
      await onChanged('Vehicle deleted.')
      setEditing(null)
      setShowForm(vehicles.length <= 1)
    } catch (error) {
      await onChanged(error instanceof Error ? error.message : 'Could not delete vehicle.')
    }
  }

  return <section className="role-panel garage-view">
    <div className="garage-head"><button className="back-link" onClick={onBack}>Back</button><button className="primary-btn" onClick={() => { setEditing(null); setShowForm(true) }}><Plus /> Add vehicle</button></div>
    <span className="eyebrow">MY VEHICLES</span>
    <h1>Your garage</h1>
    <p>Save your vehicles once and reuse them when scheduling service.</p>
    <div className="garage-layout">
      <div className="garage-list">
        {vehicles.map(vehicle => <article className="garage-card" key={vehicle.id}>
          <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} />
          <div><small>{vehicle.plate}</small><strong>{vehicle.make} {vehicle.model}</strong><span>{vehicle.year ?? 'Year not set'} · {vehicle.color || 'No color'}</span></div>
          <div className="garage-actions"><button className="secondary-btn" onClick={() => { setEditing(vehicle); setShowForm(true) }}>Edit</button><button className="secondary-btn danger-btn" onClick={() => removeVehicle(vehicle)}>Delete</button></div>
        </article>)}
        {vehicles.length === 0 && <div className="empty">No vehicles saved yet. Add your first vehicle to start your garage.</div>}
      </div>
      {showForm && <VehicleForm vehicle={editing} onCancel={() => { setEditing(null); setShowForm(vehicles.length === 0) }} onSaved={async () => { await onChanged(editing ? 'Vehicle updated.' : 'Vehicle added.'); setEditing(null); setShowForm(false) }} />}
    </div>
  </section>
}

function VehicleForm({ vehicle, onCancel, onSaved }: { vehicle: CustomerVehicle | null; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [selectedMake, setSelectedMake] = useState(vehicle?.make ?? 'Honda')
  const initialModelExists = vehicle ? Boolean(findVehicleModel(vehicle.make, vehicle.model)) : true
  const [selectedModel, setSelectedModel] = useState(vehicle ? initialModelExists ? vehicle.model : OTHER_VEHICLE_MODEL : 'Civic')
  const [customModel, setCustomModel] = useState(vehicle && !initialModelExists ? vehicle.model : '')
  const [customVehicle, setCustomVehicle] = useState('')
  const [vehicleYear, setVehicleYear] = useState(String(vehicle?.year ?? new Date().getFullYear()))
  const [vehicleColor, setVehicleColor] = useState(vehicle?.color ?? '')
  const [vehiclePlate, setVehiclePlate] = useState(vehicle?.plate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const vehicleMakes = VEHICLE_MAKE_OPTIONS
  const modelOptions = VEHICLES.filter(item => item.make === selectedMake)
  const selectedVehicle = selectedModel === OTHER_VEHICLE_MODEL ? undefined : findVehicleModel(selectedMake, selectedModel)

  function changeVehicleMake(nextMake: string) {
    setSelectedMake(nextMake)
    if (nextMake === OTHER_VEHICLE_MAKE) {
      setSelectedModel(OTHER_VEHICLE_MODEL)
      setCustomModel('')
      return
    }
    const nextVehicle = VEHICLES.find(item => item.make === nextMake)
    if (!nextVehicle) return
    setSelectedModel(nextVehicle.model)
    setCustomModel('')
    if (nextVehicle.years[0]) setVehicleYear(String(nextVehicle.years[0]))
  }

  async function submitVehicle() {
    setSaving(true)
    setError('')
    try {
      const otherParts = customVehicle.trim().split(/\s+/)
      const make = selectedMake === OTHER_VEHICLE_MAKE ? otherParts.shift() || 'Vehicle' : selectedMake
      const model = selectedMake === OTHER_VEHICLE_MAKE ? otherParts.join(' ') || OTHER_VEHICLE_MODEL : selectedModel === OTHER_VEHICLE_MODEL ? customModel.trim() || OTHER_VEHICLE_MODEL : selectedModel
      await saveCustomerVehicle({
        id: vehicle?.id,
        make,
        model,
        year: Number(vehicleYear) || null,
        color: vehicleColor,
        plate: vehiclePlate,
      })
      await onSaved()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save vehicle.')
    } finally {
      setSaving(false)
    }
  }

  return <aside className="garage-form">
    <h2>{vehicle ? 'Edit vehicle' : 'Add vehicle'}</h2>
    <div className="booking-form">
      <label>Make<select value={selectedMake} onChange={event => changeVehicleMake(event.target.value)}>{vehicleMakes.map(make => <option key={make} value={make}>{make === OTHER_VEHICLE_MAKE ? 'Other / I cannot find my car' : make}</option>)}</select></label>
      {selectedMake !== OTHER_VEHICLE_MAKE && <label>Model<select value={selectedModel} onChange={event => { setSelectedModel(event.target.value); if (event.target.value !== OTHER_VEHICLE_MODEL) setCustomModel('') }}>{modelOptions.map(item => <option key={`${item.make}-${item.model}`} value={item.model}>{item.model}</option>)}<option value={OTHER_VEHICLE_MODEL}>Other model / I cannot find my model</option></select></label>}
      {selectedMake !== OTHER_VEHICLE_MAKE && selectedModel === OTHER_VEHICLE_MODEL && <label className="wide">Model name<input value={customModel} onChange={event => setCustomModel(event.target.value)} placeholder="Example: Niro" /></label>}
      {selectedMake === OTHER_VEHICLE_MAKE && <label className="wide">Make and model<input value={customVehicle} onChange={event => setCustomVehicle(event.target.value)} placeholder="Example: Dodge Charger" /></label>}
      <label>Year{selectedVehicle ? <select value={vehicleYear} onChange={event => setVehicleYear(event.target.value)}>{selectedVehicle.years.map(year => <option key={year}>{year}</option>)}</select> : <input type="number" min="1980" max="2030" value={vehicleYear} onChange={event => setVehicleYear(event.target.value)} />}</label>
      <label>Color<input value={vehicleColor} onChange={event => setVehicleColor(event.target.value)} placeholder="Black" /></label>
      <label className="wide">Plate<input value={vehiclePlate} onChange={event => setVehiclePlate(event.target.value.toUpperCase())} placeholder="ABC1234" /></label>
    </div>
    {error && <div className="form-message">{error}</div>}
    <div className="modal-actions"><button className="secondary-btn" onClick={onCancel}>Cancel</button><button className="primary-btn" disabled={saving} onClick={submitVehicle}>{saving ? 'Saving...' : 'Save vehicle'}</button></div>
  </aside>
}

function Booking({ profile, vehicles, onBack, onConfirm }: { profile: UserProfile; vehicles: CustomerVehicle[]; onBack: () => void; onConfirm: () => void }) {
  const [service, setService] = useState('Oil change')
  const [garageVehicleId, setGarageVehicleId] = useState(() => vehicles[0]?.id ?? '')
  const [selectedMake, setSelectedMake] = useState('Honda')
  const [selectedModel, setSelectedModel] = useState('Civic')
  const [customModel, setCustomModel] = useState('')
  const [customVehicle, setCustomVehicle] = useState('')
  const [vehicleYear, setVehicleYear] = useState(String(new Date().getFullYear()))
  const [vehicleColor, setVehicleColor] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('10:00')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const vehicleMakes = VEHICLE_MAKE_OPTIONS
  const modelOptions = VEHICLES.filter(vehicle => vehicle.make === selectedMake)
  const selectedVehicle = selectedModel === OTHER_VEHICLE_MODEL ? undefined : findVehicleModel(selectedMake, selectedModel)
  const garageVehicle = vehicles.find(vehicle => vehicle.id === garageVehicleId)

  useEffect(() => {
    if (!garageVehicleId && vehicles[0]) setGarageVehicleId(vehicles[0].id)
  }, [garageVehicleId, vehicles])

  function changeVehicleMake(nextMake: string) {
    setSelectedMake(nextMake)
    if (nextMake === OTHER_VEHICLE_MAKE) {
      setSelectedModel(OTHER_VEHICLE_MODEL)
      setCustomModel('')
      return
    }
    const nextVehicle = VEHICLES.find(vehicle => vehicle.make === nextMake)
    if (!nextVehicle) return
    setSelectedModel(nextVehicle.model)
    setCustomModel('')
    if (nextVehicle.years[0]) setVehicleYear(String(nextVehicle.years[0]))
  }

  function changeVehicleModel(nextModel: string) {
    setSelectedModel(nextModel)
    if (nextModel !== OTHER_VEHICLE_MODEL) setCustomModel('')
    const nextVehicle = findVehicleModel(selectedMake, nextModel)
    if (nextVehicle?.years[0]) setVehicleYear(String(nextVehicle.years[0]))
  }

  async function confirmBooking() {
    setError('')
    if (!supabase || !profile.userId) {
      onConfirm()
      return
    }

    const otherParts = customVehicle.trim().split(/\s+/)
    const make = garageVehicle ? garageVehicle.make : selectedMake === OTHER_VEHICLE_MAKE ? otherParts.shift() || 'Vehicle' : selectedMake
    const model = garageVehicle ? garageVehicle.model : selectedMake === OTHER_VEHICLE_MAKE ? otherParts.join(' ') || OTHER_VEHICLE_MODEL : selectedModel === OTHER_VEHICLE_MODEL ? customModel.trim() || OTHER_VEHICLE_MODEL : selectedModel
    const year = garageVehicle ? garageVehicle.year : Number(vehicleYear) || null
    const color = garageVehicle ? garageVehicle.color ?? '' : vehicleColor
    const plate = garageVehicle ? garageVehicle.plate : vehiclePlate
    const problem = description.trim() || service
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()

    setSaving(true)
    const { error: bookingError } = await supabase.rpc('create_customer_booking', {
      p_vehicle_make: make,
      p_vehicle_model: model,
      p_vehicle_year: year,
      p_vehicle_color: color,
      p_vehicle_plate: plate,
      p_problem: `${service}: ${problem}`,
      p_scheduled_at: scheduledAt,
    })
    setSaving(false)

    if (bookingError) {
      setError(bookingError.message)
      return
    }

    onConfirm()
  }

  return <section className="role-panel booking">
    <button className="back-link" onClick={onBack}>Back</button>
    <span className="eyebrow">NEW APPOINTMENT</span>
    <h1>How can we help?</h1>
    <p>Choose the service, add your vehicle, and briefly describe what is happening.</p>
    <div className="service-choices">{['Oil change','Brakes','Tires','Diagnostic','A/C service','Suspension'].map((item,index) => <button type="button" className={service === item ? 'active' : ''} onClick={() => setService(item)} key={item}>{[<Gauge />,<Settings2 />,<Car />,<ClipboardCheck />,<Wrench />,<Settings2 />][index]}<span>{item}</span></button>)}</div>
    <div className="booking-form">
      {vehicles.length > 0 && <label className="wide">Saved vehicle<select value={garageVehicleId} onChange={event => setGarageVehicleId(event.target.value)}>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}{vehicle.year ? ` ${vehicle.year}` : ''} · {vehicle.plate}</option>)}<option value="">Add a different vehicle</option></select></label>}
      {garageVehicle && <div className="garage-selected wide"><img src={garageVehicle.imageUrl} alt={`${garageVehicle.make} ${garageVehicle.model}`} /><p><strong>{garageVehicle.make} {garageVehicle.model}</strong><span>{garageVehicle.year ?? 'Year not set'} · {garageVehicle.color || 'No color'} · {garageVehicle.plate}</span></p></div>}
      {!garageVehicle && <><label>Make<select value={selectedMake} onChange={event => changeVehicleMake(event.target.value)}>{vehicleMakes.map(make => <option key={make} value={make}>{make === OTHER_VEHICLE_MAKE ? 'Other / I cannot find my car' : make}</option>)}</select></label>
      {selectedMake !== OTHER_VEHICLE_MAKE && <label>Model<select value={selectedModel} onChange={event => changeVehicleModel(event.target.value)}>{modelOptions.map(vehicle => <option key={`${vehicle.make}-${vehicle.model}`} value={vehicle.model}>{vehicle.model}</option>)}<option value={OTHER_VEHICLE_MODEL}>Other model / I cannot find my model</option></select></label>}
      {selectedMake !== OTHER_VEHICLE_MAKE && selectedModel === OTHER_VEHICLE_MODEL && <label className="wide">Model name<input value={customModel} onChange={event => setCustomModel(event.target.value)} placeholder="Example: Niro" required /></label>}
      {selectedMake === OTHER_VEHICLE_MAKE && <label className="wide">Make and model<input value={customVehicle} onChange={event => setCustomVehicle(event.target.value)} placeholder="Example: Dodge Charger" required /></label>}
      <label>Year{selectedVehicle ? <select value={vehicleYear} onChange={event => setVehicleYear(event.target.value)}>{selectedVehicle.years.map(year => <option key={year}>{year}</option>)}</select> : <input type="number" min="1980" max="2030" value={vehicleYear} onChange={event => setVehicleYear(event.target.value)} />}</label>
      <label>Color<input value={vehicleColor} onChange={event => setVehicleColor(event.target.value)} placeholder="Black" /></label>
      <label>Plate<input value={vehiclePlate} onChange={event => setVehiclePlate(event.target.value.toUpperCase())} placeholder="ABC1234" /></label></>}
      <label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label>Time<select value={time} onChange={event => setTime(event.target.value)}>{workshopSchedulingConfig.availableTimes.map(slot => <option key={slot}>{slot}</option>)}</select></label>
      <label className="wide">Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the issue or requested service..." /></label>
    </div>
    {error && <div className="form-message">{error}</div>}
    <button className="primary-btn" onClick={confirmBooking} disabled={saving}>{saving ? 'Sending...' : <><Check /> Confirm appointment</>}</button>
  </section>
}

function HistoryView({ orders, vehicles, onBack, onSchedule }: { orders: ServiceOrder[]; vehicles: CustomerVehicle[]; onBack: () => void; onSchedule: () => void }) {
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id ?? null)
  const filteredOrders = vehicleFilter === 'all' ? orders : orders.filter(order => order.vehicleId === vehicleFilter)
  const selectedOrder = filteredOrders.find(order => order.id === selectedOrderId) ?? filteredOrders[0] ?? null
  const completedCount = filteredOrders.filter(order => order.status === 'Completed').length
  const activeCount = filteredOrders.filter(order => order.status !== 'Completed' && order.status !== 'Cancelled').length
  const totalSpent = filteredOrders.reduce((sum, order) => sum + order.total, 0)

  useEffect(() => {
    if (!filteredOrders.some(order => order.id === selectedOrderId)) setSelectedOrderId(filteredOrders[0]?.id ?? null)
  }, [filteredOrders, selectedOrderId])

  return <section className="role-panel history-view history-pro">
    <div className="history-head">
      <button className="back-link" onClick={onBack}>Back</button>
      <button className="primary-btn" onClick={onSchedule}><CalendarDays /> Schedule service</button>
    </div>
    <span className="eyebrow">VEHICLE HISTORY</span>
    <h1>Service records</h1>
    <p>Filter by vehicle and open each repair order to review status, estimate, mechanic, and service details.</p>
    <div className="history-controls">
      <label>Vehicle<select value={vehicleFilter} onChange={event => setVehicleFilter(event.target.value)}><option value="all">All vehicles</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}{vehicle.year ? ` ${vehicle.year}` : ''} · {vehicle.plate}</option>)}</select></label>
      <div className="history-summary"><span><strong>{filteredOrders.length}</strong>Records</span><span><strong>{activeCount}</strong>Active</span><span><strong>{completedCount}</strong>Completed</span><span><strong>{totalSpent.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong>Total</span></div>
    </div>
    <div className="history-layout">
      <div className="history-list">
        {filteredOrders.map(order => <button className={selectedOrder?.id === order.id ? 'history-card active' : 'history-card'} key={order.id} onClick={() => setSelectedOrderId(order.id)}>
          <OrderVehicleImage order={order} className="history-car-image" />
          <div><small>{order.code} · {order.date}</small><strong>{order.service}</strong><span>{order.vehicle} · {order.plate}</span></div>
          <span className={`status ${order.status === 'Completed' ? 'green' : order.status === 'Cancelled' ? 'gray' : order.status === 'Estimate' ? 'amber' : 'blue'}`}>{order.status}</span>
        </button>)}
        {filteredOrders.length === 0 && <div className="empty">No service history for this vehicle yet.</div>}
      </div>
      <aside className="history-detail">
        {selectedOrder ? <>
          <OrderVehicleImage order={selectedOrder} className="history-detail-image" />
          <div className="history-detail-title"><span className="eyebrow">{selectedOrder.code}</span><h2>{selectedOrder.vehicle}</h2><p>{selectedOrder.plate} · {selectedOrder.date}</p></div>
          <div className="history-detail-grid"><div><span>Status</span><strong>{selectedOrder.status}</strong></div><div><span>Mechanic</span><strong>{selectedOrder.mechanic}</strong></div><div><span>Estimate</span><strong>{selectedOrder.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</strong></div><div><span>Progress</span><strong>{selectedOrder.progress}%</strong></div></div>
          <div className="history-progress"><i style={{ width: `${selectedOrder.progress}%` }} /></div>
          <article><h3>Service request</h3><p>{selectedOrder.service}</p></article>
          <article><h3>Next action</h3><p>{selectedOrder.status === 'Estimate' ? 'Review and approve the estimate when the shop sends it.' : selectedOrder.status === 'Completed' ? 'Service completed. Keep this record for future maintenance.' : selectedOrder.status === 'Cancelled' ? 'This appointment was cancelled.' : 'The shop will update this repair order as work progresses.'}</p></article>
        </> : <div className="empty">Select a service record to view details.</div>}
      </aside>
    </div>
  </section>
}
