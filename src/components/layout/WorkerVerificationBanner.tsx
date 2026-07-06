import { Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

/**
 * Aviso de "perfil en revisión" para trabajadores aún no verificados.
 * Se renderiza en el layout, así que aparece en todas las páginas del
 * trabajador y desaparece automáticamente cuando identity_verified = true.
 *
 * Nota: por ahora el bloqueo es solo en la UI (MVP). La verificación real
 * la hacemos manualmente en la BD (worker_profiles.identity_verified).
 */
export default function WorkerVerificationBanner() {
  const { role, workerProfile } = useAuth()

  // Solo trabajadores no verificados
  if (role !== 'worker' || !workerProfile || workerProfile.identity_verified) return null

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
        <Clock className="w-5 h-5 text-amber-600" />
      </div>
      <div className="text-sm">
        <p className="font-bold text-amber-900">Tu perfil está en revisión</p>
        <p className="text-amber-800 mt-0.5 leading-relaxed">
          Estamos verificando tu identidad y documentos. Este proceso demora entre{' '}
          <span className="font-semibold">2 y 3 días hábiles</span>. Mientras tanto puedes explorar
          los trabajos disponibles, pero aún no podrás postular. Te avisaremos apenas quede activo.
        </p>
      </div>
    </div>
  )
}
