import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Wrench } from 'lucide-react'
import Button from '../../components/ui/Button'
import ProgressBar from '../../components/ui/ProgressBar'
import AuthNavbar from '../../components/layout/AuthNavbar'
import type { UserRole } from '../../lib/types'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<UserRole | null>(null)

  const handleNext = () => {
    if (!selected) return
    navigate(selected === 'client' ? '/register/client' : '/register/worker')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AuthNavbar />

      <div className="w-full px-4 sm:px-6">
        <ProgressBar current={1} total={4} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold text-[#0D7B6B] uppercase tracking-widest">
              PASO 1 DE 4
            </p>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">¿Qué buscas hacer?</h1>
            <p className="text-sm text-[#6B7280] max-w-sm mx-auto">
              Selecciona cómo planeas usar la plataforma para personalizar tu experiencia.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setSelected('client')}
              className={`rounded-xl border-2 p-6 text-left transition-all ${
                selected === 'client'
                  ? 'border-[#0D7B6B] bg-[#E8F5F3]'
                  : 'border-[#E5E7EB] bg-white hover:border-[#0D7B6B]/50'
              }`}
            >
              <div className="w-12 h-12 bg-[#E8F5F3] rounded-xl flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-[#0D7B6B]" />
              </div>
              <h3 className="font-bold text-[#1A1A2E] mb-1">Encontrar un trabajador</h3>
              <p className="text-sm text-[#6B7280]">
                Busco profesionales locales y confiables para resolver mis necesidades.
              </p>
            </button>

            <button
              onClick={() => setSelected('worker')}
              className={`rounded-xl border-2 p-6 text-left transition-all ${
                selected === 'worker'
                  ? 'border-[#0D7B6B] bg-[#E8F5F3]'
                  : 'border-[#E5E7EB] bg-white hover:border-[#0D7B6B]/50'
              }`}
            >
              <div className="w-12 h-12 bg-[#E8F5F3] rounded-xl flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-[#0D7B6B]" />
              </div>
              <h3 className="font-bold text-[#1A1A2E] mb-1">Ofrecer mis servicios</h3>
              <p className="text-sm text-[#6B7280]">
                Soy un profesional independiente que quiere ofrecer servicios a clientes locales.
              </p>
            </button>
          </div>

          {!selected && (
            <p className="text-center text-xs text-[#6B7280]">
              Selecciona una opción para continuar
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              ← Atrás
            </Button>
            <Button onClick={handleNext} disabled={!selected}>
              Siguiente →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
