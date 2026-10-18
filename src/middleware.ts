import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge-safe auth gate (no full NextAuth import — that was crashing on Vercel
 * with MIDDLEWARE_INVOCATION_FAILED).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Sign-in pages bounce a signed-in user home; /reset, /forgot and /privacy
  // stay open to everyone (a reset link must work even if some other login is
  // active).
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOpen =
    isAuthPage ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/privacy");

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isLoggedIn = !!token;

  if (!isLoggedIn && !isOpen) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
