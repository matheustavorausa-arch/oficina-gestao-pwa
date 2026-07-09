import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

type AppNotification = {
  id: string
  title: string
  body: string
  service_order_id: string | null
  read_at: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.round(diff / 60000))
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function NotificationsBell({ profile, onOpenOrder }: { profile: UserProfile; onOpenOrder?: (serviceOrderId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const unread = useMemo(() => items.filter(item => !item.read_at).length, [items])

  async function loadNotifications() {
    if (!supabase || !profile.userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,title,body,service_order_id,read_at,created_at,metadata')
        .eq('user_id', profile.userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setItems((data ?? []) as AppNotification[])
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    if (!supabase) return
    const readAt = new Date().toISOString()
    setItems(current => current.map(item => item.id === id ? { ...item, read_at: readAt } : item))
    await supabase.from('notifications').update({ read_at: readAt }).eq('id', id)
  }

  async function markAllAsRead() {
    if (!supabase || !profile.userId || unread === 0) return
    const readAt = new Date().toISOString()
    const unreadIds = items.filter(item => !item.read_at).map(item => item.id)
    setItems(current => current.map(item => unreadIds.includes(item.id) ? { ...item, read_at: readAt } : item))
    await supabase.from('notifications').update({ read_at: readAt }).in('id', unreadIds).eq('user_id', profile.userId)
  }

  async function openNotification(item: AppNotification) {
    if (!item.read_at) await markAsRead(item.id)
    if (item.service_order_id && onOpenOrder) {
      onOpenOrder(item.service_order_id)
      setOpen(false)
    }
  }

  useEffect(() => {
    loadNotifications().catch(() => undefined)
  }, [profile.userId])

  useEffect(() => {
    if (!supabase || !profile.userId) return
    const client = supabase
    const channel = client
      .channel(`notifications-bell-${profile.userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.userId}` }, () => {
        loadNotifications().catch(() => undefined)
      })
      .subscribe()
    return () => { client.removeChannel(channel) }
  }, [profile.userId])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return <div className="notification-wrap" ref={wrapRef}>
    <button className="notification-trigger icon-btn" onClick={() => setOpen(current => !current)} title="Notifications">
      <Bell />
      {unread > 0 && <i />}
      {unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
    </button>
    {open && <div className="notification-popover">
      <div className="notification-head">
        <div><strong>Notifications</strong><span>{unread ? `${unread} unread` : 'All caught up'}</span></div>
        <button onClick={markAllAsRead} disabled={!unread}>Mark all read</button>
      </div>
      <div className="notification-list">
        {loading && <div className="notification-empty">Loading notifications...</div>}
        {!loading && items.length === 0 && <div className="notification-empty">No notifications yet.</div>}
        {!loading && items.map(item => <button key={item.id} className={item.read_at ? 'notification-item' : 'notification-item unread'} onClick={() => openNotification(item)}>
          <span className="notification-icon">{item.title.toLowerCase().includes('chat') ? <MessageCircle /> : <Bell />}</span>
          <p><strong>{item.title}</strong><span>{item.body}</span><small>{relativeTime(item.created_at)}</small></p>
          {!item.read_at && <em />}
        </button>)}
      </div>
      {items.length > 0 && <div className="notification-foot"><Check /> Notifications are private to this login.</div>}
    </div>}
  </div>
}
