import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  read: boolean
  reference_id: string | null
  created_at: string
}

export default function NotificationsDropdown() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch initial notifications and subscribe
  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setNotifications(data)
      }
      setLoading(false)
    }

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    fetchNotifications()
    fetchUnreadCount()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications()
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    }

    setOpen(false)

    // Navigate based on type
    const base = role === 'client' ? '/client' : '/worker'
    switch (notif.type) {
      case 'new_message':
        if (notif.reference_id) {
          navigate(`${base}/messages?application=${notif.reference_id}`)
        } else {
          navigate(`${base}/messages`)
        }
        break
      case 'new_application':
      case 'match_accepted':
      case 'job_finished':
      case 'review_pending':
        if (notif.reference_id) {
          navigate(`${base}/jobs/${notif.reference_id}`)
        } else {
          navigate(`${base}/jobs`)
        }
        break
      default:
        // fallback
        break
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    setOpen(false)

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative text-[#6B7280] hover:text-[#0D7B6B] transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificaciones"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
            <h3 className="font-semibold text-[#1A1A2E] text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#0D7B6B] hover:text-[#0A6A5C] transition-colors flex items-center gap-1 font-medium"
              >
                <Check size={14} />
                Marcar leídas
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-96">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 size={20} className="animate-spin text-[#0D7B6B]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#6B7280]">
                <Bell size={24} className="mx-auto text-[#D1D5DB] mb-2" />
                No tienes notificaciones
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#F9FAFB] transition-colors flex flex-col gap-1 ${
                      !notif.read ? 'bg-[#E8F5F3]/30' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm ${!notif.read ? 'font-semibold text-[#1A1A2E]' : 'font-medium text-[#4B5563]'}`}>
                        {notif.title}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#0D7B6B] shrink-0 mt-1.5 ml-2" />
                      )}
                    </div>
                    <p className={`text-xs ${!notif.read ? 'text-[#4B5563]' : 'text-[#6B7280]'}`}>
                      {notif.body}
                    </p>
                    <span className="text-[10px] text-[#9CA3AF] mt-1">
                      {formatTime(notif.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
