import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRole, ClientProfile, WorkerProfile } from '../lib/types'

interface AuthState {
  user: User | null
  role: UserRole | null
  clientProfile: ClientProfile | null
  workerProfile: WorkerProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile(u: User) {
      const role = u.user_metadata?.role as UserRole | undefined
      if (role === 'client') {
        const { data } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('id', u.id)
          .single()
        setClientProfile(data)
        setWorkerProfile(null)
      } else if (role === 'worker') {
        const { data } = await supabase
          .from('worker_profiles')
          .select('*')
          .eq('id', u.id)
          .single()
        setWorkerProfile(data)
        setClientProfile(null)
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await loadProfile(session.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user)
      } else {
        setClientProfile(null)
        setWorkerProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const role = (user?.user_metadata?.role as UserRole) ?? null

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, role, clientProfile, workerProfile, loading, signOut }
}
