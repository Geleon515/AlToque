import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  ClipboardList,
  CreditCard,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import type { SubscriptionPlan } from '../../lib/types'

const navItems = [
  { icon: LayoutDashboard, label: 'Panel Principal', path: '/worker/dashboard' },
  { icon: Briefcase,       label: 'Ver puestos',     path: '/worker/jobs' },
  { icon: MessageSquare,   label: 'Mensajes',         path: '/worker/messages' },
  { icon: ClipboardList,   label: 'Seguimiento',      path: '/worker/tracking' },
  { icon: CreditCard,      label: 'Suscripción',      path: '/worker/subscription' },
]

interface Props {
  onNavigate?: () => void
}

export default function SidebarWorker({ onNavigate }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { workerProfile, signOut } = useAuth()
  const [plan, setPlan] = useState<SubscriptionPlan>('basic')

  useEffect(() => {
    if (!workerProfile?.id) return
    supabase
      .from('subscriptions')
      .select('plan')
      .eq('worker_id', workerProfile.id)
      .eq('status', 'active')
      .single()
      .then(({ data }) => {
        if (data?.plan) setPlan(data.plan as SubscriptionPlan)
      })
  }, [workerProfile?.id])

  const name = workerProfile?.full_name ?? ''
  const initial = name.charAt(0).toUpperCase()
  const isVerified = workerProfile?.identity_verified ?? false

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
          <div className="w-10 h-10 rounded-full bg-[#E8F5F3] flex items-center justify-center text-[#0D7B6B] font-bold text-sm shrink-0 overflow-hidden">
            {workerProfile?.avatar_url ? (
              <img src={workerProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initial || '?'
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1A1A2E] truncate">Panel de Control</p>
            {isVerified ? (
              <p className="text-xs text-[#10B981]">Estado: Verificado</p>
            ) : (
              <p className="text-xs text-[#F59E0B]">Estado: Pendiente</p>
            )}
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
        {plan === 'basic' && (
          <button
            onClick={() => handleNav('/worker/subscription')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white bg-[#1E293B] hover:bg-[#0F172A] transition-colors font-medium"
          >
            <Zap size={16} />
            <span>Mejorar Plan</span>
          </button>
        )}
        <button
          onClick={() => handleNav('/worker/settings')}
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
