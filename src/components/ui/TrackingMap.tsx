import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface Coordinates {
  lng: number;
  lat: number;
}

interface TrackingMapProps {
  destination: Coordinates | null;
  workerPosition: Coordinates | null;
}

export default function TrackingMap({ destination, workerPosition }: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const workerMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  useEffect(() => {
    if (!mapboxToken || !destination) return;

    // 1. Agregar CSS si no existe
    if (!document.getElementById('mapbox-css')) {
      const link = document.createElement('link');
      link.id = 'mapbox-css';
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      document.head.appendChild(link);
    }

    // 2. Agregar JS si no existe
    if (!(window as any).mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.async = true;
      script.onload = () => initMap();
      document.body.appendChild(script);
    } else {
      setTimeout(initMap, 100);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [destination, mapboxToken]);

  // Actualizar marcador del trabajador cuando cambie su posición
  useEffect(() => {
    if (!mapRef.current || !workerMarkerRef.current || !workerPosition) return;
    
    workerMarkerRef.current.setLngLat([workerPosition.lng, workerPosition.lat]);
    
    // Si tenemos ambas posiciones, ajustar bounds para ver ambas
    if (destination) {
      const mapboxgl = (window as any).mapboxgl;
      if (mapboxgl) {
        const bounds = new mapboxgl.LngLatBounds()
          .extend([destination.lng, destination.lat])
          .extend([workerPosition.lng, workerPosition.lat]);
          
        mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      }
    }
  }, [workerPosition, destination]);

  const initMap = () => {
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl || !mapContainerRef.current || mapRef.current || !destination) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [destination.lng, destination.lat],
        zoom: 14
      });

      // Crear DOM element para el marcador del cliente (Destino)
      const elDest = document.createElement('div');
      elDest.className = 'w-8 h-8 bg-[#0D7B6B] rounded-full flex items-center justify-center shadow-lg border-2 border-white';
      elDest.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

      destinationMarkerRef.current = new mapboxgl.Marker(elDest)
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);

      // Crear DOM element para el marcador del trabajador (en vivo)
      if (workerPosition) {
        const elWorker = document.createElement('div');
        elWorker.className = 'w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-blue-500 relative';
        elWorker.innerHTML = `
          <div class="absolute -inset-1 bg-blue-500 rounded-full animate-ping opacity-20"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 8-2 4h4l-2 4"/></svg>
        `;

        workerMarkerRef.current = new mapboxgl.Marker(elWorker)
          .setLngLat([workerPosition.lng, workerPosition.lat])
          .addTo(map);

        // Centrar mostrando ambos
        const bounds = new mapboxgl.LngLatBounds()
          .extend([destination.lng, destination.lat])
          .extend([workerPosition.lng, workerPosition.lat]);
        map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      }

      mapRef.current = map;
    } catch (e) {
      console.error('Error cargando Mapbox en TrackingMap:', e);
    }
  };

  if (!mapboxToken) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-center p-4">
        <MapPin size={32} className="text-[#6B7280]/40 mb-2" />
        <p className="text-sm font-semibold text-[#1A1A2E]">Mapa no disponible</p>
        <p className="text-xs text-[#6B7280] mt-1">Falta configuración de VITE_MAPBOX_TOKEN</p>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <span className="text-sm text-[#6B7280] font-medium">Cargando ubicación...</span>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
