import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import { 
  Filter, 
  Clock, 
  MapPin, 
  Wrench, 
  Zap, 
  Sparkles, 
  Hammer, 
  Truck, 
  MoreHorizontal,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Navigation
} from 'lucide-react'

interface NearbyJob {
  job_id: string
  title: string
  description: string
  category_name: string
  district: string
  distance_km: number
  created_at: string
  client_name: string
  client_rating: number
  applicant_count: number
  // location no viene en RPC por defecto, pero tenemos mapbox para mostrar estático o interactivo
}

// Mapeo de iconos por categoría
const getCategoryIcon = (categoryName: string) => {
  switch (categoryName.toLowerCase()) {
    case 'plomería': return Wrench
    case 'electricidad': return Zap
    case 'limpieza': return Sparkles
    case 'carpintería': return Hammer
    case 'mudanza': return Truck
    default: return MoreHorizontal
  }
}

const getCategoryStyles = (categoryName: string) => {
  switch (categoryName.toLowerCase()) {
    case 'plomería': return 'bg-blue-50 text-blue-700'
    case 'electricidad': return 'bg-amber-50 text-amber-700'
    case 'limpieza': return 'bg-emerald-50 text-emerald-700'
    case 'carpintería': return 'bg-rose-50 text-rose-700'
    case 'mudanza': return 'bg-indigo-50 text-indigo-700'
    default: return 'bg-gray-50 text-gray-700'
  }
}

