import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import { MapPin, Briefcase, Users, XCircle, CheckCircle2, Loader2, ArrowRight, Clock, X } from 'lucide-react'

interface WorkerApplicant {
  id: string
  full_name: string
  avatar_url: string | null
}

interface ApplicationItem {
  id: string
  worker: WorkerApplicant
}

interface JobPost {
  id: string
  title: string | null
  description: string
  status: 'active' | 'matched' | 'finished' | 'cancelled'
  province: string
  district: string
  created_at: string
  category?: {
    name: string
  }
  applications: ApplicationItem[]
}

export default function ClientJobsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null)

  // Detectar el parámetro de éxito en la URL
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessBanner(true)
      // Ocultar banner automáticamente a los 6 segundos
      const timer = setTimeout(() => setShowSuccessBanner(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      fetchJobs()
    }
  }, [user])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      if (!user) return

      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          description,
          status,
          province,
          district,
          created_at,
          category:categories(name),
          applications(
            id,
            worker:worker_profiles(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs((data as any) || [])
    } catch (error: any) {
      showToast('Error al cargar tus publicaciones: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Cambiar el estado del trabajo a Finalizado
  const handleFinishJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'finished' })
        .eq('id', jobId)

      if (error) throw error

      showToast('Trabajo marcado como finalizado con éxito', 'success')
      // Actualizar estado local
      setJobs(prev =>
        prev.map(j => (j.id === jobId ? { ...j, status: 'finished' } : j))
      )
    } catch (error: any) {
      showToast('Error al finalizar el trabajo: ' + error.message, 'error')
    }
  }

  // Formatear fecha a "Publicado hace X horas / días"
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `Publicado hace ${diffMins} min`
    if (diffHours < 24) return `Publicado hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    if (diffDays < 7) return `Publicado hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`

    return `Publicado el ${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
        <span className="ml-3 text-[#6B7280] text-sm">Cargando publicaciones...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      {/* Banner flotante de éxito */}
      {showSuccessBanner && (
        <div className="mb-6 bg-[#0D7B6B] text-white px-5 py-4 rounded-xl shadow-md flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="shrink-0" />
            <span className="text-sm font-semibold tracking-wide">
              ¡Trabajo publicado con éxito!
            </span>
          </div>
          <button
            onClick={() => setShowSuccessBanner(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Tus publicaciones</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Administra los trabajos que has subido a la plataforma.</p>
        </div>
        <Button onClick={() => navigate('/client/new-job')} className="font-semibold self-stretch sm:self-auto">
          Publicar nuevo trabajo
        </Button>
      </div>

      {/* Listado de Publicaciones */}
      {jobs.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <Briefcase size={48} className="text-[#6B7280] opacity-30 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-[#1A1A2E]">Aún no tienes publicaciones</h3>
          <p className="text-sm text-[#6B7280] mt-1.5 mb-6 max-w-sm">
            Publica trabajos de plomería, electricidad u otros servicios para que los profesionales del Callao postulen.
          </p>
          <Button onClick={() => navigate('/client/new-job')} className="px-6 py-2.5">
            Publicar mi primer trabajo
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map(job => {
            const isActive = job.status === 'active' || job.status === 'matched'
            const isFinished = job.status === 'finished'
            const applicants = job.applications || []
            const applicantCount = applicants.length

            return (
              <div
                key={job.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#0D7B6B] bg-[#E8F5F3] px-2.5 py-0.5 rounded-full border border-[#0D7B6B]/20 uppercase tracking-wider">
                        {job.category?.name || 'Servicio'}
                      </span>
                      {isFinished && (
                        <span className="text-[10px] font-bold text-[#6B7280] bg-gray-100 px-2 py-0.5 rounded uppercase border border-gray-200">
                          FINALIZADO
                        </span>
                      )}
                      {job.status === 'matched' && (
                        <span className="text-[10px] font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100">
                          EN PROCESO
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-[#1A1A2E] leading-snug">
                      {job.title || 'Trabajo sin título'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7280] shrink-0 font-medium sm:self-start sm:mt-1">
                    <Clock size={14} />
                    <span>{formatTimeAgo(job.created_at)}</span>
                  </div>
                </div>

                {/* Ubicación e interesados */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 text-sm text-[#6B7280]">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-[#6B7280]/70" />
                    <span>{job.district}, {job.province}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-[#6B7280]/70" />
                    <span>
                      {applicantCount > 0
                        ? `${applicantCount} ${applicantCount === 1 ? 'interesado hoy' : 'interesados hoy'}`
                        : 'Buscando postulantes'}
                    </span>
                  </div>
                </div>

                {/* Descripción resumida */}
                <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
                  {job.description}
                </p>

                {/* Línea divisoria */}
                <hr className="border-[#F1F5F9] my-4" />

                {/* Fila de Acciones y Avatars */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {isActive ? (
                    <>
                      {/* Avatars superpuestos de postulantes */}
                      <div className="flex items-center gap-3 self-start sm:self-auto">
                        {applicantCount > 0 ? (
                          <div className="flex -space-x-2.5 overflow-hidden">
                            {applicants.slice(0, 3).map((app) => {
                              const workerName = app.worker?.full_name || 'Técnico'
                              const initials = workerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                              return (
                                <div
                                  key={app.id}
                                  title={workerName}
                                  className="inline-block h-8.5 w-8.5 rounded-full ring-2 ring-white bg-[#E8F5F3] overflow-hidden flex items-center justify-center border border-[#0D7B6B]/20"
                                >
                                  {app.worker?.avatar_url ? (
                                    <img
                                      src={app.worker.avatar_url}
                                      alt={workerName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-[#0D7B6B]">{initials}</span>
                                  )}
                                </div>
                              )
                            })}
                            {applicantCount > 3 && (
                              <div className="inline-block h-8.5 w-8.5 rounded-full ring-2 ring-white bg-[#E8F5F3] flex items-center justify-center border border-[#0D7B6B]/20 text-[10px] font-bold text-[#0D7B6B]">
                                +{applicantCount - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-[#9CA3AF]">
                            Esperando propuestas...
                          </span>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmingJobId(job.id)}
                          className="flex-1 sm:flex-none py-2 px-4 border-[#EF4444]/40 text-[#EF4444] hover:bg-red-50 hover:text-red-600 flex items-center justify-center gap-1.5"
                        >
                          <XCircle size={16} />
                          Finalizar
                        </Button>
                        <Button
                          onClick={() => navigate(`/client/jobs/${job.id}`)}
                          className="flex-1 sm:flex-none py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-1.5"
                        >
                          Ver {applicantCount} {applicantCount === 1 ? 'Candidato' : 'Candidatos'}
                          <ArrowRight size={16} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Estado de finalizado */}
                      <span className="text-xs font-semibold text-[#6B7280] italic self-start sm:self-auto">
                        Trabajo finalizado y calificado
                      </span>
                      <Button
                        variant="outline"
                        disabled
                        className="w-full sm:w-auto py-2 px-5 border-gray-300 text-gray-400 cursor-not-allowed hover:bg-transparent"
                      >
                        Ver Historial
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de confirmación para finalizar trabajo */}
      {confirmingJobId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg text-[#1A1A2E] mb-2">¿Finalizar trabajo?</h3>
            <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
              ¿Estás seguro de que deseas marcar este trabajo como finalizado? Esta acción es definitiva y la publicación se cerrará para nuevos postulantes.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmingJobId(null)}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  await handleFinishJob(confirmingJobId)
                  setConfirmingJobId(null)
                }}
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
