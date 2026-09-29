"use client";

import { useEffect } from "react";

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
const STORAGE_PREFIX = "ewu-studyhub:viewed-resource:";

export function ResourceViewTracker({ fileId }: { fileId: string }) {
  useEffect(() => {
    const storageKey = `${STORAGE_PREFIX}${fileId}`;
    const now = Date.now();

    try {
      const lastTrackedAt = Number(window.sessionStorage.getItem(storageKey) || 0);
      if (lastTrackedAt > 0 && now - lastTrackedAt < DEDUPE_WINDOW_MS) return;
      window.sessionStorage.setItem(storageKey, String(now));
    } catch {
      // Tracking should never block the resource page when sessionStorage is unavailable.
    }

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
