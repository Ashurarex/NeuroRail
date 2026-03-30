import { NextResponse, type NextRequest } from "next/server";

const AUTH_TOKEN_COOKIE = "nr_token";
const AUTH_ROLE_COOKIE = "nr_role";

function redirectToLogin(request: NextRequest) {
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE)?.value;

  if (path.startsWith("/user")) {
    if (!token) {
      return redirectToLogin(request);
    }
    if (role !== "user") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  if (path.startsWith("/admin")) {
    if (!token) {
      return redirectToLogin(request);
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/user/home", request.url));
    }
  }

  if ((path === "/login" || path === "/signup") && token) {
    const destination = role === "admin" ? "/admin/dashboard" : "/user/home";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/admin/:path*", "/login", "/signup"],
};
