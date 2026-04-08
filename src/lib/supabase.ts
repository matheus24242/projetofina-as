import { createClient } from '@supabase/supabase-js';

// Access variables with fallbacks for different environments
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Please check your .env file and vite.config.ts.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', // Fallback to prevent crash on init
  supabaseAnonKey || 'placeholder-key'
);
