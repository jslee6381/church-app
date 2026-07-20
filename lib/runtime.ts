export function hasPublicSupabaseEnvironment() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasServerDataEnvironment() {
  return Boolean(hasPublicSupabaseEnvironment() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isDemoMode() {
  return !hasServerDataEnvironment() || process.env.NEXT_PUBLIC_UI_DEMO === "true";
}
