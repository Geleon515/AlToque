import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, MapPin, Upload, CheckCircle2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ProgressBar from '../../components/ui/ProgressBar'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { useToast } from '../../components/ui/Toast'
import type { Category } from '../../lib/types'

// ── Constantes ────────────────────────────────────────────────

const DISTRITOS: Record<string, string[]> = {
  Callao: [
    'Bellavista', 'Callao', 'Carmen de la Legua', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla',
  ],
  Lima: [
    'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chorrillos', 'Comas', 'El Agustino',
    'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lima', 'Lince', 'Los Olivos',
    'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pueblo Libre', 'Puente Piedra',
    'Rímac', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores',
    'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santiago de Surco',
    'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo',
  ],
}

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Bellavista: { lat: -12.0566, lng: -77.1159 },
  Callao: { lat: -12.0553, lng: -77.135 },
  'Carmen de la Legua': { lat: -12.0386, lng: -77.0969 },
  'La Perla': { lat: -12.0681, lng: -77.1039 },
  'La Punta': { lat: -12.0765, lng: -77.1579 },
  'Mi Perú': { lat: -11.8613, lng: -77.1242 },
  Ventanilla: { lat: -11.8762, lng: -77.1381 },
  Ate: { lat: -12.0279, lng: -76.9014 },
  Barranco: { lat: -12.1468, lng: -77.0218 },
  Breña: { lat: -12.0647, lng: -77.0487 },
  Carabayllo: { lat: -11.8706, lng: -77.0261 },
  Chorrillos: { lat: -12.1715, lng: -77.0149 },
  Comas: { lat: -11.9367, lng: -77.046 },
  'El Agustino': { lat: -12.0492, lng: -77.0025 },
  Independencia: { lat: -11.988, lng: -77.057 },
  'Jesús María': { lat: -12.0755, lng: -77.0495 },
  'La Molina': { lat: -12.0843, lng: -76.9368 },
  'La Victoria': { lat: -12.0711, lng: -77.0219 },
  Lima: { lat: -12.0464, lng: -77.0428 },
  Lince: { lat: -12.0872, lng: -77.0343 },
  'Los Olivos': { lat: -11.9689, lng: -77.0608 },
  Lurín: { lat: -12.2787, lng: -76.8784 },
  'Magdalena del Mar': { lat: -12.0942, lng: -77.0704 },
  Miraflores: { lat: -12.1196, lng: -77.0281 },
  Pachacámac: { lat: -12.2311, lng: -76.8685 },
  'Pueblo Libre': { lat: -12.0774, lng: -77.063 },
  'Puente Piedra': { lat: -11.8673, lng: -77.0755 },
  Rímac: { lat: -12.0317, lng: -77.032 },
  'San Borja': { lat: -12.1061, lng: -77.0001 },
  'San Isidro': { lat: -12.0985, lng: -77.048 },
  'San Juan de Lurigancho': { lat: -11.9869, lng: -77.0025 },
  'San Juan de Miraflores': { lat: -12.1554, lng: -76.971 },
  'San Luis': { lat: -12.0828, lng: -76.9879 },
  'San Martín de Porres': { lat: -11.984, lng: -77.0877 },
  'San Miguel': { lat: -12.0769, lng: -77.0856 },
  'Santa Anita': { lat: -12.0476, lng: -76.9718 },
  'Santiago de Surco': { lat: -12.1482, lng: -76.9967 },
  Surquillo: { lat: -12.1124, lng: -77.0198 },
  'Villa El Salvador': { lat: -12.2138, lng: -76.9353 },
  'Villa María del Triunfo': { lat: -12.1874, lng: -76.9461 },
}

