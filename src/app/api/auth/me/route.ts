import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return NextResponse.json({ user: { id: auth.userId, email: auth.email, role: auth.role } });
}
