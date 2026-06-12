import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageSquare, UserCircle, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  role: 'client' | 'worker'
  onMenuToggle: () => void
  notificationCount?: number
}

export default function AppNavbar({ role, onMenuToggle, notificationCount }: Props) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const dashboardPath = role === 'client' ? '/client/dashboard' : '/worker/dashboard'
  const messagesPath = role === 'client' ? '/client/messages' : '/worker/messages'
  const profilePath = role === 'client' ? '/client/profile' : '/worker/profile'
  const settingsPath = role === 'client' ? '/client/settings' : '/worker/settings'

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
        <button
          className="relative text-[#6B7280] hover:text-[#0D7B6B] transition-colors"
          aria-label="Notificaciones"
        >
          <Bell size={22} />
          {notificationCount && notificationCount > 0 ? (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          ) : null}
        </button>

        <button
          className="text-[#6B7280] hover:text-[#0D7B6B] transition-colors"
          onClick={() => navigate(messagesPath)}
          aria-label="Mensajes"
        >
          <MessageSquare size={22} />
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
