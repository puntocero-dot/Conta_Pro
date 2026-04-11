import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth/jwt-edge';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. CSRF protection: peticiones mutantes a la API deben incluir X-Requested-With
    if (
        pathname.startsWith('/api/') &&
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
    ) {
        // Excluir rutas públicas de auth (login/register no usan el header)
        const isPublicAuthRoute =
            pathname === '/api/auth/login' ||
            pathname === '/api/auth/register' ||
            pathname === '/api/auth/logout';

        if (!isPublicAuthRoute) {
            const requestedWith = request.headers.get('X-Requested-With');
            if (requestedWith !== 'XMLHttpRequest') {
                return NextResponse.json(
                    { error: 'Solicitud no autorizada' },
                    { status: 403 }
                );
            }
        }
    }

    // 2. Definir rutas protegidas
    const isDashboardRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/companies') ||
        pathname.startsWith('/clients') ||
        pathname.startsWith('/transactions') ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/invisible-ledger') ||
        pathname.startsWith('/security-dashboard') ||
        pathname.startsWith('/security');

    const isPublicRoute = pathname === '/login' || pathname === '/register';

    // 3. Obtener token de la cookie
    const token = request.cookies.get('contapro_token')?.value;
    const auth = token ? await verifyTokenEdge(token) : null;

    // 4. Redirección si no está autenticado
    if (isDashboardRoute && !auth) {
        const url = new URL('/login', request.url);
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
    }

    // 5. Redirección si ya está autenticado e intenta ir a login/register
    if (isPublicRoute && auth) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 6. RBAC: Solo SUPER_ADMIN accede a security-dashboard, users y alerts
    //    AUDITOR puede acceder a audit-logs
    const isAuditLogsPage = pathname.startsWith('/security/audit-logs');
    const isRestrictedSecurityPage =
        pathname.startsWith('/security-dashboard') ||
        pathname.startsWith('/security/users') ||
        pathname.startsWith('/security/alerts') ||
        (pathname.startsWith('/security') && !isAuditLogsPage);

    if (isRestrictedSecurityPage && auth?.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isAuditLogsPage && auth?.role !== 'SUPER_ADMIN' && auth?.role !== 'AUDITOR') {
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
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' blob: data: https://*.supabase.co",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://api.pwnedpasswords.com https://*.supabase.co",
            "frame-ancestors 'none'",
        ].join('; ')
    );
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
