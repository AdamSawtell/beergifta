import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** True when both Vite env vars are set (Amplify, or `.env.local` for dev). */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(url && key && typeof url === 'string' && typeof key === 'string')
}

/**
 * Single browser Supabase client. Call only after `isSupabaseConfigured()` is true.
 * See `dev-core/guides/supabase-patterns.md` for env naming.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
