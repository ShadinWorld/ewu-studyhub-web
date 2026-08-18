import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_EXEMPT = ["/login", "/signup", "/account", "/api/auth/callback"];
const PUBLIC_AUTHENTICATED_PREFIXES = ["/courses", "/departments", "/course"];

function isPublicAuthenticatedPath(path: string) {
  if (path === "/") return true;
  return PUBLIC_AUTHENTICATED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const exempt = AUTH_EXEMPT.some((p) => path === p || path.startsWith(`${p}/`));

  const requiresAuth =
    path.startsWith("/dashboard") ||
    path.startsWith("/support") ||
    path.startsWith("/purchases") ||
    path.startsWith("/saved") ||
    path.startsWith("/notifications") ||
    path.startsWith("/checkout") ||
    path.startsWith("/admin");

  if (!user && !exempt && requiresAuth) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Public browsing (home/course discovery) stays fast: no profile DB lookup.
  if (user && !exempt && !isPublicAuthenticatedPath(path)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_number, role, account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.account_status && profile.account_status !== "active" && !["admin", "super_admin"].includes(profile.role)) {
      const url = new URL("/account", request.url);
      url.searchParams.set("status", profile.account_status);
      return NextResponse.redirect(url);
    }

    if (requiresAuth && !profile?.phone_number && !["admin", "super_admin"].includes(profile?.role ?? "")) {
      const url = new URL("/account", request.url);
      url.searchParams.set("next", path);
      url.searchParams.set("gate", "1");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
