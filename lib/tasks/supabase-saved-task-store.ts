import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SavedTaskPayload, SavedTaskRecord } from "@/types/saved-task";

type SavedTaskRow = {
  id: string;
  user_id: string;
  visibility?: "private" | "public";
  name: string;
  site_id: string;
  site_name: string;
  date: string;
  task_type: "RACE";
  sss_open_time: string;
  task_deadline_time: string;
  distance_km: number;
  turnpoints: SavedTaskRecord["turnpoints"];
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
};

function mapSavedTaskRow(
  row: SavedTaskRow,
  profile?: { name: string | null; email: string | null } | null
): SavedTaskRecord {
  return {
    id: row.id,
    userId: row.user_id,
    ownerName: profile?.name ?? null,
    ownerEmail: profile?.email ?? null,
    visibility: row.visibility ?? "private",
    name: row.name,
    siteId: row.site_id,
    siteName: row.site_name,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    taskType: row.task_type,
    sssOpenTime: row.sss_open_time,
    taskDeadlineTime: row.task_deadline_time,
    distanceKm: Number(row.distance_km ?? 0),
    turnpoints: Array.isArray(row.turnpoints) ? row.turnpoints : [],
  };
}

function isMissingVisibilityColumnError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("visibility") &&
    (message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  );
}

async function enrichSavedTasks(rows: SavedTaskRow[]) {
  const supabase = createSupabaseAdminClient();
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

  if (userIds.length === 0) {
    return rows.map((row) => mapSavedTaskRow(row));
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  if (error) {
    return rows.map((row) => mapSavedTaskRow(row));
  }

  const profileMap = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );

  return rows.map((row) => mapSavedTaskRow(row, profileMap.get(row.user_id) ?? null));
}

export async function listSavedTasksForUser(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return enrichSavedTasks((data ?? []) as SavedTaskRow[]);
}

export async function getSavedTaskForUser(userId: string, taskId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [record] = await enrichSavedTasks([data as SavedTaskRow]);
  return record ?? null;
}

export async function getSavedTaskVisibleToUser(userId: string, taskId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .select("*")
    .eq("id", taskId)
    .or(`user_id.eq.${userId},visibility.eq.public`)
    .maybeSingle();

  if (error) {
    if (isMissingVisibilityColumnError(error)) {
      return getSavedTaskForUser(userId, taskId);
    }
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [record] = await enrichSavedTasks([data as SavedTaskRow]);
  return record ?? null;
}

export async function listPublicSavedTasks() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .select("*")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingVisibilityColumnError(error)) {
      return [];
    }
    throw new Error(error.message);
  }

  return enrichSavedTasks((data ?? []) as SavedTaskRow[]);
}

export async function getPublicSavedTask(taskId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("visibility", "public")
    .maybeSingle();

  if (error) {
    if (isMissingVisibilityColumnError(error)) {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [record] = await enrichSavedTasks([data as SavedTaskRow]);
  return record ?? null;
}

export async function saveTaskForUser(userId: string, payload: SavedTaskPayload) {
  const supabase = createSupabaseAdminClient();
  const insertPayload = {
    user_id: userId,
    visibility: payload.visibility,
    name: payload.name,
    site_id: payload.siteId,
    site_name: payload.siteName,
    date: payload.date,
    task_type: payload.taskType,
    sss_open_time: payload.sssOpenTime,
    task_deadline_time: payload.taskDeadlineTime,
    distance_km: payload.distanceKm,
    turnpoints: payload.turnpoints,
  };

  const { data, error } = await supabase
    .from("saved_tasks")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    if (isMissingVisibilityColumnError(error)) {
      const legacyPayload = {
        user_id: userId,
        name: payload.name,
        site_id: payload.siteId,
        site_name: payload.siteName,
        date: payload.date,
        task_type: payload.taskType,
        sss_open_time: payload.sssOpenTime,
        task_deadline_time: payload.taskDeadlineTime,
        distance_km: payload.distanceKm,
        turnpoints: payload.turnpoints,
      };
      const fallback = await supabase
        .from("saved_tasks")
        .insert(legacyPayload)
        .select("*")
        .single();

      if (fallback.error) {
        throw new Error(fallback.error.message);
      }

      const [record] = await enrichSavedTasks([fallback.data as SavedTaskRow]);
      return record;
    }
    throw new Error(error.message);
  }

  const [record] = await enrichSavedTasks([data as SavedTaskRow]);
  return record;
}

export async function updateTaskNameForUser(
  userId: string,
  taskId: string,
  name: string
) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("타스크 이름이 비어 있습니다.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .update({
      name: trimmedName,
    })
    .eq("user_id", userId)
    .eq("id", taskId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [record] = await enrichSavedTasks([data as SavedTaskRow]);
  return record ?? null;
}

export async function listAllSavedTasks() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return enrichSavedTasks((data ?? []) as SavedTaskRow[]);
}

export async function getSavedTask(taskId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [record] = await enrichSavedTasks([data as SavedTaskRow]);
  return record ?? null;
}

export async function deleteSavedTask(taskId: string) {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase
    .from("saved_tasks")
    .delete({ count: "exact" })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}
