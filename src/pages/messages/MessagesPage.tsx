import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MessageSquare, Search, HandshakeIcon, Loader2, Inbox, Send, ArrowLeft, Clock, Award } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Message, ChatThread, ProposalPayload } from '../../lib/types'
import MessageBubble from '../../components/chat/MessageBubble'
import ProposalModal from '../../components/chat/ProposalModal'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Ayer'
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
}

// ─── componente principal ────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user, role, clientProfile, workerProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const appIdParam = searchParams.get('application') || searchParams.get('appId')

  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)

  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [search, setSearch] = useState('')
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [acceptingProposalId, setAcceptingProposalId] = useState<string | null>(null)

  const [textMessage, setTextMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const [unreadThreads, setUnreadThreads] = useState<Record<string, number>>({})

  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Cargar lista de hilos ─────────────────────────────────────────────────

  const loadThreads = useCallback(async () => {
    if (!user) return
    setLoadingThreads(true)

    try {
      if (role === 'client') {
        // El cliente ve todos los trabajadores que postularon a sus trabajos
        const { data, error } = await supabase
          .from('applications')
          .select(`
            id,
            job_post_id,
            worker_id,
            status,
            applied_at,
            job_posts (
              id,
              title,
              description,
              client_id
            ),
            worker_profiles (
              id,
              full_name,
              avatar_url,
              subscriptions(plan, status)
            ),
            job_matches (
              id,
              job_post_id,
              worker_id,
              application_id,
              agreed_price,
              status,
              scheduled_date,
              worker_notes,
              matched_at,
              finished_at
            )
          `)
          .order('applied_at', { ascending: false })

        if (error) throw error

        const mapped: ChatThread[] = (data ?? [])
          .filter((row: any) => row.job_posts && row.job_posts.client_id === user.id)
          .map((row: any) => {
            const subs = row.worker_profiles?.subscriptions
            const isPremium = Array.isArray(subs) 
              ? subs.some((s: any) => s.plan === 'premium' && s.status === 'active')
              : (subs?.plan === 'premium' && subs?.status === 'active')

            return {
              application_id: row.id,
              job_post_id: row.job_post_id,
              job_title: row.job_posts?.title ?? null,
              job_description: row.job_posts?.description ?? '',
              other_name: row.worker_profiles?.full_name ?? 'Trabajador',
              other_avatar: row.worker_profiles?.avatar_url ?? null,
              other_id: row.worker_id,
              applied_at: row.applied_at,
              application_status: row.status,
              match: row.job_matches?.[0] ?? null,
              other_is_premium: isPremium,
            }
          })

        setThreads(mapped)
      } else {
        // El trabajador ve todos los trabajos a los que postuló
        const { data, error } = await supabase
          .from('applications')
          .select(`
            id,
            job_post_id,
            worker_id,
            status,
            applied_at,
            job_posts (
              id,
              title,
              description,
              client_id,
              client_profiles (
                id,
                full_name,
                avatar_url
              )
            ),
            job_matches (
              id,
              job_post_id,
              worker_id,
              application_id,
              agreed_price,
              status,
              scheduled_date,
              worker_notes,
              matched_at,
              finished_at
            )
          `)
          .eq('worker_id', user.id)
          .order('applied_at', { ascending: false })

        if (error) throw error

        const mapped: ChatThread[] = (data ?? [])
          .filter((row: any) => row.job_posts)
          .map((row: any) => {
            const clientProf = row.job_posts?.client_profiles
            return {
              application_id: row.id,
              job_post_id: row.job_post_id,
              job_title: row.job_posts?.title ?? null,
              job_description: row.job_posts?.description ?? '',
              other_name: clientProf?.full_name ?? 'Cliente',
              other_avatar: clientProf?.avatar_url ?? null,
              other_id: row.job_posts?.client_id ?? '',
              applied_at: row.applied_at,
              application_status: row.status,
              match: row.job_matches?.[0] ?? null,
            }
          })

        setThreads(mapped)
      }
    } catch (err) {
      console.error('Error cargando hilos:', err)
    } finally {
      setLoadingThreads(false)
    }
  }, [user?.id, role])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // ── Cargar mensajes del hilo seleccionado ─────────────────────────────────

  const loadMessages = useCallback(async (applicationId: string) => {
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('sent_at', { ascending: true })

    if (!error) setMessages(data ?? [])
    setLoadingMessages(false)
  }, [])

  const selectThread = useCallback(
    async (thread: ChatThread) => {
      setSelectedThread(thread)

      // Limpiar indicador de no leído localmente
      setUnreadThreads((prev) => {
        const next = { ...prev }
        delete next[thread.application_id]
        return next
      })

      // Marcar notificaciones correspondientes como leídas en la BD
      if (user) {
        supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('type', 'new_message')
          .eq('reference_id', thread.application_id)
          .then()
      }

      await loadMessages(thread.application_id)
    },
    [loadMessages, user],
  )

  // ── Cargar conteos de hilos no leídos iniciales ────────────────────────────
  useEffect(() => {
    if (!user) return

    const loadUnreadCounts = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('reference_id')
        .eq('user_id', user.id)
        .eq('type', 'new_message')
        .eq('read', false)

      if (!error && data) {
        const counts: Record<string, number> = {}
        data.forEach((n) => {
          if (n.reference_id) {
            counts[n.reference_id] = (counts[n.reference_id] || 0) + 1
          }
        })
        setUnreadThreads(counts)
      }
    }

    loadUnreadCounts()
  }, [user])

  // ── Auto-seleccionar hilo si viene en la URL (?application=<id>) ───────────
  useEffect(() => {
    if (threads.length > 0 && appIdParam) {
      const thread = threads.find((t) => t.application_id === appIdParam)
      if (thread && selectedThread?.application_id !== thread.application_id) {
        selectThread(thread)
        // Limpiamos los parámetros de la URL para evitar bucles de selección
        searchParams.delete('application')
        searchParams.delete('appId')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [threads, appIdParam, selectThread, searchParams, setSearchParams, selectedThread?.application_id])

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Suscripción a mensajes en tiempo real (global y local) ─────────────────
  useEffect(() => {
    if (!user) return

    // Escuchar cualquier mensaje nuevo en la base de datos
    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message

          // Si es el hilo seleccionado (sea mío o del destinatario)
          if (selectedThread && selectedThread.application_id === newMessage.application_id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev
              return [...prev, newMessage]
            })

            // ¿Es una propuesta aceptada?
            try {
              const parsed = JSON.parse(newMessage.content)
              if (parsed?.type === 'proposal_accepted') {
                loadThreads()
                const agreedPrice = parsed.amount
                const scheduledDate = parsed.scheduled_date
                setSelectedThread((prev) =>
                  prev
                    ? {
                        ...prev,
                        match: {
                          id: '',
                          job_post_id: prev.job_post_id,
                          worker_id: role === 'client' ? prev.other_id : user.id,
                          application_id: prev.application_id,
                          agreed_price: agreedPrice,
                          scheduled_date: scheduledDate,
                          worker_notes: null,
                          status: 'accepted',
                          matched_at: new Date().toISOString(),
                          finished_at: null,
                        },
                        application_status: 'accepted',
                      }
                    : prev,
                )
              }
            } catch {
              // no es JSON o no es una propuesta
            }

            // Solo si es un mensaje recibido de otra persona, lo marcamos como leído en la BD
            if (newMessage.sender_id !== user.id) {
              supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('type', 'new_message')
                .eq('reference_id', newMessage.application_id)
                .then()
            }
          } 
          // Si es de otro hilo y no fue enviado por mí, incrementamos su contador de no leídos
          else if (newMessage.sender_id !== user.id) {
            // Si el mensaje es una propuesta aceptada, refrescamos los hilos para actualizar los badges/estados en el sidebar
            try {
              const parsed = JSON.parse(newMessage.content)
              if (parsed?.type === 'proposal_accepted') {
                loadThreads()
              }
            } catch {}

            setUnreadThreads((prev) => ({
              ...prev,
              [newMessage.application_id]: (prev[newMessage.application_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, role, selectedThread?.application_id, loadThreads])

  // ── Insertar mensaje automático (solo si la BD no tiene mensajes aún) ──────
  //
  // IMPORTANTE: No usar messages.length aquí. Cuando selectThread cambia,
  // loadMessages resetea messages=[] antes de que la fetch termine, por lo que
  // messages.length siempre es 0 en este momento → se insertaría en bucle.
  // La solución es preguntar directamente a la BD con count.

  useEffect(() => {
    if (!selectedThread || !user || role !== 'worker') return
    const appId = selectedThread.application_id

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('application_id', appId)
      .then(({ count, error }) => {
        if (error || (count ?? 0) > 0) return   // ya hay mensajes → no insertar
        const workerName = workerProfile?.full_name ?? 'El trabajador'
        supabase
          .from('messages')
          .insert({
            application_id: appId,
            sender_id: user.id,
            content: `${workerName} ha postulado a tu trabajo.`,
          })
          .then(() => loadMessages(appId))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread?.application_id])

  // ── Enviar mensaje de texto ───────────────────────────────────────────────

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = textMessage.trim()
    if (!trimmed || !selectedThread || !user) return

    setSendingMessage(true)
    setTextMessage('')

    const { error } = await supabase.from('messages').insert({
      application_id: selectedThread.application_id,
      sender_id: user.id,
      content: trimmed,
    })

    if (error) {
      console.error('Error enviando mensaje:', error)
    }
    setSendingMessage(false)
  }

  // ── Enviar propuesta de acuerdo ───────────────────────────────────────────

  const handleSendProposal = async (amount: number, scheduledDate: string) => {
    if (!selectedThread || !user) return
    setShowProposalModal(false)

    const payload: ProposalPayload = {
      type: 'proposal',
      amount,
      scheduled_date: scheduledDate,
    }

    await supabase.from('messages').insert({
      application_id: selectedThread.application_id,
      sender_id: user.id,
      content: JSON.stringify(payload),
    })

    await loadMessages(selectedThread.application_id)
  }

  // ── Aceptar propuesta (crear job_match) ───────────────────────────────────

  const handleAcceptProposal = async (payload: ProposalPayload, messageId: string) => {
    if (!selectedThread || !user) return
    setAcceptingProposalId(messageId)

    try {
      // 1. Crear el job_match
      const { error: matchError } = await supabase.from('job_matches').insert({
        job_post_id: selectedThread.job_post_id,
        worker_id:
          role === 'client'
            ? selectedThread.other_id  // cliente acepta → other_id es el trabajador
            : user.id,                 // trabajador acepta → user.id es el trabajador
        application_id: selectedThread.application_id,
        agreed_price: payload.amount,
        scheduled_date: payload.scheduled_date,
        status: 'accepted',
      })

      if (matchError) {
        // Si el error es de RLS, dar instrucción clara
        const isRls = matchError.code === '42501' || matchError.message.includes('row-level security')
        const msg = isRls
          ? '[job_matches] Error de RLS: faltan políticas en la tabla. Ejecuta el SQL de políticas en Supabase.'
          : `[job_matches] Error al insertar: ${matchError.message}`
        console.error(msg, matchError)
        return
      }

      // 2. Actualizar estado de la aplicación a 'accepted'
      await supabase
        .from('applications')
        .update({ status: 'accepted' })
        .eq('id', selectedThread.application_id)

      // 3. Cerrar el job_post
      await supabase
        .from('job_posts')
        .update({ status: 'matched' })
        .eq('id', selectedThread.job_post_id)

      // 4. Enviar un mensaje de confirmación del acuerdo en el chat para avisar en tiempo real
      const acceptPayload = {
        type: 'proposal_accepted',
        proposal_message_id: messageId,
        amount: payload.amount,
        scheduled_date: payload.scheduled_date,
      }

      await supabase.from('messages').insert({
        application_id: selectedThread.application_id,
        sender_id: user.id,
        content: JSON.stringify(acceptPayload),
      })

      // Refrescar hilos y mensajes para reflejar el match
      await loadThreads()
      if (selectedThread) {
        await loadMessages(selectedThread.application_id)
        // Actualizar el thread seleccionado con el match creado
        setSelectedThread((prev) =>
          prev
            ? {
                ...prev,
                match: {
                  id: '',
                  job_post_id: prev.job_post_id,
                  worker_id:
                    role === 'client' ? prev.other_id : user.id,
                  application_id: prev.application_id,
                  agreed_price: payload.amount,
                  scheduled_date: payload.scheduled_date,
                  worker_notes: null,
                  status: 'accepted',
                  matched_at: new Date().toISOString(),
                  finished_at: null,
                },
                application_status: 'accepted',
              }
            : prev,
        )
      }
    } catch (err) {
      console.error('Error inesperado aceptando propuesta:', err)
    } finally {
      setAcceptingProposalId(null)
    }
  }

  // ── Filtrado de hilos por búsqueda ────────────────────────────────────────

  const filteredThreads = threads.filter(
    (t) =>
      t.other_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.job_title ?? t.job_description).toLowerCase().includes(search.toLowerCase()),
  )

  // ── Nombre del usuario actual ─────────────────────────────────────────────
  const myName =
    role === 'client' ? (clientProfile?.full_name ?? 'Cliente') : (workerProfile?.full_name ?? 'Trabajador')
  const myInitial = myName.charAt(0).toUpperCase()

  // Candado (solo UI, MVP): el trabajador no verificado no puede usar el chat
  if (role === 'worker' && workerProfile && !workerProfile.identity_verified) {
    return (
      <div className="-m-8 h-[calc(100vh-64px)] flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="max-w-md text-center bg-white border border-amber-200 rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">Chat no disponible aún</h2>
          <p className="text-sm text-[#6B7280] leading-relaxed">
            Podrás conversar con los clientes una vez que verifiquemos tu identidad
            (entre 2 y 3 días hábiles). El chat se habilita cuando postulas a un trabajo
            y tu perfil ya está activo.
          </p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    /* -m-8 cancela el p-8 del AppLayout; h llena el área restante tras la navbar */
    <div className="-m-8 h-[calc(100vh-64px)] flex overflow-hidden bg-[#F8FAFC]">
      {/* ── Sidebar: lista de chats ───────────────────────────────────────── */}
      <aside className={`w-full md:w-80 shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
        {/* Encabezado */}
        <div className="px-4 pt-5 pb-3 border-b border-[#E5E7EB]">
          <h1 className="text-lg font-bold text-[#1A1A2E] flex items-center gap-2">
            <MessageSquare size={20} className="text-[#0D7B6B]" />
            Mensajes
          </h1>
          {/* Buscador */}
          <div className="mt-3 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              type="text"
              placeholder="Buscar chat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-[#F9FAFB] transition"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={22} className="animate-spin text-[#0D7B6B]" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <MessageSquare size={30} className="text-[#D1D5DB] mb-2" />
              <p className="text-sm text-[#9CA3AF]">
                {role === 'worker'
                  ? 'Aún no has postulado a ningún trabajo.'
                  : 'Aún no tienes postulantes en tus trabajos.'}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = selectedThread?.application_id === thread.application_id
              const label = thread.job_title ?? thread.job_description.slice(0, 40)
              return (
                <button
                  key={thread.application_id}
                  onClick={() => selectThread(thread)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-[#F3F4F6] text-left transition-colors ${
                    isActive ? 'bg-[#E8F5F3]' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="shrink-0 w-10 h-10 rounded-full bg-[#E8F5F3] flex items-center justify-center text-[#0D7B6B] font-bold text-sm overflow-hidden">
                    {thread.other_avatar ? (
                      <img src={thread.other_avatar} alt={thread.other_name} className="w-full h-full object-cover" />
                    ) : (
                      thread.other_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate flex items-center gap-1">
                        {thread.other_name}
                        {thread.other_is_premium && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shrink-0" title="Profesional Premium">
                            <Award size={8} className="fill-amber-600" /> Pro
                          </span>
                        )}
                      </p>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span className="text-[10px] text-[#9CA3AF]">
                          {formatRelativeTime(thread.applied_at)}
                        </span>
                        {unreadThreads[thread.application_id] > 0 && (
                          <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#0D7B6B] text-white text-[9px] font-bold px-1 leading-none animate-pulse">
                            {unreadThreads[thread.application_id]}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#6B7280] truncate mt-0.5">{label}</p>
                    {thread.match ? (
                      <span className="inline-block mt-1 text-[10px] font-medium text-[#10B981] bg-green-50 px-1.5 py-0.5 rounded-full">
                        Acuerdo confirmado
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[10px] font-medium text-[#F59E0B] bg-amber-50 px-1.5 py-0.5 rounded-full">
                        Negociando…
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Panel derecho: chat activo ────────────────────────────────────── */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col min-w-0 w-full bg-[#F8FAFC]">
          {/* Header del chat */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-white border-b border-[#E5E7EB] shadow-sm shrink-0">
            {/* Botón volver en mobile */}
            <button
              onClick={() => setSelectedThread(null)}
              className="md:hidden shrink-0 p-1.5 -ml-1 text-[#6B7280] hover:bg-[#F3F4F6] rounded-xl transition-colors"
              title="Volver a los chats"
            >
              <ArrowLeft size={20} />
            </button>

            <Link 
              to={role === 'worker' ? `/worker/client/${selectedThread.other_id}` : `/client/worker/${selectedThread.other_id}`}
              className="flex items-center gap-3 min-w-0 flex-1 group hover:bg-[#F8FAFC] p-1 -ml-1 rounded-lg transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#E8F5F3] flex items-center justify-center text-[#0D7B6B] font-bold text-sm overflow-hidden shrink-0 group-hover:border-[#0D7B6B] transition-colors border border-transparent">
                {selectedThread.other_avatar ? (
                  <img src={selectedThread.other_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  selectedThread.other_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1A1A2E] truncate flex items-center gap-1.5 group-hover:text-[#0D7B6B] transition-colors">
                  {selectedThread.other_name}
                  {selectedThread.other_is_premium && (
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shrink-0" title="Profesional Premium">
                      <Award size={10} className="fill-amber-600" /> Premium
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#6B7280] truncate">
                  {selectedThread.job_title ?? selectedThread.job_description.slice(0, 50)}
                </p>
              </div>
            </Link>
            {selectedThread.match ? (
              <span className="shrink-0 text-[10px] sm:text-xs font-medium text-[#10B981] bg-green-50 border border-green-200 px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full" />
                Acuerdo confirmado
              </span>
            ) : (
              /* Botón propuesta de acuerdo en el header (antes estaba abajo) */
              <button
                onClick={() => setShowProposalModal(true)}
                title="Proponer acuerdo"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D7B6B] text-white text-xs font-semibold hover:bg-[#0A6A5C] transition-colors shadow-sm"
              >
                <HandshakeIcon size={14} />
                <span>Acuerdo</span>
              </button>
            )}
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={22} className="animate-spin text-[#0D7B6B]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare size={36} className="text-[#D1D5DB] mb-2" />
                <p className="text-sm text-[#9CA3AF]">No hay mensajes aún.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user?.id}
                  isMatchConfirmed={!!selectedThread.match}
                  onAcceptProposal={(payload) => handleAcceptProposal(payload, msg.id)}
                  acceptingProposalId={acceptingProposalId}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Barra inferior */}
          <div className="bg-white border-t border-[#E5E7EB] px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Avatar propio */}
              <div className="hidden sm:flex w-8 h-8 rounded-full bg-[#E8F5F3] items-center justify-center text-[#0D7B6B] font-bold text-xs shrink-0">
                {myInitial}
              </div>

              {/* Input habilitado */}
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-xl bg-[#F9FAFB] text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] transition"
                  disabled={sendingMessage}
                />
                <button
                  type="submit"
                  disabled={!textMessage.trim() || sendingMessage}
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#0D7B6B] text-white disabled:opacity-50 hover:bg-[#0A6A5C] transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Estado vacío — ningún hilo seleccionado */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center gap-4 bg-[#F8FAFC]">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F5F3] flex items-center justify-center">
            <Inbox size={32} className="text-[#0D7B6B]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A2E]">Selecciona una conversación</p>
            <p className="text-xs text-[#6B7280] mt-1">Elige un chat de la lista para verlo aquí.</p>
          </div>
        </div>
      )}

      {/* Modal de propuesta */}
      {showProposalModal && (
        <ProposalModal
          onConfirm={handleSendProposal}
          onClose={() => setShowProposalModal(false)}
        />
      )}
    </div>
  )
}