const CATEGORY_ICONS: Record<string, string> = {
  Plomería: '🔧',
  Electricidad: '⚡',
  Limpieza: '🧹',
  Carpintería: '🪚',
  Mudanza: '📦',
  'Otros Servicios': '🛠️',
  Otros: '🛠️',
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
            Al registrarte en Al Toque como trabajador aceptas los términos de uso. Al Toque actúa
            únicamente como facilitador entre clientes y trabajadores independientes.
          </p>
          <p>
            La plataforma no te contrata ni te subcontrata. Toda relación contractual es
            directamente entre tú y el cliente.
          </p>
          <p className="text-[#9CA3AF] italic">Texto completo próximamente disponible.</p>
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

// ── File Upload Area ──────────────────────────────────────────

function FileUploadArea({
  label,
  accept,
  multiple,
  files,
  onFiles,
}: {
  label: string
  accept: string
  multiple?: boolean
  files: File[]
  onFiles: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    onFiles(multiple ? [...files, ...selected] : [selected[0]])
  }

  const removeFile = (i: number) => {
    onFiles(files.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <p className="text-sm font-medium text-[#1A1A2E] mb-1.5">{label}</p>
      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-[#E8F5F3] rounded-lg px-3 py-2 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="flex-1 truncate text-[#1A1A2E]">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-[#6B7280] hover:text-[#EF4444]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {multiple && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs text-[#0D7B6B] hover:underline"
            >
              + Agregar otro archivo
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-[#E5E7EB] rounded-xl p-5 flex flex-col items-center gap-2 hover:border-[#0D7B6B]/50 hover:bg-[#E8F5F3]/30 transition-colors"
        >
          <Upload className="w-6 h-6 text-[#6B7280]" />
          <span className="text-sm text-[#6B7280]">
            Arrastra o haz clic para subir
          </span>
          <span className="text-xs text-[#9CA3AF]">Máx. 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export default function RegisterWorkerPage() {
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
  const [dni, setDni] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')

  // Paso 3 — Especialidades y zona
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [coverageProvince, setCoverageProvince] = useState('Callao')
  const [coverageDistrict, setCoverageDistrict] = useState('')

  // Paso 4 — Ubicación
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsDenied, setGpsDenied] = useState(false)
  const [manualDistrict, setManualDistrict] = useState('')
  const [manualProvince, setManualProvince] = useState('Callao')

  // Paso 5 — Documentos
  const [dniFiles, setDniFiles] = useState<File[]>([])
  const [antecedentesFiles, setAntecedentesFiles] = useState<File[]>([])
  const [certificadoFiles, setCertificadoFiles] = useState<File[]>([])

  // Paso 6 — Confirmación
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [googleLoading, setGoogleLoading] = useState(false)

  // Detectar sesión OAuth al montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role
        if (role === 'worker') {
          navigate('/worker/dashboard')
          return
        }
        setFullName(session.user.user_metadata?.full_name ?? '')
        setOauthEmail(session.user.email ?? '')
        setIsOAuth(true)
        setStep(3)
      }
    })
  }, [navigate])

  // Cargar categorías al montar
  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .then(({ data }) => {
        if (data) setCategories(data)
      })
  }, [])

  // Resetear distrito de cobertura cuando cambia la provincia
  useEffect(() => {
    setCoverageDistrict('')
  }, [coverageProvince])

  useEffect(() => {
    setManualDistrict('')
  }, [manualProvince])

  // ── Validaciones ────────────────────────────

  function validateStep2(): boolean {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 3)
      e.fullName = 'Ingresa tu nombre completo (mín. 3 caracteres)'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Ingresa un correo válido'
    if (!password || password.length < 8)
      e.password = 'La contraseña debe tener al menos 8 caracteres'
    if (password !== confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    if (!dni || !/^\d{8}$/.test(dni)) e.dni = 'El DNI debe tener 8 dígitos'
    if (!phone || !/^\d{9}$/.test(phone)) e.phone = 'El teléfono debe tener 9 dígitos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {}
    if (selectedCategoryIds.length === 0)
      e.categories = 'Selecciona al menos una especialidad'
    if (!coverageDistrict) e.coverageDistrict = 'Selecciona tu zona de cobertura'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep4(): boolean {
    const hasLocation =
      gpsLocation !== null || (manualDistrict !== '' && DISTRICT_COORDS[manualDistrict])
    if (!hasLocation) {
      setErrors({ location: 'Indica tu ubicación para continuar' })
      return false
    }
    setErrors({})
    return true
  }

  function validateStep5(): boolean {
    const e: Record<string, string> = {}
    if (dniFiles.length === 0) e.dniFile = 'Sube una foto de tu DNI'
    if (antecedentesFiles.length === 0)
      e.antecedentesFile = 'Sube tu certificado de antecedentes policiales'
    if (certificadoFiles.length === 0)
      e.certificadoFile = 'Sube al menos un certificado o diploma'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Handlers ───────────────────────────────

  const handleGoogleOAuth = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/register/worker` },
    })
    if (error) {
      showToast(mapError(error.message), 'error')
      setGoogleLoading(false)
    }
  }

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    )
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (!trimmed || tags.includes(trimmed) || tags.length >= 10) return
    setTags(prev => [...prev, trimmed])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleGetLocation = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsDenied(false)
        setGpsLoading(false)
      },
      () => {
        setGpsDenied(true)
        setGpsLoading(false)
      },
    )
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
        const { data, error } = await supabase.auth.getUser()
        if (error || !data.user) throw new Error('No se encontró la sesión')
        uid = data.user.id
        await supabase.auth.updateUser({
          data: { role: 'worker', full_name: fullName || data.user.user_metadata?.full_name },
        })
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: 'worker', full_name: fullName } },
        })
        if (error) throw error
        if (!data.user) throw new Error('No se pudo crear la cuenta')
        uid = data.user.id
      }

      // Calcular string de ubicación
      let locationStr: string | null = null
      if (gpsLocation) {
        locationStr = `POINT(${gpsLocation.lng} ${gpsLocation.lat})`
      } else if (manualDistrict && DISTRICT_COORDS[manualDistrict]) {
        const { lat, lng } = DISTRICT_COORDS[manualDistrict]
        locationStr = `POINT(${lng} ${lat})`
      }

      // Insertar worker_profile (id = uid porque el PK referencia auth.users)
      const { error: profileError } = await supabase
        .from('worker_profiles')
        .insert({
          id: uid,
          full_name: fullName,
          phone: phone || null,
          dni,
          bio: bio || null,
          coverage_zone: coverageDistrict || 'Callao',
          location: locationStr,
        })
      if (profileError) throw profileError

      // Insertar especialidades (worker_id = uid)
      if (selectedCategoryIds.length > 0) {
        const { error: specError } = await supabase
          .from('worker_specialties')
          .insert(
            selectedCategoryIds.map(category_id => ({
              worker_id: uid,
              category_id,
            })),
          )
        if (specError) throw specError
      }

      // Insertar tags (worker_id = uid)
      if (tags.length > 0) {
        const { error: tagsError } = await supabase
          .from('worker_tags')
          .insert(tags.map(tag => ({ worker_id: uid, tag })))
        if (tagsError) throw tagsError
      }

      // Subir documentos a Storage y guardar paths en worker_profiles
      const docPaths: {
        dni_doc_path?: string
        antecedentes_doc_path?: string
        certificados_doc_paths?: string[]
      } = {}

      if (dniFiles[0]) {
        const path = `${uid}/dni_${Date.now()}`
        const { error: uploadErr } = await supabase.storage
          .from('worker-documents')
          .upload(path, dniFiles[0], { upsert: true })
        if (uploadErr) throw uploadErr
        docPaths.dni_doc_path = path
      }

      if (antecedentesFiles[0]) {
        const path = `${uid}/antecedentes_${Date.now()}`
        const { error: uploadErr } = await supabase.storage
          .from('worker-documents')
          .upload(path, antecedentesFiles[0], { upsert: true })
        if (uploadErr) throw uploadErr
        docPaths.antecedentes_doc_path = path
      }

      if (certificadoFiles.length > 0) {
        const certPaths: string[] = []
        for (let i = 0; i < certificadoFiles.length; i++) {
          const path = `${uid}/certificado_${i}_${Date.now()}`
          const { error: uploadErr } = await supabase.storage
            .from('worker-documents')
            .upload(path, certificadoFiles[i], { upsert: true })
          if (uploadErr) throw uploadErr
          certPaths.push(path)
        }
        docPaths.certificados_doc_paths = certPaths
      }

      if (Object.keys(docPaths).length > 0) {
        const { error: pathsError } = await supabase
          .from('worker_profiles')
          .update(docPaths)
          .eq('id', uid)
        if (pathsError) throw pathsError
      }

      showToast('¡Perfil activado! Ya puedes ver trabajos en tu zona.', 'success')
      navigate('/worker/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      showToast(mapError(msg), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────

  const TOTAL_STEPS = 6

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AuthNavbar />

      <div className="w-full px-4 sm:px-6">
        <ProgressBar current={step} total={TOTAL_STEPS} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Encabezado */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-[#0D7B6B] uppercase tracking-widest">
              PASO {step} DE {TOTAL_STEPS}
            </p>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">
              {step === 2 && 'Crea tu cuenta'}
              {step === 3 && 'Especialidades y zona'}
              {step === 4 && 'Tu ubicación'}
              {step === 5 && 'Documentos de verificación'}
              {step === 6 && 'Confirmación'}
            </h1>
            {step === 5 && (
              <p className="text-sm text-[#6B7280]">
                Subir estos documentos activa tu perfil públicamente.
              </p>
            )}
          </div>

          {/* ── PASO 2 — Cuenta ── */}
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
                    placeholder="Ej. Roberto Mamani"
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
                </>
              )}

              {/* DNI y teléfono siempre visibles */}
              <Input
                label="DNI"
                type="text"
                placeholder="12345678"
                maxLength={8}
                value={dni}
                onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                error={errors.dni}
              />

              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                  Teléfono
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
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                  Sobre mí{' '}
                  <span className="text-[#6B7280] font-normal">(opcional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 300))}
                  placeholder="Cuéntanos sobre tu experiencia y habilidades..."
                  rows={3}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] resize-none focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]"
                />
                <p className="text-right text-xs text-[#9CA3AF] mt-1">{bio.length}/300</p>
              </div>

              {!isOAuth && (
                <>
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
                <Button onClick={() => { if (isOAuth || validateStep2()) setStep(3) }}>
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* ── PASO 3 — Especialidades y zona ── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Especialidades */}
              <div>
                <p className="text-sm font-medium text-[#1A1A2E] mb-2">
                  Especialidades{' '}
                  <span className="text-[#6B7280] font-normal">(selecciona al menos una)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => {
                    const selected = selectedCategoryIds.includes(cat.id)
                    const icon = CATEGORY_ICONS[cat.name] ?? '🔨'
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`rounded-xl border-2 p-3 text-left transition-all flex items-center gap-2 ${
                          selected
                            ? 'border-[#0D7B6B] bg-[#E8F5F3]'
                            : 'border-[#E5E7EB] bg-white hover:border-[#0D7B6B]/40'
                        }`}
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm font-medium text-[#1A1A2E]">{cat.name}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.categories && (
                  <p className="mt-1 text-xs text-[#EF4444]">{errors.categories}</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                  Tags de especialidad{' '}
                  <span className="text-[#6B7280] font-normal">(opcional, máx. 10)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Ej: Tableros Eléctricos"
                    disabled={tags.length >= 10}
                    className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={!tagInput.trim() || tags.length >= 10}
                    className="shrink-0 px-3"
                  >
                    + Agregar
                  </Button>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1">Presiona Enter o el botón para agregar</p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 bg-[#E8F5F3] text-[#0D7B6B] text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-[#0A6558]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Zona de cobertura */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                    Provincia de cobertura
                  </label>
                  <select
                    value={coverageProvince}
                    onChange={e => setCoverageProvince(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-white"
                  >
                    <option value="Callao">Callao</option>
                    <option value="Lima">Lima</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                    Distrito de cobertura
                  </label>
                  <select
                    value={coverageDistrict}
                    onChange={e => setCoverageDistrict(e.target.value)}
                    className={`w-full border ${errors.coverageDistrict ? 'border-[#EF4444]' : 'border-[#E5E7EB]'} rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-white`}
                  >
                    <option value="">Seleccionar</option>
                    {DISTRITOS[coverageProvince].map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {errors.coverageDistrict && (
                    <p className="mt-1 text-xs text-[#EF4444]">{errors.coverageDistrict}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  ← Atrás
                </Button>
                <Button onClick={() => { if (validateStep3()) setStep(4) }}>
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* ── PASO 4 — Ubicación ── */}
          {step === 4 && (
            <div className="space-y-5">
              <p className="text-sm text-[#6B7280]">
                Tu ubicación nos permite mostrarte trabajos cerca de ti.
              </p>

              {/* GPS */}
              {!gpsLocation ? (
                <Button
                  type="button"
                  variant="outline"
                  loading={gpsLoading}
                  onClick={handleGetLocation}
                  className="w-full gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Usar mi ubicación actual
                </Button>
              ) : (
                <div className="flex items-center gap-3 bg-[#E8F5F3] rounded-xl px-4 py-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                  <div>
                    <p className="font-semibold text-[#1A1A2E]">Ubicación detectada</p>
                    <p className="text-[#6B7280] text-xs">
                      {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGpsLocation(null)}
                    className="ml-auto text-[#6B7280] hover:text-[#EF4444]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Selector manual (cuando GPS fue denegado o como alternativa) */}
              {(gpsDenied || !gpsLocation) && (
                <div>
                  <p className="text-sm text-[#6B7280] mb-3">
                    {gpsDenied
                      ? 'GPS denegado. Selecciona tu distrito manualmente:'
                      : 'O selecciona tu distrito manualmente:'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#6B7280] mb-1">
                        Provincia
                      </label>
                      <select
                        value={manualProvince}
                        onChange={e => setManualProvince(e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-white"
                      >
                        <option value="Callao">Callao</option>
                        <option value="Lima">Lima</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6B7280] mb-1">
                        Distrito
                      </label>
                      <select
                        value={manualDistrict}
                        onChange={e => setManualDistrict(e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-white"
                      >
                        <option value="">Seleccionar</option>
                        {DISTRITOS[manualProvince].map(d => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {errors.location && (
                <p className="text-xs text-[#EF4444]">{errors.location}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  ← Atrás
                </Button>
                <Button onClick={() => { if (validateStep4()) setStep(5) }}>
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* ── PASO 5 — Documentos ── */}
          {step === 5 && (
            <div className="space-y-5">
              <FileUploadArea
                label="Foto del DNI *"
                accept="image/*"
                files={dniFiles}
                onFiles={setDniFiles}
              />
              {errors.dniFile && <p className="text-xs text-[#EF4444]">{errors.dniFile}</p>}

              <FileUploadArea
                label="Certificado de antecedentes policiales *"
                accept="image/*,application/pdf"
                files={antecedentesFiles}
                onFiles={setAntecedentesFiles}
              />
              {errors.antecedentesFile && (
                <p className="text-xs text-[#EF4444]">{errors.antecedentesFile}</p>
              )}

              <FileUploadArea
                label="Certificado(s) o diploma(s) de trabajo *"
                accept="image/*,application/pdf"
                multiple
                files={certificadoFiles}
                onFiles={setCertificadoFiles}
              />
              {errors.certificadoFile && (
                <p className="text-xs text-[#EF4444]">{errors.certificadoFile}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(4)}>
                  ← Atrás
                </Button>
                <Button onClick={() => { if (validateStep5()) setStep(6) }}>
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* ── PASO 6 — Confirmación y términos ── */}
          {step === 6 && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="bg-[#F0F4F7] rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-[#1A1A2E] mb-3">Resumen de tu perfil</p>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Nombre</span>
                  <span className="text-[#1A1A2E] font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">DNI</span>
                  <span className="text-[#1A1A2E] font-medium">{dni}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Especialidades</span>
                  <span className="text-[#1A1A2E] font-medium text-right max-w-[60%]">
                    {categories
                      .filter(c => selectedCategoryIds.includes(c.id))
                      .map(c => c.name)
                      .join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Zona</span>
                  <span className="text-[#1A1A2E] font-medium">
                    {coverageDistrict || '—'}, {coverageProvince}
                  </span>
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
                <Button variant="ghost" onClick={() => setStep(5)}>
                  ← Atrás
                </Button>
                <Button onClick={handleSubmit} loading={submitting} disabled={!termsAccepted}>
                  Activar mi perfil
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
