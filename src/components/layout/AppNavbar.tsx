import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, UserCircle, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import NotificationsDropdown from './NotificationsDropdown'

interface Props {
  role: 'client' | 'worker'
  onMenuToggle: () => void
}

export default function AppNavbar({ role, onMenuToggle }: Props) {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const dashboardPath = role === 'client' ? '/client/dashboard' : '/worker/dashboard'
  const messagesPath = role === 'client' ? '/client/messages' : '/worker/messages'
  const profilePath = role === 'client' ? '/client/profile' : '/worker/profile'
  const settingsPath = role === 'client' ? '/client/settings' : '/worker/settings'

  useEffect(() => {
    if (!user) return

    const fetchUnreadMsgCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'new_message')
        .eq('read', false)

      if (!error && count !== null) {
        setUnreadMsgCount(count)
      }
    }

    fetchUnreadMsgCount()

    // Suscribirse a cambios de notificaciones en tiempo real para actualizar el badge
    const channel = supabase
      .channel('navbar-unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadMsgCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden text-[#6B7280] hover:text-[#0D7B6B] transition-colors"
          onClick={onMenuToggle}
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
        <span
          className="text-xl font-bold text-[#0D7B6B] cursor-pointer select-none"
          onClick={() => navigate(dashboardPath)}
        >
          Al Toque
        </span>
      </div>

      <div className="flex items-center gap-5">
        <NotificationsDropdown />

        <button
          className="relative text-[#6B7280] hover:text-[#0D7B6B] transition-colors"
          onClick={() => navigate(messagesPath)}
          aria-label="Mensajes"
        >
          <MessageSquare size={22} />
          {unreadMsgCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-medium">
              {unreadMsgCount}
            </span>
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            className="text-[#6B7280] hover:text-[#0D7B6B] transition-colors"
            onClick={() => setDropdownOpen(prev => !prev)}
            aria-label="Perfil"
          >
            <UserCircle size={22} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-10 w-44 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 z-50">
              <button
                className="w-full text-left px-4 py-2 text-sm text-[#1A1A2E] hover:bg-[#F8FAFC] transition-colors"
                onClick={() => { navigate(profilePath); setDropdownOpen(false) }}
              >
                Mi perfil
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-[#1A1A2E] hover:bg-[#F8FAFC] transition-colors"
                onClick={() => { navigate(settingsPath); setDropdownOpen(false) }}
              >
                Configuración
              </button>
              <hr className="my-1 border-[#E5E7EB]" />
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                onClick={handleSignOut}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
