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
// Tipo Database para el cliente Supabase con generics
// ============================================================

export type Database = {
  public: {
    Tables: {
      client_profiles: {
        Row: ClientProfile
        Insert: Omit<ClientProfile, 'created_at'>
        Update: Partial<Omit<ClientProfile, 'id' | 'created_at'>>
      }
      worker_profiles: {
        Row: WorkerProfile
        Insert: Omit<WorkerProfile, 'avg_rating' | 'total_reviews' | 'jobs_completed' | 'ruc_verified' | 'identity_verified' | 'created_at'>
        Update: Partial<Omit<WorkerProfile, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id'>
        Update: Partial<Omit<Category, 'id'>>
      }
      worker_specialties: {
        Row: WorkerSpecialty
        Insert: Omit<WorkerSpecialty, 'id'>
        Update: never
      }
      worker_tags: {
        Row: WorkerTag
        Insert: Omit<WorkerTag, 'id'>
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
        Insert: Omit<Application, 'id' | 'applied_at' | 'status'>
        Update: Partial<Pick<Application, 'status'>>
      }
      job_matches: {
        Row: JobMatch
        Insert: Omit<JobMatch, 'id' | 'matched_at'>
        Update: Partial<Omit<JobMatch, 'id' | 'matched_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'sent_at'>
        Update: never
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at'>
        Update: never
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at'>
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
        Args: {
          worker_location: string
          radius_km: number
          worker_category_ids: number[] | null
        }
        Returns: {
          job_id: string
          title: string | null
          description: string
          category_name: string
          district: string
          distance_km: number
          created_at: string
          client_name: string
          applicant_count: number
        }[]
      }
    }
  }
}
