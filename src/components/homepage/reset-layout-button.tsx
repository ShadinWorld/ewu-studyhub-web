"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResetHomepageLayoutButton() {
  function reset() {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("ewu-studyhub:home-section:")) window.localStorage.removeItem(key);
      }
      window.location.reload();
    } catch {
      // The page remains usable when storage is unavailable.
    }
  }

  return <Button type="button" size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />Reset layout</Button>;
}
