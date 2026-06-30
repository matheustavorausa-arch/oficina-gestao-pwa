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
  ['Other', 'Outro modelo'],
] as const

function RoleHeader({ profile, onLogout, title }: Props & { title: string }) {
  return <header className="role-header"><div className="role-logo jas-brand"><span className="brand-mark"><Wrench /></span><div><strong><b>JAS</b> MOTORS</strong><small>{profile.workshopName}</small></div></div><span className="role-title">{title}</span><div className="role-head-actions"><button><Bell /><i /></button><button onClick={onLogout} title="Sair"><LogOut /></button></div></header>
}

function Toast({ text }: { text: string }) { return text ? <div className="toast"><Check />{text}</div> : null }

export function MechanicDashboard({ profile, onLogout }: Props) {
  const [remoteOrders, setRemoteOrders] = useState<ServiceOrder[]>([])
  const [selected, setSelected] = useState<ServiceOrder | null>(null)
  const [toast, setToast] = useState('')
  const [status, setStatus] = useState('Em avaliaÃ§Ã£o')
  const [avatarUrl, setAvatarUrl] = useState(defaultMechanicAvatar)
  const sourceOrders = remoteOrders
  const tasks = sourceOrders.filter(order => order.status !== 'Finalizado')
  function action(text: string) { setToast(text); setTimeout(() => setToast(''), 2300) }

  async function changeOwnAvatar(file?: File) {
    if (!file || !profile.userId) return
    try {
      const path = await uploadProfileAvatar(profile.userId, file)
      setAvatarUrl(await resolveAvatarUrl(path))
      action('Sua foto foi atualizada.')
    } catch (error) {
      action(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel trocar sua foto.')
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
    <RoleHeader profile={profile} onLogout={onLogout} title="Ãrea do mecÃ¢nico" />
    <main className="role-content">
      <section className="role-welcome">
        <div className="mechanic-profile-hero">
          <label className="mechanic-self-avatar"><img src={avatarUrl} alt={profile.name} /><input type="file" accept="image/*" onChange={event => changeOwnAvatar(event.target.files?.[0])} /><span>Trocar foto</span></label>
          <div><span className="eyebrow">OPERAÃ‡ÃƒO DE HOJE</span><h1>Bom dia, {profile.name.split(' ')[0]}.</h1><p>Atualize cada etapa para manter a oficina e o cliente informados.</p></div>
        </div>
        <button className="primary-btn" onClick={() => action('Novo serviÃ§o solicitado ao responsÃ¡vel.')}><Plus /> Novo serviÃ§o</button>
      </section>
      <section className="mechanic-stats"><article><CalendarDays /><div><strong>{tasks.length}</strong><span>Agendamentos hoje</span></div></article><article><Wrench /><div><strong>{tasks.filter(order => order.status === 'Em execução').length}</strong><span>Em andamento</span></div></article><article><Clock3 /><div><strong>{tasks.filter(order => order.status === 'Orçamento').length}</strong><span>Aguardando aprovaÃ§Ã£o</span></div></article></section>
      <div className="mechanic-grid">
        <section className="role-panel task-list"><div className="role-panel-head"><div><h2>Minha agenda</h2><span>ServiÃ§os atribuÃ­dos a vocÃª</span></div><div className="tabs"><button className="active">Hoje</button><button>ConcluÃ­dos</button></div></div>{tasks.map((order, index) => <button key={order.id} className={selected?.id === order.id ? 'task active' : 'task'} onClick={() => setSelected(order)}><time>{['08:30','10:00','11:30'][index] ?? '--:--'}</time><span className="task-car"><Car /></span><p><strong>{order.vehicle}</strong><span>{order.customer} Â· {order.service}</span><small className={`tag tag-${index}`}>{order.status}</small></p><ChevronRight /></button>)}{tasks.length === 0 && <div className="empty">Nenhum serviÃ§o atribuido ainda.</div>}</section>
        {selected ? <section className="role-panel service-detail"><div className="service-hero"><div><span className="eyebrow">SERVIÃ‡O EM ANDAMENTO</span><h2>{selected.vehicle}</h2><p>{selected.plate} Â· {selected.customer}</p></div><span className="big-car"><Car /></span></div>
          <div className="service-meta"><div><span>ServiÃ§o</span><strong>{selected.service}</strong></div><div><span>Ordem</span><strong>{selected.code}</strong></div><div><span>PrevisÃ£o</span><strong>Hoje, 17:30</strong></div></div>
          <div className="status-steps">{['Chegou','Em avaliaÃ§Ã£o','Aguardando aprovaÃ§Ã£o','Em andamento','Pronto'].map((step, index) => <button key={step} className={status === step ? 'active' : index === 0 ? 'done' : ''} onClick={() => { setStatus(step); action(`Status atualizado: ${step}`) }}><span>{index === 0 ? <Check /> : index + 1}</span><small>{step}</small></button>)}</div>
          <label className="notes-label">ComentÃ¡rios / observaÃ§Ãµes<textarea defaultValue="VeÃ­culo estÃ¡ em avaliaÃ§Ã£o. Ã“leo muito sujo; recomendado verificar tambÃ©m o filtro de ar." /></label>
          <div className="photo-strip"><button onClick={() => action('CÃ¢mera preparada para anexar foto.')}><Camera /><span>Adicionar foto</span></button><span><Wrench /></span><span><Gauge /></span><span><Car /></span></div>
          <button className="primary-btn full" onClick={() => action('AtualizaÃ§Ã£o enviada ao cliente.')}><Send /> Enviar atualizaÃ§Ã£o</button>
        </section> : <section className="role-panel service-detail"><div className="empty">Aguardando o primeiro agendamento de cliente.</div></section>}
      </div>
    </main>
    <nav className="role-bottom-nav"><button className="active"><Home />InÃ­cio</button><button><CalendarDays />Agenda</button><button className="nav-main"><Plus /></button><button><Car />VeÃ­culos</button><button><UserRound />Perfil</button></nav><Toast text={toast} />
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
    <RoleHeader profile={profile} onLogout={onLogout} title="Ãrea do cliente" />
    <main className="role-content customer-content">
      <section className="customer-hero"><div><span className="eyebrow">BEM-VINDO Ã€ SUA GARAGEM</span><h1>OlÃ¡, {profile.name.split(' ')[0]}.</h1><p>Acompanhe seu veÃ­culo e agende serviÃ§os sem precisar ligar.</p><button className="primary-btn" onClick={() => setView('booking')}><CalendarDays /> Agendar serviÃ§o</button></div><div className="vehicle-card"><span className="vehicle-art"><Car /></span><p><small>{activeOrder ? 'SEU VEÃCULO' : 'PRIMEIRO PASSO'}</small><strong>{activeOrder?.vehicle ?? 'Adicione seu veÃ­culo'}</strong><span>{activeOrder ? `${activeOrder.plate} Â· ${activeOrder.status}` : 'Crie um agendamento para iniciar os testes'}</span></p><button onClick={() => setView('booking')}><ChevronRight /></button></div></section>
      {view === 'booking' ? <Booking profile={profile} onBack={() => setView('home')} onConfirm={() => { setView('home'); action('Agendamento enviado para a oficina. O dono e o mecânico já conseguem visualizar.') }} /> : view === 'history' ? <HistoryView orders={remoteOrders} onBack={() => setView('home')} /> : <>
        <section className="customer-grid"><article className="role-panel live-service">{activeOrder ? <><div className="role-panel-head"><div><span className="eyebrow">ACOMPANHAMENTO EM TEMPO REAL</span><h2>{activeOrder.service}</h2><p>{activeOrder.code} Â· {activeOrder.vehicle}</p></div><span className="status green">{activeOrder.status}</span></div><div className="customer-timeline">{['Agendamento criado','VeÃ­culo recebido','Checklist e diagnÃ³stico','ServiÃ§o em andamento','Pronto para retirada'].map((step,index) => <div className={index === 0 ? 'done' : ''} key={step}><span>{index === 0 ? <Check /> : index + 1}</span><p><strong>{step}</strong><small>{index === 0 ? 'Agora' : 'Pendente'}</small></p></div>)}</div><div className="live-actions"><button className="secondary-btn" onClick={() => action('Chat da ordem aberto.')}><MessageCircle /> Falar com a oficina</button><button className="primary-btn" onClick={() => action('Detalhes da ordem carregados.')}><FileText /> Ver detalhes</button></div></> : <div className="empty">Nenhum serviÃ§o criado ainda. Clique em Agendar serviÃ§o para iniciar.</div>}</article>
          <aside className="customer-side"><article className="role-panel estimate-card"><ReceiptText /><span>{activeOrder ? 'OrÃ§amento da ordem' : 'Sem orÃ§amento'}</span><strong>{activeOrder ? activeOrder.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</strong><small>{activeOrder ? activeOrder.status : 'Aguardando primeiro serviÃ§o'}</small><button onClick={() => action(activeOrder ? 'OrÃ§amento aberto.' : 'Nenhum orÃ§amento criado ainda.')}>Visualizar orÃ§amento <ChevronRight /></button></article><article className="role-panel quick-card"><h2>Acesso rÃ¡pido</h2><button onClick={() => setView('history')}><History />HistÃ³rico do veÃ­culo<ChevronRight /></button><button onClick={() => action('Documentos do veÃ­culo carregados.')}><ClipboardCheck />Documentos e checklists<ChevronRight /></button><button onClick={() => action('PreferÃªncias abertas.')}><Settings2 />PreferÃªncias<ChevronRight /></button></article></aside>
        </section>
        <section className="role-panel next-care"><div><span className="eyebrow">PRÃ“XIMO CUIDADO</span><h2>{activeOrder ? 'Acompanhe as próximas etapas do serviço' : 'Nenhum cuidado programado ainda'}</h2><p>{activeOrder ? 'A oficina atualiza o status em tempo real.' : 'Crie o primeiro agendamento para iniciar o histórico do veículo.'}</p></div><Gauge /><button className="secondary-btn" onClick={() => setView('booking')}>Programar agora</button></section>
      </>}
    </main>
    <nav className="role-bottom-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Home />InÃ­cio</button><button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}><CalendarDays />Agendar</button><button onClick={() => action('Lista de serviÃ§os aberta.')}><Wrench />ServiÃ§os</button><button onClick={() => action('Mensagens abertas.')}><MessageCircle />Mensagens</button><button><UserRound />Perfil</button></nav><Toast text={toast} />
  </div>
}

function Booking({ profile, onBack, onConfirm }: { profile: UserProfile; onBack: () => void; onConfirm: () => void }) {
  const [service, setService] = useState('Troca de óleo')
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
    const model = selectedMake === 'Other' ? otherParts.join(' ') || 'Outro modelo' : selectedModel
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
    <button className="back-link" onClick={onBack}>← Voltar</button>
    <span className="eyebrow">NOVO AGENDAMENTO</span>
    <h1>Como podemos ajudar?</h1>
    <p>Escolha o serviço, adicione seu veículo e conte brevemente o que está acontecendo.</p>
    <div className="service-choices">{['Troca de óleo','Freios','Pneus','Diagnóstico','Ar-condicionado','Suspensão'].map((item,index) => <button type="button" className={service === item ? 'active' : ''} onClick={() => setService(item)} key={item}>{[<Gauge />,<Settings2 />,<Car />,<ClipboardCheck />,<Wrench />,<Settings2 />][index]}<span>{item}</span></button>)}</div>
    <div className="booking-form">
      <label>Veículo<select value={vehicleChoice} onChange={event => setVehicleChoice(event.target.value)}>{customerVehicleOptions.map(([make, model]) => <option key={`${make}-${model}`} value={`${make}|${model}`}>{make === 'Other' ? 'Outro / não encontrei meu carro' : `${make} ${model}`}</option>)}</select></label>
      {vehicleChoice.startsWith('Other|') && <label>Marca e modelo<input value={customVehicle} onChange={event => setCustomVehicle(event.target.value)} placeholder="Ex: Dodge Charger" required /></label>}
      <label>Ano<input type="number" min="1980" max="2030" value={vehicleYear} onChange={event => setVehicleYear(event.target.value)} /></label>
      <label>Cor<input value={vehicleColor} onChange={event => setVehicleColor(event.target.value)} placeholder="Preto" /></label>
      <label>Placa<input value={vehiclePlate} onChange={event => setVehiclePlate(event.target.value.toUpperCase())} placeholder="ABC1234" /></label>
      <label>Data<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label>Horário<select value={time} onChange={event => setTime(event.target.value)}>{workshopSchedulingConfig.availableTimes.map(slot => <option key={slot}>{slot}</option>)}</select></label>
      <label className="wide">Descrição<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Descreva o problema ou serviço desejado..." /></label>
    </div>
    {error && <div className="form-message">{error}</div>}
    <button className="primary-btn" onClick={confirmBooking} disabled={saving}>{saving ? 'Enviando...' : <><Check /> Confirmar agendamento</>}</button>
  </section>
}

function HistoryView({ orders, onBack }: { orders: ServiceOrder[]; onBack: () => void }) {
  return <section className="role-panel history-view"><button className="back-link" onClick={onBack}>← Voltar</button><span className="eyebrow">HISTÓRICO DO VEÍCULO</span><h1>Serviços registrados</h1><p>Todos os serviços reais registrados nesta oficina.</p>{orders.map(order => <article key={order.id}><span className="history-icon"><Wrench /></span><div><strong>{order.service}</strong><span>{order.date} · {order.code}</span></div><strong>{order.total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong><span className="status dark">{order.status}</span></article>)}{orders.length === 0 && <div className="empty">Nenhum histórico criado ainda.</div>}</section>
}
