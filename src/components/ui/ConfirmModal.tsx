import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'
import Button from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'success' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'success',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const isWarning = variant === 'warning'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-[fadeInScale_0.2s_ease-out]">
        {/* Botón cerrar */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#1A1A2E] transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Ícono */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
            isWarning
              ? 'bg-amber-50'
              : 'bg-[#E8F5F3]'
          }`}
        >
          {isWarning ? (
            <AlertTriangle size={32} className="text-amber-500" />
          ) : (
            <CheckCircle2 size={32} className="text-[#0D7B6B]" />
          )}
        </div>

        {/* Título */}
        <h2
          id="confirm-modal-title"
          className="text-xl font-extrabold text-[#1A1A2E] mb-2 leading-tight"
        >
          {title}
        </h2>

        {/* Descripción */}
        <p className="text-sm text-[#6B7280] leading-relaxed mb-7">
          {description}
        </p>

        {/* Botones */}
        <div className="w-full flex flex-col gap-3">
          <Button
            onClick={onConfirm}
            loading={loading}
            className="w-full py-3 text-base shadow-lg shadow-[#0D7B6B]/20"
          >
            {confirmText}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full py-3 text-base bg-white"
          >
            {cancelText}
          </Button>
        </div>
      </div>

      {/* Animación */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
