// Supabase (PostgREST) devuelve las columnas GEOGRAPHY como hex WKB/EWKB
// (ej. 0101000020E6100000...), no como texto POINT(lng lat). Esta función
// decodifica ese hex a { lng, lat }, con respaldo para el formato de texto.
export function parseLocation(raw: string | null | undefined): { lng: number; lat: number } | null {
  if (!raw) return null

  // Formato hex WKB/EWKB
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 50) {
    try {
      const dataHex = raw.substring(18)
      const bytes = new Uint8Array(dataHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
      const view = new DataView(bytes.buffer)
      const lng = view.getFloat64(0, true)
      const lat = view.getFloat64(8, true)
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) return { lng, lat }
    } catch {
      // cae al respaldo de texto
    }
  }

  // Respaldo: formato de texto POINT(lng lat)
  const match = raw.match(/POINT\(([^ ]+) ([^)]+)\)/)
  if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) }

  return null
}

export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = lat1 * Math.PI / 180; // φ, λ en radianes
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}
