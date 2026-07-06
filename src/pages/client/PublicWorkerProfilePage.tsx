import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  ArrowLeft,
  BadgeCheck,
  Star,
  UserCheck,
  Building2,
  Award,
  Briefcase
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

export default function PublicWorkerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [specialties, setSpecialties] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

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
        .from('worker_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (pErr || !pData) {
        console.error('Profile error:', pErr)
        return
      }
      setProfile(pData)

      // 2. Fetch Specialties
      const { data: specData } = await supabase
        .from('worker_specialties')
        .select('categories(name)')
        .eq('worker_id', id)

      if (specData) {
        const cats = specData.map((s: any) => s.categories?.name).filter(Boolean)
        setSpecialties(cats)
      }

      // 3. Fetch Tags
      const { data: tagsData } = await supabase
        .from('worker_tags')
        .select('tag')
        .eq('worker_id', id)
      
      if (tagsData) {
        setTags(tagsData.map(t => t.tag))
      }

      // 4. Fetch Reviews
      const { data: revData } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('reviewed_id', id)
        .order('created_at', { ascending: false })

      if (revData && revData.length > 0) {
        const clientIds = [...new Set(revData.map(r => r.reviewer_id))]
        const { data: clientsData } = await supabase
          .from('client_profiles')
          .select('id, full_name, avatar_url')
          .in('id', clientIds)
        
        const clientMap = (clientsData || []).reduce((acc: any, c: any) => {
          acc[c.id] = c
          return acc
        }, {})

        const reviewsWithClients = revData.map(r => ({
          ...r,
          reviewer: clientMap[r.reviewer_id] || null
        }))
        setReviews(reviewsWithClients)
      }

      // 5. Fetch Subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('worker_id', id)
        .eq('status', 'active')
        .maybeSingle()

      setIsPremium(subData?.plan === 'premium')

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D7B6B]"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">Perfil no encontrado</h2>
        <button onClick={() => navigate(-1)} className="text-[#0D7B6B] hover:underline">Volver</button>
      </div>
    )
  }

  const mainSpecialty = specialties.length > 0 ? specialties[0] : 'Profesional Independiente'
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Botón volver */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#1A1A2E] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* COLUMNA IZQUIERDA (Perfil Resumen) */}
        <div className="w-full lg:w-1/3 space-y-6">
          
          {/* Card Principal */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center">
            
            <div className="relative w-32 h-32 mb-4">
              <div className="w-full h-full rounded-2xl bg-[#E8F5F3] text-[#0D7B6B] flex items-center justify-center overflow-hidden border border-[#E5E7EB]">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold">{profile.full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {isPremium ? (
                <div className="absolute -bottom-2 -right-2 bg-amber-500 rounded-full p-1.5 border-2 border-white shadow-md" title="Verificado Premium">
                  <Award className="text-white fill-amber-100" size={18} />
                </div>
              ) : profile.identity_verified ? (
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 border border-[#E5E7EB]" title="Identidad Verificada">
                  <BadgeCheck className="text-blue-500" fill="white" size={24} />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 justify-center">
                <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight">{profile.full_name}</h1>
                {isPremium && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5" title="Profesional Premium">
                    <Award size={10} className="fill-amber-600" /> Premium
                  </span>
                )}
              </div>
            </div>
            <p className="text-[#0D7B6B] font-medium text-sm mt-1">{mainSpecialty}</p>

            <div className="flex items-center justify-center gap-1 mt-4 text-2xl font-black text-[#1A1A2E]">
              {profile.avg_rating.toFixed(1)}
              <div className="flex items-center gap-0.5 ml-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={20} 
                    className={star <= Math.round(profile.avg_rating) ? "text-amber-500 fill-amber-500" : "text-gray-300"} 
                  />
                ))}
              </div>
            </div>
            
            <div className="mt-3 inline-flex items-center px-3 py-1 bg-[#F3F4F6] rounded-full">
              <p className="text-xs font-semibold text-[#4B5563]">
                {profile.jobs_completed} {profile.jobs_completed === 1 ? 'trabajo completado' : 'trabajos completados'}
              </p>
            </div>
          </div>

          {/* Credenciales de Confianza */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-4">
              Credenciales de Confianza
            </h3>
            <div className="space-y-4">
              
              <div className={`flex items-start gap-3 p-3 rounded-xl border ${profile.ruc_verified ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#F9FAFB] border-[#E5E7EB]'}`}>
                <Building2 size={20} className={profile.ruc_verified ? 'text-[#16A34A] mt-0.5' : 'text-[#9CA3AF] mt-0.5'} />
                <div>
                  <p className={`text-sm font-bold ${profile.ruc_verified ? 'text-[#166534]' : 'text-[#4B5563]'}`}>RUC {profile.ruc_verified ? 'Verificado' : 'No verificado'}</p>
                  <p className={`text-xs ${profile.ruc_verified ? 'text-[#15803D]' : 'text-[#6B7280]'}`}>
                    {profile.ruc_verified ? 'Documentación legal validada' : 'Aún no proporciona RUC'}
                  </p>
                </div>
              </div>

              <div className={`flex items-start gap-3 p-3 rounded-xl border ${profile.identity_verified ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#F9FAFB] border-[#E5E7EB]'}`}>
                <UserCheck size={20} className={profile.identity_verified ? 'text-[#16A34A] mt-0.5' : 'text-[#9CA3AF] mt-0.5'} />
                <div>
                  <p className={`text-sm font-bold ${profile.identity_verified ? 'text-[#166534]' : 'text-[#4B5563]'}`}>Identidad {profile.identity_verified ? 'Validada' : 'No validada'}</p>
                  <p className={`text-xs ${profile.identity_verified ? 'text-[#15803D]' : 'text-[#6B7280]'}`}>
                    {profile.identity_verified ? 'Biometría y DNI confirmados' : 'Documentos en revisión'}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA (Detalles) */}
        <div className="w-full lg:w-2/3 space-y-6">
          
          {/* Sobre mí */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-[#1A1A2E] mb-4">Sobre mí</h2>
            {profile.bio ? (
              <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-[#6B7280] italic">Este trabajador aún no ha escrito sobre sí mismo.</p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-[#E5E7EB] text-[#4B5563] text-xs font-semibold rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Portafolio de trabajos (Solo Premium) */}
          {isPremium && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-[#0D7B6B]" />
                Portafolio de trabajos
              </h2>
              {profile.portfolio_urls && profile.portfolio_urls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {profile.portfolio_urls.map((url: string, idx: number) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative aspect-video rounded-xl overflow-hidden border border-[#E5E7EB] bg-gray-50 group hover:opacity-90 transition-opacity"
                    >
                      <img src={url} alt={`Trabajo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280] italic">Este profesional aún no ha subido imágenes a su portafolio.</p>
              )}
            </div>
          )}

          {/* Reseñas */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#1A1A2E]">Reseñas de clientes</h2>
              <div className="flex items-center gap-1.5 px-3 py-1 border border-[#E5E7EB] rounded-full bg-white">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-[#1A1A2E]">{profile.avg_rating.toFixed(1)} de 5</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star size={32} className="text-[#E5E7EB] mx-auto mb-3" />
                <p className="text-sm text-[#6B7280]">Aún no hay reseñas disponibles.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {visibleReviews.map((r) => {
                  const initials = r.reviewer?.full_name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'AN'

                  return (
                    <div key={r.id} className="border-b border-[#F3F4F6] last:border-0 pb-6 last:pb-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8F5F3] text-[#0D7B6B] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                            {r.reviewer?.avatar_url ? (
                              <img src={r.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1A1A2E]">{r.reviewer?.full_name || 'Usuario Anónimo'}</p>
                            <p className="text-xs text-[#6B7280]">{getRelativeTime(r.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              size={12} 
                              className={star <= r.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"} 
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-[#4B5563] leading-relaxed">"{r.comment}"</p>
                      )}
                    </div>
                  )
                })}

                {reviews.length > 3 && !showAllReviews && (
                  <button 
                    onClick={() => setShowAllReviews(true)}
                    className="w-full py-3 mt-2 text-sm font-bold text-[#0D7B6B] border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] transition-colors"
                  >
                    Ver las {reviews.length} reseñas
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
