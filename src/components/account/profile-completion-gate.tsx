"use client";

import Link from "next/link";

export function ProfileCompletionGate({ next }: { next: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">One quick step</p>
        <h2 className="mt-2 text-2xl font-bold">Complete your profile</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Add your WhatsApp number to unlock purchases, saved resources, notifications, seller features and the rest of StudyHub.</p>
        <div className="mt-5 flex gap-2">
          <Link href={`/account?next=${encodeURIComponent(next)}#complete-account`} className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Complete profile</Link>
          <Link href="/" className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold">Back home</Link>
        </div>
      </div>
    </div>
  );
}
