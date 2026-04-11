import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';
import { getComplianceStats, generateAdminBypassToken, AML_CONFIG } from '@/lib/sv-compliance';

// ── GET: Listar alertas y estadísticas de cumplimiento ──────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');       // PENDING, REVIEWED, REPORTED
    const alertType = searchParams.get('alertType'); // THRESHOLD_EXCEEDED, etc.
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: Record<string, unknown> = { companyId };
    if (status) where.status = status;
    if (alertType) where.alertType = alertType;

    const [alerts, total, stats] = await Promise.all([
      prisma.complianceAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.complianceAlert.count({ where }),
      getComplianceStats(companyId),
    ]);

    return NextResponse.json({
      alerts,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats,
      config: AML_CONFIG,
    });
  } catch (error) {
    console.error('GET /api/compliance error:', error);
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 });
  }
}

// ── POST: Generar token de bypass o crear alerta manual ──────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Solo SUPER_ADMIN y CONTADOR pueden generar tokens
    if (!['SUPER_ADMIN', 'CONTADOR'].includes(auth.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para esta acción' },
        { status: 403 }
      );
    }

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const body = await request.json();
    const { action } = body;

    if (action === 'GENERATE_BYPASS_TOKEN') {
      const { reason } = body;
      if (!reason) {
        return NextResponse.json({ error: 'Se requiere una razón para el bypass' }, { status: 400 });
      }

      const token = await generateAdminBypassToken(companyId, auth.userId, reason);
      return NextResponse.json({
        token,
        expiresIn: '1 hora',
        message: 'Token válido por 1 hora. Use este token al registrar la transacción.',
      }, { status: 201 });
    }

    if (action === 'CREATE_MANUAL_ALERT') {
      const { description, amount } = body;
      if (!description) {
        return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 });
      }

      const alert = await prisma.complianceAlert.create({
        data: {
          companyId,
          alertType: 'MANUAL',
          amount: amount ?? 0,
          description,
          status: 'PENDING',
        },
      });

      return NextResponse.json({ alert }, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/compliance error:', error);
    return NextResponse.json({ error: 'Error en cumplimiento' }, { status: 500 });
  }
}

// ── PATCH: Actualizar estado de una alerta ──────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    if (!['SUPER_ADMIN', 'CONTADOR'].includes(auth.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const body = await request.json();
    const { alertId, status, reportNumber, notes } = body;

    if (!alertId || !status) {
      return NextResponse.json({ error: 'alertId y status requeridos' }, { status: 400 });
    }

    const validStatuses = ['REVIEWED', 'REPORTED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status debe ser uno de: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const alert = await prisma.complianceAlert.update({
      where: { id: alertId },
      data: {
        status,
        reviewedBy: auth.userId,
        reviewedAt: new Date(),
        ...(reportNumber ? { reportNumber } : {}),
        ...(notes ? {
          metadata: {
            ...(typeof (await prisma.complianceAlert.findUnique({ where: { id: alertId }, select: { metadata: true } }))?.metadata === 'object'
              ? (await prisma.complianceAlert.findUnique({ where: { id: alertId }, select: { metadata: true } }))?.metadata as object
              : {}),
            reviewNotes: notes,
          },
        } : {}),
      },
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('PATCH /api/compliance error:', error);
    return NextResponse.json({ error: 'Error al actualizar alerta' }, { status: 500 });
  }
}
