import { useState } from 'react'
import { X, HandshakeIcon, CalendarDays, Clock, DollarSign } from 'lucide-react'

interface Props {
  onConfirm: (amount: number, scheduledDate: string) => void
  onClose: () => void
}

export default function ProposalModal({ onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Ingresa un monto válido mayor a 0.')
      return
    }
    if (!date) {
      setError('Selecciona una fecha.')
      return
    }
    if (!time) {
      setError('Selecciona una hora.')
      return
    }

    // Combinar fecha + hora en ISO 8601
    const scheduledDate = new Date(`${date}T${time}:00`).toISOString()
    onConfirm(parsed, scheduledDate)
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0D7B6B] to-[#0A6A5C]">
          <div className="flex items-center gap-2 text-white">
            <HandshakeIcon size={20} />
            <h2 className="font-semibold text-base">Proponer Acuerdo Final</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-[#6B7280]">
            Define los detalles del servicio. La otra parte deberá aceptar este acuerdo para formalizar el trabajo.
          </p>

          {/* Monto */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Monto acordado (S/)
            </label>
            <div className="relative">
              <DollarSign
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Ej: 150.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/40 focus:border-[#0D7B6B] transition"
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Fecha de llegada
            </label>
            <div className="relative">
              <CalendarDays
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/40 focus:border-[#0D7B6B] transition"
              />
            </div>
          </div>

          {/* Hora */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Hora de llegada
            </label>
            <div className="relative">
              <Clock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/40 focus:border-[#0D7B6B] transition"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#D1D5DB] text-sm text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-[#0D7B6B] text-white text-sm font-medium hover:bg-[#0A6A5C] transition-colors"
            >
              Enviar Propuesta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
