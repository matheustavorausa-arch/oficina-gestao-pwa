import { useEffect, useState } from 'react'
import { Bell, CalendarDays, Camera, Car, Check, ChevronRight, ClipboardCheck, Clock3, FileText, Gauge, History, Home, LogOut, MessageCircle, Plus, ReceiptText, Send, Settings2, UserRound, Wrench } from 'lucide-react'
import { defaultMechanicAvatar, resolveAvatarUrl, uploadProfileAvatar } from '../lib/avatars'
import { fetchServiceOrders } from '../lib/serviceOrders'
import { supabase } from '../lib/supabase'
import { workshopSchedulingConfig } from '../config/workshop'
import type { ServiceOrder, UserProfile } from '../types'

interface Props { profile: UserProfile; onLogout: () => void }

const customerVehicleOptions = [
  ['Toyota', 'Camry'], ['Toyota', 'Corolla'], ['Toyota', 'RAV4'],
  ['Honda', 'Civic'], ['Honda', 'Accord'], ['Honda', 'CR-V'],
  ['Ford', 'F-150'], ['Ford', 'EcoSport'], ['Ford', 'Escape'], ['Ford', 'Explorer'],
  ['Chevrolet', 'Silverado 1500'], ['Chevrolet', 'Equinox'], ['Chevrolet', 'Malibu'],
  ['Nissan', 'Altima'], ['Nissan', 'Rogue'], ['Nissan', 'Sentra'],
  ['Hyundai', 'Elantra'], ['Hyundai', 'Tucson'], ['Hyundai', 'Santa Fe'],
  ['Kia', 'Telluride'], ['Kia', 'Sportage'], ['Jeep', 'Grand Cherokee'],
  ['Tesla', 'Model 3'], ['Tesla', 'Model Y'], ['Ram', '1500'],
  ['Subaru', 'Outback'], ['Subaru', 'Forester'], ['Mazda', 'CX-5'],
  ['Volkswagen', 'Jetta'], ['BMW', '320i'], ['Mercedes-Benz', 'C-Class'], ['Audi', 'A4'],
  ['Other', 'Other model'],
] as const

function RoleHeader({ profile, onLogout, title }: Props & { title: string }) {
  return <header className="role-header"><div className="role-logo jas-brand"><span className="brand-mark"><Wrench /></span><div><strong><b>JAS</b> MOTORS</strong><small>{profile.workshopName}</small></div></div><span className="role-title">{title}</span><div className="role-head-actions"><button><Bell /><i /></button><button onClick={onLogout} title="Log out"><LogOut /></button></div></header>
}

function Toast({ text }: { text: string }) { return text ? <div className="toast"><Check />{text}</div> : null }

