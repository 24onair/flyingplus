import type { ApprovalStatus, UserProfile } from "@/types/profile";

export function canUsePersonalStorage(profile: Pick<UserProfile, "approvalStatus"> | null) {
  return profile?.approvalStatus === "approved";
}

export function approvalStatusLabel(status: ApprovalStatus) {
  switch (status) {
    case "approved":
      return "승인 완료";
    case "rejected":
      return "가입 반려";
    default:
      return "승인 대기";
  }
}

