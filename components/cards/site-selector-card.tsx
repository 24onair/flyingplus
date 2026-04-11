import type { SiteSummary } from "@/types/site";

export function SiteSelectorCard({
  site,
  defaultChecked = true,
  preferred = false,
}: {
  site: SiteSummary;
  defaultChecked?: boolean;
  preferred?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 transition hover:border-emerald-500 hover:bg-emerald-50">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-stone-900">{site.name}</p>
          {preferred ? (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              선호
            </span>
          ) : null}
        </div>
        <p className="text-sm text-stone-500">{site.tagline}</p>
      </div>
      <input
        type="checkbox"
        name="siteIds"
        value={site.siteId}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-emerald-700"
      />
    </label>
  );
}
