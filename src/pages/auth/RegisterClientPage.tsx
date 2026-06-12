import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ProgressBar from '../../components/ui/ProgressBar'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { useToast } from '../../components/ui/Toast'

// ── Constantes ────────────────────────────────────────────────

const DISTRITOS: Record<string, string[]> = {
  Callao: [
    'Bellavista',
    'Callao',
    'Carmen de la Legua',
    'La Perla',
    'La Punta',
    'Mi Perú',
    'Ventanilla',
  ],
  Lima: [
    'Ate',
    'Barranco',
    'Breña',
    'Carabayllo',
    'Chorrillos',
    'Comas',
    'El Agustino',
    'Independencia',
    'Jesús María',
    'La Molina',
    'La Victoria',
    'Lima',
    'Lince',
    'Los Olivos',
    'Lurín',
    'Magdalena del Mar',
    'Miraflores',
    'Pachacámac',
    'Pueblo Libre',
    'Puente Piedra',
    'Rímac',
    'San Borja',
    'San Isidro',
    'San Juan de Lurigancho',
    'San Juan de Miraflores',
    'San Luis',
    'San Martín de Porres',
    'San Miguel',
    'Santa Anita',
    'Santiago de Surco',
    'Surquillo',
    'Villa El Salvador',
    'Villa María del Triunfo',
  ],
}

function mapError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos'
  if (msg.includes('already been registered') || msg.includes('already registered'))
    return 'Este correo ya tiene una cuenta'
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 8 caracteres'
  return 'Ocurrió un error. Intenta de nuevo.'
}

