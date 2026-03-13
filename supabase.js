// ─────────────────────────────────────────────────────────
//  src/lib/supabase.js
//  Creates a single shared Supabase client used everywhere.
//  Values come from your .env.local file.
// ─────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
