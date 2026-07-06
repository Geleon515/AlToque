import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  ShieldCheck,
  CheckCircle2,
  X,
  CreditCard,
  Calendar,
  Sparkles,
  Zap,
  Award,
  AlertCircle,
  Clock
} from 'lucide-react'
import Button from '../../components/ui/Button'
import type { SubscriptionPlan } from '../../lib/types'

interface SubscriptionData {
  plan: SubscriptionPlan
  status: string
  culqi_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
}

export default function WorkerSubscriptionPage() {
  const { user, workerProfile } = useAuth()
  const isVerified = !!workerProfile?.identity_verified
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [activePlan, setActivePlan] = useState<SubscriptionPlan>('basic')
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)

  // Payment Form States
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [isFlipped, setIsFlipped] = useState(false)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  // Simulated Processing States
  const [paymentStep, setPaymentStep] = useState<'idle' | 'validating' | 'authorizing' | 'saving' | 'success'>('idle')

  useEffect(() => {
    if (user?.id) {
      fetchSubscription()
    }
  }, [user?.id])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status, culqi_subscription_id, current_period_start, current_period_end')
        .eq('worker_id', user!.id)
        .eq('status', 'active')
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSubscription(data as SubscriptionData)
        setActivePlan(data.plan as SubscriptionPlan)
      } else {
        setSubscription(null)
        setActivePlan('basic')
      }
    } catch (e) {
      console.error('Error cargando suscripción:', e)
    } finally {
      setLoading(false)
    }
  }

  // Card formatting handlers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    const formatted = value.match(/.{1,4}/g)?.join(' ') || ''
    if (formatted.length <= 19) {
      setCardNumber(formatted)
      // Clear error
      if (formErrors.cardNumber) {
        setFormErrors(prev => ({ ...prev, cardNumber: '' }))
      }
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 4) value = value.substring(0, 4)
    
    let formatted = value
    if (value.length > 2) {
      formatted = `${value.substring(0, 2)}/${value.substring(2)}`
    }
    
    setCardExpiry(formatted)
    if (formErrors.cardExpiry) {
      setFormErrors(prev => ({ ...prev, cardExpiry: '' }))
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setCardCvv(value)
      if (formErrors.cardCvv) {
        setFormErrors(prev => ({ ...prev, cardCvv: '' }))
      }
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardName(e.target.value.toUpperCase())
    if (formErrors.cardName) {
      setFormErrors(prev => ({ ...prev, cardName: '' }))
    }
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    const cleanNumber = cardNumber.replace(/\s/g, '')
    
    if (cleanNumber.length < 15 || cleanNumber.length > 16) {
      errors.cardNumber = 'Número de tarjeta inválido (15 o 16 dígitos)'
    }
    if (!cardName.trim()) {
      errors.cardName = 'Ingresa el nombre del titular'
    }
    if (cardExpiry.length !== 5) {
      errors.cardExpiry = 'Formato inválido (MM/YY)'
    } else {
      const [month] = cardExpiry.split('/')
      const m = parseInt(month, 10)
      if (m < 1 || m > 12) {
        errors.cardExpiry = 'Mes inválido (01-12)'
      }
    }
    if (cardCvv.length < 3 || cardCvv.length > 4) {
      errors.cardCvv = 'CVV inválido (3 o 4 dígitos)'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle Simulated Payment Submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setPaymentStep('validating')
    
    // Step 1: Validate Card (fictional delay)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setPaymentStep('authorizing')
    // Step 2: Authorize Payment (fictional delay)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setPaymentStep('saving')
    // Step 3: Write to Supabase
    try {
      const now = new Date()
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const mockSubId = 'sub_sim_' + Math.random().toString(36).substring(2, 11).toUpperCase()

      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          worker_id: user!.id,
          plan: 'premium',
          status: 'active',
          culqi_subscription_id: mockSubId,
          current_period_start: now.toISOString(),
          current_period_end: nextMonth.toISOString(),
          created_at: now.toISOString()
        }, { onConflict: 'worker_id' })

      if (error) throw error

      setPaymentStep('success')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reset & refresh
      setShowPaymentModal(false)
      setPaymentStep('idle')
      setCardNumber('')
      setCardName('')
      setCardExpiry('')
      setCardCvv('')
      
      // Update UI state
      fetchSubscription()
      
      // Reload page after a short delay to trigger header state propagation if needed
      window.location.reload()

    } catch (err: any) {
      console.error('Error al actualizar suscripción:', err)
      setFormErrors({ submit: err.message || 'Error al procesar suscripción en la base de datos' })
      setPaymentStep('idle')
    }
  }

  // Handle Cancel Subscription
  const handleCancelSubscription = async () => {
    const confirmCancel = window.confirm(
      '¿Estás seguro de que deseas cancelar tu Plan Premium?\nPerderás acceso inmediato a las postulaciones prioritarias, el límite diario de 5 postulaciones y la insignia de verificación.'
    )
    if (!confirmCancel) return

    try {
      setCancelling(true)
      
      // For simulation, we can revert to basic and set status to cancelled
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan: 'basic',
          status: 'cancelled',
          current_period_end: new Date().toISOString()
        })
        .eq('worker_id', user!.id)

      if (error) throw error

      await fetchSubscription()
      
      // Reload page to refresh context
      window.location.reload()
    } catch (e) {
      console.error('Error al cancelar la suscripción:', e)
      alert('Hubo un error al cancelar la suscripción. Por favor, intenta de nuevo.')
    } finally {
      setCancelling(false)
    }
  }

  // Helper to determine card brand logo/color
  const getCardBrand = (num: string) => {
    const cleanNum = num.replace(/\s/g, '')
    if (cleanNum.startsWith('4')) return { name: 'Visa', color: 'from-blue-600 to-indigo-800' }
    if (cleanNum.startsWith('5')) return { name: 'MasterCard', color: 'from-red-600 to-orange-700' }
    if (cleanNum.startsWith('3')) return { name: 'American Express', color: 'from-teal-600 to-emerald-800' }
    return { name: 'Card', color: 'from-slate-700 to-slate-900' }
  }

  const cardDetails = getCardBrand(cardNumber)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">Suscripción</h1>
        <p className="text-[#6B7280] mt-2">
          Gestiona tu plan de cuenta y accede a mayores oportunidades de trabajo en Lima Metropolitana.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0D7B6B]"></div>
        </div>
      ) : (
        <>
          {/* Active Plan Banner */}
          <div className={`p-6 rounded-2xl border transition-all duration-300 ${
            activePlan === 'premium'
              ? 'bg-[#E8F5F3] border-[#0D7B6B]/20 text-[#0D7B6B]'
              : 'bg-white border-[#E5E7EB] text-[#1A1A2E]'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  activePlan === 'premium' ? 'bg-[#0D7B6B]/10 text-[#0D7B6B]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {activePlan === 'premium' ? <Award size={28} /> : <Zap size={28} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {activePlan === 'premium' ? 'Plan Premium Activo' : 'Plan Básico Activo'}
                    {activePlan === 'premium' && (
                      <span className="bg-[#0D7B6B] text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <Sparkles size={10} /> Pro
                      </span>
                    )}
                  </h3>
                  <p className="text-sm mt-1 text-[#6B7280]">
                    {activePlan === 'premium'
                      ? 'Disfrutas del límite expandido de 5 postulaciones diarias y prioridad en los feeds.'
                      : 'Cuentas con 2 postulaciones diarias gratuitas para ofrecer tus servicios.'}
                  </p>
                  
                  {activePlan === 'premium' && subscription && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Siguiente facturación: {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                      </span>
                      <span>•</span>
                      <span>Ref: {subscription.culqi_subscription_id}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {activePlan === 'premium' && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="px-4 py-2 text-xs font-semibold text-red-600 hover:text-white border border-red-200 hover:bg-red-500 hover:border-red-500 rounded-xl transition-all duration-200 self-start md:self-auto disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando...' : 'Cancelar Suscripción'}
                </button>
              )}
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid md:grid-cols-2 gap-8 mt-6">
            {/* Basic Plan */}
            <div className={`bg-white border rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
              activePlan === 'basic' ? 'border-[#E5E7EB] ring-2 ring-slate-100' : 'border-[#E5E7EB] opacity-75'
            }`}>
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-bold text-[#1A1A2E]">Plan Básico</h4>
                    <p className="text-xs text-[#6B7280] mt-1">Para técnicos independientes iniciales</p>
                  </div>
                  {activePlan === 'basic' && (
                    <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                      Actual
                    </span>
                  )}
                </div>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold text-[#1A1A2E]">S/ 0</span>
                  <span className="text-sm font-semibold text-[#6B7280] ml-2">/ mensual</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-[#4B5563]">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-slate-400 shrink-0" />
                    <span><strong>2 postulaciones</strong> por día</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-slate-400 shrink-0" />
                    <span>Visualización básica de trabajos cercanos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-slate-400 shrink-0" />
                    <span>Chat con clientes después de postular</span>
                  </li>
                  <li className="flex items-center gap-3 opacity-40">
                    <CheckCircle2 size={16} className="text-slate-400 shrink-0" />
                    <span>Insignia de trabajador verificado en perfil</span>
                  </li>
                  <li className="flex items-center gap-3 opacity-40">
                    <CheckCircle2 size={16} className="text-slate-400 shrink-0" />
                    <span>Notificaciones inmediatas de nuevos trabajos</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                {activePlan === 'basic' ? (
                  <div className="w-full text-center py-2.5 text-sm font-medium text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Plan Activo
                  </div>
                ) : (
                  <div className="w-full text-center py-2.5 text-sm font-medium text-slate-400">
                    Desactivado
                  </div>
                )}
              </div>
            </div>

            {/* Premium Plan */}
            <div className={`bg-white border rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden hover:shadow-xl ${
              activePlan === 'premium' 
                ? 'border-[#0D7B6B] ring-2 ring-[#0D7B6B]/10' 
                : 'border-[#E5E7EB] hover:border-[#0D7B6B]/50'
            }`}>
              <div className="absolute top-0 right-0 bg-[#0D7B6B] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl flex items-center gap-1 shadow-sm">
                <Sparkles size={10} /> Popular
              </div>

              <div>
                <div>
                  <h4 className="text-xl font-bold text-[#1A1A2E]">Plan Premium</h4>
                  <p className="text-xs text-[#6B7280] mt-1">Multiplica tus postulaciones y consigue más clientes</p>
                </div>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold text-[#1A1A2E]">S/ 15</span>
                  <span className="text-sm font-semibold text-[#6B7280] ml-2">/ mensual</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-[#4B5563]">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#0D7B6B] shrink-0" />
                    <span><strong>5 postulaciones</strong> por día (Límite expandido)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#0D7B6B] shrink-0" />
                    <span><strong>Posicionamiento prioritario</strong> en la lista de postulantes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#0D7B6B] shrink-0" />
                    <span><strong>Insignia Verificado Premium</strong> en tu perfil público</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#0D7B6B] shrink-0" />
                    <span><strong>Notificaciones instantáneas</strong> de nuevos trabajos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#0D7B6B] shrink-0" />
                    <span>Portafolio de trabajos ilimitado</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                {activePlan === 'premium' ? (
                  <div className="w-full text-center py-2.5 text-sm font-semibold text-[#0D7B6B] bg-[#E8F5F3] rounded-xl border border-[#0D7B6B]/20">
                    Suscripción Premium Activa
                  </div>
                ) : !isVerified ? (
                  <div className="w-full text-center py-2.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-center gap-2">
                    <Clock size={14} /> Disponible al verificar tu perfil
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-3 bg-[#0D7B6B] hover:bg-[#0A6255] text-white font-bold rounded-xl shadow-lg shadow-[#0D7B6B]/20 hover:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} /> Suscribirme Ahora
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Simulated Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E7EB]">
            {/* Modal Close Button */}
            {paymentStep === 'idle' && (
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            )}

            {/* Simulated Payment Content Screen */}
            <div className="p-6 md:p-8">
              {paymentStep === 'idle' ? (
                <>
                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-bold text-[#1A1A2E]">Pago Simulado</h3>
                    <p className="text-xs text-[#6B7280] mt-1">Suscripción Mensual Premium — S/ 15.00</p>
                  </div>

                  {/* 3D Flipping Card Visualizer */}
                  <div className="perspective-1000 w-full h-44 mb-6">
                    <div className={`relative w-full h-full duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                      
                      {/* CARD FRONT FACE */}
                      <div className={`absolute inset-0 w-full h-full rounded-2xl p-5 text-white bg-gradient-to-br ${cardDetails.color} backface-hidden shadow-lg flex flex-col justify-between transition-all duration-300`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] uppercase opacity-75 font-semibold tracking-wider">AlToque Pay</p>
                            <div className="w-8 h-6 bg-yellow-400/80 rounded-md mt-1 border border-yellow-300/40 relative overflow-hidden">
                              <div className="absolute inset-0 grid grid-cols-3 gap-0.5 p-0.5 opacity-60">
                                {[...Array(9)].map((_, i) => (
                                  <div key={i} className="border-[0.5px] border-slate-800/20 rounded-[1px]"></div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-black italic tracking-tight">{cardDetails.name}</span>
                        </div>
                        
                        <div className="my-2">
                          <p className="text-lg font-mono tracking-widest text-center">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </p>
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="truncate pr-4">
                            <p className="text-[8px] uppercase opacity-60 font-semibold">Titular</p>
                            <p className="text-xs font-semibold tracking-wide truncate max-w-[200px]">
                              {cardName || 'TITULAR DE LA TARJETA'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[8px] uppercase opacity-60 font-semibold">Expira</p>
                            <p className="text-xs font-semibold tracking-wider">
                              {cardExpiry || 'MM/YY'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CARD BACK FACE */}
                      <div className="absolute inset-0 w-full h-full rounded-2xl text-white bg-gradient-to-br from-slate-800 to-slate-900 backface-hidden rotate-y-180 shadow-lg flex flex-col justify-between py-5">
                        <div className="w-full h-10 bg-slate-950 mt-1"></div>
                        
                        <div className="px-5 my-2">
                          <div className="flex items-center justify-end">
                            <div className="text-[9px] uppercase opacity-50 font-semibold mr-2">CVV</div>
                            <div className="bg-white text-slate-800 font-mono px-3 py-1 text-sm rounded italic font-bold tracking-wider w-16 text-right">
                              {cardCvv || '•••'}
                            </div>
                          </div>
                          <div className="w-full border-b border-dashed border-slate-700/60 mt-2"></div>
                        </div>

                        <div className="px-5 flex justify-between items-center text-[8px] opacity-40">
                          <span>Simulacro de tarjeta de crédito</span>
                          <span>AlToque Corp.</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Payment Input Form */}
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    {/* Card Number */}
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1A2E] mb-1">Número de Tarjeta</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4111 1111 1111 1111"
                          className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/20 focus:border-[#0D7B6B] transition-all font-mono ${
                            formErrors.cardNumber ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : 'border-[#E5E7EB]'
                          }`}
                          required
                        />
                        <div className="absolute right-3 top-3 text-slate-400">
                          <CreditCard size={18} />
                        </div>
                      </div>
                      {formErrors.cardNumber && (
                        <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-semibold">
                          <AlertCircle size={10} /> {formErrors.cardNumber}
                        </p>
                      )}
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1A2E] mb-1">Nombre en la Tarjeta</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={handleNameChange}
                        placeholder="JUAN PEREZ"
                        className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/20 focus:border-[#0D7B6B] transition-all uppercase ${
                          formErrors.cardName ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : 'border-[#E5E7EB]'
                        }`}
                        required
                      />
                      {formErrors.cardName && (
                        <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-semibold">
                          <AlertCircle size={10} /> {formErrors.cardName}
                        </p>
                      )}
                    </div>

                    {/* Expiry & CVV Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#1A1A2E] mb-1">Fecha Vence</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/20 focus:border-[#0D7B6B] transition-all font-mono ${
                            formErrors.cardExpiry ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : 'border-[#E5E7EB]'
                          }`}
                          required
                        />
                        {formErrors.cardExpiry && (
                          <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-semibold">
                            <AlertCircle size={10} /> {formErrors.cardExpiry}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1A1A2E] mb-1">CVV</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={handleCvvChange}
                          onFocus={() => setIsFlipped(true)}
                          onBlur={() => setIsFlipped(false)}
                          placeholder="123"
                          className={`w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-[#0D7B6B]/20 focus:border-[#0D7B6B] transition-all font-mono ${
                            formErrors.cardCvv ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : 'border-[#E5E7EB]'
                          }`}
                          required
                        />
                        {formErrors.cardCvv && (
                          <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-semibold">
                            <AlertCircle size={10} /> {formErrors.cardCvv}
                          </p>
                        )}
                      </div>
                    </div>

                    {formErrors.submit && (
                      <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2.5 rounded-xl border border-red-100">
                        {formErrors.submit}
                      </p>
                    )}

                    {/* Notice */}
                    <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 flex gap-3 text-[11px] text-[#6B7280]">
                      <ShieldCheck size={18} className="text-[#0D7B6B] shrink-0 mt-0.5" />
                      <p>
                        <strong>Simulación Sandbox:</strong> Este formulario no procesa cobros reales. Puedes ingresar datos aleatorios de prueba para simular el pago de forma segura.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full py-3 bg-[#0D7B6B] hover:bg-[#0A6255] text-white font-bold rounded-xl transition-all shadow-md shadow-[#0D7B6B]/15"
                    >
                      Pagar Soles S/ 15.00
                    </Button>
                  </form>
                </>
              ) : (
                /* Processing Steps screen */
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                  {paymentStep !== 'success' ? (
                    <>
                      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#0D7B6B]"></div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-bold text-[#1A1A2E]">Procesando tu Suscripción</h4>
                        <p className="text-sm text-[#6B7280] font-medium animate-pulse">
                          {paymentStep === 'validating' && 'Verificando datos de tarjeta...'}
                          {paymentStep === 'authorizing' && 'Confirmando autorización bancaria...'}
                          {paymentStep === 'saving' && 'Configurando tu plan Premium en Supabase...'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 animate-bounce">
                        <CheckCircle2 size={48} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-bold text-emerald-600">¡Pago Aprobado!</h4>
                        <p className="text-sm text-slate-500 font-medium">
                          Tu suscripción Premium ha sido configurada correctamente.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
