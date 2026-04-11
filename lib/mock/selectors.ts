import { siteSummaries } from "@/data/sites/config";
import { generateBriefing } from "@/lib/engine/generate-briefing";
import { mockRequests } from "@/lib/mock/requests";

export function getSiteSummaries() {
  return siteSummaries;
}

export function getBriefingScenario(key: keyof typeof mockRequests) {
  return generateBriefing(mockRequests[key]);
}
