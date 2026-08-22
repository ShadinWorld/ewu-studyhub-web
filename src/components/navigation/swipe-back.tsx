"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EDGE_START = 28;
const SWIPE_DISTANCE = 90;
const MAX_VERTICAL_DRIFT = 70;

export function SwipeBackGesture() {
  const router = useRouter();
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || touch.clientX > EDGE_START) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [role=dialog], [data-no-swipe-back], .overflow-x-auto, .overflow-x-scroll")) return;
      startRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = Math.abs(touch.clientY - start.y);
      if (dx >= SWIPE_DISTANCE && dy <= MAX_VERTICAL_DRIFT) router.back();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [router]);

  return null;
}
