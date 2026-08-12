import Link from "next/link";
import { Bell, CheckCircle2, Clock3, DollarSign, ShieldCheck, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

function iconFor(type: string) {
  if (type === "purchase_completed" || type === "payout_completed" || type === "upload_approved") {
    return <CheckCircle2 className="h-5 w-5 text-primary" />;
  }
  if (type === "report_update") {
    return <XCircle className="h-5 w-5 text-destructive" />;
  }
  return <Clock3 className="h-5 w-5 text-amber-500" />;
}

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
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">Mark all as read</Button>
          </form>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {notifications?.length ? notifications.map((notification) => (
          <Card key={notification.id} className={!notification.is_read ? "border-primary/40 bg-primary/[0.03]" : ""}>
            <CardContent className="flex gap-4 p-4">
              <div className="mt-0.5 shrink-0">{iconFor(notification.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-semibold">{notification.title}</p>
                  <time className="text-xs text-muted-foreground" dateTime={notification.created_at}>
                    {new Date(notification.created_at).toLocaleString()}
                  </time>
                </div>
                {notification.body && <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {notification.link && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={notification.link}>Open</Link>
                    </Button>
                  )}
                  {!notification.is_read && (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="notification_id" value={notification.id} />
                      <Button type="submit" size="sm" variant="ghost">Mark as read</Button>
                    </form>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No notifications yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Payment, seller and marketplace updates will appear here.</p>
            </CardContent>
          </Card>
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
}
