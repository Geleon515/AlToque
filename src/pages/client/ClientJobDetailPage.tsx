import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
} from 'lucide-react'

// Iconos por categoría (mismo criterio que NewJobPage)
const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  'Plomería': Wrench,
  'Electricidad': Zap,
  'Limpieza': Sparkles,
  'Carpintería': Hammer,
  'Mudanza': Truck,
  'Otros Servicios': MoreHorizontal,
}

interface Attachment {
  id: string
  file_url: string
  file_type: 'image' | 'video'
}

interface Applicant {
  id: string // id de la postulación (application)
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

  useEffect(() => {
    if (user && id) {
      fetchJobDetail()
    }
  }, [user, id])

  const fetchJobDetail = async () => {
    try {
      setLoading(true)
      if (!user || !id) return

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
    } catch (error: any) {
      showToast('No se pudo cargar la publicación: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Finalizar la búsqueda (cerrar la publicación)
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
  const isActive = job.status === 'active' || job.status === 'matched'
  const categoryName = job.category?.name
  const CategoryIcon = categoryName ? CATEGORY_ICONS[categoryName] ?? Wrench : Wrench

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Volver */}
      <button
        onClick={() => navigate('/client/jobs')}
        className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] hover:text-[#0D7B6B] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Panel principal ── */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
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

          {/* Finalizar búsqueda */}
          {isActive && (
            <div className="mt-8">
              <Button
                variant="outline"
                onClick={handleFinishSearch}
                loading={finishing}
                className="border-[#EF4444]/40 text-[#EF4444] hover:bg-red-50 hover:text-red-600"
              >
                <XCircle size={16} />
                Finalizar búsqueda
              </Button>
            </div>
          )}
        </div>

        {/* ── Panel lateral: interesados + candidatos ── */}
        <div className="space-y-6">
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
                        <div className="w-11 h-11 rounded-full bg-[#E8F5F3] overflow-hidden flex items-center justify-center border border-[#0D7B6B]/15 shrink-0">
                          {w.avatar_url ? (
                            <img src={w.avatar_url} alt={w.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[#0D7B6B]">{initials}</span>
                          )}
                        </div>
                        {/* Nombre + rating */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-[#1A1A2E] truncate">
                              {w.full_name}
                            </p>
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

                      {/* Ver mensaje → chat (Persona 5) */}
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
        </div>
      </div>
    </div>
  )
}
