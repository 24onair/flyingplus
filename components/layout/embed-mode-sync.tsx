"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function EmbedModeSync() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";

  useEffect(() => {
    document.body.dataset.embedMode = isEmbed ? "true" : "false";

    return () => {
      delete document.body.dataset.embedMode;
    };
  }, [isEmbed]);

  return null;
}
