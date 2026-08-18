"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function AdminActionToast() {
  const params = useSearchParams();
  useEffect(() => {
    const saved = params.get("saved");
    const error = params.get("error");
    if (saved) toast.success(saved);
    if (error) toast.error(error);
  }, [params]);
  return null;
}
