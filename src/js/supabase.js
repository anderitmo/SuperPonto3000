// Supabase API Configuration
export const SUPABASE_URL = 'https://yhrabfdapveuscfjqkpv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_vI6eeiF4LTzhcIop4hyxwA_xyYzZjZ8';

// Initialize Supabase Client (if window.supabase is available from CDN)
export const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
