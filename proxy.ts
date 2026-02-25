import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "bombino-crm-jwt-secret-2024-internal",
);

// Paths that do NOT require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Always allow Next.js internals & static assets ───────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const token = request.cookies.get("bombino_session")?.value;

  // ── Already logged in → redirect away from /login ────────────────────────
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {
        // Token invalid — let them through to login (cookie will be cleared on next API call)
      }
    }
    return NextResponse.next();
  }

  // ── Public API routes ─────────────────────────────────────────────────────
  if (isPublic) {
    return NextResponse.next();
  }

  // ── All other routes require a valid JWT ─────────────────────────────────
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized — please log in" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    // Token is invalid or expired
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: "Session expired — please log in again" },
        { status: 401 },
      );
      res.cookies.delete("bombino_session");
      return res;
    }

    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("bombino_session");
    return res;
  }
}

export const config = {
  // Match every route except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
