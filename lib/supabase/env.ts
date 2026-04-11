function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getSupabaseEnv() {
  return {
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function hasSupabasePublicEnv() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.anonKey);
}

export function hasSupabaseAdminEnv() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.serviceRoleKey);
}

