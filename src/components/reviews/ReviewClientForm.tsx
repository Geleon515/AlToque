import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'

interface ReviewClientFormProps {
  jobMatchId: string
  clientId: string
  clientName: string
  onReviewSubmitted: (review: any) => void
}

export function ReviewClientForm({
  jobMatchId,
  clientId,
  clientName,
  onReviewSubmitted
}: ReviewClientFormProps) {
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
        reviewed_id: clientId,
        rating,
        comment: comment.trim() || null
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewPayload)
        .select()
        .single()

      if (error) throw error
      
      showToast('Calificación al cliente enviada correctamente', 'success')
      onReviewSubmitted(data)
    } catch (error: any) {
      if (error.code === '23505') {
        showToast('Ya has calificado a este cliente', 'error')
      } else {
        showToast('Error al enviar la calificación: ' + error.message, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm mt-3">
      <h3 className="text-sm font-bold text-[#1A1A2E] mb-2">
        Califica al Cliente
      </h3>
      <p className="text-xs text-[#6B7280] mb-4">
        El trabajo ha finalizado. Por favor, califica tu experiencia con <strong>{clientName}</strong> para cerrar el ciclo formalmente.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
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
                  size={24}
                  className={`${
                    star <= (hoverRating || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200 fill-gray-200'
                  } transition-colors`}
                />
              </button>
            ))}
            <span className="ml-2 text-xs font-semibold text-[#6B7280]">
              {rating === 0 ? 'Selecciona' : rating === 5 ? '¡Excelente!' : rating === 1 ? 'Malo' : rating + ' estrellas'}
            </span>
          </div>
        </div>

        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario sobre el cliente (opcional)"
            className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#1A1A2E] focus:outline-none focus:border-[#0D7B6B] focus:ring-1 focus:ring-[#0D7B6B] transition-all resize-none h-20"
          />
        </div>

        <Button 
          type="submit" 
          loading={submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Enviar Calificación
        </Button>
      </form>
    </div>
  )
}
