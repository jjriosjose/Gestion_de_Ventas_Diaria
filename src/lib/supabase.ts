import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://ccvzosnhxitfeochnflr.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bJ9YeotIgS6Zo5OPTpZ_JQ_qkJAeJqF'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
