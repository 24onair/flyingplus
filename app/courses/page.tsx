import { CoursesClient } from "@/components/briefing/courses-client";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  return <CoursesClient searchParams={resolvedSearchParams} />;
}
