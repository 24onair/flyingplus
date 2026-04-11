import type { TaskPointType } from "@/types/course";

export type SavedTaskVisibility = "private" | "public";

export type SavedTaskTurnpoint = {
  order: number;
  name: string;
  label?: string;
  lat: number;
  lng: number;
  radiusM: number;
  taskType: TaskPointType;
  elevationM: number | null;
};

export type SavedTaskRecord = {
  id: string;
  userId?: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  visibility: SavedTaskVisibility;
  name: string;
  siteId: string;
  siteName: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  taskType: "RACE";
  sssOpenTime: string;
  taskDeadlineTime: string;
  distanceKm: number;
  turnpoints: SavedTaskTurnpoint[];
};

export type SavedTaskPayload = {
  name: string;
  visibility: SavedTaskVisibility;
  siteId: string;
  siteName: string;
  date: string;
  taskType: "RACE";
  sssOpenTime: string;
  taskDeadlineTime: string;
  distanceKm: number;
  turnpoints: SavedTaskTurnpoint[];
};
