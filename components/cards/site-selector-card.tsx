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
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderRadius: 4,
        border: "1px solid #5E5E5E",
        background: "#FFFFFF",
        cursor: "pointer",
        transition: "border-color 200ms ease, background 200ms ease",
        boxShadow: "rgba(0, 0, 0, 0.3) 0px 0px 5px 0px",
        gap: 12,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLLabelElement).style.borderColor = "#0EA5E9";
        (e.currentTarget as HTMLLabelElement).style.background = "rgba(14,165,233,0.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLLabelElement).style.borderColor = "#5E5E5E";
        (e.currentTarget as HTMLLabelElement).style.background = "#FFFFFF";
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{ fontWeight: 600, color: "#1E2026", margin: 0, fontSize: 15 }}>{site.name}</p>
          {preferred ? (
            <span style={{
              display: "inline-flex",
              padding: "2px 8px",
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 700,
              background: "rgba(14,165,233,0.12)",
              color: "#0EA5E9",
            }}>
              선호
            </span>
          ) : null}
        </div>
        <p style={{ fontSize: 13, color: "#757575", margin: "3px 0 0" }}>{site.tagline}</p>
      </div>
      <input
        type="checkbox"
        name="siteIds"
        value={site.siteId}
        defaultChecked={defaultChecked}
        style={{ width: 16, height: 16, accentColor: "#0EA5E9", flexShrink: 0, cursor: "pointer" }}
      />
    </label>
  );
}
