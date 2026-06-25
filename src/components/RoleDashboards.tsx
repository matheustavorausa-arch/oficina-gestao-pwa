import { useEffect, useState } from 'react'
import { Bell, CalendarDays, Camera, Car, Check, ChevronRight, ClipboardCheck, Clock3, FileText, Gauge, History, Home, LogOut, MessageCircle, Plus, ReceiptText, Send, Settings2, UserRound, Wrench } from 'lucide-react'
import { demoOrders } from '../demoData'
import { defaultMechanicAvatar, resolveAvatarUrl, uploadProfileAvatar } from '../lib/avatars'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

interface Props { profile: UserProfile; onLogout: () => void }

function RoleHeader({ profile, onLogout, title }: Props & { title: string }) {
  return <header className="role-header"><div className="role-logo jas-brand"><span className="brand-mark"><Wrench /></span><div><strong><b>JAS</b> MOTORS</strong><small>{profile.workshopName}</small></div></div><span className="role-title">{title}</span><div className="role-head-actions"><button><Bell /><i /></button><button onClick={onLogout} title="Sair"><LogOut /></button></div></header>
}

function Toast({ text }: { text: string }) { return text ? <div className="toast"><Check />{text}</div> : null }

export function MechanicDashboard({ profile, onLogout }: Props) {
  const [selected, setSelected] = useState(demoOrders[0])
  const [toast, setToast] = useState('')
  const [status, setStatus] = useState('Em avaliação')
  const [avatarUrl, setAvatarUrl] = useState(defaultMechanicAvatar)
  const tasks = demoOrders.filter(order => order.status !== 'Finalizado')
  function action(text: string) { setToast(text); setTimeout(() => setToast(''), 2300) }

  async function changeOwnAvatar(file?: File) {
    if (!file || !profile.userId) return
    try {
      const path = await uploadProfileAvatar(profile.userId, file)
      setAvatarUrl(await resolveAvatarUrl(path))
      action('Sua foto foi atualizada.')
    } catch (error) {
      action(error instanceof Error ? error.message : 'Não foi possível trocar sua foto.')
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

  return <div className="role-app mechanic-app">
    <RoleHeader profile={profile} onLogout={onLogout} title="Área do mecânico" />
    <main className="role-content">
      <section className="role-welcome">
        <div className="mechanic-profile-hero">
          <label className="mechanic-self-avatar"><img src={avatarUrl} alt={profile.name} /><input type="file" accept="image/*" onChange={event => changeOwnAvatar(event.target.files?.[0])} /><span>Trocar foto</span></label>
          <div><span className="eyebrow">OPERAÇÃO DE HOJE</span><h1>Bom dia, {profile.name.split(' ')[0]}.</h1><p>Atualize cada etapa para manter a oficina e o cliente informados.</p></div>
        </div>
        <button className="primary-btn" onClick={() => action('Novo serviço solicitado ao responsável.')}><Plus /> Novo serviço</button>
      </section>
      <section className="mechanic-stats"><article><CalendarDays /><div><strong>6</strong><span>Agendamentos hoje</span></div></article><article><Wrench /><div><strong>2</strong><span>Em andamento</span></div></article><article><Clock3 /><div><strong>3</strong><span>Aguardando aprovação</span></div></article></section>
      <div className="mechanic-grid">
        <section className="role-panel task-list"><div className="role-panel-head"><div><h2>Minha agenda</h2><span>Serviços atribuídos a você</span></div><div className="tabs"><button className="active">Hoje</button><button>Concluídos</button></div></div>{tasks.map((order, index) => <button key={order.id} className={selected.id === order.id ? 'task active' : 'task'} onClick={() => setSelected(order)}><time>{['08:30','10:00','11:30'][index]}</time><span className="task-car"><Car /></span><p><strong>{order.vehicle}</strong><span>{order.customer} · {order.service}</span><small className={`tag tag-${index}`}>{order.status}</small></p><ChevronRight /></button>)}</section>
        <section className="role-panel service-detail"><div className="service-hero"><div><span className="eyebrow">SERVIÇO EM ANDAMENTO</span><h2>{selected.vehicle}</h2><p>{selected.plate} · {selected.customer}</p></div><span className="big-car"><Car /></span></div>
          <div className="service-meta"><div><span>Serviço</span><strong>{selected.service}</strong></div><div><span>Ordem</span><strong>{selected.code}</strong></div><div><span>Previsão</span><strong>Hoje, 17:30</strong></div></div>
          <div className="status-steps">{['Chegou','Em avaliação','Aguardando aprovação','Em andamento','Pronto'].map((step, index) => <button key={step} className={status === step ? 'active' : index === 0 ? 'done' : ''} onClick={() => { setStatus(step); action(`Status atualizado: ${step}`) }}><span>{index === 0 ? <Check /> : index + 1}</span><small>{step}</small></button>)}</div>
          <label className="notes-label">Comentários / observações<textarea defaultValue="Veículo está em avaliação. Óleo muito sujo; recomendado verificar também o filtro de ar." /></label>
          <div className="photo-strip"><button onClick={() => action('Câmera preparada para anexar foto.')}><Camera /><span>Adicionar foto</span></button><span><Wrench /></span><span><Gauge /></span><span><Car /></span></div>
          <button className="primary-btn full" onClick={() => action('Atualização enviada ao cliente.')}><Send /> Enviar atualização</button>
        </section>
      </div>
    </main>
    <nav className="role-bottom-nav"><button className="active"><Home />Início</button><button><CalendarDays />Agenda</button><button className="nav-main"><Plus /></button><button><Car />Veículos</button><button><UserRound />Perfil</button></nav><Toast text={toast} />
  </div>
}

export function CustomerDashboard({ profile, onLogout }: Props) {
  const [toast, setToast] = useState('')
  const [view, setView] = useState<'home' | 'booking' | 'history'>('home')
  const activeOrder = demoOrders[0]
  function action(text: string) { setToast(text); setTimeout(() => setToast(''), 2300) }
  return <div className="role-app customer-app">
    <RoleHeader profile={profile} onLogout={onLogout} title="Área do cliente" />
    <main className="role-content customer-content">
      <section className="customer-hero"><div><span className="eyebrow">BEM-VINDO À SUA GARAGEM</span><h1>Olá, {profile.name.split(' ')[0]}.</h1><p>Acompanhe seu veículo e agende serviços sem precisar ligar.</p><button className="primary-btn" onClick={() => setView('booking')}><CalendarDays /> Agendar serviço</button></div><div className="vehicle-card"><span className="vehicle-art"><Car /></span><p><small>SEU VEÍCULO</small><strong>Honda Civic 2020</strong><span>BRA-2E19 · 48.320 km</span></p><button><ChevronRight /></button></div></section>
      {view === 'booking' ? <Booking onBack={() => setView('home')} onConfirm={() => { setView('home'); action('Agendamento confirmado para hoje às 10:00.') }} /> : view === 'history' ? <HistoryView onBack={() => setView('home')} /> : <>
        <section className="customer-grid"><article className="role-panel live-service"><div className="role-panel-head"><div><span className="eyebrow">ACOMPANHAMENTO EM TEMPO REAL</span><h2>{activeOrder.service}</h2><p>{activeOrder.code} · {activeOrder.vehicle}</p></div><span className="status green">Em execução</span></div><div className="customer-timeline">{['Veículo recebido','Checklist e diagnóstico','Orçamento aprovado','Serviço em andamento','Pronto para retirada'].map((step,index) => <div className={index < 4 ? 'done' : ''} key={step}><span>{index < 4 ? <Check /> : index + 1}</span><p><strong>{step}</strong><small>{index < 3 ? ['Hoje, 08:42','Hoje, 09:15','Hoje, 10:02'][index] : index === 3 ? 'Agora' : 'Pendente'}</small></p></div>)}</div><div className="live-actions"><button className="secondary-btn" onClick={() => action('Chat da ordem aberto.')}><MessageCircle /> Falar com a oficina</button><button className="primary-btn" onClick={() => action('Detalhes da ordem carregados.')}><FileText /> Ver detalhes</button></div></article>
          <aside className="customer-side"><article className="role-panel estimate-card"><ReceiptText /><span>Orçamento aprovado</span><strong>R$ 1.840,00</strong><small>Aprovado hoje às 10:02</small><button onClick={() => action('Orçamento aberto.')}>Visualizar orçamento <ChevronRight /></button></article><article className="role-panel quick-card"><h2>Acesso rápido</h2><button onClick={() => setView('history')}><History />Histórico do veículo<ChevronRight /></button><button onClick={() => action('Documentos do veículo carregados.')}><ClipboardCheck />Documentos e checklists<ChevronRight /></button><button onClick={() => action('Preferências abertas.')}><Settings2 />Preferências<ChevronRight /></button></article></aside>
        </section>
        <section className="role-panel next-care"><div><span className="eyebrow">PRÓXIMO CUIDADO</span><h2>Troca de óleo em aproximadamente 2.600 km</h2><p>Baseado no histórico e quilometragem do seu veículo.</p></div><Gauge /><button className="secondary-btn" onClick={() => setView('booking')}>Programar agora</button></section>
      </>}
    </main>
    <nav className="role-bottom-nav"><button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Home />Início</button><button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}><CalendarDays />Agendar</button><button onClick={() => action('Lista de serviços aberta.')}><Wrench />Serviços</button><button onClick={() => action('Mensagens abertas.')}><MessageCircle />Mensagens</button><button><UserRound />Perfil</button></nav><Toast text={toast} />
  </div>
}

function Booking({ onBack, onConfirm }: { onBack: () => void; onConfirm: () => void }) {
  const [service, setService] = useState('Troca de óleo')
  return <section className="role-panel booking"><button className="back-link" onClick={onBack}>← Voltar</button><span className="eyebrow">NOVO AGENDAMENTO</span><h1>Como podemos ajudar?</h1><p>Escolha o serviço, a data e conte brevemente o que está acontecendo.</p><div className="service-choices">{['Troca de óleo','Freios','Pneus','Diagnóstico','Ar-condicionado','Suspensão'].map((item,index) => <button className={service === item ? 'active' : ''} onClick={() => setService(item)} key={item}>{[<Gauge />,<Settings2 />,<Car />,<ClipboardCheck />,<Wrench />,<Settings2 />][index]}<span>{item}</span></button>)}</div><div className="booking-form"><label>Data<input type="date" defaultValue="2026-06-24" /></label><label>Horário<select defaultValue="10:00"><option>08:00</option><option>10:00</option><option>14:00</option><option>16:00</option></select></label><label className="wide">Descrição<textarea placeholder="Descreva o problema ou serviço desejado..." /></label></div><button className="primary-btn" onClick={onConfirm}><Check /> Confirmar agendamento</button></section>
}

function HistoryView({ onBack }: { onBack: () => void }) {
  return <section className="role-panel history-view"><button className="back-link" onClick={onBack}>← Voltar</button><span className="eyebrow">HISTÓRICO DO VEÍCULO</span><h1>Honda Civic 2020</h1><p>Todos os serviços registrados nesta oficina.</p>{demoOrders.slice(0,3).map((order,index) => <article key={order.id}><span className="history-icon"><Wrench /></span><div><strong>{['Revisão completa','Troca de óleo e filtros','Alinhamento e balanceamento'][index]}</strong><span>{['22/06/2026','10/04/2026','18/01/2026'][index]} · {order.code}</span></div><strong>{[1840,490,320][index].toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong><span className="status dark">Concluído</span></article>)}</section>
}
