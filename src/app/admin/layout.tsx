import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/"); // not an admin — silently bounce to homepage
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-muted/30 p-4">
        <Link href="/" className="mb-6 block font-bold">EWU StudyHub</Link>
        <p className="mb-4 text-xs text-muted-foreground">Signed in as {profile.full_name}</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/admin" className="rounded-md px-3 py-2 hover:bg-accent">Overview</Link>
          <Link href="/admin/uploads" className="rounded-md px-3 py-2 hover:bg-accent">Pending Uploads</Link>
          <Link href="/admin/sellers" className="rounded-md px-3 py-2 hover:bg-accent">Seller Requests</Link>
          <Link href="/admin/reports" className="rounded-md px-3 py-2 hover:bg-accent">Reports</Link>
          <Link href="/admin/users" className="rounded-md px-3 py-2 hover:bg-accent">Users</Link>
          <Link href="/admin/payments" className="rounded-md px-3 py-2 hover:bg-accent">Payments</Link>
          <Link href="/admin/payouts" className="rounded-md px-3 py-2 hover:bg-accent">Payouts</Link>
          <Link href="/admin/commission" className="rounded-md px-3 py-2 hover:bg-accent">Commission</Link>
          <Link href="/admin/settings" className="rounded-md px-3 py-2 hover:bg-accent">Settings</Link>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <h1 className="font-semibold">Admin Panel</h1>
          <ThemeToggle />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
