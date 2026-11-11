/**
 * Session refresh + admin route gate. Refreshes the Supabase Auth session on
 * every request (so server components see a valid token) and redirects
 * unauthenticated users away from /admin. Role authorization is still enforced
 * server-side in each admin handler (Blueprint §6, §14) — this is only a
 * first-line visibility gate.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Redirect legacy /cleaner/* routes cleanly to /pro/*.
  if (path === "/cleaner" || path.startsWith("/cleaner/")) {
    const proUrl = request.nextUrl.clone();
    proUrl.pathname = path === "/cleaner" ? "/pro" : `/pro${path.slice("/cleaner".length)}`;
    return NextResponse.redirect(proUrl, 308);
  }

  const isAdminArea = path.startsWith("/admin") && path !== "/admin/login";
  const isProArea =
    (path === "/pro" || path.startsWith("/pro/")) &&
    path !== "/pro/login" &&
    !path.startsWith("/pro/onboard");

  if ((isAdminArea || isProArea) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = isProArea ? "/pro/login" : "/admin/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run on admin/pro/legacy-cleaner pages; skip static assets. API routes enforce their own
  // auth via requireAdmin/requireCleaner.
  matcher: ["/admin/:path*", "/pro/:path*", "/cleaner/:path*"],
};
