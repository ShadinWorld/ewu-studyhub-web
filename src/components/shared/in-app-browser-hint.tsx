"use client";

import { useEffect, useState } from "react";

export function InAppBrowserHint() {
  const [shown, setShown] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isInApp = /FBAN|FBAV|Instagram|Messenger|Line\//i.test(ua);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    setShown(isInApp);
    setMobile(isMobile);
  }, []);

  if (!shown) return null;

  const openUrl = () => {
    const url = window.location.href;
    try {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) navigator.clipboard?.writeText(url);
    } catch {
      navigator.clipboard?.writeText(url);
    }
  };

  return (
    <div className="fixed inset-x-3 top-[4.5rem] z-[70] mx-auto max-w-xl rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Open StudyHub in your browser</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {mobile ? "Facebook’s in-app browser can be slower. Open this page in Chrome/Safari for the fastest experience." : "This in-app browser may be slower than your normal browser."}
          </p>
        </div>
        <button onClick={() => setShown(false)} className="text-sm text-muted-foreground">✕</button>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={openUrl} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Open in browser</button>
        <button onClick={() => setShown(false)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Continue here</button>
      </div>
    </div>
  );
}
