import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Auth routes өөрсдөө ажиллаг
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    // ✅ AUTH_SECRET эсвэл NEXTAUTH_SECRET аль нь байгаагаар ажиллуулна
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // ✅ Guest-ийг бүрэн устгасан: token байхгүй бол LOGIN руу явуулна
  if (!token) {
    // API дуудлагуудыг redirect хийхгүй (stream эвдэрдэг).
    // API бол зүгээр 401 буцаа.
    if (pathname.startsWith("/api/")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  // guest concept байхгүй болсон тул энэ шалгалт хэрэггүй.
  // Гэхдээ үлдээе гэвэл зүгээр — одоо token байгаа тул энд орж ирэхгүй.
  if (token && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
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
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
