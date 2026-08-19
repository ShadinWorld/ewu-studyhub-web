"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  const goBack = () => {
    const cameFromSameSite = document.referrer.startsWith(window.location.origin);
    if (cameFromSameSite && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
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
