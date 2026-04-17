import { NextRequest, NextResponse } from 'next/server';

export function validateCronSecret(request: NextRequest): boolean {
    const secret = request.headers.get('x-cron-secret');
    return !!secret && secret === process.env.CRON_SECRET;
}

export function cronUnauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
