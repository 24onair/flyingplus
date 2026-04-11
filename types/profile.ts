export type ApprovalStatus = "pending" | "approved" | "rejected";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  phone: string;
  primarySiteId: string | null;
  approvalStatus: ApprovalStatus;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileInsert = {
  email: string;
  name: string;
  phone: string;
  primarySiteId: string | null;
};

