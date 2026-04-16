"use client";

type OpenTopLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function OpenTopLink({
  href,
  className = "",
  children,
}: OpenTopLinkProps) {
  function handleClick() {
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = href;
        return;
      }
    } catch {
      // Fallback below for cross-origin iframe access issues.
    }

    try {
      window.open(href, "_top");
      return;
    } catch {
      // Final fallback below.
    }

    window.location.href = href;
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
