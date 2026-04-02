import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/error-response';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const company = await prisma.company.findFirst({
            where: { id, users: { some: { id: auth.userId } } },
            select: { metadata: true },
        });
        if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

        const theme = (company.metadata as any)?.theme ?? {};
        return NextResponse.json({ theme });
    } catch (error) {
        return apiError('Error al obtener tema', 500, error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const company = await prisma.company.findFirst({
            where: { id, users: { some: { id: auth.userId } } },
            select: { metadata: true },
        });
        if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });

        const body = await request.json();

        // Validate hex colors
        const colorFields = ['primaryColor', 'sidebarBg', 'sidebarFg'] as const;
        for (const field of colorFields) {
            if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
                if (!HEX_COLOR_RE.test(body[field])) {
                    return NextResponse.json({ error: `Color inválido: ${field} debe ser formato #RRGGBB` }, { status: 400 });
                }
            }
        }

        const existingMetadata = (company.metadata as Record<string, unknown>) ?? {};
        const existingTheme = (existingMetadata.theme as Record<string, unknown>) ?? {};

        const newTheme = {
            ...existingTheme,
            ...(body.primaryColor !== undefined ? { primaryColor: body.primaryColor || null } : {}),
            ...(body.sidebarBg !== undefined ? { sidebarBg: body.sidebarBg || null } : {}),
            ...(body.sidebarFg !== undefined ? { sidebarFg: body.sidebarFg || null } : {}),
            ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl || null } : {}),
            ...(body.fontFamily !== undefined ? { fontFamily: body.fontFamily || null } : {}),
        };

        const updatedMetadata = { ...existingMetadata, theme: newTheme };

        await prisma.company.update({
            where: { id },
            data: { metadata: updatedMetadata },
        });

        return NextResponse.json({ theme: newTheme });
    } catch (error) {
        return apiError('Error al guardar tema', 500, error);
    }
}