// ── Modal Términos ────────────────────────────────────────────

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1A1A2E] text-lg">Términos y Condiciones</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1A1A2E]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-sm text-[#6B7280] space-y-3 leading-relaxed">
          <p>
            Al registrarte en Al Toque aceptas estos términos de uso de la plataforma. Al Toque
            actúa únicamente como facilitador entre clientes y trabajadores independientes.
          </p>
          <p>
            La plataforma no contrata ni subcontrata trabajadores. Toda relación contractual es
            directamente entre el cliente y el trabajador.
          </p>
          <p className="text-[#9CA3AF] italic">
            Texto completo próximamente disponible.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-[#0D7B6B] text-white rounded-lg font-semibold text-sm hover:bg-[#0A6558] transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export default function RegisterClientPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [step, setStep] = useState(2)
  const [isOAuth, setIsOAuth] = useState(false)
  const [oauthEmail, setOauthEmail] = useState('')

  // Paso 2 — Datos de cuenta
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Paso 3 — Datos de perfil
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('Callao')
  const [district, setDistrict] = useState('')

  // Paso 4 — Confirmación
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Detectar si el usuario ya se autenticó con Google
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role
        if (role === 'client') {
          navigate('/client/dashboard')
          return
        }
        // Vino de OAuth sin rol → saltar al paso 3
        setFullName(session.user.user_metadata?.full_name ?? '')
        setOauthEmail(session.user.email ?? '')
        setIsOAuth(true)
        setStep(3)
      }
    })
  }, [navigate])

  // Resetear distrito cuando cambia la provincia
  useEffect(() => {
    setDistrict('')
  }, [province])

  // ── Validaciones ────────────────────────────

  function validateStep2() {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 3)
      e.fullName = 'Ingresa tu nombre completo (mín. 3 caracteres)'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Ingresa un correo válido'
    if (!password || password.length < 8)
      e.password = 'La contraseña debe tener al menos 8 caracteres'
    if (password !== confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep3() {
    const e: Record<string, string> = {}
    if (!district) e.district = 'Selecciona un distrito'
    if (phone && !/^\d{9}$/.test(phone)) e.phone = 'El teléfono debe tener 9 dígitos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Handlers ───────────────────────────────

  const handleGoogleOAuth = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/register/client` },
    })
    if (error) {
      showToast(mapError(error.message), 'error')
      setGoogleLoading(false)
    }
  }

  const handleStep2Next = () => {
    if (!validateStep2()) return
    setStep(3)
  }

  const handleStep3Next = () => {
    if (!validateStep3()) return
    setStep(4)
  }

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setErrors({ terms: 'Debes aceptar los términos y condiciones' })
      return
    }
    setSubmitting(true)
    try {
      let uid: string

      if (isOAuth) {
        // Usuario ya autenticado con Google — solo actualizar metadata
        const { data, error } = await supabase.auth.getUser()
        if (error || !data.user) throw new Error('No se encontró la sesión')
        uid = data.user.id
        await supabase.auth.updateUser({
          data: { role: 'client', full_name: fullName || data.user.user_metadata?.full_name },
        })
      } else {
        // Registro con email/contraseña
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: 'client', full_name: fullName } },
        })
        if (error) throw error
        if (!data.user) throw new Error('No se pudo crear la cuenta')
        uid = data.user.id
      }

      // Insertar perfil de cliente
      const { error: profileError } = await supabase.from('client_profiles').insert({
        id: uid,
        full_name: fullName,
        phone: phone || null,
        province,
        district,
      })
      if (profileError) throw profileError

      showToast(
        '¡Bienvenido a Al Toque! Revisa tu email para confirmar tu cuenta.',
        'success',
      )
      navigate('/client/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      showToast(mapError(msg), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AuthNavbar />

      <div className="w-full px-4 sm:px-6">
        <ProgressBar current={step} total={4} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Encabezado del paso */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-[#0D7B6B] uppercase tracking-widest">
              PASO {step} DE 4
            </p>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">
              {step === 2 && 'Crea tu cuenta'}
              {step === 3 && 'Datos de perfil'}
              {step === 4 && 'Confirmación'}
            </h1>
          </div>

          {/* ── PASO 2 — Datos de cuenta ── */}
          {step === 2 && (
            <div className="space-y-4">
              {isOAuth ? (
                <div className="bg-[#E8F5F3] border border-[#0D7B6B]/30 rounded-xl p-4 text-sm text-[#0D7B6B] font-medium">
                  Cuenta Google conectada: {oauthEmail}
                </div>
              ) : (
                <>
                  <Input
                    label="Nombre completo"
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    error={errors.fullName}
                  />
                  <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    error={errors.email}
                  />
                  <Input
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    error={errors.password}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="text-[#6B7280] hover:text-[#1A1A2E]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <Input
                    label="Confirmar contraseña"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="text-[#6B7280] hover:text-[#1A1A2E]"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                    <span className="text-xs text-[#6B7280]">O regístrate con</span>
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    loading={googleLoading}
                    onClick={handleGoogleOAuth}
                    className="w-full gap-3"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continuar con Google
                  </Button>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => navigate('/register')}>
                  ← Atrás
                </Button>
                <Button onClick={handleStep2Next}>Siguiente →</Button>
              </div>
            </div>
          )}

          {/* ── PASO 3 — Datos de perfil ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                  Teléfono{' '}
                  <span className="text-[#6B7280] font-normal">(opcional)</span>
                </label>
                <div className="flex">
                  <span className="px-3 py-2.5 border border-r-0 border-[#E5E7EB] rounded-l-lg bg-gray-50 text-sm text-[#6B7280] flex items-center select-none">
                    +51
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="987654321"
                    className={`flex-1 border ${errors.phone ? 'border-[#EF4444]' : 'border-[#E5E7EB]'} rounded-r-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]`}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-[#EF4444]">{errors.phone}</p>}
                {phone && !errors.phone && (
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Te contactaremos por este número si hay novedades
                  </p>
                )}
              </div>

              {/* Provincia */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                  Provincia
                </label>
                <select
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-white"
                >
                  <option value="Callao">Callao</option>
                  <option value="Lima">Lima</option>
                </select>
              </div>

              {/* Distrito */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                  Distrito
                </label>
                <select
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className={`w-full border ${errors.district ? 'border-[#EF4444]' : 'border-[#E5E7EB]'} rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-white`}
                >
                  <option value="">Selecciona un distrito</option>
                  {DISTRITOS[province].map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.district && (
                  <p className="mt-1 text-xs text-[#EF4444]">{errors.district}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  ← Atrás
                </Button>
                <Button onClick={handleStep3Next}>Siguiente →</Button>
              </div>
            </div>
          )}

          {/* ── PASO 4 — Confirmación y términos ── */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="bg-[#F0F4F7] rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-[#1A1A2E] mb-3">Resumen de tu cuenta</p>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Nombre</span>
                  <span className="text-[#1A1A2E] font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Correo</span>
                  <span className="text-[#1A1A2E] font-medium">{isOAuth ? oauthEmail : email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Provincia</span>
                  <span className="text-[#1A1A2E] font-medium">{province}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Distrito</span>
                  <span className="text-[#1A1A2E] font-medium">{district}</span>
                </div>
              </div>

              {/* Términos */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0D7B6B]"
                  />
                  <span className="text-sm text-[#6B7280]">
                    Acepto los{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#0D7B6B] hover:underline font-medium"
                    >
                      Términos y Condiciones
                    </button>{' '}
                    y la{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#0D7B6B] hover:underline font-medium"
                    >
                      Política de Privacidad
                    </button>
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1 text-xs text-[#EF4444]">{errors.terms}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  ← Atrás
                </Button>
                <Button onClick={handleSubmit} loading={submitting} disabled={!termsAccepted}>
                  Crear mi cuenta
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}
    </div>
  )
}
