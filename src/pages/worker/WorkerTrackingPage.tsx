import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import { 
  CheckCircle2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Calendar,
  Truck,
  Wrench,
  Loader2,
  MoreVertical,
  Navigation
} from 'lucide-react'
import type { MatchStatus } from '../../lib/types'
import TrackingMap from '../../components/ui/TrackingMap'
import { getDistanceInMeters } from '../../lib/geo'

interface TrackingMatch {
  id: string
  status: MatchStatus
  scheduled_date: string | null
  agreed_price: number | null
  worker_notes: string | null
  job: {
    id: string
    title: string
    address: string
    district: string
    client: {
      full_name: string
      phone: string
      avatar_url: string | null
    }
  }
}

export default function WorkerTrackingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<TrackingMatch[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Tracking states
  const [workerLocation, setWorkerLocation] = useState<{lng: number, lat: number} | null>(null)
  const [jobCoordinates, setJobCoordinates] = useState<Record<string, {lng: number, lat: number}>>({})
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (user) {
      fetchMatches()
    }
  }, [user])

  // Lógica de tracking cuando hay trabajos "En camino"
  useEffect(() => {
    const onTheWayMatches = matches.filter(m => m.status === 'on_the_way')
    
    if (onTheWayMatches.length === 0) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    // 1. Obtener coordenadas de los trabajos "on_the_way" que falten
    const fetchMissingCoords = async () => {
      const newCoords = { ...jobCoordinates }
      let updated = false
      for (const match of onTheWayMatches) {
        if (!newCoords[match.job.id]) {
          const { data, error } = await supabase.rpc('get_job_coordinates', { job_id_param: match.job.id })
          if (!error && data) {
            newCoords[match.job.id] = data as {lng: number, lat: number}
            updated = true
          }
        }
      }
      if (updated) {
        setJobCoordinates(newCoords)
      }
    }
    fetchMissingCoords()

    // 2. Configurar canales
    const channels = onTheWayMatches.map(match => supabase.channel(`tracking_${match.id}`))

    // 3. Iniciar tracking
    if ('geolocation' in navigator && watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = { lng: position.coords.longitude, lat: position.coords.latitude }
          setWorkerLocation(newLoc)
          
          channels.forEach(channel => {
            channel.send({
              type: 'broadcast',
              event: 'location',
              payload: newLoc
            })
          })
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error)
          // Mostrar toast solo si no hemos intentado mostrarlo recientemente para evitar spam
          if (!window.sessionStorage.getItem('geo_error_shown')) {
            showToast('No pudimos acceder a tu ubicación de alta precisión.', 'error')
            window.sessionStorage.setItem('geo_error_shown', 'true')
          }
        },
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 20000 }
      )
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [matches]) // dependemos de matches para (des)activar tracking

  // Limpieza final al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('job_matches')
        .select(`
          id,
          status,
          scheduled_date,
          agreed_price,
          worker_notes,
          job:job_posts!inner (
            id,
            title,
            address,
            district,
            client:client_profiles (
              full_name,
              phone,
              avatar_url
            )
          )
        `)
        .eq('worker_id', user!.id)
        .order('matched_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        setMatches(data as any)
      } else {
        setMatches([])
      }
    } catch (error: any) {
      showToast('Error al cargar seguimiento: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (matchId: string, newStatus: MatchStatus) => {
    try {
      setUpdatingId(matchId)

      const payload: any = { status: newStatus }
      if (newStatus === 'finished') {
        payload.finished_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('job_matches')
        .update(payload)
        .eq('id', matchId)

      if (error) throw error

      if (newStatus === 'finished') {
        const match = matches.find(m => m.id === matchId)
        if (match) {
          await supabase
            .from('job_posts')
            .update({ status: 'finished' })
            .eq('id', match.job.id)
        }
      }

      showToast('Estado actualizado a: ' + getStatusLabel(newStatus), 'success')
      fetchMatches()
    } catch (error: any) {
      showToast('Error al actualizar estado: ' + error.message, 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusLabel = (status: MatchStatus) => {
    switch (status) {
      case 'accepted': return 'Aceptado / Por Iniciar'
      case 'on_the_way': return 'En Camino'
      case 'in_progress': return 'En Progreso'
      case 'finished': return 'Finalizado'
    }
  }

  const getStatusProgress = (status: MatchStatus) => {
    switch (status) {
      case 'accepted': return 25
      case 'on_the_way': return 50
      case 'in_progress': return 75
      case 'finished': return 100
    }
  }

  const renderTimelineStep = (
    currentStatus: MatchStatus, 
    stepStatus: MatchStatus, 
    label: string, 
    Icon: any, 
    onClick: () => void,
    isHighlighted: boolean = false
  ) => {
    const isCompleted = getStatusProgress(currentStatus) >= getStatusProgress(stepStatus)
    const isCurrent = currentStatus === stepStatus
    
    return (
      <div className="flex flex-col items-center flex-1">
        <button
          onClick={onClick}
          disabled={updatingId !== null || isCompleted}
          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 relative
            ${isCurrent ? 'border-[#0D7B6B] ring-4 ring-[#0D7B6B]/20 bg-white' : 
              isCompleted ? 'border-[#0D7B6B] bg-[#0D7B6B] text-white' : 
              'border-[#E5E7EB] text-[#9CA3AF] bg-white hover:border-[#0D7B6B]/50'
            }
            ${isHighlighted ? 'ring-4 ring-amber-400/50 animate-pulse border-amber-500' : ''}
            `}
        >
          <Icon size={18} className={isCompleted && !isCurrent ? 'text-white' : isCurrent || isHighlighted ? 'text-[#0D7B6B]' : ''} />
        </button>
        <span className={`text-[10px] font-bold mt-2 text-center ${isCurrent || isHighlighted ? 'text-[#0D7B6B]' : isCompleted ? 'text-[#1A1A2E]' : 'text-[#9CA3AF]'}`}>
          {label}
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
        <span className="mt-4 text-[#6B7280] text-sm">Cargando seguimiento...</span>
      </div>
    )
  }

  const activeMatches = matches.filter(m => m.status !== 'finished')
  const pastMatches = matches.filter(m => m.status === 'finished')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Seguimiento de Trabajos</h1>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Gestiona el estado de los trabajos que tienes asignados.
        </p>
      </div>

      <div className="space-y-8">
        {/* Trabajos Activos */}
        <section>
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Trabajos en curso ({activeMatches.length})
          </h2>
          
          {activeMatches.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center shadow-sm">
              <CheckCircle2 size={32} className="text-[#6B7280] opacity-40 mx-auto mb-3" />
              <p className="text-sm font-medium text-[#1A1A2E]">No tienes trabajos en curso</p>
              <p className="text-xs text-[#6B7280] mt-1">Postula a trabajos en el feed para empezar a trabajar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMatches.map(match => {
                const isTracking = match.status === 'on_the_way'
                const coords = jobCoordinates[match.job.id]
                
                // Si la distancia es menor a 150m, resaltamos el botón "Trabajando" (Ya llegué)
                let isNearby = false
                if (isTracking && coords && workerLocation) {
                  const dist = getDistanceInMeters(workerLocation.lat, workerLocation.lng, coords.lat, coords.lng)
                  if (dist < 150) {
                    isNearby = true
                  }
                }

                return (
                  <div key={match.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    
                    {/* Top Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8F5F3] text-[#0D7B6B] flex items-center justify-center font-bold text-lg">
                          {match.job?.client?.avatar_url ? (
                            <img src={match.job.client.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            (match.job?.client?.full_name || 'C').charAt(0)
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-[#1A1A2E]">{match.job?.client?.full_name || 'Cliente'}</h3>
                          <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
                            <a href={`tel:${match.job?.client?.phone}`} className="flex items-center gap-1 hover:text-[#0D7B6B] transition-colors">
                              <Phone size={12} /> {match.job?.client?.phone || 'Sin teléfono'}
                            </a>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => navigate(`/worker/messages?match=${match.id}`)} className="p-2 text-[#0D7B6B] bg-[#E8F5F3] rounded-full hover:bg-[#0D7B6B] hover:text-white transition-colors">
                        <MessageSquare size={16} />
                      </button>
                    </div>

                    {/* Job Info */}
                    <div className="mb-6 pb-6 border-b border-[#F1F5F9]">
                      <h4 className="font-bold text-[#1A1A2E] text-lg">{match.job?.title}</h4>
                      <div className="flex flex-col sm:flex-row gap-3 mt-2 text-sm text-[#6B7280]">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={16} className="text-[#0D7B6B]" />
                          {match.job?.address}, {match.job?.district}
                        </div>
                        {match.scheduled_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={16} className="text-[#0D7B6B]" />
                            {new Date(match.scheduled_date).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mapa de Tracking en Vivo (Solo si está en camino) */}
                    {isTracking && (
                      <div className="mb-6 rounded-xl overflow-hidden border border-[#E5E7EB] h-[250px] relative">
                        <TrackingMap 
                          destination={coords || null}
                          workerPosition={workerLocation}
                        />
                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-[10px] font-bold text-[#1A1A2E] px-2.5 py-1.5 rounded-lg shadow-sm border border-[#E5E7EB]">
                          {isNearby ? '📍 Estás cerca del destino' : '🚗 Transmitiendo ubicación...'}
                        </div>
                      </div>
                    )}

                    {/* Status Timeline */}
                    <div className="relative mb-2 px-4 sm:px-8">
                      {/* Background Line */}
                      <div className="absolute top-5 left-10 right-10 h-1 bg-[#E5E7EB] -z-0 rounded-full" />
                      {/* Progress Line */}
                      <div 
                        className="absolute top-5 left-10 h-1 bg-[#0D7B6B] -z-0 rounded-full transition-all duration-500"
                        style={{ width: `calc(${getStatusProgress(match.status)}% - 20px)` }}
                      />
                      
                      <div className="flex justify-between">
                        {renderTimelineStep(match.status, 'accepted', 'Aceptado', CheckCircle2, () => {})}
                        {renderTimelineStep(match.status, 'on_the_way', 'En camino', Navigation, () => updateStatus(match.id, 'on_the_way'))}
                        {renderTimelineStep(match.status, 'in_progress', 'Ya llegué', Wrench, () => updateStatus(match.id, 'in_progress'), isNearby && match.status === 'on_the_way')}
                        {renderTimelineStep(match.status, 'finished', 'Finalizar', CheckCircle2, () => {
                          if(confirm('¿Estás seguro de que deseas marcar este trabajo como finalizado?')) {
                            updateStatus(match.id, 'finished')
                          }
                        })}
                      </div>
                    </div>
                    
                    {updatingId === match.id && (
                      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                        <Loader2 className="w-6 h-6 text-[#0D7B6B] animate-spin" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Historial (Finalizados) */}
        {pastMatches.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Historial de Trabajos</h2>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
              {pastMatches.map((match, index) => (
                <div key={match.id} className={`p-4 flex items-center justify-between ${index !== pastMatches.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A2E] text-sm">{match.job?.title}</h4>
                      <p className="text-xs text-[#6B7280]">Cliente: {match.job?.client?.full_name || 'Cliente'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    Completado
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
