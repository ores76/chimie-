import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials as provided by the user.
const supabaseUrl = 'https://gxoalykqhvrihaaojsny.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4b2FseWtxaHZyaWhhYW9qc255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDc4ODIsImV4cCI6MjA3NDgyMzg4Mn0.ZKLXVA_300eWWwWw6GEn25SSm73hemc6SkADnfOSHcY';

if (!supabaseUrl || !supabaseAnonKey) {
    // This should not be reached with hardcoded values, but it's good practice to keep the check.
    console.error("Supabase URL or Anon Key is not configured. Authentication features will be disabled.");
}

// Create and export the Supabase client.
// The exclamation marks assert that the variables are non-null.
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
