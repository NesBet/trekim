import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-edge";

const publicPaths = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/paystack",
  "/api/products",
  "/login",
  "/signup",
  "/_next",
  "/favicon",
  "/images",
  "/inventory",
  "/payment",
];

const exactPublicPaths = ["/"];

const adminPaths = ["/admin", "/api/users", "/api/products"];
const salespersonPaths = ["/dashboard"];
const customerPaths = ["/cart"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    exactPublicPaths.includes(pathname) ||
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/")
    );

  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get("trekim_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("trekim_token", "", { maxAge: 0 });
    return response;
  }

  const isAdminPath = adminPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
  const isSalespersonPath = salespersonPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
  const isCustomerPath = customerPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isAdminPath && payload.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isSalespersonPath && !["SALESPERSON", "ADMIN"].includes(payload.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-email", payload.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
