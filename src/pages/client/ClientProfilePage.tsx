import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { User, Mail, Phone, MapPin, ClipboardCheck, Edit2, Camera, Loader2, Star } from 'lucide-react'

// Distritos del Callao y Lima Metropolitana para la selección
const DISTRICTS = [
  'Bellavista',
  'Callao',
  'Carmen de la Legua',
  'La Perla',
  'La Punta',
  'Mi Perú',
  'Ventanilla',
  'Miraflores',
  'San Isidro',
  'Santiago de Surco',
  'San Borja',
  'Barranco',
  'La Molina',
  'San Miguel',
  'Magdalena del Mar',
  'Jesús María',
  'Lince',
  'Pueblo Libre',
  'Surquillo',
  'Chorrillos'
]

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

export default function ClientProfilePage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Perfil del cliente
  const [profile, setProfile] = useState<{
    full_name: string
    phone: string
    province: string
    district: string
    address: string
    avatar_url: string
    created_at: string
  } | null>(null)

  // Estadísticas del cliente
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0
  })

  // Reseñas recibidas de trabajadores
  const [reviews, setReviews] = useState<any[]>([])
  const [showAllReviews, setShowAllReviews] = useState(false)

  // Estado del formulario de edición
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    province: 'Callao',
    district: '',
    address: '',
    email: '' // Solo lectura / información del usuario
  })

  useEffect(() => {
    if (user) {
      fetchProfileAndStats()
    }
  }, [user])

  const fetchProfileAndStats = async () => {
    try {
      setLoading(true)
      if (!user) return

      // 1. Obtener perfil
      const { data: profileData, error: profileError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfile({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        province: profileData.province || 'Callao',
        district: profileData.district || '',
        address: profileData.address || '',
        avatar_url: profileData.avatar_url || '',
        created_at: profileData.created_at
      })

      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        province: profileData.province || 'Callao',
        district: profileData.district || '',
        address: profileData.address || '',
        email: user.email || ''
      })

      // 2. Obtener estadísticas de trabajos
      const { data: jobs, error: jobsError } = await supabase
        .from('job_posts')
        .select('status')
        .eq('client_id', user.id)

      if (jobsError) throw jobsError

      const total = jobs?.length || 0
      const completed = jobs?.filter(j => j.status === 'finished').length || 0

      setStats({
        totalJobs: total,
        completedJobs: completed
      })

      // 3. Obtener reseñas del cliente (como reviewed_id)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError

      if (reviewsData && reviewsData.length > 0) {
        const workerIds = [...new Set(reviewsData.map(r => r.reviewer_id))]
        const { data: workersData } = await supabase
          .from('worker_profiles')
          .select('id, full_name, avatar_url')
          .in('id', workerIds)

        const workerMap = (workersData || []).reduce((acc: any, w: any) => {
          acc[w.id] = w
          return acc
        }, {})

        const reviewsWithWorkers = reviewsData.map(r => ({
          ...r,
          reviewer: workerMap[r.reviewer_id] || null
        }))
        setReviews(reviewsWithWorkers)
      } else {
        setReviews([])
      }
    } catch (error: any) {
      showToast('Error al cargar la información del perfil: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSaving(true)

      // Validaciones básicas
      if (!formData.full_name.trim()) {
        showToast('El nombre completo es requerido', 'error')
        return
      }
      if (!formData.district) {
        showToast('Debes seleccionar un distrito', 'error')
        return
      }

      // Actualizar tabla client_profiles
      const { error: updateError } = await supabase
        .from('client_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          province: formData.province,
          district: formData.district,
          address: formData.address
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Si el correo ha cambiado, actualizarlo en Supabase Auth
      if (formData.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        })
        if (authError) {
          showToast('Perfil guardado, pero falló la actualización del correo: ' + authError.message, 'error')
        } else {
          showToast('Perfil actualizado. Se envió un correo de confirmación a tu nueva dirección.', 'success')
        }
      } else {
        showToast('Perfil actualizado correctamente', 'success')
      }

      // Actualizar estado local
      setProfile(prev => prev ? {
        ...prev,
        full_name: formData.full_name,
        phone: formData.phone,
        province: formData.province,
        district: formData.district,
        address: formData.address
      } : null)

      setIsEditing(false)
    } catch (error: any) {
      showToast('Error al guardar el perfil: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      setUploadingAvatar(true)

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        showToast('El archivo debe ser una imagen', 'error')
        return
      }

      // Subir archivo al bucket 'avatars'
      // Usamos el timestamp en el path para evitar problemas de caché del navegador
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Actualizar perfil del cliente en la DB
      const { error: updateError } = await supabase
        .from('client_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      showToast('Foto de perfil actualizada correctamente', 'success')
    } catch (error: any) {
      showToast('Error al subir la foto de perfil: ' + error.message, 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Helper para formatear fecha de registro: "Enero 2024"
  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return 'Enero 2024'
    const date = new Date(dateString)
    const formatter = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' })
    const formatted = formatter.format(date)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1) // Capitalizar primer caracter
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#0D7B6B] animate-spin" />
        <span className="ml-3 text-[#6B7280] text-sm">Cargando perfil...</span>
      </div>
    )
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0
  const avgRatingFormatted = avgRating > 0 ? avgRating.toFixed(1) : '0.0'
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Título de la sección */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Mi Perfil</h1>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Revisa y maneja los detalles y las preferencias de tu cuenta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda / Principal (Detalles del Perfil) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Header del Perfil: Foto y Nombre */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-[#E5E7EB] mb-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Contenedor del Avatar */}
                <div className="relative group">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#0D7B6B] bg-[#E8F5F3] flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={48} className="text-[#0D7B6B] opacity-80" />
                    )}
                  </div>
                  {/* Botón flotante para subir foto */}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-2 -right-2 bg-[#0D7B6B] hover:bg-[#0A6558] text-white p-2 rounded-xl cursor-pointer shadow-md transition-colors flex items-center justify-center border-2 border-white"
                  >
                    {uploadingAvatar ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-[#1A1A2E]">{profile?.full_name}</h2>
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1.5">
                    <span className="text-xs font-semibold text-[#0D7B6B] bg-[#E8F5F3] px-2.5 py-1 rounded-full border border-[#0D7B6B]/25">
                      ✓ Propietario Verificado
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-2">
                    Miembro desde {formatMemberSince(profile?.created_at)}
                  </p>
                </div>
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2"
                >
                  <Edit2 size={16} />
                  Editar Perfil
                </Button>
              )}
            </div>

            {/* Formulario / Información Personal */}
            <form onSubmit={handleSaveProfile}>
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 text-[#0D7B6B] font-bold text-sm tracking-wide uppercase border-b border-[#F1F5F9] pb-2 mb-2">
                  <User size={18} className="shrink-0" />
                  <span>Información Personal</span>
                </div>

                {isEditing ? (
                  /* VISTA DE EDICIÓN */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nombre Completo"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                      />
                      <Input
                        label="Número de Teléfono"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Ej. +51 987 654 321"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Correo Electrónico"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        helper="Cambiar el correo requiere confirmación en la nueva dirección."
                      />
                      <div className="w-full">
                        <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                          Distrito
                        </label>
                        <select
                          name="district"
                          value={formData.district}
                          onChange={handleInputChange}
                          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]"
                          required
                        >
                          <option value="">Selecciona tu distrito</option>
                          {DISTRICTS.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                          Provincia
                        </label>
                        <select
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]"
                        >
                          <option value="Callao">Callao</option>
                          <option value="Lima">Lima</option>
                        </select>
                      </div>
                      <Input
                        label="Dirección Principal"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Ej. Av. Santa Rosa 450"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] mt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          // Cancelar y restaurar datos
                          setFormData({
                            full_name: profile?.full_name || '',
                            phone: profile?.phone || '',
                            province: profile?.province || 'Callao',
                            district: profile?.district || '',
                            address: profile?.address || '',
                            email: user?.email || ''
                          })
                          setIsEditing(false)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" loading={saving}>
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* VISTA DE LECTURA (MOCKUP) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    {/* Correo */}
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-[#6B7280] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Correo Electrónico
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm font-medium text-[#1A1A2E]">{user?.email}</p>
                          <span className="text-[10px] font-bold text-[#0D7B6B] bg-[#E8F5F3] px-1.5 py-0.5 rounded uppercase border border-[#0D7B6B]/20">
                            Principal
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-[#6B7280] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Número de Teléfono
                        </p>
                        <p className="text-sm font-medium text-[#1A1A2E] mt-1">
                          {profile?.phone || 'No registrado'}
                        </p>
                      </div>
                    </div>

                    {/* Dirección */}
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <MapPin className="w-5 h-5 text-[#6B7280] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Dirección Principal
                        </p>
                        {profile?.address || profile?.district ? (
                          <div className="text-sm font-medium text-[#1A1A2E] mt-1 leading-relaxed">
                            <p>{profile.address || 'Sin calle registrada'}</p>
                            <p className="text-xs text-[#6B7280]">
                              {profile.district}, {profile.province}, Perú
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-[#1A1A2E] mt-1 italic text-[#9CA3AF]">
                            No registrada
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Columna Derecha / Paneles laterales */}
        <div className="flex flex-col gap-6">
          {/* Tarjeta 1: Total Trabajos Publicados */}
          <div className="bg-[#E8F5F3] border border-[#0D7B6B]/20 text-[#1A1A2E] rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
            {/* Decoración de fondo */}
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 group-hover:scale-110 transition-transform duration-300 text-[#0D7B6B]">
              <ClipboardCheck size={120} />
            </div>

            <div className="flex items-center gap-2 text-[#0D7B6B]">
              <ClipboardCheck size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Trabajos Publicados</span>
            </div>

            <div className="mt-4">
              <p className="text-4xl font-extrabold text-[#0D7B6B]">{stats.totalJobs}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                {stats.completedJobs} Completados Exitosamente
              </p>
            </div>
          </div>

          {/* Tarjeta 2: Resumen de Calificaciones */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-4xl font-extrabold text-[#1A1A2E]">
                {reviews.length > 0 ? avgRatingFormatted : '-'}
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={24}
                    className={reviews.length > 0 && star <= Math.round(avgRating) ? "text-amber-500 fill-amber-500" : "text-gray-200"}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mt-2 font-medium">
              {reviews.length > 0 
                ? `Calificación promedio basada en ${reviews.length} ${reviews.length === 1 ? 'reseña' : 'reseñas'}`
                : 'Aún no tienes calificaciones'}
            </p>
          </div>

          {/* Tarjeta 3: Detalle de Reseñas */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-[#F3F4F6] pb-4">
              <h3 className="text-lg font-bold text-[#1A1A2E]">
                Reseñas de trabajadores
              </h3>
              <span className="text-xs font-semibold text-[#0D7B6B] bg-[#E8F5F3] px-2.5 py-1 rounded-full border border-[#0D7B6B]/20">
                {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star size={32} className="text-[#E5E7EB] mx-auto mb-3" />
                <p className="text-sm text-[#6B7280]">No has recibido reseñas de trabajadores todavía.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {visibleReviews.map((r) => {
                  const initials = r.reviewer?.full_name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'TR'

                  return (
                    <div key={r.id} className="border-b border-[#F3F4F6] last:border-0 pb-6 last:pb-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8F5F3] text-[#0D7B6B] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-[#E5E7EB]">
                            {r.reviewer?.avatar_url ? (
                              <img src={r.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1A1A2E]">{r.reviewer?.full_name || 'Trabajador'}</p>
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
                      {r.comment ? (
                        <p className="text-sm text-[#4B5563] leading-relaxed italic">"{r.comment}"</p>
                      ) : (
                        <p className="text-sm text-[#9CA3AF] italic">Sin comentario adicional.</p>
                      )}
                    </div>
                  )
                })}

                {reviews.length > 3 && !showAllReviews && (
                  <button 
                    type="button"
                    onClick={() => setShowAllReviews(true)}
                    className="w-full py-2.5 mt-2 text-xs font-bold text-[#0D7B6B] border border-[#0D7B6B]/20 rounded-xl hover:bg-[#E8F5F3] hover:text-[#0A6558] transition-colors"
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
