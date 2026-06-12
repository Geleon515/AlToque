import { useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const section = pathname.split('/').filter(Boolean).pop() ?? 'página'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Hammer size={48} className="text-[#0D7B6B] mb-4 opacity-60" />
      <h2 className="text-xl font-bold text-[#1A1A2E] mb-1 capitalize">{section}</h2>
      <p className="text-[#6B7280] text-sm">Esta sección está en construcción.</p>
    </div>
  )
}
