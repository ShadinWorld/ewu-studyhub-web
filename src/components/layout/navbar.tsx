import Link from "next/link";
import { GraduationCap, Search, Upload } from "lucide-react";
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
  let profile: { full_name: string | null; avatar_url: string | null; role: UserRole; is_seller: boolean } | null =
    null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role, is_seller")
      .eq("id", user.id)
      .single();
    profile = data;
    isAdmin = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap className="h-6 w-6 text-primary" />
          EWU StudyHub
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
            Browse
          </Link>
          <Link href="/departments" className="text-muted-foreground hover:text-foreground transition-colors">
            Departments
          </Link>
          <Link href="/courses" className="text-muted-foreground hover:text-foreground transition-colors">
            Courses
          </Link>
          <Link href="/trending" className="text-muted-foreground hover:text-foreground transition-colors">
            Trending
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild aria-label="Search">
            <Link href="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <Button variant="destructive" size="sm" asChild>
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserMenu
                fullName={profile?.full_name ?? null}
                email={user.email ?? null}
                avatarUrl={profile?.avatar_url ?? null}
                role={profile?.role ?? "student"}
                isSeller={Boolean(profile?.is_seller || profile?.role === "seller")}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
