import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import {
  Lock,
  User,
  Mail,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Shield,
  MessageCircle,
  Smartphone,
} from 'lucide-react'

/* ─── Subcomponente: Sección con título ─────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-3 px-1">
        {title}
      </h2>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#F1F5F9]">
        {children}
      </div>
    </div>
  )
}

/* ─── Subcomponente: Fila de info (solo lectura) ────────────────────────── */
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-8 h-8 rounded-lg bg-[#E8F5F3] flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[#0D7B6B]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#6B7280] font-medium">{label}</p>
        <p className="text-sm font-semibold text-[#1A1A2E] truncate">{value}</p>
      </div>
    </div>
  )
}

/* ─── Subcomponente: Fila acción (con flecha) ───────────────────────────── */
function ActionRow({
  icon: Icon,
  label,
  sublabel,
  onClick,
}: {
  icon: any
  label: string
  sublabel?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-[#E8F5F3] flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[#0D7B6B]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#1A1A2E]">{label}</p>
        {sublabel && <p className="text-xs text-[#6B7280] mt-0.5">{sublabel}</p>}
      </div>
      <ChevronRight size={16} className="text-[#9CA3AF]" />
    </button>
  )
}

/* ─── Subcomponente: Toggle row (para 2FA simulado) ─────────────────────── */
function ToggleRow({
  icon: Icon,
  label,
  sublabel,
  enabled,
  onToggle,
}: {
  icon: any
  label: string
  sublabel?: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-8 h-8 rounded-lg bg-[#E8F5F3] flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[#0D7B6B]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#1A1A2E]">{label}</p>
        {sublabel && <p className="text-xs text-[#6B7280] mt-0.5">{sublabel}</p>}
      </div>
      {/* Toggle switch */}
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${
          enabled ? 'bg-[#0D7B6B]' : 'bg-[#D1D5DB]'
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

/* ─── Subcomponente: Fila decorativa (sin navegación) ───────────────────── */
function StaticLinkRow({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: any
  label: string
  sublabel?: string
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 group transition-colors hover:bg-[#F0FDF9] cursor-default">
      <div className="w-8 h-8 rounded-lg bg-[#E8F5F3] group-hover:bg-[#D1EDE8] flex items-center justify-center shrink-0 transition-colors">
        <Icon size={16} className="text-[#0D7B6B]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#1A1A2E] group-hover:text-[#0D7B6B] transition-colors">
          {label}
        </p>
        {sublabel && <p className="text-xs text-[#6B7280] mt-0.5">{sublabel}</p>}
      </div>
    </div>
  )
}

/* ─── Página principal ──────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user, role, clientProfile, workerProfile } = useAuth()
  const { showToast } = useToast()

  // Cambio de contraseña
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // 2FA simulado (estado guardado en localStorage)
  const [twoFAEnabled, setTwoFAEnabled] = useState<boolean>(
    () => localStorage.getItem('altoque_2fa') === 'true'
  )

  const profile = role === 'client' ? clientProfile : workerProfile
  const displayName = profile?.full_name ?? user?.email ?? '—'
  const email = user?.email ?? '—'
  const accountType = role === 'worker' ? 'Trabajador' : 'Cliente'

  /* Cambiar contraseña */
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showToast('Completa todos los campos', 'error')
      return
    }
    if (newPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error')
      return
    }
    try {
      setSavingPassword(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showToast('¡Contraseña actualizada con éxito!', 'success')
      setShowPasswordForm(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  /* Toggle 2FA simulado */
  const handleToggle2FA = () => {
    const next = !twoFAEnabled
    setTwoFAEnabled(next)
    localStorage.setItem('altoque_2fa', String(next))
    showToast(
      next
        ? '✅ Verificación en dos pasos activada'
        : 'Verificación en dos pasos desactivada',
      next ? 'success' : 'error'
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Encabezado */}
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E]">Configuración</h1>
        <p className="text-sm text-[#6B7280] mt-1">Administra tu cuenta y preferencias</p>
      </div>

      {/* ── Cuenta ──────────────────────────────────────────────── */}
      <Section title="Tu cuenta">
        <InfoRow icon={User} label="Nombre completo" value={displayName} />
        <InfoRow icon={Mail} label="Correo electrónico" value={email} />
        <InfoRow icon={User} label="Tipo de cuenta" value={accountType} />
      </Section>

      {/* ── Seguridad ───────────────────────────────────────────── */}
      <Section title="Seguridad">
        {/* Cambiar contraseña */}
        <ActionRow
          icon={Lock}
          label="Cambiar contraseña"
          sublabel="Actualiza tu contraseña de acceso"
          onClick={() => setShowPasswordForm(v => !v)}
        />

        {/* Formulario de cambio de contraseña (inline) */}
        {showPasswordForm && (
          <div className="px-5 py-4 bg-[#F8FAFC] space-y-3">
            <Input
              label="Nueva contraseña"
              type={showNew ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              rightElement={
                <button type="button" onClick={() => setShowNew(v => !v)} className="text-[#9CA3AF] hover:text-[#1A1A2E] transition-colors">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <Input
              label="Confirmar nueva contraseña"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              rightElement={
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-[#9CA3AF] hover:text-[#1A1A2E] transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <div className="flex gap-2 pt-1">
              <Button onClick={handleChangePassword} loading={savingPassword} className="flex-1">
                Guardar contraseña
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword('') }}
                disabled={savingPassword}
                className="flex-1 bg-white"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* 2FA simulado */}
        <ToggleRow
          icon={Smartphone}
          label="Verificación en dos pasos"
          sublabel={twoFAEnabled ? 'Activada — tu cuenta está protegida' : 'Desactivada — te recomendamos activarla'}
          enabled={twoFAEnabled}
          onToggle={handleToggle2FA}
        />
      </Section>

      {/* ── Ayuda y Soporte ─────────────────────────────────────── */}
      <Section title="Ayuda y soporte">
        <StaticLinkRow
          icon={MessageCircle}
          label="Contactar soporte"
          sublabel="Escríbenos por WhatsApp"
        />
        <StaticLinkRow
          icon={FileText}
          label="Términos y condiciones"
          sublabel="Lee nuestras condiciones de uso"
        />
        <StaticLinkRow
          icon={Shield}
          label="Política de privacidad"
          sublabel="Cómo protegemos tus datos"
        />
      </Section>

      {/* ── Versión ─────────────────────────────────────────────── */}
      <p className="text-center text-xs text-[#9CA3AF] pt-2">
        AlToque · v1.0.0
      </p>
    </div>
  )
}
