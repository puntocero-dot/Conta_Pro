import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, getCompanyIdFromRequest } from '@/lib/auth/jwt';

// ── GET: Obtener expediente KYC de un cliente ───────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    if (clientId) {
      // Obtener KYC específico
      const kyc = await prisma.kYCRecord.findUnique({
        where: { clientId_companyId: { clientId, companyId } },
      });

      const client = await prisma.accountClient.findUnique({
        where: { id: clientId },
        select: { name: true, nit: true, dui: true, type: true },
      });

      return NextResponse.json({ kyc, client });
    }

    // Listar todos los KYC de la empresa
    const where: Record<string, unknown> = { companyId };
    if (status) where.status = status;

    const records = await prisma.kYCRecord.findMany({
      where,
      include: {
        client: {
          select: { name: true, nit: true, dui: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Clientes sin KYC
    const clientsWithoutKYC = await prisma.accountClient.findMany({
      where: {
        companyId,
        kycRecords: { none: {} },
      },
      select: { id: true, name: true, nit: true, type: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ records, clientsWithoutKYC });
  } catch (error) {
    console.error('GET /api/compliance/kyc error:', error);
    return NextResponse.json({ error: 'Error al obtener KYC' }, { status: 500 });
  }
}

// ── POST: Crear o actualizar expediente KYC ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const companyId = await getCompanyIdFromRequest(request, auth.userId);
    if (!companyId) return NextResponse.json({ error: 'Sin empresa' }, { status: 400 });

    const body = await request.json();
    const {
      clientId, riskLevel, sourceOfFunds, occupation,
      annualIncome, politicallyExposed, kycFormData,
      documents, expiresAt, notes, status: kycStatus,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId es requerido' }, { status: 400 });
    }

    // Verificar que el cliente existe y pertenece a la empresa
    const client = await prisma.accountClient.findFirst({
      where: { id: clientId, companyId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Upsert: crear o actualizar
    const kyc = await prisma.kYCRecord.upsert({
      where: { clientId_companyId: { clientId, companyId } },
      create: {
        clientId,
        companyId,
        riskLevel: riskLevel || 'LOW',
        sourceOfFunds,
        occupation,
        annualIncome: annualIncome ? parseFloat(annualIncome) : null,
        politicallyExposed: politicallyExposed || false,
        kycFormData: kycFormData || null,
        documents: documents || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes,
        status: kycStatus || 'PENDING',
        ...(kycStatus === 'VERIFIED' ? {
          verifiedAt: new Date(),
          verifiedBy: auth.userId,
        } : {}),
      },
      update: {
        riskLevel: riskLevel || undefined,
        sourceOfFunds,
        occupation,
        annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
        politicallyExposed: politicallyExposed ?? undefined,
        kycFormData: kycFormData || undefined,
        documents: documents || undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        notes,
        status: kycStatus || undefined,
        ...(kycStatus === 'VERIFIED' ? {
          verifiedAt: new Date(),
          verifiedBy: auth.userId,
        } : {}),
      },
    });

    return NextResponse.json({ kyc }, { status: 201 });
  } catch (error) {
    console.error('POST /api/compliance/kyc error:', error);
    return NextResponse.json({ error: 'Error al guardar KYC' }, { status: 500 });
  }
}
