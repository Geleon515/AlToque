import { CheckCircle2, CalendarDays, Clock, DollarSign, Loader2 } from 'lucide-react'
import type { Message, ProposalPayload } from '../../lib/types'

interface Props {
  message: Message
  isOwn: boolean          // ¿Lo envió el usuario actual?
  isMatchConfirmed: boolean  // ¿Ya existe un job_match para esta aplicación?
  onAcceptProposal: (payload: ProposalPayload) => Promise<void>
  acceptingProposalId: string | null  // ID del mensaje en proceso de aceptación
}

/**
 * Intenta parsear el contenido de un mensaje como ProposalPayload.
 * Devuelve null si no es una propuesta.
 */
function tryParseProposal(content: string): ProposalPayload | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed?.type === 'proposal' && parsed.amount && parsed.scheduled_date) {
      return parsed as ProposalPayload
    }
  } catch {
    // no es JSON — es un mensaje de texto normal
  }
  return null
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSentAt(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MessageBubble({
  message,
  isOwn,
  isMatchConfirmed,
  onAcceptProposal,
  acceptingProposalId,
}: Props) {
  const proposal = tryParseProposal(message.content)
  const isAccepting = acceptingProposalId === message.id

  // ── Tarjeta de Propuesta de Acuerdo ─────────────────────────────────────────
  if (proposal) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div
          className={`max-w-xs w-full rounded-2xl shadow-sm overflow-hidden border ${
            isOwn
              ? 'border-[#0D7B6B]/30 bg-gradient-to-br from-[#0D7B6B] to-[#0A6A5C] text-white'
              : 'border-[#E5E7EB] bg-white text-[#1A1A2E]'
          }`}
        >
          {/* Header de la tarjeta */}
          <div
            className={`px-4 py-2.5 flex items-center gap-2 border-b ${
              isOwn ? 'border-white/20 bg-white/10' : 'border-[#F3F4F6] bg-[#F9FAFB]'
            }`}
          >
            <DollarSign size={15} className={isOwn ? 'text-white/80' : 'text-[#0D7B6B]'} />
            <span className={`text-xs font-semibold ${isOwn ? 'text-white/90' : 'text-[#0D7B6B]'}`}>
              Propuesta de Acuerdo
            </span>
          </div>

          {/* Cuerpo */}
          <div className="px-4 py-3 space-y-2">
            {/* Monto */}
            <div className="flex items-center gap-2">
              <DollarSign
                size={14}
                className={isOwn ? 'text-white/70' : 'text-[#6B7280]'}
              />
              <span className={`text-sm ${isOwn ? 'text-white/70' : 'text-[#6B7280]'}`}>
                Monto:
              </span>
              <span className={`text-sm font-bold ${isOwn ? 'text-white' : 'text-[#1A1A2E]'}`}>
                S/ {proposal.amount.toFixed(2)}
              </span>
            </div>

            {/* Fecha */}
            <div className="flex items-center gap-2">
              <CalendarDays
                size={14}
                className={isOwn ? 'text-white/70' : 'text-[#6B7280]'}
              />
              <span className={`text-xs ${isOwn ? 'text-white/80' : 'text-[#4B5563]'}`}>
                {formatDate(proposal.scheduled_date)}
              </span>
            </div>

            {/* Hora */}
            <div className="flex items-center gap-2">
              <Clock
                size={14}
                className={isOwn ? 'text-white/70' : 'text-[#6B7280]'}
              />
              <span className={`text-xs ${isOwn ? 'text-white/80' : 'text-[#4B5563]'}`}>
                {formatTime(proposal.scheduled_date)}
              </span>
            </div>
          </div>

          {/* Acción */}
          <div className={`px-4 py-3 border-t ${isOwn ? 'border-white/20' : 'border-[#F3F4F6]'}`}>
            {isMatchConfirmed ? (
              /* Ya se aceptó */
              <div className="flex items-center justify-center gap-2 py-1">
                <CheckCircle2 size={16} className="text-[#10B981]" />
                <span className="text-xs font-semibold text-[#10B981]">Acuerdo confirmado</span>
              </div>
            ) : isOwn ? (
              /* El emisor ve un estado de espera */
              <p className={`text-center text-xs ${isOwn ? 'text-white/60' : 'text-[#9CA3AF]'}`}>
                Esperando respuesta…
              </p>
            ) : (
              /* El receptor puede aceptar */
              <button
                onClick={() => onAcceptProposal(proposal)}
                disabled={isAccepting}
                className="w-full py-2 rounded-lg bg-[#0D7B6B] text-white text-xs font-semibold hover:bg-[#0A6A5C] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isAccepting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Confirmando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    Aceptar Acuerdo
                  </>
                )}
              </button>
            )}
          </div>

          {/* Timestamp */}
          <div className={`px-4 pb-2 text-right`}>
            <span className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
              {formatSentAt(message.sent_at)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Burbuja de texto normal ─────────────────────────────────────────────────
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
          isOwn
            ? 'bg-[#0D7B6B] text-white rounded-br-sm'
            : 'bg-white border border-[#E5E7EB] text-[#1A1A2E] rounded-bl-sm'
        }`}
      >
        <p className="leading-relaxed">{message.content}</p>
        <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-[#9CA3AF]'}`}>
          {formatSentAt(message.sent_at)}
        </p>
      </div>
    </div>
  )
}
