import { useNavigate } from 'react-router-dom'
import {
  Search,
  MessageSquare,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Ban,
  ArrowRight,
  Wrench,
  Users,
} from 'lucide-react'

// ─────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────
function Navbar() {
  const navigate = useNavigate()
  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm">
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

// ─────────────────────────────────────────
// HERO
// ─────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-violet-400',
]

function HeroSection() {
  const navigate = useNavigate()
  return (
    <section className="bg-[#E8F5F3] py-16 md:py-24 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-12 md:gap-16">

        {/* ── Columna izquierda — texto ── */}
        <div className="flex-1 space-y-6 text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A1A2E] leading-tight">
            Encuentra ayuda local<br className="hidden sm:block" />
            o ofrece tus servicios{' '}
            <span className="text-[#2DB89E]">al instante</span>
          </h1>
          <p className="text-[#6B7280] text-lg leading-relaxed max-w-md mx-auto md:mx-0">
            Conectamos a profesionales verificados con clientes de la zona.
            Sin comisiones. La forma más rápida de resolver tus necesidades.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3 bg-[#0D7B6B] text-white rounded-lg font-semibold hover:bg-[#0A6558] transition-colors"
            >
              Buscar Profesionales
            </button>
            <button
              onClick={() => navigate('/register')}
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#0D7B6B] text-[#0D7B6B] rounded-lg font-semibold hover:bg-white transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Ofrecer mis Servicios
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 justify-center md:justify-start pt-1">
            <div className="flex -space-x-2">
              {AVATAR_COLORS.map((color, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-full ${color} border-2 border-[#E8F5F3]`}
                />
              ))}
            </div>
            <p className="text-sm text-[#6B7280]">
              <span className="font-bold text-[#1A1A2E]">10k+</span> usuarios confían en nosotros
            </p>
          </div>
        </div>

        {/* ── Columna derecha — imágenes ── */}
        <div className="flex-1 relative w-full max-w-md mx-auto pb-8 md:pb-14">
          {/* Imagen principal */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <img
              src="https://placehold.co/520x440/BFE0DA/0D7B6B?text=Plomero+Profesional"
              alt="Profesional de plomería trabajando"
              className="w-full object-cover"
            />
            {/* Badge trabajador verificado */}
            <div className="absolute bottom-4 left-4 bg-white rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
              <div className="w-9 h-9 rounded-full bg-[#0D7B6B] flex items-center justify-center text-white text-xs font-bold shrink-0">
                CM
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A2E]">Carlos M.</p>
                <p className="text-xs text-[#6B7280]">Plomero Verificado</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-[#0D7B6B] shrink-0" />
            </div>
          </div>

          {/* Card flotante — solo desktop */}
          <div className="hidden md:flex absolute -top-4 -right-8 bg-[#0D7B6B] text-white rounded-xl px-3 py-3 shadow-xl items-start gap-2">
            <Zap className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold leading-snug">Servicio Rápido</p>
              <p className="text-xs opacity-80 leading-snug">Conexión directa</p>
            </div>
          </div>

          {/* Imagen secundaria — solo desktop */}
          <div className="hidden md:block absolute -bottom-4 -right-8 w-36 rounded-xl overflow-hidden shadow-xl border-4 border-white">
            <img
              src="https://placehold.co/200x160/F0F4F7/6B7280?text=Electricista"
              alt="Electricista profesional"
              className="w-full object-cover"
            />
          </div>
        </div>

      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// CÓMO FUNCIONA
// ─────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    Icon: Search,
    number: '1',
    title: 'Encuentra',
    desc: 'Publica lo que necesitas o explora cientos de profesionales verificados cerca de ti. Resultados en segundos.',
  },
  {
    Icon: MessageSquare,
    number: '2',
    title: 'Negocia Directo',
    desc: 'Habla directamente con el profesional por chat integrado. Sin intermediarios, sin comisiones ocultas.',
  },
  {
    Icon: CheckCircle2,
    number: '3',
    title: 'Trabajo Listo',
    desc: 'Sigue el estado en tiempo real y califica al finalizar para construir la confianza de la comunidad.',
  },
]

function HowItWorksSection() {
  return (
    <section className="bg-[#F0F4F7] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E] mb-4">
            ¿Cómo funciona Al Toque?
          </h2>
          <p className="text-[#6B7280] text-lg max-w-lg mx-auto">
            Un proceso simple de 3 pasos diseñado para la eficiencia y transparencia.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ Icon, number, title, desc }) => (
            <div
              key={number}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#E8F5F3] rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-[#0D7B6B]" />
                </div>
                <span className="text-5xl font-black text-gray-100 leading-none select-none">
                  {number}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{title}</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// CARACTERÍSTICAS
// ─────────────────────────────────────────
const FEATURES = [
  {
    Icon: Ban,
    title: 'Cero Comisiones',
    desc: 'El precio acordado entre cliente y profesional es exactamente lo que se paga. Sin sorpresas ni descuentos ocultos.',
  },
  {
    Icon: MessageSquare,
    title: 'Chat Directo',
    desc: 'Comunícate de forma privada con el profesional antes, durante y después del servicio.',
  },
  {
    Icon: ShieldCheck,
    title: 'Perfiles Verificados',
    desc: 'Todos los técnicos pasan verificación de identidad con DNI y biometría antes de activar su perfil.',
  },
]

function FeaturesSection() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-16">

        {/* Columna izquierda — texto */}
        <div className="flex-1 space-y-8">
          <div>
            <p className="text-[#0D7B6B] font-semibold text-xs uppercase tracking-widest mb-3">
              Transparencia Radical. Eficiencia Confiable.
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E] leading-snug">
              Una plataforma diseñada<br className="hidden sm:block" /> para la confianza
            </h2>
          </div>
          <div className="space-y-6">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="w-11 h-11 bg-[#E8F5F3] rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#0D7B6B]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A1A2E] mb-1">{title}</h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha — mockup de chat */}
        <div className="flex-1 w-full max-w-sm mx-auto">
          <div className="bg-[#F0F4F7] rounded-2xl p-4 shadow-sm">
            {/* Header del chat */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 mb-4">
              <div className="w-10 h-10 bg-[#0D7B6B] rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                RM
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A2E]">Roberto M.</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-xs text-[#6B7280]">En línea</span>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="space-y-3 min-h-36">
              <div className="flex justify-end">
                <div className="bg-[#0D7B6B] text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
                  Hola, ¿puedes revisar la instalación eléctrica de mi sala?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white text-[#1A1A2E] text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] shadow-sm">
                  Claro, tengo disponibilidad mañana a las 9am. ¿Te queda bien?
                </div>
              </div>
            </div>

            {/* Badge verificado */}
            <div className="mt-4 flex items-center justify-center gap-2 bg-[#E8F5F3] rounded-xl py-2.5">
              <ShieldCheck className="w-4 h-4 text-[#0D7B6B]" />
              <span className="text-xs font-semibold text-[#0D7B6B]">Identidad Verificada</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// CTA FINAL
// ─────────────────────────────────────────
function CTASection() {
  const navigate = useNavigate()
  return (
    <section className="bg-[#0D7B6B] py-20 text-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold leading-snug">
          Únete a la comunidad de confianza hoy mismo
        </h2>
        <p className="text-white/75 text-lg">
          Miles de trabajos realizados con éxito en tu zona. Regístrate gratis y empieza a conectar.
        </p>
        <button
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-[#0D7B6B] transition-colors"
        >
          Crear mi cuenta gratis
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────
const FOOTER_LINKS = ['Términos y Condiciones', 'Contacto', 'Privacidad', 'Soporte']

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xl font-black text-[#0D7B6B] tracking-tight">AL TOQUE</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-[#6B7280] hover:text-[#0D7B6B] transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>
        <p className="text-xs text-[#6B7280] text-center md:text-right">
          © 2026 AL TOQUE — SERVICIOS LOCALES CONFIABLES
        </p>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  )
}
