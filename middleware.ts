import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // const { pathname } = request.nextUrl;
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
}
