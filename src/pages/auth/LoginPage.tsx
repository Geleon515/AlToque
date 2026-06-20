import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import AuthNavbar from '../../components/layout/AuthNavbar'
import { useToast } from '../../components/ui/Toast'
import type { UserRole } from '../../lib/types'

function mapError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos'
  if (msg.includes('Email already registered') || msg.includes('already been registered'))
    return 'Este correo ya tiene una cuenta'
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 8 caracteres'
  if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de ingresar'
  return 'Ocurrió un error. Intenta de nuevo.'
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { showToast } = useToast()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      showToast(mapError(error.message), 'error')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1A1A2E] text-lg">Recuperar contraseña</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1A1A2E]">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sent ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 bg-[#E8F5F3] rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-[#0D7B6B]" />
            </div>
            <p className="text-sm text-[#6B7280]">
              Te enviamos un enlace a{' '}
              <strong className="text-[#1A1A2E]">{email}</strong>
            </p>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-[#6B7280]">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Enviar enlace
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)

  const redirectByRole = (role: UserRole | undefined) => {
    if (role === 'client') navigate('/client/dashboard')
    else if (role === 'worker') navigate('/worker/dashboard')
    else navigate('/register')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      setError(mapError(authError.message))
    } else {
      redirectByRole(data.user?.user_metadata?.role as UserRole | undefined)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (authError) {
      showToast(mapError(authError.message), 'error')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AuthNavbar />

      <div className="flex flex-1">
        {/* Columna izquierda — ilustración */}
        <div className="hidden lg:flex flex-1 bg-[#E8F5F3] items-center justify-center p-12">
          <img
            src="https://vklwagysmthhsfsxoyjo.supabase.co/storage/v1/object/public/Imagenes-web/Login.png"
            alt="Trabajadores técnicos"
            className="rounded-2xl max-h-[600px] object-cover shadow-lg"
          />
        </div>

        {/* Columna derecha — formulario */}
        <div className="flex-1 flex items-center justify-center px-4 py-12 lg:px-16">
          <div className="w-full max-w-md space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]">Iniciar Sesión</h1>
              <p className="text-[#6B7280] text-sm mt-1">
                Ingresa tus credenciales para continuar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

              <div className="space-y-1">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  error={error}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="text-[#6B7280] hover:text-[#1A1A2E]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-[#0D7B6B] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full mt-2">
                Ingresar
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#6B7280]">O continúa con</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <Button
              type="button"
              variant="outline"
              loading={googleLoading}
              onClick={handleGoogle}
              className="w-full gap-3"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Iniciar sesión con Google
            </Button>

            <p className="text-center text-sm text-[#6B7280]">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="text-[#0D7B6B] font-semibold hover:underline">
                Regístrate ahora
              </Link>
            </p>
          </div>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  )
}
