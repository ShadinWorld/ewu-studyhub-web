"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateUserRole } from "@/app/admin/users/actions";

const ROLES = [
  ["student", "Student"],
  ["verified_student", "Verified student"],
  ["seller", "Seller"],
  ["admin", "Admin"],
  ["super_admin", "Super admin"],
] as const;

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
  return <select aria-label="User role" value={currentRole} onChange={handleChange} disabled={isPending} className="h-9 rounded-md border border-input bg-background px-2 text-xs font-medium">
    {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>;
}
