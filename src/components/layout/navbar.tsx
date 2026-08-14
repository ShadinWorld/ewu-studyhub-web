import Link from "next/link";
import { Bell, GraduationCap, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/layout/user-menu";
import type { UserRole } from "@/types/database.types";

export async function Navbar() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let unreadNotificationCount = 0;
  let profile: { full_name: string | null; avatar_url: string | null; role: UserRole; is_seller: boolean; phone_number: string | null } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role, is_seller, phone_number")
      .eq("id", user.id)
      .single();
    profile = data;
    isAdmin = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("is_read", false);
    unreadNotificationCount = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between gap-2 sm:h-16">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-bold text-base sm:text-lg">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <span className="truncate">EWU StudyHub</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/search" className="text-muted-foreground transition-colors hover:text-foreground">Browse</Link>
          <Link href="/departments" className="text-muted-foreground transition-colors hover:text-foreground">Departments</Link>
          <Link href="/courses" className="text-muted-foreground transition-colors hover:text-foreground">Courses</Link>
          <Link href="/trending" className="text-muted-foreground transition-colors hover:text-foreground">Trending</Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="icon" asChild aria-label="Search" className="h-9 w-9 sm:h-10 sm:w-10">
            <Link href="/search"><Search className="h-5 w-5" /></Link>
          </Button>
          {user && (
            <Button variant="ghost" size="icon" asChild aria-label={unreadNotificationCount ? `Notifications, ${unreadNotificationCount} unread` : "Notifications"} className="relative hidden h-10 w-10 sm:inline-flex">
              <Link href="/notifications">
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </Link>
            </Button>
          )}
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <Button variant="destructive" size="sm" asChild className="hidden md:inline-flex">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
                <Link href="/dashboard/upload"><Upload className="mr-2 h-4 w-4" />Upload</Link>
              </Button>
              <Button size="sm" asChild className="hidden md:inline-flex">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserMenu
                fullName={profile?.full_name ?? null}
                email={user.email ?? null}
                phoneNumber={profile?.phone_number ?? null}
                avatarUrl={profile?.avatar_url ?? null}
                role={profile?.role ?? "student"}
                isSeller={Boolean(profile?.is_seller || profile?.role === "seller")}
              />
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild><Link href="/login">Log in</Link></Button>
              <Button size="sm" asChild><Link href="/signup">Sign up</Link></Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
