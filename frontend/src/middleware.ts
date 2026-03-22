import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ADMIN_ROUTES = ["/upload", "/drafts", "/tags", "/analytics"];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
    if (isAdminRoute && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/library", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/library/:path*",
    "/bookmarks/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/article/:path*",
    "/upload/:path*",
    "/drafts/:path*",
    "/tags/:path*",
    "/analytics/:path*",
  ],
};
