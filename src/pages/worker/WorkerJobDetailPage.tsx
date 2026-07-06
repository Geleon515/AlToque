import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  Star, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle,
  FileVideo,
  Loader2
} from 'lucide-react'
import type { JobPost, ClientProfile, JobAttachment, Application } from '../../lib/types'

interface JobDetails extends JobPost {
  client: ClientProfile & { avg_rating?: number, total_reviews?: number, jobs_posted?: number }
  category: { name: string }
  attachments: JobAttachment[]
  my_application: Application | null
}

export default function WorkerJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, workerProfile } = useAuth()
  const { showToast } = useToast()

  const isVerified = !!workerProfile?.identity_verified

  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [job, setJob] = useState<JobDetails | null>(null)
  const [canApplyToday, setCanApplyToday] = useState<boolean | null>(null)

  useEffect(() => {
    if (id && user) {
      fetchJobDetails()
      checkLimit()
    }
  }, [id, user])

  const checkLimit = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.rpc('check_daily_application_limit', {
        worker_id: user.id
      })
      if (error) throw error
      setCanApplyToday(data)
    } catch (err) {
      console.error('Error al verificar límite:', err)
    }
  }

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      
      // Obtener el trabajo con su cliente y categoría
      const { data: jobData, error: jobError } = await supabase
        .from('job_posts')
        .select(`
          *,
          client:client_profiles(*),
          category:categories(name)
        `)
        .eq('id', id)
        .single()

      if (jobError) throw jobError

      // Obtener adjuntos
      const { data: attachments, error: attachError } = await supabase
        .from('job_attachments')
        .select('*')
        .eq('job_post_id', id)

      if (attachError) throw attachError

      // Obtener postulación actual del trabajador si existe
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_post_id', id)
        .eq('worker_id', user!.id)
        .maybeSingle()

      if (appError) throw appError

      setJob({
        ...(jobData as any),
        attachments: attachments || [],
        my_application: application || null
      })
    } catch (error: any) {
      showToast('Error al cargar detalles del trabajo', 'error')
      navigate('/worker/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!user || !job) return
    if (!isVerified) {
      showToast('Tu perfil aún está en revisión. Podrás postular una vez que verifiquemos tu identidad (2-3 días hábiles).', 'error')
      return
    }
    if (canApplyToday === false) {
      showToast('Has alcanzado tu límite de postulaciones diarias. Mejora tu plan a Premium para postular a más trabajos.', 'error')
      return
    }

    try {
      setApplying(true)
      
      const { error } = await supabase
        .from('applications')
        .insert({
          job_post_id: job.id,
          worker_id: user.id,
          status: 'pending'
        })

      if (error) throw error

      showToast('¡Postulación enviada con éxito!', 'success')
      // Refrescar estado local
      setJob(prev => prev ? { 
        ...prev, 
        my_application: { id: 'temp', job_post_id: job.id, worker_id: user.id, status: 'pending', applied_at: new Date().toISOString() } 
      } : null)
      
      // Actualizar límite restante
      checkLimit()
      
    } catch (error: any) {
      showToast('Error al postular: ' + error.message, 'error')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
        <span className="mt-4 text-[#6B7280] text-sm">Cargando detalles del trabajo...</span>
      </div>
    )
  }

  if (!job) return null

  const hasApplied = !!job.my_application
  const isJobActive = job.status === 'active'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Botón Volver */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#1A1A2E] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Volver al listado
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Principal (Detalles del Trabajo) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-[#E8F5F3] text-[#0D7B6B] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {job.category.name}
              </span>
              <span className="text-sm font-medium text-[#6B7280]">
                {new Date(job.created_at).toLocaleDateString('es-PE')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] mb-4">
              {job.title || 'Solicitud de servicio de ' + job.category.name}
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 mb-6 text-sm font-medium text-[#6B7280]">
              <div className="flex items-center gap-1.5">
                <MapPin size={16} className="text-[#0D7B6B]" />
                {job.district}, {job.province}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={16} className="text-[#0D7B6B]" />
                Publicado a las {new Date(job.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-[#1A1A2E] leading-relaxed mb-8">
              <h3 className="text-lg font-bold mb-2">Descripción del problema</h3>
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>

            {job.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#1A1A2E] mb-3">Archivos adjuntos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {job.attachments.map(att => (
                    <a 
                      key={att.id} 
                      href={att.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="relative group border border-[#E5E7EB] rounded-lg overflow-hidden bg-gray-50 aspect-square flex items-center justify-center hover:border-[#0D7B6B] transition-colors"
                    >
                      {att.file_type === 'image' ? (
                        <img src={att.file_url} alt="Adjunto" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileVideo size={24} className="text-[#0D7B6B]" />
                          <span className="text-[10px] font-semibold text-[#6B7280]">Ver Video</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Ver original</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Lateral (Perfil del Cliente y Acción) */}
        <div className="space-y-6">
          {/* Tarjeta de Acción */}
          <div className="bg-white border border-[#0D7B6B]/20 rounded-2xl p-6 shadow-md shadow-[#0D7B6B]/5">
            <h3 className="text-base font-bold text-[#1A1A2E] mb-4">¿Te interesa este trabajo?</h3>
            
            {!isJobActive && !hasApplied ? (
              <div className="bg-gray-100 rounded-xl p-4 flex gap-3 text-[#6B7280]">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-medium">Este trabajo ya no está disponible para postulaciones.</p>
              </div>
            ) : hasApplied ? (
              <div className="bg-[#E8F5F3] rounded-xl p-4 border border-[#0D7B6B]/20">
                <div className="flex items-center gap-2 text-[#0D7B6B] font-bold mb-2">
                  <CheckCircle2 size={20} />
                  Ya postulaste
                </div>
                <p className="text-xs text-[#0D7B6B] leading-relaxed">
                  El cliente revisará tu perfil. Si te acepta, el trabajo pasará a la sección de Seguimiento y se abrirá el chat.
                </p>
                <div className="mt-4 pt-4 border-t border-[#0D7B6B]/10">
                  <Button variant="outline" onClick={() => navigate('/worker/dashboard')} className="w-full bg-white">
                    Ver más trabajos
                  </Button>
                </div>
              </div>
            ) : !isVerified ? (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                  <AlertCircle size={20} />
                  Perfil en revisión
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Podrás postular a este trabajo apenas verifiquemos tu identidad y documentos
                  (entre 2 y 3 días hábiles). Te avisaremos cuando tu perfil quede activo.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleApply}
                  loading={applying}
                  className="w-full py-3 text-base shadow-lg shadow-[#0D7B6B]/20"
                >
                  Postular ahora
                </Button>

                {canApplyToday === false && (
                  <p className="text-xs text-red-500 font-medium text-center">
                    Límite diario alcanzado. Mejora tu plan.
                  </p>
                )}

                <p className="text-[11px] text-[#6B7280] text-center px-2">
                  Al postular, el cliente podrá ver tu perfil público, calificaciones y DNI validado.
                </p>
              </div>
            )}
          </div>

          {/* Perfil del Cliente */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-4">Acerca del Cliente</h3>
            
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#1A1A2E] text-xl font-bold overflow-hidden">
                {job.client?.avatar_url ? (
                  <img src={job.client.avatar_url} alt={job.client.full_name} className="w-full h-full object-cover" />
                ) : (
                  (job.client?.full_name || 'C').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="font-bold text-[#1A1A2E] text-lg">{job.client?.full_name || 'Cliente no identificado'}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold text-[#1A1A2E]">{job.client?.avg_rating?.toFixed(1) || '5.0'}</span>
                  <span className="text-xs text-[#6B7280]">({job.client?.total_reviews || 0} reseñas)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#F1F5F9]">
              <div className="flex items-center gap-3 text-sm text-[#6B7280]">
                <User size={16} />
                Miembro desde {job.client?.created_at ? new Date(job.client.created_at).getFullYear() : new Date().getFullYear()}
              </div>
              <div className="flex items-center gap-3 text-sm text-[#6B7280]">
                <Briefcase size={16} />
                {job.client?.jobs_posted || 1} trabajos publicados
              </div>
              <div className="flex items-center gap-3 text-sm text-[#6B7280]">
                <MapPin size={16} />
                Ubicación principal: {job.client?.district || job.district}
              </div>
            </div>

            <div className="mt-5 bg-gray-50 rounded-lg p-3 text-xs text-[#6B7280] italic text-center">
              El número de teléfono del cliente será visible solo si acepta tu postulación.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
