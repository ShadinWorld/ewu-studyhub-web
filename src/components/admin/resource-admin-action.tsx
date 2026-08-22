"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeResource } from "@/app/admin/resources/actions";

export function ResourceAdminAction({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const onRemove = () => {
    if (!window.confirm(`Remove “${title}” from StudyHub? Purchases and history will be preserved for existing buyers.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      try {
        const result = await removeResource(fd);
        if (result?.ok) toast.success("Resource removed successfully.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove resource.");
      }
    });
  };
  return <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={onRemove}>{pending ? "Removing…" : "Remove"}</Button>;
}
