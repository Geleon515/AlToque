// ============================================================
// Enums
// ============================================================

export type UserRole = 'client' | 'worker'
export type JobStatus = 'active' | 'matched' | 'finished' | 'cancelled'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type MatchStatus = 'accepted' | 'on_the_way' | 'in_progress' | 'finished'
export type SubscriptionPlan = 'basic' | 'premium'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired'
export type NotificationType =
  | 'new_application'
  | 'job_finished'
  | 'new_message'
  | 'match_accepted'
  | 'review_pending'

// ============================================================
// Row types — mirrors exactos del schema.sql
// ============================================================

export interface ClientProfile {
  id: string           // PK = auth.users.id
  full_name: string
  phone: string | null
  avatar_url: string | null
  province: string
  district: string
  address: string | null
  created_at: string
}

export interface WorkerProfile {
  id: string           // PK = auth.users.id
  full_name: string
  phone: string | null
  avatar_url: string | null
  dni: string
  bio: string | null
  coverage_zone: string
  location: string | null  // GEOGRAPHY(POINT,4326) serializado como WKT
  ruc_verified: boolean
  identity_verified: boolean
  avg_rating: number
  total_reviews: number
  jobs_completed: number
  dni_doc_path?: string | null
  antecedentes_doc_path?: string | null
  certificados_doc_paths?: string[] | null
  created_at: string
}

export interface Category {
  id: number           // SERIAL (entero)
  name: string
  icon: string | null
}

export interface WorkerSpecialty {
  id: number
  worker_id: string
  category_id: number
}

export interface WorkerTag {
  id: number
  worker_id: string
  tag: string
}

export interface JobPost {
  id: string
  client_id: string
  category_id: number
  title: string | null
  description: string
  status: JobStatus
  province: string
  district: string
  address: string | null
  location: string | null
  current_radius_km: number
  created_at: string
  updated_at: string
}

export interface JobAttachment {
  id: string
  job_post_id: string
  file_url: string
  file_type: 'image' | 'video'
  created_at: string
}

export interface Application {
  id: string
  job_post_id: string
  worker_id: string
  status: ApplicationStatus
  applied_at: string
}

export interface JobMatch {
  id: string
  job_post_id: string
  worker_id: string
  application_id: string
  agreed_price: number | null
  status: MatchStatus
  scheduled_date: string | null
  worker_notes: string | null
  matched_at: string
  finished_at: string | null
}

export interface Message {
  id: string
  application_id: string
  sender_id: string
  content: string
  sent_at: string
}

export interface Review {
  id: string
  job_match_id: string
  reviewer_id: string
  reviewed_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface Subscription {
  id: string
  worker_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  culqi_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  reference_id: string | null
  created_at: string
}

// ============================================================
// Tipos para la vista de Mensajes / Chat
// ============================================================

/**
 * Contenido parseado de un mensaje de tipo "propuesta de acuerdo".
 * Se guarda serializado como JSON en messages.content.
 */
export interface ProposalPayload {
  type: 'proposal'
  amount: number          // monto acordado en soles
  scheduled_date: string  // ISO 8601 (fecha + hora)
}

/**
 * Hilo de chat que se muestra en la columna izquierda de la pantalla
 * de Mensajes. Agrupa la aplicación, el job, el perfil de la contraparte
 * y el match (si ya fue aceptado).
 */
export interface ChatThread {
  application_id: string
  job_post_id: string
  job_title: string | null
  job_description: string
  /** Nombre de la contraparte (trabajador para el cliente; cliente para el trabajador) */
  other_name: string
  other_avatar: string | null
  other_id: string
  applied_at: string
  application_status: ApplicationStatus
  /** Match ya creado para esta aplicación, si existe */
  match: JobMatch | null
}

// ============================================================
// Tipo Database para el cliente Supabase con generics
// ============================================================

export type Database = any
