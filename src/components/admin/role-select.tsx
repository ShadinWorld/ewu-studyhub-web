"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateUserRole } from "@/app/admin/users/actions";

const ROLES = ["student", "verified_student", "seller", "admin", "super_admin"];

export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value;
    startTransition(async () => {
      const res = await updateUserRole(userId, newRole);
      if (res?.error) toast.error(res.error);
      else toast.success("Role updated");
    });
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={isPending}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );
}
