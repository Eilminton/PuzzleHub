import { createClient } from '@supabase/supabase-js'

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
