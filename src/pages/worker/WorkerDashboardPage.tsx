import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  MapPin, 
  ShieldCheck,
  CheckCircle2,
  Star,
  Zap,
  TrendingUp,
  Briefcase
} from 'lucide-react'
import Button from '../../components/ui/Button'

export default function WorkerDashboardPage() {
  const navigate = useNavigate()
  const { user, workerProfile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [applicationsToday, setApplicationsToday] = useState(0)
  const [maxApplications, setMaxApplications] = useState(2)
  const [finishedJobs, setFinishedJobs] = useState(0)
  
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number }>({ lng: -77.1352, lat: -12.0621 })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

  useEffect(() => {
    if (workerProfile?.location) {
      const match = workerProfile.location.match(/POINT\(([^ ]+) ([^)]+)\)/)
      if (match) {
        setCoordinates({ lng: parseFloat(match[1]), lat: parseFloat(match[2]) })
      }
    }

    if (user) {
      fetchStats()
    }
  }, [workerProfile?.location, user?.id])

  const fetchStats = async () => {
    if (!user) return
    try {
      setLoading(true)
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

      const { count: appsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .gte('applied_at', startOfDay.toISOString())

      setApplicationsToday(appsCount || 0)

      const { count: finishedCount } = await supabase
        .from('job_matches')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .eq('status', 'finished')

      setFinishedJobs(finishedCount || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Cargar Mapbox
  useEffect(() => {
    if (mapboxToken) {
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
  }, [mapboxToken, coordinates])

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Título */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Hola, {workerProfile?.full_name?.split(' ')[0] || 'Trabajador'}</h1>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Este es el resumen de tu actividad en AlToque.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Resumen (1/3) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Panel 1: Actividad */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#E8F5F3] flex items-center justify-center text-[#0D7B6B]">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-[#1A1A2E] text-lg">Actividad Diaria</h3>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-[#6B7280]">Postulaciones</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#1A1A2E]">{applicationsToday}</span>
                  <span className="text-sm text-[#6B7280]">/ {maxApplications}</span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0D7B6B] rounded-full transition-all" style={{ width: `${Math.min((applicationsToday / maxApplications) * 100, 100)}%` }}></div>
              </div>
            </div>

            {maxApplications === 2 && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-blue-900">Plan Básico</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">Límite: 2 diarias</p>
                </div>
                <Button onClick={() => navigate('/worker/subscription')} className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm shrink-0">
                  Mejorar Plan
                </Button>
              </div>
            )}
          </div>

          {/* Panel 2: Rendimiento */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-bold text-[#1A1A2E] text-lg">Tu Rendimiento</h3>
            </div>

            <div className="flex flex-col gap-4">
              <div className="border border-[#F1F5F9] rounded-xl p-4 bg-gray-50 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Completados</span>
                </div>
                <p className="text-3xl font-extrabold text-[#1A1A2E]">{finishedJobs}</p>
              </div>

              <div className="border border-[#F1F5F9] rounded-xl p-4 bg-gray-50 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Calificación Promedio</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-[#1A1A2E]">{workerProfile?.avg_rating?.toFixed(1) || '5.0'}</p>
                </div>
                <p className="text-[10px] font-medium text-[#9CA3AF] mt-1">Basado en {workerProfile?.total_reviews || 0} reseñas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Mapa (2/3) */}
        <div className="lg:col-span-2 flex flex-col">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Tu zona de cobertura actual</h2>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm flex-1 min-h-[400px] relative">
        {mapboxToken ? (
          <div ref={mapContainerRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
            <MapPin className="text-gray-400 mb-2" size={32} />
            <p className="text-sm text-gray-500 font-medium">Mapa no disponible</p>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}
