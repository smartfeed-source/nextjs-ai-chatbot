import { type NextRequest, NextResponse } from "next/server";
import { getQrStatus } from "./lib/qr-store";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow QR login flow without forcing guest auth redirects
  if (["/login", "/register"].includes(pathname)) {
    return NextResponse.next();
  }

  // If a QR token cookie exists and is logged in, allow; otherwise pass through
  const userToken = request.cookies.get("user_token")?.value;
  if (userToken && getQrStatus(userToken) === "login") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
