import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, MessageSquare, FileText, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { icon: LayoutDashboard, label: 'Panel Principal', path: '/client/dashboard' },
  { icon: Briefcase,       label: 'Subir trabajo',   path: '/client/new-job' },
  { icon: MessageSquare,   label: 'Mensajes',         path: '/client/messages' },
  { icon: FileText,        label: 'Mis publicaciones', path: '/client/jobs' },
]

interface Props {
  onNavigate?: () => void
}

export default function SidebarClient({ onNavigate }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { clientProfile, signOut } = useAuth()

  const name = clientProfile?.full_name ?? ''
  const initial = name.charAt(0).toUpperCase()

  const handleNav = (path: string) => {
    navigate(path)
    onNavigate?.()
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8F5F3] flex items-center justify-center text-[#0D7B6B] font-bold text-sm shrink-0">
            {initial || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A2E] truncate">{name || 'Cliente'}</p>
            <p className="text-xs text-[#6B7280]">Estado: Cliente</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                active
                  ? 'bg-[#E8F5F3] text-[#0D7B6B] font-medium border-l-[3px] border-[#0D7B6B] pl-[9px] pr-3'
                  : 'text-[#6B7280] hover:bg-[#F8FAFC] px-3'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-2 border-t border-[#E5E7EB] space-y-1">
        <button
          onClick={() => handleNav('/client/settings')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6B7280] hover:bg-[#F8FAFC] transition-colors"
        >
          <Settings size={18} />
          <span>Configuración</span>
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}
