"use client";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Using auth-helpers client ensures the middleware can sync cookies for server routes
// Explicitly pass env values to avoid any ambiguity at build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClientComponentClient({
  supabaseUrl,
  supabaseKey: supabaseAnonKey,
});
