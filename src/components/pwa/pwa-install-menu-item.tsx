"use client";

import { Download, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallMenuItem() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setInstalled(true);
      setInstallEvent(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice.catch(() => undefined);
      setInstallEvent(null);
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void handleInstall(); }} className="cursor-pointer">
        <Download className="mr-2 h-4 w-4" />
        Install StudyHub App
      </DropdownMenuItem>
      {showHelp && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">StudyHub App install</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  এই browser-এ automatic install prompt এখন পাওয়া যাচ্ছে না। নিচের browser option ব্যবহার করে StudyHub install করুন।
                </p>
              </div>
              <button type="button" onClick={() => setShowHelp(false)} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6">
              <div className="rounded-xl border p-3">
                <p className="font-semibold">Android Chrome / Samsung Internet</p>
                <p className="mt-1 text-muted-foreground">Browser menu (⋮) খুলে <strong>Install app</strong> বা <strong>Add to Home screen</strong> নির্বাচন করুন।</p>
              </div>
              {isIOS() && (
                <div className="rounded-xl border p-3">
                  <p className="font-semibold">iPhone / iPad</p>
                  <p className="mt-1 text-muted-foreground">Share menu খুলে <strong>Add to Home Screen</strong> নির্বাচন করুন।</p>
                </div>
              )}
              <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                Install option browser, device এবং current PWA install state-এর ওপর নির্ভর করে।
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowHelp(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">Close</button>
              <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <RotateCcw className="h-4 w-4" />
                Check again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
