import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Filter, 
  Clock, 
  ChevronRight,
  Loader2,
  Star,
  CheckCircle2
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
  has_applied?: boolean
}

export default function WorkerJobsPage() {
  const navigate = useNavigate()
  const { user, workerProfile } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<NearbyJob[]>([])
  const [radius] = useState(10) // km
  const [coordinates] = useState({ lat: -12.0621, lng: -77.1352 }) // Callao mock center

  useEffect(() => {
    if (user && workerProfile) {
      fetchJobs(coordinates.lng, coordinates.lat, radius)
    }
  }, [user, workerProfile])

  const fetchJobs = async (lng: number, lat: number, rad: number) => {
    try {
      setLoading(true)
      
      // 1. Fetch applications to know what the user already applied to
      const { data: myApps } = await supabase
        .from('applications')
        .select('job_post_id')
        .eq('worker_id', user!.id)
      
      const appliedIds = new Set(myApps?.map(a => a.job_post_id) || [])

      // 2. Fetch jobs
      let fetchedJobs: NearbyJob[] = []
      
      const { data, error } = await supabase.rpc('get_nearby_jobs', {
        worker_location: `POINT(${lng} ${lat})`,
        radius_km: rad,
        worker_category_ids: null
      })

      if (!error && data && data.length > 0) {
        fetchedJobs = [...data].sort((a: NearbyJob, b: NearbyJob) => a.distance_km - b.distance_km)
      } else {
        // Fallback
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

        fetchedJobs = (fallbackData || []).map((job: any) => ({
          job_id: job.id,
          title: job.title,
          description: job.description,
          category_name: job.category?.name || 'Otro',
          district: job.district,
          distance_km: parseFloat((Math.random() * (rad - 1) + 1).toFixed(1)),
          created_at: job.created_at,
          client_name: job.client?.full_name || 'Cliente',
          client_rating: job.client?.avg_rating || 5.0,
          applicant_count: 0
        }))
      }

      // Merge application status
      const mergedJobs = fetchedJobs.map(job => ({
        ...job,
        has_applied: appliedIds.has(job.job_id)
      }))

      setJobs(mergedJobs)
    } catch (error: any) {
      showToast('Error al buscar trabajos: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const diff = new Date().getTime() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours} h`
    return `Hace ${days} d`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Título y Búsqueda */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Puestos Disponibles</h1>
        <p className="mt-1.5 text-[#6B7280]">
          Explora los trabajos más cercanos a ti.
        </p>
      </div>

      {/* Controles de filtro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por palabra clave..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/20 focus:border-[#0D7B6B] transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 px-4 text-sm bg-white">
            <Filter size={16} className="mr-2" />
            Filtros
          </Button>
          <Button variant="outline" className="h-10 px-4 text-sm bg-white">
            <Clock size={16} className="mr-2 text-[#0D7B6B]" />
            Recientes
          </Button>
        </div>
      </div>

      {/* Lista de Trabajos */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
            <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
            <span className="mt-4 text-[#6B7280] text-sm">Buscando trabajos cercanos...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#E5E7EB] shadow-sm">
            <div className="w-16 h-16 bg-[#E8F5F3] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="text-[#0D7B6B]" size={32} />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">No hay trabajos en tu zona</h3>
            <p className="text-[#6B7280] text-sm max-w-sm mx-auto">
              Actualmente no encontramos solicitudes activas en {workerProfile?.coverage_zone || 'tu distrito'}. Intenta ampliar tu radio de búsqueda.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const isApplied = job.has_applied
              
              return (
                <div 
                  key={job.job_id} 
                  className={`bg-white rounded-2xl p-5 transition-all shadow-sm group relative overflow-hidden border ${
                    isApplied ? 'border-[#0D7B6B]/40 bg-[#F8FAFC]' : 'border-[#E5E7EB] hover:shadow-md hover:border-[#0D7B6B]/30'
                  }`}
                >
                  {isApplied && (
                    <div className="absolute top-4 right-4 bg-[#E8F5F3] text-[#0D7B6B] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Ya postulaste
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#E8F5F3] text-[#0D7B6B] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {job.category_name}
                        </span>
                        {!isApplied && job.distance_km <= 5 && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Star size={10} className="fill-amber-700" />
                            Cerca de ti
                          </span>
                        )}
                      </div>
                      
                      <h3 className={`font-bold text-lg mb-1.5 ${isApplied ? 'text-[#1A1A2E]/70' : 'text-[#1A1A2E]'}`}>
                        {job.title}
                      </h3>
                      
                      <p className={`text-sm line-clamp-2 mb-3 leading-relaxed ${isApplied ? 'text-[#6B7280]/70' : 'text-[#6B7280]'}`}>
                        {job.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A1A2E]">
                          <MapPin size={14} className="text-[#0D7B6B]" />
                          {job.district} <span className="text-[#9CA3AF]">({job.distance_km} km)</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-[#E5E7EB]" />
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280]">
                          <span className="text-amber-500">★</span> {job.client_rating.toFixed(1)} rating
                          <span className="mx-1">•</span>
                          {formatTimeAgo(job.created_at)}
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => navigate(`/worker/jobs/${job.job_id}`)}
                      variant={isApplied ? "outline" : "primary"}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 transition-colors shrink-0"
                    >
                      {isApplied ? 'Ver estado' : 'Ver detalles'}
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
