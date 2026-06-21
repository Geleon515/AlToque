import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'

interface ReviewWorkerFormProps {
  jobMatchId: string
  workerId: string
  workerName: string
  onReviewSubmitted: (review: any) => void
}

export function ReviewWorkerForm({
  jobMatchId,
  workerId,
  workerName,
  onReviewSubmitted
}: ReviewWorkerFormProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (rating === 0) {
      showToast('Por favor, selecciona una calificación', 'error')
      return
    }

    try {
      setSubmitting(true)
      const reviewPayload = {
        job_match_id: jobMatchId,
        reviewer_id: user.id,
        reviewed_id: workerId,
        rating,
        comment: comment.trim() || null
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewPayload)
        .select()
        .single()

      if (error) throw error
      
      // La base de datos asume un trigger para actualizar el avg_rating,
      // pero por ahora solo mostramos éxito y pasamos la reseña
      showToast('Calificación enviada correctamente', 'success')
      onReviewSubmitted(data)
    } catch (error: any) {
      if (error.code === '23505') {
        showToast('Ya has calificado este trabajo', 'error')
      } else {
        showToast('Error al enviar la calificación: ' + error.message, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
      <h2 className="text-base font-bold text-[#1A1A2E] mb-2">
        El trabajo ha finalizado
      </h2>
      <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
        El técnico ha marcado el trabajo como finalizado. Para cerrar el ciclo, por favor confirma y deja una calificación a <strong>{workerName}</strong>. 
        Si tuviste algún inconveniente, déjalo saber en tu comentario.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#1A1A2E] mb-2">
            Calificación (Obligatorio)
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={`${
                    star <= (hoverRating || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200 fill-gray-200'
                  } transition-colors`}
                />
              </button>
            ))}
            <span className="ml-3 text-sm font-semibold text-[#6B7280]">
              {rating === 0 ? 'Selecciona' : rating === 5 ? '¡Excelente!' : rating === 1 ? 'Malo' : rating + ' estrellas'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A1A2E] mb-2">
            Comentario (Opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="¿Cómo fue tu experiencia con el técnico?"
            className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#0D7B6B] focus:ring-1 focus:ring-[#0D7B6B] transition-all resize-none h-24"
          />
        </div>

        <Button
          type="submit"
          loading={submitting}
          className="w-full bg-[#0D7B6B] hover:bg-[#0B695C] text-white"
        >
          Confirmar y Calificar
        </Button>
      </form>
    </div>
  )
}
