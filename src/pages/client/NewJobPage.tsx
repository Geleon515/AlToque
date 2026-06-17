import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import {
  Wrench,
  Zap,
  Sparkles,
  Hammer,
  Truck,
  MoreHorizontal,
  Upload,
  X,
  MapPin,
  ArrowRight,
  ArrowLeft,
  FileVideo,
  Loader2
} from 'lucide-react'

// Categorías mapeadas con sus iconos correspondientes
const CATEGORIES_MAPPING = [
  { id: 1, name: 'Plomería', icon: Wrench },
  { id: 2, name: 'Electricidad', icon: Zap },
  { id: 3, name: 'Limpieza', icon: Sparkles },
  { id: 4, name: 'Carpintería', icon: Hammer },
  { id: 5, name: 'Mudanza', icon: Truck },
  { id: 6, name: 'Otros Servicios', icon: MoreHorizontal }
]

const PROVINCES = ['Callao', 'Lima']

const DISTRICTS_MAPPING: Record<string, string[]> = {
  Callao: ['Bellavista', 'Callao', 'Carmen de la Legua', 'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla'],
  Lima: [
    'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chorrillos', 'Comas', 'El Agustino', 'Independencia',
    'Jesús María', 'La Molina', 'La Victoria', 'Lima', 'Lince', 'Los Olivos', 'Lurín', 'Magdalena del Mar',
    'Miraflores', 'Pachacámac', 'Pueblo Libre', 'Puente Piedra', 'Rímac', 'San Borja', 'San Isidro',
    'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel',
    'Santa Anita', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'
  ]
}

