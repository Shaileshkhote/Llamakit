import { NextResponse, type NextRequest } from "next/server"

const sessionCookieName = "llamakit_session"

const publicApiPrefixes = ["/api/auth", "/api/webhooks/github", "/api/github/installations/callback"]

function requiresSession(pathname: string) {
  if (pathname.startsWith("/dashboard")) return true
  if (pathname.startsWith("/api/projects")) return true
  if (pathname.startsWith("/api/github")) return true
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (requiresSession(pathname) && !request.cookies.get(sessionCookieName)?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/api/projects/:path*", "/api/github/:path*"]
}
