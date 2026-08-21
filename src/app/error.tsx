"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep logging minimal and avoid exposing sensitive runtime details in UI.
    console.error("EWU StudyHub route error", { digest: undefined });
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">The page could not load right now. Try again without losing your current session.</p>
        <Button onClick={() => reset()} className="mt-5"><RefreshCcw className="mr-2 h-4 w-4" />Try again</Button>
      </div>
    </main>
  );
}
