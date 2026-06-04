import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') return NextResponse.next();

  const slug = pathname.replace(/^\//, '');
  if (/^\d+$/.test(slug)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('evento', slug);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon|IMG).*)'],
};
