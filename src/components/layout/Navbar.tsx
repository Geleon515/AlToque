import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function Navbar() {
  const { user, role } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-blue-600">
        AlToque
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              to={role === 'client' ? '/client' : '/worker'}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-gray-600 hover:text-blue-600">
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
