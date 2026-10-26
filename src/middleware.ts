import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

function parseJwtPayload(
  token?: string,
  checkExp: boolean = true
): { role?: string; userId?: string; email?: string; exp?: number } | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Edge-safe base64url decoding
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonPayload);

    // Verify token expiration if requested
    if (checkExp && payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const nextAuthUser = req.auth?.user;

  // Check HttpOnly access_token cookie
  const accessTokenCookie = req.cookies.get("access_token")?.value;
  let validAccessToken = parseJwtPayload(accessTokenCookie, true);
  let rawAccessToken = parseJwtPayload(accessTokenCookie, false);

  // Check HttpOnly refresh_token cookie
  const refreshTokenCookie = req.cookies.get("refresh_token")?.value;
  const validRefreshToken = parseJwtPayload(refreshTokenCookie, true);

  // User is authenticated if valid access_token, valid refresh_token, OR NextAuth session exists
  const isAuthenticated =
    !!validAccessToken || !!validRefreshToken || !!nextAuthUser;

  const userRole =
    validAccessToken?.role ||
    rawAccessToken?.role ||
    (nextAuthUser as { role?: string })?.role;

  const applyCookies = (res: NextResponse) => res;

  if (pathname.startsWith("/admin")) {
    // /admin or /admin/ direct navigation
    if (pathname === "/admin" || pathname === "/admin/") {
      const url = req.nextUrl.clone();
      if (isAuthenticated && (userRole === "ADMIN" || userRole === "STAFF")) {
        url.pathname = "/admin/dashboard";
      } else {
        url.pathname = "/admin/login";
      }
      url.search = "";
      return applyCookies(NextResponse.redirect(url));
    }

    if (pathname === "/admin/login") {
      if (isAuthenticated && (userRole === "ADMIN" || userRole === "STAFF")) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/dashboard";
        url.search = "";
        return applyCookies(NextResponse.redirect(url));
      }
      return applyCookies(NextResponse.next());
    }

    if (!isAuthenticated || (userRole !== "ADMIN" && userRole !== "STAFF")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return applyCookies(NextResponse.redirect(url));
    }

    return applyCookies(NextResponse.next());
  }

  const protectedCustomerRoutes = [
    "/cart",
    "/checkout",
    "/orders",
    "/profile",
    "/wishlist",
  ];
  const isProtectedCustomer = protectedCustomerRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedCustomer && !isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
    return applyCookies(NextResponse.redirect(url));
  }

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    // If the user arrived with a callbackUrl (e.g. redirected due to 401 / expired session) or auth error,
    // do not force-redirect away; allow them to view the login form and re-authenticate.
    if (req.nextUrl.searchParams.has("callbackUrl") || req.nextUrl.searchParams.has("error")) {
      return applyCookies(NextResponse.next());
    }

    const url = req.nextUrl.clone();
    url.search = "";
    if (userRole === "ADMIN" || userRole === "STAFF") {
      url.pathname = "/admin/dashboard";
    } else {
      url.pathname = "/";
    }
    return applyCookies(NextResponse.redirect(url));
  }

  return applyCookies(NextResponse.next());
});

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/cart",
    "/checkout/:path*",
    "/orders/:path*",
    "/profile",
    "/profile/:path*",
    "/wishlist",
    "/login",
    "/register",
  ],
};
