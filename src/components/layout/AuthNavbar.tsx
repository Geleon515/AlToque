import { useNavigate } from 'react-router-dom'

export default function AuthNavbar() {
  const navigate = useNavigate()

  return (
    <nav className="bg-white w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <span
          onClick={() => navigate('/')}
          className="text-xl font-bold text-[#0D7B6B] cursor-pointer select-none"
        >
          Al Toque
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-lg border border-[#0D7B6B] text-[#0D7B6B] text-sm font-semibold hover:bg-[#E8F5F3] transition-colors"
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 rounded-lg bg-[#0D7B6B] text-white text-sm font-semibold hover:bg-[#0A6558] transition-colors"
          >
            Registrarse
          </button>
        </div>
      </div>
    </nav>
  )
}
