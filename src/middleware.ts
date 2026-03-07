import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth/jwt-edge';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Definir rutas protegidas
    const isDashboardRoute = pathname.startsWith('/dashboard') ||
        pathname.startsWith('/companies') ||
        pathname.startsWith('/clients') ||
        pathname.startsWith('/transactions') ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/invisible-ledger') ||
        pathname.startsWith('/security-dashboard');

    const isPublicRoute = pathname === '/login' || pathname === '/register';

    // 2. Obtener token de la cookie
    const token = request.cookies.get('conta2go_token')?.value;
    const auth = token ? await verifyTokenEdge(token) : null;

    // 3. Redirección si no está autenticado
    if (isDashboardRoute && !auth) {
        const url = new URL('/login', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
    }

    // 4. Redirección si ya está autenticado e intenta ir a login/register
    if (isPublicRoute && auth) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 5. RBAC Básico: Solo SUPER_ADMIN entra a security-dashboard
    if (pathname.startsWith('/security-dashboard') && auth?.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const response = NextResponse.next();

    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.pwnedpasswords.com;"
    );
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
