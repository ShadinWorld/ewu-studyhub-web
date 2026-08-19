import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { NotificationList } from "@/components/notifications/notification-list";
import { markAllNotificationsRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container max-w-3xl flex-1 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.` : "You're all caught up."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/requests">My Requests</Link></Button>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="outline" size="sm">Mark all as read</Button>
            </form>
          )}
        </div>
      </div>

<NotificationList notifications={notifications ?? []} />
      </main>
      <Footer />
    </div>
  );
}
