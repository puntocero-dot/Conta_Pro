import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { randomInt } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);

    if (!auth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Generar un token de 6 dígitos
    const token = randomInt(100000, 999999).toString();

    // Guardar el token en el metadata del usuario
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    const currentMetadata = (user?.metadata as any) || {};

    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        metadata: {
          ...currentMetadata,
          telegramLinkToken: token,
          telegramLinkTokenExpires: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
        }
      }
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error in /api/auth/telegram-link:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
    try {
      const auth = await getAuthFromRequest(request);
      if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { telegramId: true }
      });
  
      return NextResponse.json({ linked: !!user?.telegramId });
    } catch (error) {
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
