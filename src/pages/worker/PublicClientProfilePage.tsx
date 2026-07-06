import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft,
  Star,
  User,
  Briefcase,
  MapPin,
  Calendar
} from 'lucide-react'

// Helper for relative time
function getRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7)
    return `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`
  }
  const m = Math.floor(diffDays / 30)
  return `Hace ${m} ${m === 1 ? 'mes' : 'meses'}`
}

export default function PublicClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [showAllReviews, setShowAllReviews] = useState(false)

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Fetch Profile
      const { data: pData, error: pErr } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (pErr || !pData) {
        console.error('Profile error:', pErr)
        return
      }
      setProfile(pData)

      // 2. Fetch Reviews
      const { data: revData } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('reviewed_id', id)
        .order('created_at', { ascending: false })

      if (revData && revData.length > 0) {
        const workerIds = [...new Set(revData.map(r => r.reviewer_id))]
        const { data: workersData } = await supabase
          .from('worker_profiles')
          .select('id, full_name, avatar_url')
          .in('id', workerIds)
        
        const workerMap = (workersData || []).reduce((acc: any, w: any) => {
          acc[w.id] = w
          return acc
        }, {})

        const enrichedReviews = revData.map(r => ({
          ...r,
          reviewer: workerMap[r.reviewer_id] || { full_name: 'Usuario Anónimo', avatar_url: null }
        }))

        setReviews(enrichedReviews)
      } else {
        setReviews([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#0D7B6B]/20 border-t-[#0D7B6B] rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">Cliente no encontrado</h2>
        <p className="text-[#6B7280] mb-6">El perfil que buscas no existe o no está disponible.</p>
        <button onClick={() => navigate(-1)} className="text-[#0D7B6B] font-semibold hover:underline">
          Volver atrás
        </button>
      </div>
    )
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Botón Volver */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#1A1A2E] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Volver atrás
      </button>

      {/* Tarjeta Principal del Perfil */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E5E7EB] shadow-sm mb-8 relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#E8F5F3] to-white rounded-bl-full -z-10 opacity-70" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 relative z-10">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-white shadow-xl shadow-[#0D7B6B]/10 border-4 border-white flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-extrabold text-[#0D7B6B]">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info principal */}
          <div className="flex-1 text-center sm:text-left mt-2">
            <h1 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 tracking-tight">
              {profile.full_name}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-4 mb-6">
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span className="font-bold text-amber-700">{profile.avg_rating?.toFixed(1) || '5.0'}</span>
                <span className="text-xs font-medium text-amber-600/70">({profile.total_reviews || 0} reseñas)</span>
              </div>
              
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280]">
                <MapPin size={16} className="text-[#0D7B6B]" />
                {profile.district || profile.province || 'Ubicación no especificada'}
              </div>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5E7EB]">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase size={16} className="text-[#0D7B6B]" />
                  <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Trabajos</span>
                </div>
                <p className="text-2xl font-extrabold text-[#1A1A2E]">{profile.jobs_posted || 1}</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Publicados</p>
              </div>

              <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5E7EB]">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-[#0D7B6B]" />
                  <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Miembro desde</span>
                </div>
                <p className="text-lg font-extrabold text-[#1A1A2E] mt-1">{new Date(profile.created_at).getFullYear()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reseñas */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E5E7EB] shadow-sm">
        <h3 className="text-xl font-bold text-[#1A1A2E] mb-8 flex items-center gap-2">
          <Star size={24} className="text-[#0D7B6B]" />
          Lo que dicen los trabajadores
        </h3>

        {reviews.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <User className="text-gray-400" size={20} />
            </div>
            <p className="text-[#6B7280] font-medium">Este cliente aún no tiene reseñas.</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Sé el primero en hacer un trabajo con él y dejar una valoración.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedReviews.map(review => (
              <div key={review.id} className="border-b border-[#E5E7EB] last:border-0 pb-6 last:pb-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {review.reviewer?.avatar_url ? (
                        <img src={review.reviewer.avatar_url} alt="Reviewer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-gray-500">{review.reviewer?.full_name?.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[#1A1A2E] text-sm">{review.reviewer?.full_name}</p>
                      <div className="flex text-amber-400 mt-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} size={12} className={star <= review.rating ? 'fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#9CA3AF] whitespace-nowrap">
                    {getRelativeTime(review.created_at)}
                  </span>
                </div>
                <p className="text-sm text-[#4B5563] leading-relaxed">"{review.comment}"</p>
              </div>
            ))}

            {reviews.length > 3 && !showAllReviews && (
              <button 
                onClick={() => setShowAllReviews(true)}
                className="w-full py-3 mt-4 rounded-xl border-2 border-[#E5E7EB] text-sm font-bold text-[#6B7280] hover:border-[#0D7B6B] hover:text-[#0D7B6B] transition-colors"
              >
                Ver todas las reseñas ({reviews.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
