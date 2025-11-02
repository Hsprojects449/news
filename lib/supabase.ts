import { createClient, SupabaseClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

let _supabase: SupabaseClient | null = null
if (url && key) {
  _supabase = createClient(url, key)
}

export const supabase = _supabase

// Helper to check availability
export function hasSupabase() {
  return !!_supabase
}