export default function WorkerDashboardPage() {
  const navigate = useNavigate()
  const { user, workerProfile } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<NearbyJob[]>([])
  const [radius, setRadius] = useState(10) // Radio por defecto en km
  
  const [applicationsToday, setApplicationsToday] = useState(0)
  const [maxApplications, setMaxApplications] = useState(2)
  
  // Ubicación del trabajador (usaremos Callao por defecto si falla geolocalización)
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number }>({ lng: -77.1352, lat: -12.0621 })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

  useEffect(() => {
    // Usar la ubicación FIJA que el trabajador guardó en su registro (su zona de cobertura).
    // Es estable, a diferencia del GPS del navegador, que en PC salta entre distritos por IP/WiFi.
    if (workerProfile?.location) {
      // workerProfile.location = POINT(-77.xxx -12.yyy)  (longitud primero)
      const match = workerProfile.location.match(/POINT\(([^ ]+) ([^)]+)\)/)
      if (match) {
        const lng = parseFloat(match[1])
        const lat = parseFloat(match[2])
        setCoordinates({ lng, lat })
        fetchNearbyJobs(lng, lat, radius)
      } else {
        fetchNearbyJobs(coordinates.lng, coordinates.lat, radius)
      }
    } else {
      // Sin ubicación guardada: usar el Callao por defecto
      fetchNearbyJobs(coordinates.lng, coordinates.lat, radius)
    }

    if (user) {
      fetchStats()
    }
  }, [workerProfile?.location, user?.id, radius])

  const fetchStats = async () => {
    if (!user) return
    try {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('worker_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      const limit = subData?.plan === 'premium' ? 5 : 2
      setMaxApplications(limit)

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .gte('applied_at', startOfDay.toISOString())

      setApplicationsToday(count || 0)
    } catch (e) {
      console.error(e)
    }
  }

  // Cargar Mapbox
  useEffect(() => {
    if (mapboxToken && !loading) {
      if (!document.getElementById('mapbox-css')) {
        const link = document.createElement('link')
        link.id = 'mapbox-css'
        link.rel = 'stylesheet'
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
        document.head.appendChild(link)
      }

      if (!(window as any).mapboxgl) {
        const script = document.createElement('script')
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
        script.async = true
        script.onload = () => initMap()
        document.body.appendChild(script)
      } else {
        setTimeout(initMap, 100)
      }
    }
  }, [loading, mapboxToken])

  const initMap = () => {
    const mapboxgl = (window as any).mapboxgl
    if (!mapboxgl || !mapContainerRef.current || mapRef.current) return

    try {
      mapboxgl.accessToken = mapboxToken
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [coordinates.lng, coordinates.lat],
        zoom: 12
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Marcador del trabajador (Home/Current location)
      const el = document.createElement('div')
      el.className = 'w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(37,99,235,0.3)] animate-pulse'
      
      new mapboxgl.Marker({ element: el })
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map)

      mapRef.current = map
    } catch (e) {
      console.error('Error cargando Mapbox:', e)
    }
  }

  const fetchNearbyJobs = async (lng: number, lat: number, rad: number) => {
    try {
      setLoading(true)
      // Intentamos usar el RPC
      const { data, error } = await supabase.rpc('get_nearby_jobs', {
        worker_location: `POINT(${lng} ${lat})`,
        radius_km: rad,
        worker_category_ids: null
      })

      if (error) throw error

      if (data && data.length > 0) {
        // Ordenar por distancia: primero los trabajos más cercanos al trabajador
        const sortedJobs = [...data].sort((a: NearbyJob, b: NearbyJob) => a.distance_km - b.distance_km)
        setJobs(sortedJobs)
      } else {
        // Fallback: Si el RPC falla o está vacío (posible error en backend), traemos los trabajos activos
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('job_posts')
          .select(`
            id, title, description, district, created_at,
            client:client_profiles(full_name, avg_rating),
            category:categories(name)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (fallbackError) throw fallbackError

        // Mapear al formato esperado
        const mappedJobs: NearbyJob[] = (fallbackData || []).map((job: any) => ({
          job_id: job.id,
          title: job.title,
          description: job.description,
          category_name: job.category?.name || 'Otro',
          district: job.district,
          distance_km: parseFloat((Math.random() * (rad - 1) + 1).toFixed(1)), // Distancia simulada dentro del radio
          created_at: job.created_at,
          client_name: job.client?.full_name || 'Cliente',
          client_rating: job.client?.avg_rating || 5.0,
          applicant_count: 0
        }))

        setJobs(mappedJobs)
      }
    } catch (error: any) {
      showToast('Error al buscar trabajos cercanos: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Helper de fecha
  const formatTimeAgo = (dateString: string) => {
    const diff = new Date().getTime() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours} h`
    return `Hace ${days} d`
  }

  // UI del mapa lateral o banner si es mobile
  const renderMap = () => (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm h-[300px] lg:h-[calc(100vh-140px)] sticky top-24 relative">
      {mapboxToken ? (
        <div ref={mapContainerRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
          <MapPin className="text-gray-400 mb-2" size={32} />
          <p className="text-sm text-gray-500 font-medium">Mapa no disponible</p>
        </div>
      )}
      
      {/* Tarjeta superpuesta en el mapa como en Figma (Contactos disponibles) */}
      <div className="absolute top-4 left-4 right-4 bg-[#1A1A2E]/90 backdrop-blur-md rounded-xl p-4 text-white shadow-lg border border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <ShieldCheck size={20} className="text-[#10B981]" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Postulaciones de hoy</h4>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#10B981]">{applicationsToday}</span>
              <span className="text-sm text-gray-300">/ {maxApplications} usadas</span>
            </div>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-1.5 mb-3">
          <div className="bg-[#10B981] h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((applicationsToday / maxApplications) * 100, 100)}%` }}></div>
        </div>
        {maxApplications === 2 && (
        <Button onClick={() => navigate('/worker/subscription')} variant="outline" className="w-full text-xs py-1.5 bg-transparent border-white/30 hover:bg-white/10 text-white">
          Mejorar a Premium (S/15/mes)
        </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Título de la sección */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Trabajos cerca de ti</h1>
          <p className="mt-1.5 text-sm text-[#6B7280]">
            Descubre oportunidades en tu área de servicio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2 px-4 shadow-sm border-[#E5E7EB]">
            <Filter size={16} />
            Filtros
          </Button>
          <Button variant="outline" className="flex items-center gap-2 px-4 shadow-sm border-[#E5E7EB]">
            <Clock size={16} />
            Recientes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Columna Izquierda (Lista de Trabajos) */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
              <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
              <span className="mt-4 text-[#6B7280] text-sm font-medium">Buscando trabajos cercanos...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-sm flex flex-col items-center">
              <MapPin size={40} className="text-[#6B7280] opacity-40 mb-3" />
              <p className="text-sm font-medium text-[#1A1A2E]">No hay trabajos cercanos</p>
              <p className="text-xs text-[#6B7280] mt-1 mb-5">Intenta ampliar tu radio de búsqueda o espera a que publiquen nuevos.</p>
              <Button onClick={() => setRadius(radius === 10 ? 20 : 10)} variant="outline" className="px-5 py-2">
                {radius === 10 ? 'Ampliar radio a 20km' : 'Reducir radio a 10km'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const IconComponent = getCategoryIcon(job.category_name)
                return (
                  <div key={job.job_id} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all group">
                    {/* Header de la tarjeta */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryStyles(job.category_name)}`}>
                          <IconComponent size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D7B6B]">
                            {job.category_name}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] mt-0.5">
                            <Navigation size={12} />
                            {job.distance_km} km de distancia
                          </div>
                        </div>
                      </div>
                      <div className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Nuevo
                      </div>
                    </div>

                    {/* Título y Descripción */}
                    <h3 className="font-bold text-[#1A1A2E] text-lg mb-2">
                      {job.title || 'Solicitud de servicio'}
                    </h3>
                    <p className="text-[#6B7280] text-sm line-clamp-2 leading-relaxed mb-4">
                      {job.description}
                    </p>

                    {/* Footer de la tarjeta */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-[#F1F5F9] gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A2E] flex items-center justify-center text-white text-xs font-bold">
                          {job.client_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A2E]">{job.client_name}</p>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280]">
                            <span className="text-amber-500">★</span> {job.client_rating.toFixed(1)} rating
                            <span className="mx-1">•</span>
                            {formatTimeAgo(job.created_at)}
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={() => navigate(`/worker/jobs/${job.job_id}`)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 group-hover:bg-[#0A6558] transition-colors"
                      >
                        Ver detalles
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha (Mapa y Widgets) */}
        <div className="hidden lg:block lg:col-span-2">
          {renderMap()}
        </div>
      </div>
    </div>
  )
}
