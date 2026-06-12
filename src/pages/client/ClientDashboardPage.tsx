import { useAuth } from '../../hooks/useAuth'

export default function ClientDashboardPage() {
  const { clientProfile } = useAuth()
  const firstName = clientProfile?.full_name?.split(' ')[0] ?? 'Cliente'

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1A1A2E]">¡Hola, {firstName}!</h1>
      <p className="mt-1 text-[#6B7280]">Aquí tendrás el resumen de tus actividades.</p>
    </div>
  )
}
