import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function listFavoriteSiteIdsForUser(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("favorite_sites")
    .select("site_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => item.site_id as string);
}

export async function addFavoriteSiteForUser(userId: string, siteId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("favorite_sites").upsert(
    { user_id: userId, site_id: siteId },
    { onConflict: "user_id,site_id", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFavoriteSiteForUser(userId: string, siteId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("favorite_sites")
    .delete()
    .eq("user_id", userId)
    .eq("site_id", siteId);

  if (error) {
    throw new Error(error.message);
  }
}
