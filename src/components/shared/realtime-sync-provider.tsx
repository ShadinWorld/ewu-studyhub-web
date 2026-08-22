"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PUBLIC_TABLES = [
  "courses",
  "departments",
  "announcements",
  "academic_documents",
  "deadlines",
] as const;

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (!mounted) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (mounted) router.refresh();
      }, 350);
    };

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let role: string | null = null;
      let isSeller = false;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role,is_seller")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role ?? null;
        isSeller = Boolean(profile?.is_seller || role === "seller");
      }

      const channel = supabase.channel(`studyhub-live-sync-${user?.id ?? "public"}-${Date.now()}`);

      for (const table of PUBLIC_TABLES) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          scheduleRefresh,
        );
      }

      if (user) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `profile_id=eq.${user.id}` },
          scheduleRefresh,
        );
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "purchases", filter: `buyer_id=eq.${user.id}` },
          scheduleRefresh,
        );
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "resource_requests", filter: `user_id=eq.${user.id}` },
          scheduleRefresh,
        );
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          scheduleRefresh,
        );

        if (isSeller) {
          channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table: "payouts", filter: `seller_id=eq.${user.id}` },
            scheduleRefresh,
          );
          channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table: "purchases" },
            scheduleRefresh,
          );
        }

        if (role === "admin" || role === "super_admin") {
          for (const table of ["notifications", "purchases", "payouts", "resource_requests", "profiles"] as const) {
            channel.on(
              "postgres_changes",
              { event: "*", schema: "public", table },
              scheduleRefresh,
            );
          }
        }
      }

      channel.subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    void setup().then((fn) => {
      cleanup = fn;
    });

    const onFocus = () => scheduleRefresh();
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      if (refreshTimer) clearTimeout(refreshTimer);
      cleanup?.();
    };
  }, [router]);

  return children;
}
