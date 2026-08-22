"use client";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

declare global { interface WindowEventMap { beforeinstallprompt: BeforeInstallPromptEvent } }
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

export function InstallAppButton() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => { const handler = (e: BeforeInstallPromptEvent) => { e.preventDefault(); setEvent(e); }; window.addEventListener("beforeinstallprompt", handler as EventListener); return () => window.removeEventListener("beforeinstallprompt", handler as EventListener); }, []);
  if (!event) return null;
  return <Button type="button" variant="outline" size="sm" onClick={async () => { await event.prompt(); setEvent(null); }}><Download className="mr-1.5 h-4 w-4" />Add to Home Screen</Button>;
}
