import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  MapPin, 
  ShieldCheck,
  CheckCircle2,
  Star,
  TrendingUp
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { parseLocation } from '../../lib/geo'

export default function WorkerDashboardPage() {
  const navigate = useNavigate()
  const { user, workerProfile } = useAuth()
  const isVerified = !!workerProfile?.identity_verified

  const [applicationsToday, setApplicationsToday] = useState(0)
  const [maxApplications, setMaxApplications] = useState(2)
  const [finishedJobs, setFinishedJobs] = useState(0)
  
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number }>({ lng: -77.1352, lat: -12.0621 })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const workerMarkerRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

  const [mapLoaded, setMapLoaded] = useState(false)
  const [activeJobs, setActiveJobs] = useState<{id:string, lat:number, lng:number, title:string}[]>([])

  useEffect(() => {
    if (workerProfile?.location) {
      const coords = parseLocation(workerProfile.location)
      if (coords) setCoordinates(coords)
    }

    if (user) {
      fetchStats()
      // Las ubicaciones exactas de los trabajos solo se muestran a trabajadores
      // verificados (privacidad de los clientes). Sin verificar → no se cargan pines.
      if (isVerified) fetchJobLocations()
    }
  }, [workerProfile?.location, workerProfile?.identity_verified, user?.id])

  const fetchJobLocations = async () => {
    try {
      const { data } = await supabase.from('job_posts').select('id, title, location').eq('status', 'active')
      if (data) {
        const parsed = data.map(j => {
          const coords = parseLocation(j.location)
          if(coords) return { id: j.id, title: j.title, lat: coords.lat, lng: coords.lng }
          return null
        }).filter(Boolean) as any[]
        setActiveJobs(parsed)
      }
    } catch (e) {
      console.error(e)
    }
  }

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

      const { count: appsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .gte('applied_at', startOfDay.toISOString())

      setApplicationsToday(appsCount || 0)

      const { data: matchesData } = await supabase
        .from('job_matches')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .eq('status', 'finished')

        if (matchesData) setFinishedJobs(matchesData.length)
      } catch (error) {
        console.error('Error cargando stats:', error)
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

  useEffect(() => {
    if (mapLoaded && mapRef.current && (window as any).mapboxgl) {
      const mapboxgl = (window as any).mapboxgl
      if (!workerMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'w-10 h-10 flex items-center justify-center relative z-50'
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-40"></div>
            <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg relative z-10"></div>
          </div>
        `
        workerMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([coordinates.lng, coordinates.lat])
          .addTo(mapRef.current)
      } else {
        workerMarkerRef.current.setLngLat([coordinates.lng, coordinates.lat])
      }
      mapRef.current.flyTo({ center: [coordinates.lng, coordinates.lat], zoom: 12.5 })
    }
  }, [coordinates, mapLoaded])

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

      mapRef.current = map
      setMapLoaded(true)
    } catch (e) {
      console.error('Error cargando Mapbox:', e)
    }
  }

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !activeJobs.length) return
    const mapboxgl = (window as any).mapboxgl

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    activeJobs.forEach(job => {
      const el = document.createElement('div')
      el.className = 'w-8 h-8 flex items-center justify-center cursor-pointer'
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white relative z-10">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
        </div>
      `
      
      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(`
        <div class="p-2 min-w-[120px]">
          <p class="font-bold text-[#1A1A2E] text-xs leading-tight">${job.title}</p>
          <p class="text-[10px] text-[#0D7B6B] mt-1 font-bold">¡Oportunidad activa!</p>
        </div>
      `)

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([job.lng, job.lat])
        .setPopup(popup)
        .addTo(mapRef.current)
      
      markersRef.current.push(marker)
    })
  }, [mapLoaded, activeJobs])

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

        {/* Sin verificar: no se muestran las ubicaciones de los trabajos */}
        {mapboxToken && !isVerified && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur border border-amber-200 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 font-medium leading-snug">
              Las ubicaciones de los trabajos se mostrarán cuando tu perfil esté verificado.
            </p>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}
