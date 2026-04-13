import { NextResponse } from "next/server";
import { getRequestAuthProfile } from "@/lib/supabase/request-auth";
import {
  deleteSavedTask,
  getPublicSavedTask,
  getSavedTask,
  getSavedTaskVisibleToUser,
  listAllSavedTasks,
  listPublicSavedTasks,
  listSavedTasksForUser,
  saveTaskForUser,
  updateTaskNameForUser,
} from "@/lib/tasks/supabase-saved-task-store";
import type { SavedTaskPayload } from "@/types/saved-task";

export const runtime = "nodejs";

async function getOptionalAuth(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const auth = await getRequestAuthProfile(request, { requireApproved: true });
  return auth.ok ? auth : null;
}

export async function GET(request: Request) {
  try {
    const auth = await getOptionalAuth(request);
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId")?.trim();
    const scope = searchParams.get("scope")?.trim();

    if (taskId) {
      const task = auth
        ? auth.profile.isAdmin
          ? await getSavedTask(taskId)
          : await getSavedTaskVisibleToUser(auth.userId, taskId)
        : await getPublicSavedTask(taskId);

      if (!task) {
        return NextResponse.json(
          { error: "타스크를 찾지 못했습니다." },
          { status: 404 }
        );
      }

      return NextResponse.json({ task });
    }

    if (scope === "public" || !auth) {
      const tasks = await listPublicSavedTasks();
      return NextResponse.json({ tasks });
    }

    const tasks =
      scope === "all" && auth.profile.isAdmin
        ? await listAllSavedTasks()
        : await listSavedTasksForUser(auth.userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      {
        error: "타스크 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireApproved: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as Partial<SavedTaskPayload>;

    if (
      !payload.name ||
      (payload.visibility !== "private" && payload.visibility !== "public") ||
      !payload.siteId ||
      !payload.siteName ||
      !payload.date ||
      !payload.sssOpenTime ||
      !payload.taskDeadlineTime ||
      !Array.isArray(payload.turnpoints) ||
      payload.turnpoints.length < 2
    ) {
      return NextResponse.json(
        { error: "필수 타스크 정보가 부족합니다." },
        { status: 400 }
      );
    }

    const record = await saveTaskForUser(auth.userId, {
      name: payload.name,
      visibility: payload.visibility,
      siteId: payload.siteId,
      siteName: payload.siteName,
      date: payload.date,
      taskType: "RACE",
      sssOpenTime: payload.sssOpenTime,
      taskDeadlineTime: payload.taskDeadlineTime,
      distanceKm: Number(payload.distanceKm ?? 0),
      turnpoints: payload.turnpoints,
    });

    return NextResponse.json({ task: record });
  } catch (error) {
    return NextResponse.json(
      {
        error: "타스크 저장 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireApproved: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = (await request.json()) as { taskId?: string; name?: string };

    if (!payload.taskId || !payload.name?.trim()) {
      return NextResponse.json(
        { error: "수정할 타스크 정보가 부족합니다." },
        { status: 400 }
      );
    }

    const updated = await updateTaskNameForUser(
      auth.userId,
      payload.taskId,
      payload.name
    );

    if (!updated) {
      return NextResponse.json(
        { error: "수정할 타스크를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: "타스크 이름 수정 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getRequestAuthProfile(request, { requireApproved: true });

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.profile.isAdmin) {
      return NextResponse.json(
        { error: "관리자만 타스크를 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId")?.trim();

    if (!taskId) {
      return NextResponse.json(
        { error: "삭제할 타스크 정보가 부족합니다." },
        { status: 400 }
      );
    }

    const deleted = await deleteSavedTask(taskId);

    if (!deleted) {
      return NextResponse.json(
        { error: "삭제할 타스크를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "타스크 삭제 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
