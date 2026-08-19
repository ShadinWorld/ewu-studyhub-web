"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const HISTORY_KEY = "ewu-studyhub-navigation-history";
const MAX_HISTORY = 50;

type HistoryEntry = string;

function readHistory(): HistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeHistory(history: HistoryEntry[]) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch {
    // Session storage may be unavailable in private/restricted browser contexts.
  }
}

export function BackButton({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentUrl = React.useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  React.useEffect(() => {
    const history = readHistory();
    if (history[history.length - 1] !== currentUrl) {
      writeHistory([...history, currentUrl]);
    }
  }, [currentUrl]);

  if (pathname === "/") return null;

  const goBack = () => {
    const history = readHistory();
    const currentIndex = history.lastIndexOf(currentUrl);
    const targetIndex = currentIndex > 0 ? currentIndex - 1 : -1;

    if (targetIndex >= 0) {
      const target = history[targetIndex];
      writeHistory(history.slice(0, targetIndex + 1));
      router.replace(target);
      return;
    }

    router.replace("/");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={goBack}
      className={className}
      aria-label="Go back"
      title="Back"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
