import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  // Email links work whether or not the person is signed in.
  const isEmailLinkRoute = ["/verify-email", "/forgot-pin", "/reset-pin"].includes(pathname);
  const isPublicRoute = pathname === "/" || isAuthRoute || isEmailLinkRoute;

  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Only page loads bounce a signed-in user off the log-in page; server
  // actions posted from it (like remembering the device just after signing in)
  // must be left alone.
  if (isLoggedIn && isAuthRoute && req.method === "GET") {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)"],
};
