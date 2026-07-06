import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import {
  ArrowLeft,
  MapPin,
  Users,
  XCircle,
  Star,
  BadgeCheck,
  MessageSquare,
  Loader2,
  Wrench,
  Zap,
  Sparkles,
  Hammer,
  Truck,
  MoreHorizontal,
  FileVideo,
  CheckCircle2,
  CalendarDays,
  Clock,
  DollarSign,
  Navigation,
  User
} from 'lucide-react'
import { ReviewWorkerForm } from '../../components/reviews/ReviewWorkerForm'
import type { MatchStatus } from '../../lib/types'
import TrackingMap from '../../components/ui/TrackingMap'

// Iconos por categoría (mismo criterio que NewJobPage)
const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  'Plomería': Wrench,
  'Electricidad': Zap,
  'Limpieza': Sparkles,
  'Carpintería': Hammer,
  'Mudanza': Truck,
  'Otros Servicios': MoreHorizontal,
}

const MATCH_STEPS: { status: MatchStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { status: 'accepted',    label: 'Acuerdo confirmado',  icon: CheckCircle2 },
  { status: 'on_the_way', label: 'En camino',            icon: Navigation   },
  { status: 'in_progress', label: 'En progreso',         icon: Wrench       },
  { status: 'finished',   label: 'Finalizado',           icon: CheckCircle2 },
]

const STATUS_ORDER: Record<MatchStatus, number> = {
  accepted: 0,
  on_the_way: 1,
  in_progress: 2,
  finished: 3,
}

interface Attachment {
  id: string
  file_url: string
  file_type: 'image' | 'video'
}

interface Applicant {
  id: string
  applied_at: string
  worker: {
    id: string
    full_name: string
    avatar_url: string | null
    identity_verified: boolean
    avg_rating: number
    total_reviews: number
  }
}

interface MatchInfo {
  id: string
  status: MatchStatus
  agreed_price: number | null
  scheduled_date: string | null
  worker_notes: string | null
  matched_at: string
  client_confirmed_arrival: boolean | null
  arrival_location_verified: boolean | null
  worker: {
    id: string
    full_name: string
    avatar_url: string | null
    avg_rating: number
    total_reviews: number
    identity_verified: boolean
  } | null
}

interface JobDetail {
  id: string
  title: string | null
  description: string
  status: 'active' | 'matched' | 'finished' | 'cancelled'
  province: string
  district: string
  address: string | null
  created_at: string
  category?: { name: string }
  job_attachments: Attachment[]
  applications: Applicant[]
}

