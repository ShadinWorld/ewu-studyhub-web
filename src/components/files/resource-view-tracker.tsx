"use client";

import { useEffect } from "react";

export function ResourceViewTracker({ fileId }: { fileId: string }) {
  useEffect(() => {
    void fetch(`/api/files/${fileId}/track-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => {
      // View tracking is non-critical and must not affect the resource experience.
    });
  }, [fileId]);

  return null;
}
