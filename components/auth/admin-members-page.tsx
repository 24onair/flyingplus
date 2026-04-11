"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { approvalStatusLabel } from "@/lib/auth/profile";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  primary_site_id: string | null;
  approval_status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
};

type ProfilesApiResponse = {
  profiles?: ProfileRow[];
  profile?: ProfileRow;
  error?: string;
  details?: string;
};

async function readProfilesResponse(response: Response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("서버가 JSON이 아닌 응답을 반환했습니다.");
  }

  return JSON.parse(raw) as ProfilesApiResponse;
}

export function AdminMembersPage() {
  const { user, profile, isLoading, getAccessToken } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      if (isLoading) return;
      if (!user || !profile?.isAdmin) {
        setProfiles([]);
        setStatus("idle");
        setError("");
        return;
      }

      setStatus("loading");
      setError("");

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error("로그인 세션을 확인하지 못했습니다.");

        const response = await fetch("/api/admin/profiles", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = await readProfilesResponse(response);

        if (!response.ok) {
          throw new Error(payload.error ?? payload.details ?? "회원 목록 조회 실패");
        }

        if (!cancelled) {
          setProfiles(payload.profiles ?? []);
          setStatus("done");
        }
      } catch (nextError) {
        if (!cancelled) {
          setStatus("error");
          setError(nextError instanceof Error ? nextError.message : "알 수 없는 오류");
        }
      }
    }

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, isLoading, profile?.isAdmin, user]);

  async function updateProfile(
    targetUserId: string,
    updates: { approvalStatus?: "pending" | "approved" | "rejected"; isAdmin?: boolean }
  ) {
    setSavingKey(targetUserId);
    setError("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("로그인 세션을 확인하지 못했습니다.");

      const response = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: targetUserId, ...updates }),
      });
      const payload = await readProfilesResponse(response);

      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? payload.details ?? "회원 수정 실패");
      }

      setProfiles((current) =>
        current.map((item) => (item.id === targetUserId ? payload.profile! : item))
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "알 수 없는 오류");
    } finally {
      setSavingKey("");
    }
  }

  const summary = useMemo(
    () => ({
      pending: profiles.filter((item) => item.approval_status === "pending").length,
      approved: profiles.filter((item) => item.approval_status === "approved").length,
      rejected: profiles.filter((item) => item.approval_status === "rejected").length,
    }),
    [profiles]
  );

  const groupedProfiles = useMemo(() => {
    const pending = profiles.filter((item) => item.approval_status === "pending");
    const approved = profiles.filter((item) => item.approval_status === "approved");
    const rejected = profiles.filter((item) => item.approval_status === "rejected");
    return { pending, approved, rejected };
  }, [profiles]);

  if (isLoading) {
    return <div className="glass rounded-[28px] border p-6 text-sm text-stone-600">계정 상태를 확인하고 있습니다...</div>;
  }

  if (!user || !profile?.isAdmin) {
    return <div className="glass rounded-[28px] border p-6 text-sm text-stone-700">관리자만 회원 승인 페이지를 볼 수 있습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-[28px] border p-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-full bg-amber-100 px-4 py-2 font-semibold text-amber-900">승인 대기 {summary.pending}</div>
          <div className="rounded-full bg-emerald-100 px-4 py-2 font-semibold text-emerald-900">승인 완료 {summary.approved}</div>
          <div className="rounded-full bg-rose-100 px-4 py-2 font-semibold text-rose-900">반려 {summary.rejected}</div>
        </div>
      </section>

      {status === "loading" ? <div className="glass rounded-[28px] border p-6 text-sm text-stone-600">회원 목록을 불러오는 중입니다...</div> : null}
      {status === "error" || error ? <div className="glass rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-900">{error || "회원 목록을 불러오지 못했습니다."}</div> : null}

      <section className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">승인 대기 회원</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              {groupedProfiles.pending.length}명
            </span>
          </div>

          {groupedProfiles.pending.length === 0 ? (
            <div className="glass rounded-[28px] border p-6 text-sm text-stone-600">
              현재 승인 대기 중인 회원이 없습니다.
            </div>
          ) : (
            <div className="grid gap-4">
              {groupedProfiles.pending.map((item) => (
                <article key={item.id} className="glass rounded-[28px] border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                          {approvalStatusLabel(item.approval_status)}
                        </span>
                        {item.is_admin ? (
                          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                            관리자
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-stone-900">{item.name || "이름 없음"}</h2>
                        <p className="mt-1 text-sm text-stone-600">{item.email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500">
                      가입일{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        timeZone: "Asia/Seoul",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(item.created_at))}
                    </p>
                  </div>

                  <dl className="mt-4 grid gap-2 text-sm text-stone-700 md:grid-cols-3">
                    <div><dt className="font-semibold text-stone-500">전화번호</dt><dd>{item.phone || "없음"}</dd></div>
                    <div><dt className="font-semibold text-stone-500">선호 활공장</dt><dd>{item.primary_site_id || "없음"}</dd></div>
                    <div><dt className="font-semibold text-stone-500">회원 ID</dt><dd className="truncate">{item.id}</dd></div>
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void updateProfile(item.id, { approvalStatus: "approved" })} disabled={savingKey === item.id} className="btn btn-primary disabled:opacity-60">승인</button>
                    <button type="button" onClick={() => void updateProfile(item.id, { approvalStatus: "rejected" })} disabled={savingKey === item.id} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:opacity-60">반려</button>
                    <button type="button" onClick={() => void updateProfile(item.id, { isAdmin: !item.is_admin })} disabled={savingKey === item.id} className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:opacity-60">
                      {item.is_admin ? "관리자 해제" : "관리자 지정"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-stone-200/80 pt-2" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">승인 완료 / 반려 회원</h2>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
              {groupedProfiles.approved.length + groupedProfiles.rejected.length}명
            </span>
          </div>

          <div className="grid gap-4">
            {[...groupedProfiles.approved, ...groupedProfiles.rejected].map((item) => (
              <article key={item.id} className="glass rounded-[28px] border p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          item.approval_status === "approved"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {approvalStatusLabel(item.approval_status)}
                      </span>
                      {item.is_admin ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                          관리자
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-stone-900">{item.name || "이름 없음"}</h2>
                      <p className="mt-1 text-sm text-stone-600">{item.email}</p>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500">
                    가입일{" "}
                    {new Intl.DateTimeFormat("ko-KR", {
                      timeZone: "Asia/Seoul",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.created_at))}
                  </p>
                </div>

                <dl className="mt-4 grid gap-2 text-sm text-stone-700 md:grid-cols-3">
                  <div><dt className="font-semibold text-stone-500">전화번호</dt><dd>{item.phone || "없음"}</dd></div>
                  <div><dt className="font-semibold text-stone-500">선호 활공장</dt><dd>{item.primary_site_id || "없음"}</dd></div>
                  <div><dt className="font-semibold text-stone-500">회원 ID</dt><dd className="truncate">{item.id}</dd></div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  {item.approval_status !== "approved" ? (
                    <button type="button" onClick={() => void updateProfile(item.id, { approvalStatus: "approved" })} disabled={savingKey === item.id} className="btn btn-primary disabled:opacity-60">승인</button>
                  ) : null}
                  {item.approval_status !== "pending" ? (
                    <button type="button" onClick={() => void updateProfile(item.id, { approvalStatus: "pending" })} disabled={savingKey === item.id} className="btn btn-secondary disabled:opacity-60">대기</button>
                  ) : null}
                  {item.approval_status !== "rejected" ? (
                    <button type="button" onClick={() => void updateProfile(item.id, { approvalStatus: "rejected" })} disabled={savingKey === item.id} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:opacity-60">반려</button>
                  ) : null}
                  <button type="button" onClick={() => void updateProfile(item.id, { isAdmin: !item.is_admin })} disabled={savingKey === item.id} className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:opacity-60">
                    {item.is_admin ? "관리자 해제" : "관리자 지정"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