export default function NewJobPage() {
  const navigate = useNavigate()
  const { user, clientProfile } = useAuth()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Paso 1: Categoría y Título
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [title, setTitle] = useState('')

  // Paso 2: Detalles y Adjuntos
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<{ file: File; previewUrl: string; type: 'image' | 'video' }[]>([])
  const [compressing, setCompressing] = useState(false)

  // Paso 3: Ubicación
  const [province, setProvince] = useState('Callao')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number }>({ lng: -77.1352, lat: -12.0621 }) // Coordenadas Callao por defecto

  // Refs de mapa y scripts
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

  // Pre-cargar datos del distrito del cliente al iniciar
  useEffect(() => {
    if (clientProfile) {
      setProvince(clientProfile.province || 'Callao')
      setDistrict(clientProfile.district || '')
      setAddress(clientProfile.address || '')
    }
  }, [clientProfile])

  // Cargar Mapbox GL JS dinámicamente
  useEffect(() => {
    if (step === 3 && mapboxToken) {
      // 1. Agregar CSS de Mapbox si no existe
      if (!document.getElementById('mapbox-css')) {
        const link = document.createElement('link')
        link.id = 'mapbox-css'
        link.rel = 'stylesheet'
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
        document.head.appendChild(link)
      }

      // 2. Agregar JS de Mapbox si no existe
      if (!(window as any).mapboxgl) {
        const script = document.createElement('script')
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
        script.async = true
        script.onload = () => initMap()
        document.body.appendChild(script)
      } else {
        // Mapbox ya cargado, inicializar inmediatamente
        setTimeout(initMap, 100)
      }
    }

    return () => {
      // Limpieza de instancias
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
    }
  }, [step])

  // Centrar mapa cuando cambia la selección del Distrito
  useEffect(() => {
    if (step === 3 && district) {
      geocodeDistrict()
    }
  }, [district, province])

  // Inicializar mapa de Mapbox
  const initMap = () => {
    const mapboxgl = (window as any).mapboxgl
    if (!mapboxgl || !mapContainerRef.current || mapRef.current) return

    try {
      mapboxgl.accessToken = mapboxToken
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [coordinates.lng, coordinates.lat],
        zoom: 13
      })

      // Agregar botón de controles
      map.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Crear marcador arrastrable
      const marker = new mapboxgl.Marker({
        color: '#0D7B6B',
        draggable: true
      })
        .setLngLat([coordinates.lng, coordinates.lat])
        .addTo(map)

      // Evento de arrastre de pin
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        updateCoordinatesAndAddress(lngLat.lng, lngLat.lat)
      })

      // Evento de clic en el mapa
      map.on('click', (e: any) => {
        marker.setLngLat(e.lngLat)
        updateCoordinatesAndAddress(e.lngLat.lng, e.lngLat.lat)
      })

      mapRef.current = map
      markerRef.current = marker

      // Geocodificar distrito inicial
      if (district) {
        geocodeDistrict()
      }
    } catch (e) {
      console.error('Error cargando Mapbox:', e)
    }
  }

  // Geocodificar el distrito seleccionado
  const geocodeDistrict = async () => {
    if (!district || !mapboxToken) return
    try {
      const query = `${district}, ${province}, Perú`
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        
        setCoordinates({ lng, lat })

        if (mapRef.current) {
          mapRef.current.flyTo({ center: [lng, lat], zoom: 14 })
        }
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat])
        }
      }
    } catch (error) {
      console.error('Error al geocodificar distrito:', error)
    }
  }

  // Geocodificación inversa: obtener dirección a partir de coordenadas
  const updateCoordinatesAndAddress = async (lng: number, lat: number) => {
    setCoordinates({ lng, lat })
    if (!mapboxToken) return

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&limit=1`
      const response = await fetch(url)
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const placeName = data.features[0].place_name
        // Tomar el nombre simplificado de la calle/dirección (primer fragmento)
        const streetAddress = placeName.split(',')[0]
        setAddress(streetAddress)
      }
    } catch (error) {
      console.error('Error al realizar geocodificación inversa:', error)
    }
  }

  // Compresión local de imagen a JPEG
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Exportar como jpeg al 80%
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '_opt.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              } else {
                resolve(file)
              }
            },
            'image/jpeg',
            0.8
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  // Manejador de subida de archivos
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (attachments.length + files.length > 5) {
      showToast('Solo puedes subir un máximo de 5 archivos multimedia en total.', 'error')
      return
    }

    setCompressing(true)
    const newAttachments: typeof attachments = []

    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      if (!isImage && !isVideo) {
        showToast(`El archivo ${file.name} no es un formato válido de imagen o video.`, 'error')
        continue
      }

      if (isVideo) {
        // Validar tamaño máximo para video (15MB)
        if (file.size > 15 * 1024 * 1024) {
          showToast(`El video ${file.name} excede el límite de 15MB. Por favor súbelo más comprimido.`, 'error')
          continue
        }

        newAttachments.push({
          file,
          previewUrl: URL.createObjectURL(file),
          type: 'video'
        })
      } else if (isImage) {
        // Comprimir imagen localmente
        const compressedFile = await compressImage(file)
        newAttachments.push({
          file: compressedFile,
          previewUrl: URL.createObjectURL(compressedFile),
          type: 'image'
        })
      }
    }

    setAttachments(prev => [...prev, ...newAttachments])
    setCompressing(false)
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].previewUrl)
      updated.splice(index, 1)
      return updated
    })
  }

  // Guardado en Supabase (Carga de archivos + Inserción)
  const handleSubmitJob = async () => {
    if (!user) return
    if (!selectedCategoryId) {
      showToast('Debes seleccionar una categoría.', 'error')
      return
    }
    if (!description.trim() || description.trim().length < 15) {
      showToast('La descripción del problema debe ser más detallada (mínimo 15 caracteres).', 'error')
      return
    }
    if (!district) {
      showToast('Por favor selecciona un distrito.', 'error')
      return
    }

    try {
      setSaving(true)

      // 1. Insertar el post en `job_posts`
      // Usar WKT para guardar Point
      const wktLocation = `POINT(${coordinates.lng} ${coordinates.lat})`

      const { data: jobData, error: jobError } = await supabase
        .from('job_posts')
        .insert({
          client_id: user.id,
          category_id: selectedCategoryId,
          title: title.trim() || null,
          description: description.trim(),
          province,
          district,
          address: address.trim() || null,
          location: wktLocation
        })
        .select()
        .single()

      if (jobError) throw jobError
      const jobId = jobData.id

      // 2. Subir los archivos adjuntos y guardarlos en `job_attachments`
      for (let i = 0; i < attachments.length; i++) {
        const { file, type } = attachments[i]
        const fileExt = file.name.split('.').pop()
        const storagePath = `jobs/${user.id}/${jobId}/file_${i}_${Date.now()}.${fileExt}`

        // Subida a Storage Bucket `job-attachments`
        const { error: uploadError } = await supabase.storage
          .from('job-attachments')
          .upload(storagePath, file)

        if (uploadError) throw uploadError

        // Obtener URL Pública
        const { data: { publicUrl } } = supabase.storage
          .from('job-attachments')
          .getPublicUrl(storagePath)

        // Registrar en `job_attachments`
        const { error: attachError } = await supabase
          .from('job_attachments')
          .insert({
            job_post_id: jobId,
            file_url: publicUrl,
            file_type: type
          })

        if (attachError) throw attachError
      }

      showToast('¡Trabajo publicado con éxito!', 'success')
      navigate('/client/jobs?success=true')
    } catch (error: any) {
      showToast('Error al publicar el trabajo: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Título de la sección */}
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Publicar un Trabajo</h1>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Completa los detalles para encontrar al profesional adecuado.
        </p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center justify-center gap-2 sm:gap-6 mb-8 max-w-lg mx-auto">
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-[#0D7B6B] text-white' : 'bg-gray-100 text-gray-400'}`}>
            1
          </div>
          <span className={`text-[11px] font-semibold mt-1 ${step >= 1 ? 'text-[#0D7B6B]' : 'text-gray-400'}`}>Categoría</span>
        </div>
        <div className={`h-0.5 flex-1 transition-colors ${step >= 2 ? 'bg-[#0D7B6B]' : 'bg-gray-100'}`} />
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? 'bg-[#0D7B6B] text-white' : 'bg-gray-100 text-gray-400'}`}>
            2
          </div>
          <span className={`text-[11px] font-semibold mt-1 ${step >= 2 ? 'text-[#0D7B6B]' : 'text-gray-400'}`}>Detalles</span>
        </div>
        <div className={`h-0.5 flex-1 transition-colors ${step >= 3 ? 'bg-[#0D7B6B]' : 'bg-gray-100'}`} />
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 3 ? 'bg-[#0D7B6B] text-white' : 'bg-gray-100 text-gray-400'}`}>
            3
          </div>
          <span className={`text-[11px] font-semibold mt-1 ${step >= 3 ? 'text-[#0D7B6B]' : 'text-gray-400'}`}>Ubicación</span>
        </div>
      </div>

      {/* Caja Contenedora Principal */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* ── PASO 1: CATEGORÍA ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-bold text-[#1A1A2E]">¿Qué tipo de servicio necesitas?</h2>
              <p className="text-xs text-[#6B7280] mt-1">Selecciona la categoría que mejor describa el trabajo.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CATEGORIES_MAPPING.map(cat => {
                const IconComponent = cat.icon
                const isSelected = selectedCategoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`p-6 border rounded-xl flex flex-col items-center justify-center gap-3 transition-all relative ${
                      isSelected
                        ? 'border-[#0D7B6B] bg-[#E8F5F3]/30 text-[#0D7B6B] ring-2 ring-[#0D7B6B]/20'
                        : 'border-[#E5E7EB] hover:border-[#0D7B6B]/50 hover:bg-[#F8FAFC] text-[#6B7280]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full bg-[#0D7B6B] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                    )}
                    <IconComponent size={28} className={isSelected ? 'text-[#0D7B6B]' : 'text-[#6B7280]/80'} />
                    <span className="text-xs font-bold tracking-tight">{cat.name}</span>
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-[#F1F5F9]">
              <Input
                label="Título de la publicación (Opcional)"
                placeholder="Ej. Reparación de aire acondicionado"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  if (!selectedCategoryId) {
                    showToast('Debes seleccionar una categoría para continuar.', 'error')
                    return
                  }
                  setStep(2)
                }}
                className="flex items-center gap-2"
              >
                Siguiente paso
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 2: DETALLES Y MULTIMEDIA ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">Detalles del Trabajo</h2>
              <p className="text-xs text-[#6B7280] mt-1">Describe el problema con precisión para recibir mejores propuestas</p>
            </div>

            {/* Descripción */}
            <div className="w-full">
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
                Descripción del problema *
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Mi tubería de la cocina gotea desde hace dos días. Necesito cambiar la llave de paso y revisar la junta..."
                rows={5}
                className="w-full border border-[#E5E7EB] rounded-lg p-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B] bg-white resize-y"
                required
              />
              <p className="text-[11px] text-[#6B7280] mt-1">Ingresa una descripción clara del problema de al menos 15 caracteres.</p>
            </div>

            {/* Adjuntos */}
            <div className="w-full">
              <label className="block text-sm font-semibold text-[#1A1A2E] mb-2">
                Fotos o Videos (Opcional)
              </label>
              
              {/* Dropzone */}
              <label className="border-2 border-dashed border-[#E5E7EB] hover:border-[#0D7B6B]/50 hover:bg-[#F8FAFC] transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {compressing ? (
                  <>
                    <Loader2 size={32} className="text-[#0D7B6B] animate-spin mb-3" />
                    <span className="text-xs font-semibold text-[#0D7B6B]">Optimizando archivos multimedia...</span>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-[#6B7280]/60 mb-3" />
                    <p className="text-xs font-semibold text-[#1A1A2E]">Arrastra y suelta tus archivos aquí o haz clic para explorar</p>
                    <p className="text-[11px] text-[#6B7280] mt-1">Sube fotos o videos del problema (Máx 5 archivos, videos máx 15MB)</p>
                  </>
                )}
              </label>

              {/* Previsualizaciones */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
                  {attachments.map((attach, idx) => (
                    <div key={idx} className="relative group border border-[#E5E7EB] rounded-lg overflow-hidden bg-gray-50 aspect-square flex items-center justify-center">
                      {attach.type === 'image' ? (
                        <img
                          src={attach.previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                          <FileVideo size={28} className="text-[#0D7B6B]" />
                          <span className="text-[10px] font-semibold text-[#6B7280] truncate max-w-full">
                            Video MP4
                          </span>
                        </div>
                      )}
                      {/* Botón borrar */}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-90 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navegación */}
            <div className="flex justify-between items-center pt-4 border-t border-[#F1F5F9]">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Atrás
              </Button>
              <Button
                onClick={() => {
                  if (!description.trim() || description.trim().length < 15) {
                    showToast('Por favor describe tu problema en detalle (mínimo 15 caracteres).', 'error')
                    return
                  }
                  setStep(3)
                }}
                className="flex items-center gap-2"
              >
                Siguiente paso
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 3: UBICACIÓN Y MAPA ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">Ubicación</h2>
              <p className="text-xs text-[#6B7280] mt-1">Indica tu distrito y provincia para que los técnicos cercanos puedan llegar más rápido.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Formulario */}
              <div className="space-y-4">
                <p className="text-sm font-bold text-[#1A1A2E]">¿Dónde se realizará el trabajo?</p>
                <p className="text-xs text-[#6B7280]">Ingresa tu ubicación para conectar con profesionales en tu zona.</p>

                {/* Provincia */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                    Provincia
                  </label>
                  <select
                    value={province}
                    onChange={e => {
                      setProvince(e.target.value)
                      setDistrict('')
                    }}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]"
                  >
                    {PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Distrito */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                    Distrito
                  </label>
                  <select
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/30 focus:border-[#0D7B6B]"
                    required
                  >
                    <option value="">Selecciona tu distrito</option>
                    {DISTRICTS_MAPPING[province]?.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Dirección Exacta */}
                <Input
                  label="Dirección exacta"
                  placeholder="Ej: Av. Santa Rosa 123"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  helper="Compartir la dirección exacta ayuda a que los profesionales te den presupuestos más precisos."
                />

                <div className="bg-[#E8F5F3] border border-[#0D7B6B]/10 rounded-xl p-4 text-xs text-[#0D7B6B] leading-relaxed">
                  💡 Compartir la dirección exacta ayuda a que los profesionales te den presupuestos más precisos de movilidad.
                </div>
              </div>

              {/* Mapa */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-xs text-[#6B7280] font-medium">
                  <MapPin size={14} className="text-[#0D7B6B]" />
                  <span>
                    {district ? `${district}, ${province}` : 'Selecciona distrito'}
                  </span>
                </div>
                
                <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-inner bg-gray-100 aspect-[4/3] relative">
                  {/* Contenedor Mapbox */}
                  {mapboxToken ? (
                    <div ref={mapContainerRef} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                      <MapPin size={32} className="text-[#6B7280]/40 mb-2 animate-bounce" />
                      <p className="text-xs font-semibold text-[#1A1A2E]">Visualización del mapa de Lima/Callao</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">VITE_MAPBOX_TOKEN no configurado</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-[#6B7280] text-center italic">
                  * Haz clic en el mapa o arrastra el marcador verde para posicionar el punto exacto de tu domicilio.
                </p>
              </div>
            </div>

            {/* Navegación y Envío */}
            <div className="flex justify-between items-center pt-4 border-t border-[#F1F5F9] mt-6">
              <Button variant="ghost" onClick={() => setStep(2)} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Atrás
              </Button>
              <Button
                onClick={handleSubmitJob}
                loading={saving}
                className="px-6 py-2.5"
              >
                Confirmar y Publicar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
