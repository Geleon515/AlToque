/* eslint-disable @typescript-eslint/no-explicit-any -- Mapbox GL se carga por CDN sin tipos */
import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, Loader2, X } from 'lucide-react'

// Coordenadas por defecto (Callao) si no hay valor ni pista de centro
const DEFAULT_CENTER = { lat: -12.0621, lng: -77.1352 }

interface Coords {
  lat: number
  lng: number
}

interface Suggestion {
  place_name: string
  center: [number, number] // [lng, lat]
}

interface LocationPickerProps {
  /** Coordenada seleccionada actual (fuente de verdad, la controla el padre) */
  value: Coords | null
  /** Se llama cada vez que el usuario mueve el pin, busca o usa el GPS */
  onChange: (coords: Coords) => void
  /** Centro inicial sugerido (ej. coords del distrito elegido). Solo se usa al montar. */
  centerHint?: Coords | null
  className?: string
}

/**
 * Selector de ubicación con Mapbox: mapa con pin arrastrable, buscador de
 * direcciones y botón "usar mi ubicación actual" como atajo. Carga Mapbox GL
 * dinámicamente (mismo patrón que NewJobPage) para no meterlo al bundle.
 */
export default function LocationPicker({ value, onChange, centerHint, className }: LocationPickerProps) {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')

  // ── Cargar Mapbox GL JS dinámicamente e inicializar ──
  useEffect(() => {
    if (!mapboxToken) return

    let cancelled = false

    const start = value ?? centerHint ?? DEFAULT_CENTER

    const initMap = () => {
      const mapboxgl = (window as any).mapboxgl
      if (cancelled || !mapboxgl || !mapContainerRef.current || mapRef.current) return

      try {
        mapboxgl.accessToken = mapboxToken
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [start.lng, start.lat],
          zoom: 14,
        })
        map.addControl(new mapboxgl.NavigationControl(), 'top-right')

        const marker = new mapboxgl.Marker({ color: '#0D7B6B', draggable: true })
          .setLngLat([start.lng, start.lat])
          .addTo(map)

        marker.on('dragend', () => {
          const { lng, lat } = marker.getLngLat()
          onChangeRef.current({ lat, lng })
        })

        map.on('click', (e: any) => {
          marker.setLngLat(e.lngLat)
          onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        })

        mapRef.current = map
        markerRef.current = marker

        // Si aún no había una coordenada elegida, sembrar la inicial
        if (!value) onChangeRef.current({ lat: start.lat, lng: start.lng })
      } catch (e) {
        console.error('Error cargando Mapbox:', e)
      }
    }

    // 1. CSS de Mapbox
    if (!document.getElementById('mapbox-css')) {
      const link = document.createElement('link')
      link.id = 'mapbox-css'
      link.rel = 'stylesheet'
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
      document.head.appendChild(link)
    }

    // 2. JS de Mapbox
    if (!(window as any).mapboxgl) {
      const existing = document.getElementById('mapbox-js') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', initMap)
      } else {
        const script = document.createElement('script')
        script.id = 'mapbox-js'
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
        script.async = true
        script.onload = initMap
        document.body.appendChild(script)
      }
    } else {
      setTimeout(initMap, 100)
    }

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
    }
    // Solo al montar: el centro inicial se fija una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mover el pin en el mapa hacia una coordenada (buscador / GPS)
  const moveTo = (lng: number, lat: number) => {
    if (mapRef.current) mapRef.current.flyTo({ center: [lng, lat], zoom: 15 })
    if (markerRef.current) markerRef.current.setLngLat([lng, lat])
    onChange({ lat, lng })
  }

  // ── Buscador (geocodificación directa) con sugerencias ──
  useEffect(() => {
    if (!mapboxToken || searchQuery.trim().length < 3) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json` +
          `?access_token=${mapboxToken}&limit=5&country=pe&language=es` +
          `&proximity=${DEFAULT_CENTER.lng},${DEFAULT_CENTER.lat}`
        const res = await fetch(url, { signal: controller.signal })
        const data = await res.json()
        setSuggestions(
          (data.features ?? []).map((f: any) => ({ place_name: f.place_name, center: f.center })),
        )
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error('Error geocodificando:', e)
      }
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery, mapboxToken])

  const pickSuggestion = (s: Suggestion) => {
    const [lng, lat] = s.center
    setSearchQuery(s.place_name)
    setSuggestions([])
    moveTo(lng, lat)
  }

  // ── Atajo: usar mi ubicación actual (GPS) ──
  const handleGps = () => {
    setGpsError('')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        moveTo(pos.coords.longitude, pos.coords.latitude)
        setGpsLoading(false)
      },
      () => {
        setGpsError('No pudimos obtener tu ubicación. Búscala o muévela en el mapa.')
        setGpsLoading(false)
      },
    )
  }

  // ── Sin token de Mapbox: no se puede renderizar el mapa ──
  if (!mapboxToken) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] p-5 text-center text-sm text-[#6B7280]">
        <MapPin className="w-6 h-6 text-[#6B7280]/40 mx-auto mb-2" />
        Mapa no disponible (VITE_MAPBOX_TOKEN no configurado).
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Buscador */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#0D7B6B]/30 focus-within:border-[#0D7B6B]">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Busca tu dirección o zona (ej. Av. Sáenz Peña, Callao)"
            className="flex-1 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none bg-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSuggestions([])
              }}
              className="text-[#6B7280] hover:text-[#EF4444]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm text-[#1A1A2E] hover:bg-[#E8F5F3] flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-[#0D7B6B] shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{s.place_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div
        ref={mapContainerRef}
        className="w-full h-64 rounded-xl overflow-hidden border border-[#E5E7EB] mt-3"
      />
      <p className="text-xs text-[#9CA3AF] mt-1.5">
        Arrastra el pin o haz clic en el mapa para ajustar tu ubicación exacta.
      </p>

      {/* Atajo GPS */}
      <button
        type="button"
        onClick={handleGps}
        disabled={gpsLoading}
        className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#0D7B6B] hover:underline disabled:opacity-60"
      >
        {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        Usar mi ubicación actual
      </button>
      {gpsError && <p className="text-xs text-[#EF4444] mt-1">{gpsError}</p>}

      {/* Coordenada seleccionada */}
      {value && (
        <p className="text-xs text-[#6B7280] mt-2">
          Ubicación seleccionada:{' '}
          <span className="font-medium text-[#1A1A2E]">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        </p>
      )}
    </div>
  )
}
