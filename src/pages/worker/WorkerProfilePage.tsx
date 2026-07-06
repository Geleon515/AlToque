import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { 
  User, 
  MapPin, 
  Camera, 
  Star, 
  Briefcase, 
  ShieldCheck, 
  Settings,
  Tags,
  Loader2,
  MessageSquare,
  X,
  Award
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

// Categorías fijas de la BD
const ALL_CATEGORIES = [
  { id: 1, name: 'Plomería' },
  { id: 2, name: 'Electricidad' },
  { id: 3, name: 'Limpieza' },
  { id: 4, name: 'Carpintería' },
  { id: 5, name: 'Mudanza' },
  { id: 6, name: 'Otros Servicios' }
]

export default function WorkerProfilePage() {
  const { user, workerProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Perfil Base
  const [bio, setBio] = useState('')
  const [coverageZone, setCoverageZone] = useState('')
  
  // Relaciones
  const [specialties, setSpecialties] = useState<number[]>([]) // array de category_id
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [reviews, setReviews] = useState<any[]>([])

  // Premium & Portafolio
  const [isPremium, setIsPremium] = useState(false)
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([])
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)

  useEffect(() => {
    if (workerProfile) {
      setBio(workerProfile.bio || '')
      setCoverageZone(workerProfile.coverage_zone || '')
      setPortfolioUrls(workerProfile.portfolio_urls || [])
      fetchRelationships()
      checkPremiumStatus()
    }
  }, [workerProfile])

  const checkPremiumStatus = async () => {
    try {
      if (!workerProfile?.id) return
      const { data } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('worker_id', workerProfile.id)
        .eq('status', 'active')
        .maybeSingle()
      
      setIsPremium(data?.plan === 'premium')
    } catch (e) {
      console.error('Error al validar premium:', e)
    }
  }

  const fetchRelationships = async () => {
    try {
      if (!workerProfile?.id) return

      // Cargar especialidades
      const { data: specData } = await supabase
        .from('worker_specialties')
        .select('category_id')
        .eq('worker_id', workerProfile.id)
      
      if (specData) {
        setSpecialties(specData.map(s => s.category_id))
      }

      // Cargar tags
      const { data: tagsData } = await supabase
        .from('worker_tags')
        .select('tag')
        .eq('worker_id', workerProfile.id)

      if (tagsData) {
        setTags(tagsData.map(t => t.tag))
      }

      // Cargar reseñas
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer_id
        `)
        .eq('reviewed_id', workerProfile.id)
        .order('created_at', { ascending: false })

      if (reviewsError) {
        console.error('Error al cargar reseñas:', reviewsError)
      }

      if (reviewsData && reviewsData.length > 0) {
        const clientIds = [...new Set(reviewsData.map(r => r.reviewer_id))]
        const { data: clientsData } = await supabase
          .from('client_profiles')
          .select('id, full_name, avatar_url')
          .in('id', clientIds)
        
        const clientMap = (clientsData || []).reduce((acc, c) => {
          acc[c.id] = c
          return acc
        }, {} as Record<string, any>)

        const reviewsWithClients = reviewsData.map(r => ({
          ...r,
          reviewer: clientMap[r.reviewer_id] || null
        }))

        setReviews(reviewsWithClients)
      }

    } catch (err) {
      console.error('Error al cargar datos del perfil:', err)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida.', 'error')
      return
    }

    try {
      setLoading(true)
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`

      // Subir al bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Actualizar perfil
      const { error: updateError } = await supabase
        .from('worker_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      window.location.reload()
      showToast('Foto de perfil actualizada.', 'success')
    } catch (error: any) {
      showToast('Error al actualizar la foto: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSpecialty = (categoryId: number) => {
    if (specialties.includes(categoryId)) {
      setSpecialties(prev => prev.filter(id => id !== categoryId))
    } else {
      setSpecialties(prev => [...prev, categoryId])
    }
  }

  const addTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return
    setTags(prev => [...prev, newTag.trim()])
    setNewTag('')
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const handleSaveProfile = async () => {
    if (!user) return
    if (!coverageZone) {
      showToast('Por favor selecciona una zona de cobertura válida.', 'error')
      return
    }
    try {
      setSaving(true)

      // 1. Guardar info base en worker_profiles
      const { error: profileError } = await supabase
        .from('worker_profiles')
        .update({
          bio,
          coverage_zone: coverageZone
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Sincronizar especialidades
      // Eliminar actuales y reinsertar
      await supabase.from('worker_specialties').delete().eq('worker_id', user.id)
      if (specialties.length > 0) {
        await supabase.from('worker_specialties').insert(
          specialties.map(catId => ({ worker_id: user.id, category_id: catId }))
        )
      }

      // 3. Sincronizar tags
      await supabase.from('worker_tags').delete().eq('worker_id', user.id)
      if (tags.length > 0) {
        await supabase.from('worker_tags').insert(
          tags.map(t => ({ worker_id: user.id, tag: t }))
        )
      }

      window.location.reload()
      showToast('Perfil actualizado correctamente', 'success')
    } catch (error: any) {
      showToast('Error al guardar el perfil: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadPortfolioItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona una imagen válida.', 'error')
      return
    }

    try {
      setUploadingPortfolio(true)
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/portfolio_${Date.now()}.${fileExt}`

      // Subir al bucket publico 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL publica
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const updatedUrls = [...portfolioUrls, publicUrl]

      // Actualizar worker_profiles
      const { error: updateError } = await supabase
        .from('worker_profiles')
        .update({ portfolio_urls: updatedUrls })
        .eq('id', user.id)

      if (updateError) throw updateError

      setPortfolioUrls(updatedUrls)
      showToast('Foto agregada al portafolio.', 'success')
    } catch (error: any) {
      showToast('Error al subir la foto: ' + error.message, 'error')
    } finally {
      setUploadingPortfolio(false)
    }
  }

  const handleDeletePortfolioItem = async (urlToDelete: string) => {
    if (!user) return
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta foto de tu portafolio?')) return
    try {
      setUploadingPortfolio(true)
      
      const pathPart = urlToDelete.split('/public/avatars/')[1]
      if (pathPart) {
        await supabase.storage.from('avatars').remove([pathPart])
      }

      const updatedUrls = portfolioUrls.filter(url => url !== urlToDelete)

      // Actualizar worker_profiles
      const { error: updateError } = await supabase
        .from('worker_profiles')
        .update({ portfolio_urls: updatedUrls })
        .eq('id', user.id)

      if (updateError) throw updateError

      setPortfolioUrls(updatedUrls)
      showToast('Foto eliminada del portafolio.', 'success')
    } catch (error: any) {
      showToast('Error al eliminar la foto: ' + error.message, 'error')
    } finally {
      setUploadingPortfolio(false)
    }
  }

  if (!workerProfile) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Mi Perfil Profesional</h1>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Gestiona cómo te ven los clientes y resalta tus habilidades.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda (Info Estática y Foto) */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm text-center">
            <div className="relative w-28 h-28 mx-auto mb-4 group">
              <div className="w-full h-full rounded-full bg-[#E8F5F3] text-[#0D7B6B] border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                {workerProfile.avatar_url ? (
                  <img src={workerProfile.avatar_url} alt={workerProfile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{workerProfile.full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="absolute bottom-0 right-0 p-2 bg-[#0D7B6B] text-white rounded-full hover:bg-[#0A6558] transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>

            <h2 className="text-xl font-bold text-[#1A1A2E] flex items-center justify-center gap-1.5">
              {workerProfile.full_name}
              {isPremium && (
                <span className="text-amber-500" title="Miembro Premium">
                  <Award size={18} className="fill-amber-100" />
                </span>
              )}
            </h2>
            {workerProfile.identity_verified ? (
              <p className="text-xs font-semibold text-[#10B981] flex items-center justify-center gap-1 mt-1">
                <ShieldCheck size={14} />
                Identidad Verificada
              </p>
            ) : (
              <p className="text-xs font-semibold text-[#F59E0B] flex items-center justify-center gap-1 mt-1">
                Pendiente de verificación
              </p>
            )}
            {isPremium && (
              <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-2 uppercase tracking-wide">
                Premium Activo
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#F1F5F9]">
              <div className="text-center">
                <p className="text-2xl font-black text-[#1A1A2E] flex items-center justify-center gap-1">
                  <Star size={18} className="text-amber-500 fill-amber-500" />
                  {workerProfile.avg_rating.toFixed(1)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-bold mt-1">Calificación</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-[#1A1A2E]">{workerProfile.jobs_completed}</p>
                <p className="text-[10px] uppercase tracking-wider text-[#6B7280] font-bold mt-1">Trabajos Realizados</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#1A1A2E] uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-[#0D7B6B]" />
              Datos Personales
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">DNI</span>
                <span className="font-semibold text-[#1A1A2E]">{workerProfile.dni}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Teléfono</span>
                <span className="font-semibold text-[#1A1A2E]">{workerProfile.phone}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-[#F1F5F9]">
                <p className="text-xs text-[#6B7280] italic">
                  Estos datos fueron verificados durante tu registro y no pueden modificarse desde aquí por seguridad.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha (Edición de Perfil) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={20} className="text-[#0D7B6B]" />
              <h3 className="text-lg font-bold text-[#1A1A2E]">Configuración del Perfil</h3>
            </div>

            <div className="space-y-6">
              {/* Biografía */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
                  Acerca de mí (Biografía)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ej: Soy un electricista con 10 años de experiencia. Me destaco por mi puntualidad..."
                  rows={4}
                  className="w-full border border-[#E5E7EB] rounded-lg p-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] resize-none max-h-32"
                />
                <p className="text-[11px] text-[#6B7280] mt-1">Esta información será visible para los clientes cuando postules a sus trabajos.</p>
              </div>

              {/* Zona de Cobertura */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-[#0D7B6B]" />
                  Zona de cobertura principal
                </label>
                <select
                  value={coverageZone}
                  onChange={(e) => setCoverageZone(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-lg p-3 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]"
                >
                  <option value="" disabled>Selecciona un distrito del Callao</option>
                  {['Bellavista', 'Callao', 'Carmen de la Legua', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla', 'Todo el Callao'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Especialidades Principales */}
              <div className="pt-4 border-t border-[#F1F5F9]">
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
                  <Briefcase size={16} className="text-[#0D7B6B]" />
                  Categorías de Servicio
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map(cat => {
                    const isSelected = specialties.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleSpecialty(cat.id)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'bg-[#0D7B6B] text-white border-[#0D7B6B]' 
                            : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#0D7B6B]/50 hover:text-[#1A1A2E]'
                        }`}
                      >
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tags / Habilidades Específicas */}
              <div className="pt-4 border-t border-[#F1F5F9]">
                <label className="block text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
                  <Tags size={16} className="text-[#0D7B6B]" />
                  Habilidades o Etiquetas Adicionales
                </label>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-[#1A1A2E] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border border-gray-200">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-[#6B7280] italic py-1">No has agregado habilidades específicas.</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: Instalación LED, Fugas de agua..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1"
                  />
                  <Button onClick={addTag} variant="outline" className="px-4">Añadir</Button>
                </div>
              </div>

            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={handleSaveProfile} loading={saving} className="px-8">
                Guardar Cambios
              </Button>
            </div>
          </div>

          {/* Sección de Portafolio */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Briefcase size={20} className="text-[#0D7B6B]" />
                <h3 className="text-lg font-bold text-[#1A1A2E]">Mi Portafolio de Trabajos</h3>
              </div>
              {isPremium ? (
                <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <Award size={12} className="fill-amber-600" /> Premium
                </span>
              ) : (
                <Link 
                  to="/worker/subscription"
                  className="text-xs font-bold text-[#0D7B6B] hover:underline"
                >
                  Obtener Premium para habilitar portafolio
                </Link>
              )}
            </div>

            {!isPremium ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <Briefcase size={32} className="text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#1A1A2E] mb-1">Muestra tus mejores trabajos a los clientes</p>
                <p className="text-xs text-[#6B7280] mb-4">
                  Los miembros Premium pueden subir fotos de sus proyectos anteriores para destacar y conseguir más trabajos.
                </p>
                <Button onClick={() => navigate('/worker/subscription')} className="text-xs px-4 py-2 bg-[#0D7B6B]">
                  Mejorar a Premium
                </Button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {portfolioUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[#E5E7EB] bg-gray-50 group">
                      <img src={url} alt={`Trabajo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleDeletePortfolioItem(url)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                        title="Eliminar foto"
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <label className="border-2 border-dashed border-[#E5E7EB] hover:border-[#0D7B6B]/50 rounded-xl flex flex-col items-center justify-center cursor-pointer p-4 aspect-video hover:bg-[#F8FAFC] transition-all">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleUploadPortfolioItem}
                      disabled={uploadingPortfolio}
                    />
                    {uploadingPortfolio ? (
                      <Loader2 className="w-6 h-6 text-[#0D7B6B] animate-spin" />
                    ) : (
                      <>
                        <Camera size={20} className="text-[#6B7280] mb-1.5" />
                        <span className="text-xs font-semibold text-[#1A1A2E]">Añadir foto</span>
                        <span className="text-[10px] text-[#6B7280] mt-0.5">JPG, PNG máx. 5MB</span>
                      </>
                    )}
                  </label>
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Tus fotos del portafolio se mostrarán públicamente en tu perfil para que los clientes vean la calidad de tu trabajo.
                </p>
              </div>
            )}
          </div>

          {/* Sección de Reseñas */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#1A1A2E] flex items-center gap-2 mb-6">
              <MessageSquare size={20} className="text-[#0D7B6B]" />
              Reseñas Recibidas ({reviews.length})
            </h3>
            
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#6B7280]">Aún no has recibido reseñas. ¡Completa trabajos para obtener calificaciones!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-xl p-5 border border-[#E5E7EB]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                          {review.reviewer?.avatar_url ? (
                            <img src={review.reviewer.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-[#0D7B6B]">
                              {review.reviewer?.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1A1A2E]">{review.reviewer?.full_name || 'Cliente'}</p>
                          <p className="text-xs text-[#6B7280]">
                            {new Date(review.created_at).toLocaleDateString('es-PE', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-sm font-black text-[#1A1A2E]">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment ? (
                      <p className="text-sm text-[#4B5563] leading-relaxed italic border-l-2 border-[#0D7B6B]/30 pl-3">"{review.comment}"</p>
                    ) : (
                      <p className="text-sm text-[#9CA3AF] italic">Sin comentario adicional.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