export default function ClientJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [job, setJob] = useState<JobDetail | null>(null)
  const [match, setMatch] = useState<MatchInfo | null>(null)
  const [clientReview, setClientReview] = useState<any>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Tracking states
  const [jobCoordinates, setJobCoordinates] = useState<{lng: number, lat: number} | null>(null)
  const [workerLocation, setWorkerLocation] = useState<{lng: number, lat: number} | null>(null)

  useEffect(() => {
    if (user && id) fetchJobDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id])

  // Lógica de tracking cuando el trabajo está "En camino"
  useEffect(() => {
    if (job && match && match.status === 'on_the_way') {
      const loadMapData = async () => {
        // Obtener coordenadas de destino
        if (!jobCoordinates) {
          const { data, error } = await supabase.rpc('get_job_coordinates', { job_id_param: job.id })
          if (!error && data) {
            setJobCoordinates(data as {lng: number, lat: number})
          }
        }
      }
      loadMapData()

      // Suscribirse a la ubicación en vivo del trabajador
      const channel = supabase.channel(`tracking_${match.id}`)
      channel.on('broadcast', { event: 'location' }, (payload) => {
        if (payload.payload) {
          setWorkerLocation(payload.payload)
        }
      }).subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [job, match])

  const fetchJobDetail = async () => {
    try {
      setLoading(true)
      if (!user || !id) return

      // 1. Datos del job_post
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          description,
          status,
          province,
          district,
          address,
          created_at,
          category:categories(name),
          job_attachments(id, file_url, file_type),
          applications(
            id,
            applied_at,
            worker:worker_profiles(
              id,
              full_name,
              avatar_url,
              identity_verified,
              avg_rating,
              total_reviews
            )
          )
        `)
        .eq('id', id)
        .eq('client_id', user.id)
        .single()

      if (error) throw error
      setJob(data as any)

      // 2. Si el trabajo está matched, cargar el job_match con datos del trabajador
      if (data?.status === 'matched' || data?.status === 'finished') {
        const { data: matchData } = await supabase
          .from('job_matches')
          .select(`
            id,
            status,
            agreed_price,
            scheduled_date,
            worker_notes,
            matched_at,
            arrival_location_verified,
            client_confirmed_arrival,
            worker:worker_profiles(
              id,
              full_name,
              avatar_url,
              avg_rating,
              total_reviews,
              identity_verified
            )
          `)
          .eq('job_post_id', id)
          .single()

        setMatch(matchData as any ?? null)

        // 3. Obtener reseña si ya finalizó o está en progreso (por si acaso)
        if (matchData) {
          const { data: reviewData } = await supabase
            .from('reviews')
            .select('*')
            .eq('job_match_id', matchData.id)
            .eq('reviewer_id', user.id)
            .maybeSingle()
          setClientReview(reviewData || null)
        }
      }
    } catch (error: any) {
      showToast('No se pudo cargar la publicación: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFinishSearch = async () => {
    if (!job) return
    try {
      setFinishing(true)
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'finished' })
        .eq('id', job.id)
      if (error) throw error
      showToast('Búsqueda finalizada correctamente', 'success')
      navigate('/client/jobs')
    } catch (error: any) {
      showToast('Error al finalizar la búsqueda: ' + error.message, 'error')
    } finally {
      setFinishing(false)
    }
  }

  const handleConfirmArrival = async (confirmed: boolean) => {
    if (!match) return
    try {
      const { error } = await supabase
        .from('job_matches')
        .update({ client_confirmed_arrival: confirmed })
        .eq('id', match.id)

      if (error) throw error
      setMatch(prev => prev ? { ...prev, client_confirmed_arrival: confirmed } : prev)
      showToast('Confirmación registrada', 'success')
    } catch (error: any) {
      showToast('Error al enviar confirmación: ' + error.message, 'error')
    }
  }

  // ── Helpers de formato ────────────────────────────────────────────────────
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
        <span className="ml-3 text-[#6B7280] text-sm">Cargando publicación...</span>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[#6B7280]">No encontramos esta publicación.</p>
        <button
          onClick={() => navigate('/client/jobs')}
          className="mt-4 text-sm font-semibold text-[#0D7B6B] hover:underline"
        >
          Volver a mis publicaciones
        </button>
      </div>
    )
  }

  const applicants = job.applications || []
  const applicantCount = applicants.length
  const attachments = job.job_attachments || []
  const isFinished = job.status === 'finished' || match?.status === 'finished'
  const isMatched = job.status === 'matched' || isFinished
  const isActive = job.status === 'active' && !isMatched
  const categoryName = job.category?.name
  const CategoryIcon = categoryName ? CATEGORY_ICONS[categoryName] ?? Wrench : Wrench

  // Paso actual del seguimiento
  const currentStep = match ? STATUS_ORDER[match.status] : -1

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Volver */}
      <button
        onClick={() => navigate('/client/jobs')}
        className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] hover:text-[#0D7B6B] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Volver a mis publicaciones
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Datos del trabajo ── */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Título y meta */}
            <h1 className="text-2xl font-bold text-[#1A1A2E] leading-snug">
            {job.title || 'Trabajo sin título'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <MapPin size={15} className="text-[#6B7280]/70" />
              {job.district}, {job.province}
            </span>
            {categoryName && (
              <span className="flex items-center gap-1.5">
                <CategoryIcon size={15} className="text-[#0D7B6B]" />
                {categoryName}
              </span>
            )}
            {isMatched && !isFinished && (
              <span className="text-[10px] font-bold text-[#0D7B6B] bg-[#E8F5F3] px-2.5 py-0.5 rounded-full border border-[#0D7B6B]/20 uppercase tracking-wider">
                En proceso
              </span>
            )}
            {isFinished && (
              <span className="text-[10px] font-bold text-[#6B7280] bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200 uppercase tracking-wider">
                Finalizado
              </span>
            )}
          </div>

          {/* Descripción */}
          <div className="mt-6">
            <h2 className="text-sm font-bold text-[#1A1A2E] mb-2">Descripción</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </div>

          {/* Galería de adjuntos */}
          {attachments.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-[#1A1A2E] mb-3">Fotos Adjuntas</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden border border-[#E5E7EB] bg-gray-50 group"
                  >
                    {att.file_type === 'image' ? (
                      <img
                        src={att.file_url}
                        alt="Adjunto del trabajo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#0D7B6B]">
                        <FileVideo size={24} />
                        <span className="text-[10px] font-semibold text-[#6B7280]">Video</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Finalizar búsqueda (solo si está activo) */}
          {isActive && (
            <div className="mt-8">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(true)}
                className="border-[#EF4444]/40 text-[#EF4444] hover:bg-red-50 hover:text-red-600"
              >
                <XCircle size={16} />
                Finalizar búsqueda
              </Button>
            </div>
          )}
          </div>

          {/* Mapa de Tracking (Solo si está en camino) */}
          {isMatched && match && match.status === 'on_the_way' && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 sm:p-6 border-b border-[#E5E7EB] flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1A1A2E] flex items-center gap-2">
                  <Navigation size={18} className="text-[#0D7B6B]" />
                  Rastreo en vivo
                </h2>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  El trabajador está en camino...
                </div>
              </div>
              <div className="h-[400px] relative w-full bg-gray-50">
                <TrackingMap destination={jobCoordinates} workerPosition={workerLocation} />
              </div>
            </div>
          )}
        </div>

        {/* ── Panel lateral ── */}
        <div className="space-y-5">

          {/* Banner de confirmación pasiva */}
          {isMatched && match && match.status === 'in_progress' && match.client_confirmed_arrival === null && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm mb-5">
              <h3 className="text-sm font-bold text-blue-900 mb-2">¿El técnico ya llegó?</h3>
              <p className="text-xs text-blue-700 mb-3">El trabajador ha indicado que se encuentra en tu ubicación.</p>
              <div className="flex gap-2">
                <Button onClick={() => handleConfirmArrival(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3">
                  Sí, ya llegó
                </Button>
                <button onClick={() => handleConfirmArrival(false)} className="border border-blue-300 text-blue-700 hover:bg-blue-100 text-xs h-8 px-3 bg-white rounded-xl font-semibold transition-colors">
                  Aún no
                </button>
              </div>
            </div>
          )}

          {/* ═══ PANEL DE SEGUIMIENTO (trabajo matched) ═══ */}
          {isMatched && match ? (
            <>
              {/* Formulario de Calificación si el técnico ya marcó finalizado */}
              {match.status === 'finished' && !clientReview && (
                <ReviewWorkerForm 
                  jobMatchId={match.id}
                  workerId={match.worker?.id || ''}
                  workerName={match.worker?.full_name || 'Trabajador'}
                  onReviewSubmitted={(review) => {
                    setClientReview(review)
                    // Mostrar toast opcional si es necesario
                  }}
                />
              )}

              {/* Reseña Enviada */}
              {clientReview && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm mb-5">
                  <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    Ciclo Finalizado Formalmente
                  </h3>
                  <p className="text-xs text-emerald-800 mb-3">Has confirmado y calificado este trabajo.</p>
                  <div className="bg-white rounded-xl p-3 border border-emerald-100">
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={14} className={star <= clientReview.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                    {clientReview.comment && (
                      <p className="text-xs text-gray-700 italic">"{clientReview.comment}"</p>
                    )}
                  </div>
                </div>
              )}

              {/* Estado del trabajo — timeline */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#1A1A2E] mb-5">Estado del trabajo</h2>
                <div className="space-y-0">
                  {MATCH_STEPS.map((step, idx) => {
                    const StepIcon = step.icon
                    const done = idx <= currentStep
                    const active = idx === currentStep
                    const isLast = idx === MATCH_STEPS.length - 1
                    return (
                      <div key={step.status} className="flex gap-3">
                        {/* Indicador vertical */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              done
                                ? 'bg-[#0D7B6B] text-white'
                                : 'bg-[#F1F5F9] text-[#9CA3AF] border border-[#E5E7EB]'
                            } ${active ? 'ring-2 ring-[#0D7B6B]/30 ring-offset-1' : ''}`}
                          >
                            <StepIcon size={13} />
                          </div>
                          {!isLast && (
                            <div
                              className={`w-0.5 h-8 my-0.5 rounded-full ${
                                done && idx < currentStep ? 'bg-[#0D7B6B]' : 'bg-[#E5E7EB]'
                              }`}
                            />
                          )}
                        </div>
                        {/* Etiqueta */}
                        <div className={`pb-${isLast ? '0' : '2'} flex items-center`}>
                          <p
                            className={`text-xs font-semibold ${
                              active
                                ? 'text-[#0D7B6B]'
                                : done
                                  ? 'text-[#1A1A2E]'
                                  : 'text-[#9CA3AF]'
                            }`}
                          >
                            {step.label}
                            {active && (
                              <span className="ml-2 text-[10px] font-normal text-[#0D7B6B] bg-[#E8F5F3] px-1.5 py-0.5 rounded-full">
                                Actual
                              </span>
                            )}
                            {step.status === 'in_progress' && match.arrival_location_verified && (
                              <span className="ml-2 text-[10px] font-normal text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 size={10} /> Verificada
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Trabajador asignado */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
                  <User size={15} className="text-[#0D7B6B]" />
                  Trabajador asignado
                </h2>
                {match.worker ? (
                  <div className="flex items-center gap-3">
                    <Link 
                      to={`/client/worker/${match.worker.id}`}
                      className="w-11 h-11 rounded-full bg-[#E8F5F3] overflow-hidden flex items-center justify-center border border-[#0D7B6B]/15 shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {match.worker.avatar_url ? (
                        <img src={match.worker.avatar_url} alt={match.worker.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-[#0D7B6B]">
                          {match.worker.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <Link to={`/client/worker/${match.worker.id}`} className="text-sm font-semibold text-[#1A1A2E] truncate hover:text-[#0D7B6B] hover:underline transition-colors">
                          {match.worker.full_name}
                        </Link>
                        {match.worker.identity_verified && (
                          <BadgeCheck size={14} className="text-[#0D7B6B] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-[#6B7280]">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        {match.worker.total_reviews > 0
                          ? `${match.worker.avg_rating} (${match.worker.total_reviews} reseñas)`
                          : 'Sin reseñas aún'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#9CA3AF]">Datos del trabajador no disponibles</p>
                )}

                {/* Ir al chat */}
                <button
                  onClick={() => navigate('/client/messages')}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 bg-[#E8F5F3] hover:bg-[#0D7B6B] hover:text-white text-[#0D7B6B] text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <MessageSquare size={14} />
                  Ver chat
                </button>
              </div>

              {/* Detalles del acuerdo */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#1A1A2E] mb-4">Detalles del acuerdo</h2>
                <div className="space-y-3">
                  {/* Monto */}
                  <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F5F3] flex items-center justify-center shrink-0">
                      <DollarSign size={15} className="text-[#0D7B6B]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold tracking-wider">Monto acordado</p>
                      <p className="text-sm font-bold text-[#1A1A2E]">
                        {match.agreed_price !== null
                          ? `S/ ${match.agreed_price.toFixed(2)}`
                          : 'No definido'}
                      </p>
                    </div>
                  </div>

                  {/* Fecha */}
                  {match.scheduled_date && (
                    <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                      <div className="w-8 h-8 rounded-lg bg-[#E8F5F3] flex items-center justify-center shrink-0">
                        <CalendarDays size={15} className="text-[#0D7B6B]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold tracking-wider">Fecha acordada</p>
                        <p className="text-sm font-semibold text-[#1A1A2E]">
                          {formatDate(match.scheduled_date)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hora */}
                  {match.scheduled_date && (
                    <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                      <div className="w-8 h-8 rounded-lg bg-[#E8F5F3] flex items-center justify-center shrink-0">
                        <Clock size={15} className="text-[#0D7B6B]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold tracking-wider">Hora de llegada</p>
                        <p className="text-sm font-semibold text-[#1A1A2E]">
                          {formatTime(match.scheduled_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ═══ PANEL DE CANDIDATOS (trabajo activo) ═══ */
            <>
              {/* Contador de interesados */}
              <div className="bg-[#E8F5F3] border border-[#0D7B6B]/15 rounded-2xl p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                  <Users size={20} className="text-[#0D7B6B]" />
                </div>
                <div>
                  <p className="text-base font-bold text-[#1A1A2E] leading-tight">
                    {applicantCount} {applicantCount === 1 ? 'profesional' : 'profesionales'}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {applicantCount > 0 ? 'interesados en tu publicación' : 'aún sin postulantes'}
                  </p>
                </div>
              </div>

              {/* Lista de candidatos */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#1A1A2E] mb-4">
                  Candidatos ({applicantCount})
                </h2>

                {applicantCount === 0 ? (
                  <div className="text-center py-8">
                    <Users size={32} className="text-[#6B7280] opacity-30 mx-auto mb-2" />
                    <p className="text-xs text-[#6B7280]">
                      Todavía nadie ha postulado. Los técnicos cercanos verán tu publicación pronto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applicants.map(app => {
                      const w = app.worker
                      const initials = w.full_name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                      return (
                        <div
                          key={app.id}
                          className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4"
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <Link 
                              to={`/client/worker/${w.id}`}
                              className="w-11 h-11 rounded-full bg-[#E8F5F3] overflow-hidden flex items-center justify-center border border-[#0D7B6B]/15 shrink-0 hover:opacity-80 transition-opacity"
                            >
                              {w.avatar_url ? (
                                <img src={w.avatar_url} alt={w.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-[#0D7B6B]">{initials}</span>
                              )}
                            </Link>
                            {/* Nombre + rating */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <Link to={`/client/worker/${w.id}`} className="text-sm font-semibold text-[#1A1A2E] truncate hover:text-[#0D7B6B] hover:underline transition-colors">
                                  {w.full_name}
                                </Link>
                                {w.identity_verified && (
                                  <BadgeCheck size={15} className="text-[#0D7B6B] shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-[#6B7280]">
                                <Star size={13} className="text-amber-400 fill-amber-400" />
                                {w.total_reviews > 0 ? (
                                  <span>
                                    {w.avg_rating} ({w.total_reviews}{' '}
                                    {w.total_reviews === 1 ? 'reseña' : 'reseñas'})
                                  </span>
                                ) : (
                                  <span className="italic">Sin reseñas aún</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ver mensaje → chat */}
                          <button
                            onClick={() => navigate(`/client/messages?application=${app.id}`)}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 bg-[#E8F5F3] hover:bg-[#0D7B6B] hover:text-white text-[#0D7B6B] text-xs font-semibold py-2 rounded-lg transition-colors"
                          >
                            <MessageSquare size={14} />
                            Ver mensaje
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmación para finalizar búsqueda */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg text-[#1A1A2E] mb-2">¿Finalizar trabajo?</h3>
            <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
              ¿Estás seguro de que deseas marcar este trabajo como finalizado? Esta acción es definitiva y la publicación se cerrará para nuevos postulantes.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  setShowConfirmModal(false)
                  await handleFinishSearch()
                }}
                loading={finishing}
                className="bg-[#EF4444] hover:bg-red-700 text-white px-4 py-2 border-none"
              >
                Sí, finalizar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
