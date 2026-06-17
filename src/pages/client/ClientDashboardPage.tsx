import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import { Plus, MessageSquare, ArrowRight, Briefcase, Loader2, Users, Search } from 'lucide-react'

interface JobPostItem {
  id: string
  title: string | null
  description: string
  status: string
  created_at: string
  category?: {
    name: string
  }
  applications: { id: string }[]
}

interface MessageItem {
  id: string
  content: string
  sent_at: string
  sender_id: string
  application: {
    id: string
    worker: {
      full_name: string
      avatar_url: string | null
    }
  }
}

export default function ClientDashboardPage() {
  const navigate = useNavigate()
  const { user, clientProfile } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobPostItem[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])

  const firstName = clientProfile?.full_name?.split(' ')[0] ?? 'Cliente'

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      if (!user) return

      // 1. Obtener los últimos 5 trabajos publicados
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          category:categories(name),
          applications(id)
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (jobsError) throw jobsError
      setJobs((jobsData as any) || [])

      // 2. Obtener mensajes recientes (mensajes entrantes)
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sent_at,
          sender_id,
          application:applications!inner(
            id,
            worker:worker_profiles(
              full_name,
              avatar_url
            ),
            job:job_posts!inner(
              client_id
            )
          )
        `)
        .neq('sender_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(15)

      if (messagesError) throw messagesError

      // Agrupar por conversación (application.id) para mostrar solo el último mensaje por chat
      const uniqueConversations: MessageItem[] = []
      const seenConversations = new Set<string>()

      for (const msg of (messagesData as any) || []) {
        const appId = msg.application?.id
        if (appId && !seenConversations.has(appId)) {
          seenConversations.add(appId)
          uniqueConversations.push(msg)
          if (uniqueConversations.length >= 4) break
        }
      }

      setMessages(uniqueConversations)
    } catch (error: any) {
      showToast('Error al cargar datos del dashboard: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Formateador de tiempo relativo en español
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    const dateZero = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const diffTime = nowZero.getTime() - dateZero.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`

    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
  }

  // Formateador de hora del mensaje
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
    }

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    }

    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
  }

  // Helper para asignar colores a las categorías
  const getCategoryStyles = (categoryName?: string) => {
    if (!categoryName) return 'bg-gray-50 text-gray-600 border-gray-200/40'
    
    switch (categoryName.toLowerCase()) {
      case 'plomería':
        return 'bg-blue-50 text-blue-700 border border-blue-100'
      case 'electricidad':
        return 'bg-amber-50 text-amber-700 border border-amber-100'
      case 'limpieza':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
      case 'carpintería':
        return 'bg-rose-50 text-rose-700 border border-rose-100'
      case 'mudanza':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-100'
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
        <span className="ml-3 text-[#6B7280] text-sm">Cargando actividades...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">¡Hola, {firstName}!</h1>
          <p className="mt-1.5 text-sm text-[#6B7280]">
            Aquí tienes el resumen de tus actividades.
          </p>
        </div>
        <Button
          onClick={() => navigate('/client/new-job')}
          className="flex items-center gap-2 shadow-sm font-semibold tracking-wide self-stretch sm:self-auto"
        >
          <Plus size={18} />
          Publicar un nuevo trabajo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda (Trabajos publicados recientes) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1A1A2E] flex items-center gap-2">
              <Briefcase size={20} className="text-[#0D7B6B]" />
              Trabajos publicados recientes
            </h2>
            <button
              onClick={() => navigate('/client/jobs')}
              className="text-sm font-semibold text-[#0D7B6B] hover:text-[#0A6558] hover:underline flex items-center gap-1 transition-colors"
            >
              Ver todos
              <ArrowRight size={14} />
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-sm flex flex-col items-center">
              <Briefcase size={40} className="text-[#6B7280] opacity-40 mb-3" />
              <p className="text-sm font-medium text-[#1A1A2E]">No has publicado ningún trabajo aún</p>
              <p className="text-xs text-[#6B7280] mt-1 mb-5">Publica tu primer requerimiento para recibir propuestas de técnicos.</p>
              <Button onClick={() => navigate('/client/new-job')} variant="outline" className="px-5 py-2">
                Publicar primer trabajo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map(job => {
                const applicantCount = job.applications?.length || 0
                return (
                  <div
                    key={job.id}
                    className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Fila superior: Categoría y Fecha */}
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getCategoryStyles(job.category?.name)}`}>
                          {job.category?.name || 'Servicio'}
                        </span>
                        <span className="text-xs font-medium text-[#6B7280]">
                          {formatRelativeDate(job.created_at)}
                        </span>
                      </div>

                      {/* Título y Descripción */}
                      <h3 className="font-bold text-[#1A1A2E] text-base line-clamp-1 mb-1">
                        {job.title || 'Trabajo sin título'}
                      </h3>
                      <p className="text-[#6B7280] text-sm line-clamp-2 leading-relaxed mb-4">
                        {job.description}
                      </p>
                    </div>

                    {/* Fila inferior: Postulantes y Detalle */}
                    <div className="border-t border-[#F1F5F9] pt-3 flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1.5">
                        {applicantCount > 0 ? (
                          <>
                            <Users size={16} className="text-[#0D7B6B]" />
                            <span className="text-xs font-semibold text-[#0D7B6B]">
                              {applicantCount} {applicantCount === 1 ? 'propuesta' : 'propuestas'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Search size={16} className="text-amber-500 animate-pulse" />
                            <span className="text-xs font-medium text-amber-600">Buscando...</span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/client/jobs/${job.id}`)}
                        className="text-xs font-bold text-[#0D7B6B] hover:text-[#0A6558] hover:underline flex items-center gap-1 transition-colors"
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha (Mensajes Recientes) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-[#0D7B6B]" />
            <h2 className="text-lg font-bold text-[#1A1A2E]">Mensajes Recientes</h2>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-xs font-medium text-[#1A1A2E]">No tienes mensajes nuevos</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Se activará el chat cuando un técnico postule a tu trabajo.</p>
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {messages.map(msg => {
                  const workerName = msg.application.worker?.full_name || 'Técnico'
                  const initials = workerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  
                  return (
                    <div
                      key={msg.id}
                      onClick={() => navigate(`/client/messages`)}
                      className="flex items-start gap-3 p-2 rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[#E8F5F3] overflow-hidden flex items-center justify-center border border-[#0D7B6B]/10 shrink-0">
                        {msg.application.worker?.avatar_url ? (
                          <img
                            src={msg.application.worker.avatar_url}
                            alt={workerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-[#0D7B6B]">{initials}</span>
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className="text-sm font-semibold text-[#1A1A2E] truncate pr-2">
                            {workerName}
                          </p>
                          <span className="text-[10px] font-medium text-[#6B7280] shrink-0">
                            {formatMessageTime(msg.sent_at)}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] truncate leading-normal">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => navigate('/client/messages')}
              className="w-full text-center border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-semibold py-2.5 rounded-lg text-[#1A1A2E] transition-colors block mt-2"
            >
              Ver todos los mensajes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
