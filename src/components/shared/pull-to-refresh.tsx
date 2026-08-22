"use client";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
export function PullToRefresh() {
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const onStart = (e: TouchEvent) => { if (window.scrollY === 0) startY.current = e.touches[0]?.clientY ?? null; };
    const onMove = (e: TouchEvent) => { if (startY.current == null || window.scrollY !== 0) return; const delta = (e.touches[0]?.clientY ?? startY.current) - startY.current; if (delta > 0) { const next = Math.min(delta / 1.4, 70); pullRef.current = next; setPull(next); } };
    const onEnd = () => { const shouldRefresh = pullRef.current >= 55; startY.current = null; pullRef.current = 0; setPull(0); if (shouldRefresh) { setRefreshing(true); router.refresh(); window.setTimeout(() => setRefreshing(false), 900); } };
    window.addEventListener("touchstart", onStart, { passive: true }); window.addEventListener("touchmove", onMove, { passive: true }); window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
  }, [router]);
  if (pull < 5 && !refreshing) return null;
  return <div className="pointer-events-none fixed left-1/2 top-16 z-[70] -translate-x-1/2 rounded-full border bg-background/95 p-2 shadow-lg"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} style={{ transform: `rotate(${pull * 3}deg)` }} /></div>;
}
