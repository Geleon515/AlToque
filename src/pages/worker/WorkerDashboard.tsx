import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const { signOut, workerProfile } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#F0F4F7]">
      <nav className="bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between">
        <span className="text-xl font-bold text-[#0D7B6B]">Al Toque</span>
        <div className="flex items-center gap-4">
          {workerProfile && (
            <span className="text-sm text-[#6B7280]">Hola, {workerProfile.full_name}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-[#6B7280] hover:text-[#EF4444] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-2">Dashboard Trabajador</h1>
        <p className="text-[#6B7280]">En construcción — Próximamente disponible.</p>
      </main>
    </div>
  )
}
