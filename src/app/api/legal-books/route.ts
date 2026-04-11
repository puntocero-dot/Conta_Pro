import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { LEGAL_BOOK_LABELS } from '@/lib/sv-legal-config';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // ACTAS, ACCIONISTAS, DIARIO, MAYOR

    const books = await prisma.legalBook.findMany({
      where: {
        companyId,
        ...(type ? { type } : {}),
      },
      orderBy: [{ type: 'asc' }, { date: 'desc' }],
    });

    const bookTypes = Object.entries(LEGAL_BOOK_LABELS).map(([key, label]) => ({
      type: key,
      label,
      count: books.filter(b => b.type === key).length,
    }));

    return NextResponse.json({ books, bookTypes });
  } catch (error) {
    console.error('GET /api/legal-books error:', error);
    return NextResponse.json({ error: 'Error al obtener libros legales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const body = await request.json();
    const { type, title, content, folioNumber, date } = body;

    if (!type || !title || !content || !date) {
      return NextResponse.json(
        { error: 'Campos requeridos: tipo, título, contenido, fecha' },
        { status: 400 }
      );
    }

    const book = await prisma.legalBook.create({
      data: {
        companyId,
        type,
        title,
        content: typeof content === 'string' ? { text: content } : content,
        folioNumber: folioNumber ? parseInt(folioNumber) : null,
        date: new Date(date),
      },
    });

    return NextResponse.json({ book }, { status: 201 });
  } catch (error) {
    console.error('POST /api/legal-books error:', error);
    return NextResponse.json({ error: 'Error al crear libro legal' }, { status: 500 });
  }
}