export function MechanicDashboard({ profile, onLogout }: Props) {
  const [remoteOrders, setRemoteOrders] = useState<ServiceOrder[]>([])
  const [selected, setSelected] = useState<ServiceOrder | null>(null)
  const [toast, setToast] = useState('')
  const [status, setStatus] = useState('Evaluation')
  const [avatarUrl, setAvatarUrl] = useState(defaultMechanicAvatar)
  const tasks = remoteOrders.filter(order => order.status !== 'Completed')
  function action(text: string) { setToast(text); setTimeout(() => setToast(''), 2300) }

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
    const loadOrders = () => fetchServiceOrders(profile).then(items => {
      setRemoteOrders(items)
      setSelected(current => items.find(item => item.id === current?.id) ?? items[0] ?? null)
    }).catch(() => undefined)
    loadOrders()
    const client = supabase
    const channel = client
      .channel(`mechanic-orders-${profile.userId}-${profile.workshopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders', filter: `workshop_id=eq.${profile.workshopId}` }, loadOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_assignments', filter: `workshop_id=eq.${profile.workshopId}` }, loadOrders)
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile.userId, profile.workshopId])

  return <div className="role-app mechanic-app">
    <RoleHeader profile={profile} onLogout={onLogout} title="Mechanic Area" />
    <main className="role-content">
      <section className="role-welcome">
        <div className="mechanic-profile-hero">
          <label className="mechanic-self-avatar"><img src={avatarUrl} alt={profile.name} /><input type="file" accept="image/*" onChange={event => changeOwnAvatar(event.target.files?.[0])} /><span>Change photo</span></label>
          <div><span className="eyebrow">TODAY'S WORKFLOW</span><h1>Good morning, {profile.name.split(' ')[0]}.</h1><p>Update each service stage to keep the shop and customer informed.</p></div>
        </div>
        <button className="primary-btn" onClick={() => action('New service request sent to the owner.')}><Plus /> New service</button>
      </section>
      <section className="mechanic-stats"><article><CalendarDays /><div><strong>{tasks.length}</strong><span>Appointments today</span></div></article><article><Wrench /><div><strong>{tasks.filter(order => order.status === 'In Progress').length}</strong><span>In progress</span></div></article><article><Clock3 /><div><strong>{tasks.filter(order => order.status === 'Estimate').length}</strong><span>Waiting approval</span></div></article></section>
      <div className="mechanic-grid">
        <section className="role-panel task-list"><div className="role-panel-head"><div><h2>My schedule</h2><span>Services assigned to you</span></div><div className="tabs"><button className="active">Today</button><button>Completed</button></div></div>{tasks.map((order, index) => <button key={order.id} className={selected?.id === order.id ? 'task active' : 'task'} onClick={() => setSelected(order)}><time>{['08:30','10:00','11:30'][index] ?? '--:--'}</time><span className="task-car"><Car /></span><p><strong>{order.vehicle}</strong><span>{order.customer} · {order.service}</span><small className={`tag tag-${index}`}>{order.status}</small></p><ChevronRight /></button>)}{tasks.length === 0 && <div className="empty">No assigned services yet.</div>}</section>
        {selected ? <section className="role-panel service-detail"><div className="service-hero"><div><span className="eyebrow">SERVICE IN PROGRESS</span><h2>{selected.vehicle}</h2><p>{selected.plate} · {selected.customer}</p></div><span className="big-car"><Car /></span></div>
          <div className="service-meta"><div><span>Service</span><strong>{selected.service}</strong></div><div><span>Order</span><strong>{selected.code}</strong></div><div><span>ETA</span><strong>Today, 5:30 PM</strong></div></div>
          <div className="status-steps">{['Arrived','Evaluation','Waiting Approval','In Progress','Ready'].map((step, index) => <button key={step} className={status === step ? 'active' : index === 0 ? 'done' : ''} onClick={() => { setStatus(step); action(`Status updated: ${step}`) }}><span>{index === 0 ? <Check /> : index + 1}</span><small>{step}</small></button>)}</div>
          <label className="notes-label">Comments / notes<textarea defaultValue="Vehicle is under evaluation. Add service notes here." /></label>
          <div className="photo-strip"><button onClick={() => action('Camera ready to attach a photo.')}><Camera /><span>Add photo</span></button><span><Wrench /></span><span><Gauge /></span><span><Car /></span></div>
          <button className="primary-btn full" onClick={() => action('Update sent to the customer.')}><Send /> Send update</button>
        </section> : <section className="role-panel service-detail"><div className="empty">Waiting for the first customer appointment.</div></section>}
      </div>
    </main>
    <nav className="role-bottom-nav"><button className="active"><Home />Home</button><button><CalendarDays />Schedule</button><button className="nav-main"><Plus /></button><button><Car />Vehicles</button><button><UserRound />Profile</button></nav><Toast text={toast} />
  </div>
}

export function CustomerDashboard({ profile, onLogout }: Props) {
  const [toast, setToast] = useState('')
  const [view, setView] = useState<'home' | 'booking' | 'history'>('home')
  const [remoteOrders, setRemoteOrders] = useState<ServiceOrder[]>([])
  const activeOrder = remoteOrders[0] ?? null
  function action(text: string) { setToast(text); setTimeout(() => setToast(''), 2300) }

  useEffect(() => {
    if (!supabase || !profile.workshopId) return
    const loadOrders = () => fetchServiceOrders(profile).then(setRemoteOrders).catch(() => undefined)
    loadOrders()
    const client = supabase
    const channel = client
      .channel(`customer-orders-${profile.userId}-${profile.workshopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders', filter: `workshop_id=eq.${profile.workshopId}` }, loadOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `workshop_id=eq.${profile.workshopId}` }, loadOrders)
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile.userId, profile.workshopId])

  return <div className="role-app customer-app">
    <RoleHeader profile={profile} onLogout={onLogout} title="Customer Area" />
    <main className="role-content customer-content">
      <section className="customer-hero"><div><span className="eyebrow">WELCOME TO YOUR GARAGE</span><h1>Hello, {profile.name.split(' ')[0]}.</h1><p>Track your vehicle and schedule services without calling the shop.</p><button className="primary-btn" onClick={() => setView('booking')}><CalendarDays /> Schedule service</button></div><div className="vehicle-card"><span className="vehicle-art"><Car /></span><p><small>{activeOrder ? 'YOUR VEHICLE' : 'FIRST STEP'}</small><strong>{activeOrder?.vehicle ?? 'Add your vehicle'}</strong><span>{activeOrder ? `${activeOrder.plate} · ${activeOrder.status}` : 'Create an appointment to start testing'}</span></p><button onClick={() => setView('booking')}><ChevronRight /></button></div></section>
      {view === 'booking' ? <Booking profile={profile} onBack={() => setView('home')} onConfirm={() => { setView('home'); action('Appointment sent to the shop. Owner and mechanic can see it now.') }} /> : view === 'history' ? <HistoryView orders={remoteOrders} onBack={() => setView('home')} /> : <>
        <section className="customer-grid"><article className="role-panel live-service">{activeOrder ? <><div className="role-panel-head"><div><span className="eyebrow">REAL-TIME SERVICE TRACKING</span><h2>{activeOrder.service}</h2><p>{activeOrder.code} · {activeOrder.vehicle}</p></div><span className="status green">{activeOrder.status}</span></div><div className="customer-timeline">{['Appointment created','Vehicle received','Checklist and diagnosis','Service in progress','Ready for pickup'].map((step,index) => <div className={index === 0 ? 'done' : ''} key={step}><span>{index === 0 ? <Check /> : index + 1}</span><p><strong>{step}</strong><small>{index === 0 ? 'Now' : 'Pending'}</small></p></div>)}</div><div className="live-actions"><button className="secondary-btn" onClick={() => action('Repair order chat opened.')}><MessageCircle /> Message the shop</button><button className="primary-btn" onClick={() => action('Repair order details loaded.')}><FileText /> View details</button></div></> : <div className="empty">No service created yet. Click Schedule service to begin.</div>}</article>
          <aside className="customer-side"><article className="role-panel estimate-card"><ReceiptText /><span>{activeOrder ? 'Repair order estimate' : 'No estimate'}</span><strong>{activeOrder ? activeOrder.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00'}</strong><small>{activeOrder ? activeOrder.status : 'Waiting for first service'}</small><button onClick={() => action(activeOrder ? 'Estimate opened.' : 'No estimate created yet.')}>View estimate <ChevronRight /></button></article><article className="role-panel quick-card"><h2>Quick access</h2><button onClick={() => setView('history')}><History />Vehicle history<ChevronRight /></button><button onClick={() => action('Vehicle documents loaded.')}><ClipboardCheck />Documents and checklists<ChevronRight /></button><button onClick={() => action('Preferences opened.')}><Settings2 />Preferences<ChevronRight /></button></article></aside>
        </section>
        <section className="role-panel next-care"><div><span className="eyebrow">NEXT CARE</span><h2>{activeOrder ? 'Track the next service steps' : 'No service scheduled yet'}</h2><p>{activeOrder ? 'The shop updates the status in real time.' : 'Create the first appointment to start the vehicle history.'}</p></div><Gauge /><button className="secondary-btn" onClick={() => setView('booking')}>Schedule now</button></section>
      </>}
    </main>
    <nav className="role-bottom-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Home />Home</button><button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}><CalendarDays />Schedule</button><button onClick={() => action('Services list opened.')}><Wrench />Services</button><button onClick={() => action('Messages opened.')}><MessageCircle />Messages</button><button><UserRound />Profile</button></nav><Toast text={toast} />
  </div>
}

function Booking({ profile, onBack, onConfirm }: { profile: UserProfile; onBack: () => void; onConfirm: () => void }) {
  const [service, setService] = useState('Oil change')
  const [vehicleChoice, setVehicleChoice] = useState('Honda|Civic')
  const [customVehicle, setCustomVehicle] = useState('')
  const [vehicleYear, setVehicleYear] = useState(String(new Date().getFullYear()))
  const [vehicleColor, setVehicleColor] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('10:00')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirmBooking() {
    setError('')
    if (!supabase || !profile.userId) {
      onConfirm()
      return
    }

    const [selectedMake, selectedModel] = vehicleChoice.split('|')
    const otherParts = customVehicle.trim().split(/\s+/)
    const make = selectedMake === 'Other' ? otherParts.shift() || 'Vehicle' : selectedMake
    const model = selectedMake === 'Other' ? otherParts.join(' ') || 'Other model' : selectedModel
    const problem = description.trim() || service
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()

    setSaving(true)
    const { error: bookingError } = await supabase.rpc('create_customer_booking', {
      p_vehicle_make: make,
      p_vehicle_model: model,
      p_vehicle_year: Number(vehicleYear) || null,
      p_vehicle_color: vehicleColor,
      p_vehicle_plate: vehiclePlate,
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
      <label>Vehicle<select value={vehicleChoice} onChange={event => setVehicleChoice(event.target.value)}>{customerVehicleOptions.map(([make, model]) => <option key={`${make}-${model}`} value={`${make}|${model}`}>{make === 'Other' ? 'Other / I cannot find my car' : `${make} ${model}`}</option>)}</select></label>
      {vehicleChoice.startsWith('Other|') && <label>Make and model<input value={customVehicle} onChange={event => setCustomVehicle(event.target.value)} placeholder="Example: Dodge Charger" required /></label>}
      <label>Year<input type="number" min="1980" max="2030" value={vehicleYear} onChange={event => setVehicleYear(event.target.value)} /></label>
      <label>Color<input value={vehicleColor} onChange={event => setVehicleColor(event.target.value)} placeholder="Black" /></label>
      <label>Plate<input value={vehiclePlate} onChange={event => setVehiclePlate(event.target.value.toUpperCase())} placeholder="ABC1234" /></label>
      <label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label>Time<select value={time} onChange={event => setTime(event.target.value)}>{workshopSchedulingConfig.availableTimes.map(slot => <option key={slot}>{slot}</option>)}</select></label>
      <label className="wide">Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the issue or requested service..." /></label>
    </div>
    {error && <div className="form-message">{error}</div>}
    <button className="primary-btn" onClick={confirmBooking} disabled={saving}>{saving ? 'Sending...' : <><Check /> Confirm appointment</>}</button>
  </section>
}

function HistoryView({ orders, onBack }: { orders: ServiceOrder[]; onBack: () => void }) {
  return <section className="role-panel history-view"><button className="back-link" onClick={onBack}>Back</button><span className="eyebrow">VEHICLE HISTORY</span><h1>Registered services</h1><p>All real services registered at this shop.</p>{orders.map(order => <article key={order.id}><span className="history-icon"><Wrench /></span><div><strong>{order.service}</strong><span>{order.date} · {order.code}</span></div><strong>{order.total.toLocaleString('en-US',{style:'currency',currency:'USD'})}</strong><span className="status dark">{order.status}</span></article>)}{orders.length === 0 && <div className="empty">No history created yet.</div>}</section>
}
