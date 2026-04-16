"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function EmbedModeSync() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  const isMapFullscreen = searchParams.get("mapFullscreen") === "1";

  useEffect(() => {
    document.body.dataset.embedMode = isEmbed ? "true" : "false";
    document.body.dataset.mapFullscreenMode = isMapFullscreen ? "true" : "false";

    return () => {
      delete document.body.dataset.embedMode;
      delete document.body.dataset.mapFullscreenMode;
    };
  }, [isEmbed, isMapFullscreen]);

  return null;
}
