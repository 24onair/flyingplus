import type { Metadata } from "next";
import { ComplaintGenerator } from "@/components/complaint/complaint-generator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "문경 활공장 민원문 생성",
  description: "문경 활공장 위탁 운영 반대 취지의 국민신문고 민원문을 생성합니다.",
};

export default function MungyeongComplaintPage() {
  return <ComplaintGenerator />;
}
