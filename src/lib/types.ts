// ============================================================
// Enums — deben coincidir con los tipos en PostgreSQL
// ============================================================

export type UserRole = 'client' | 'worker'
export type JobStatus = 'pending' | 'active' | 'closed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type MatchStatus = 'accepted' | 'on_the_way' | 'in_progress' | 'finished'
export type SubscriptionPlan = 'basic' | 'premium'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due'
export type NotificationType =
  | 'new_application'
  | 'match_accepted'
  | 'status_changed'
  | 'new_message'
  | 'review_request'

// ============================================================
// Row types — mirrors de cada tabla
// ============================================================

export interface ClientProfile {
  id: string
  user_id: string
  nombre: string
  telefono: string | null
  provincia: string
  distrito: string
  avg_rating: number
  total_reviews: number
  jobs_posted: number
  created_at: string
  updated_at: string
}

export interface WorkerProfile {
  id: string
  user_id: string
  nombre: string
  dni: string
  bio: string | null
  zona_cobertura: string | null
  location: string | null // GEOGRAPHY(POINT, 4326) — serializado como string
  avg_rating: number
  total_reviews: number
  jobs_completed: number
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  nombre: string
  icono: string | null
  created_at: string
}

export interface WorkerSpecialty {
  id: string
  worker_id: string
  category_id: string
  created_at: string
}

export interface WorkerTag {
  id: string
  worker_id: string
  tag: string
  created_at: string
}

export interface JobPost {
  id: string
  client_id: string
  category_id: string
  titulo: string
  descripcion: string
  location: string // GEOGRAPHY(POINT, 4326)
  direccion: string
  distrito: string
  status: JobStatus
  current_radius_km: number
  scheduled_date: string | null
  created_at: string
  updated_at: string
}

export interface JobAttachment {
  id: string
  job_post_id: string
  url: string
  type: 'image' | 'video'
  created_at: string
}

export interface Application {
  id: string
  job_post_id: string
  worker_id: string
  mensaje: string | null
  status: ApplicationStatus
  created_at: string
  updated_at: string
}

export interface JobMatch {
  id: string
  job_post_id: string
  application_id: string
  worker_id: string
  client_id: string
  status: MatchStatus
  scheduled_date: string | null
  worker_notes: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  application_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface Review {
  id: string
  job_match_id: string
  reviewer_id: string
  reviewed_id: string
  rating: number
  comment: string | null
  is_default: boolean
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
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  titulo: string
  body: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

// ============================================================
// Tipo Database para el cliente Supabase con generics
// Reemplazar con `npx supabase gen types typescript` cuando
// el proyecto Supabase esté creado.
// ============================================================

export type Database = {
  public: {
    Tables: {
      client_profiles: {
        Row: ClientProfile
        Insert: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at' | 'avg_rating' | 'total_reviews' | 'jobs_posted'>
        Update: Partial<Omit<ClientProfile, 'id' | 'created_at'>>
      }
      worker_profiles: {
        Row: WorkerProfile
        Insert: Omit<WorkerProfile, 'id' | 'created_at' | 'updated_at' | 'avg_rating' | 'total_reviews' | 'jobs_completed' | 'is_verified'>
        Update: Partial<Omit<WorkerProfile, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      worker_specialties: {
        Row: WorkerSpecialty
        Insert: Omit<WorkerSpecialty, 'id' | 'created_at'>
        Update: never
      }
      worker_tags: {
        Row: WorkerTag
        Insert: Omit<WorkerTag, 'id' | 'created_at'>
        Update: never
      }
      job_posts: {
        Row: JobPost
        Insert: Omit<JobPost, 'id' | 'created_at' | 'updated_at' | 'status' | 'current_radius_km'>
        Update: Partial<Omit<JobPost, 'id' | 'created_at'>>
      }
      job_attachments: {
        Row: JobAttachment
        Insert: Omit<JobAttachment, 'id' | 'created_at'>
        Update: never
      }
      applications: {
        Row: Application
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at' | 'status'>
        Update: Partial<Pick<Application, 'status' | 'updated_at'>>
      }
      job_matches: {
        Row: JobMatch
        Insert: Omit<JobMatch, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<JobMatch, 'id' | 'created_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: never
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at' | 'is_default'>
        Update: never
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Pick<Notification, 'read'>>
      }
    }
    Functions: {
      get_nearby_jobs: {
        Args: { worker_location: string; radius_km: number; category_ids: string[] }
        Returns: (JobPost & { distance_km: number })[]
      }
      check_daily_application_limit: {
        Args: { p_worker_id: string }
        Returns: boolean
      }
      expand_job_radius: {
        Args: Record<string, never>
        Returns: void
      }
      insert_default_reviews: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      job_status: JobStatus
      application_status: ApplicationStatus
      match_status: MatchStatus
      subscription_plan: SubscriptionPlan
      subscription_status: SubscriptionStatus
      notification_type: NotificationType
    }
  }
}
