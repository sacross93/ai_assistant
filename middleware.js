import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-it');

export async function middleware(request) {
    const session = request.cookies.get('session');
    const path = request.nextUrl.pathname;

    // 1. Verify Session
    let payload = null;
    if (session) {
        try {
            const verified = await jwtVerify(session.value, SECRET_KEY);
            payload = verified.payload;
        } catch (error) {
            // Invalid token -> redirect to login (unless already there)
            // if ( !path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/api') ) {
            //   return NextResponse.redirect(new URL('/login', request.url));
            // }
        }
    }

    const isAuth = !!payload;
    const isPublicPath = path === '/' || path === '/login' || path === '/signup';
    const isAdminPath = path.startsWith('/admin');

    // If trying to access public path while logged in -> redirect to chat (not landing)
    if (isPublicPath && isAuth && path !== '/') {
        return NextResponse.redirect(new URL('/chat', request.url));
    }

    // If trying to access protected path while logged out -> redirect to login
    if (!isPublicPath && !isAuth && !path.startsWith('/api') && path !== '/favicon.ico' && !path.startsWith('/_next')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Admin Protection
    if (isAdminPath && payload?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes - handled separately or allowed)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images (public static images)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
    ],
};
