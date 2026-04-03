/**
 * SEED: App Factory S.A. de C.V.
 * Empresa ficticia de desarrollo de software en El Salvador
 * Genera 2 años de historial (2024-2025) con todos los módulos
 */
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────
const usd = (n) => Math.round(n * 100) / 100;
const rnd = (min, max) => usd(Math.random() * (max - min) + min);
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const d = (y, m, day) => new Date(y, m - 1, day);

// Simple encrypt stub (misma lógica que el app — usa AES-256-GCM)
// Para el seed usamos un hash simple del NIT
function fakeEncrypt(val) {
  return 'SEED:' + Buffer.from(val).toString('base64');
}

// ─── Catálogo SV (subconjunto) ────────────────────────────────────────────────
const ACCOUNTS = [
  { code: '1101', name: 'Caja y Bancos',                       type: 'ACTIVO' },
  { code: '1102', name: 'Cuentas por Cobrar Clientes',         type: 'ACTIVO' },
  { code: '1105', name: 'IVA Crédito Fiscal',                  type: 'ACTIVO' },
  { code: '1106', name: 'Pago a Cuenta por Recuperar',         type: 'ACTIVO' },
  { code: '1206', name: 'Equipo de Cómputo',                   type: 'ACTIVO' },
  { code: '1206D', name: 'Depreciación Acum. Cómputo',         type: 'ACTIVO' },
  { code: '1205', name: 'Mobiliario y Equipo de Oficina',      type: 'ACTIVO' },
  { code: '1205D', name: 'Depreciación Acum. Mobiliario',      type: 'ACTIVO' },
  { code: '1204', name: 'Vehículos',                           type: 'ACTIVO' },
  { code: '1204D', name: 'Depreciación Acum. Vehículos',       type: 'ACTIVO' },
  { code: '2101', name: 'Cuentas por Pagar Proveedores',       type: 'PASIVO' },
  { code: '2103', name: 'AFP por Pagar',                       type: 'PASIVO' },
  { code: '2104', name: 'ISSS por Pagar',                      type: 'PASIVO' },
  { code: '2105', name: 'INSAFORP por Pagar',                  type: 'PASIVO' },
  { code: '2106', name: 'ISR Retenido por Pagar',              type: 'PASIVO' },
  { code: '2108', name: 'IVA Débito Fiscal',                   type: 'PASIVO' },
  { code: '2110', name: 'Sueldos por Pagar',                   type: 'PASIVO' },
  { code: '2111', name: 'Vacaciones por Pagar',                type: 'PASIVO' },
  { code: '2112', name: 'Aguinaldo por Pagar',                 type: 'PASIVO' },
  { code: '2113', name: 'Indemnización por Pagar',             type: 'PASIVO' },
  { code: '2201', name: 'Préstamos Bancarios LP',              type: 'PASIVO' },
  { code: '3101', name: 'Capital Social',                      type: 'PATRIMONIO' },
  { code: '3103', name: 'Utilidades Retenidas',                type: 'PATRIMONIO' },
  { code: '3104', name: 'Utilidad del Ejercicio',              type: 'PATRIMONIO' },
  { code: '4102', name: 'Prestación de Servicios',             type: 'INGRESO' },
  { code: '4104', name: 'Otros Ingresos',                      type: 'INGRESO' },
  { code: '6101', name: 'Sueldos y Salarios',                  type: 'GASTO' },
  { code: '6102', name: 'Cargas Sociales',                     type: 'GASTO' },
  { code: '6103', name: 'Vacaciones',                          type: 'GASTO' },
  { code: '6104', name: 'Aguinaldo',                           type: 'GASTO' },
  { code: '6105', name: 'Indemnizaciones',                     type: 'GASTO' },
  { code: '6107', name: 'Alquiler',                            type: 'GASTO' },
  { code: '6108', name: 'Energía Eléctrica',                   type: 'GASTO' },
  { code: '6110', name: 'Telecomunicaciones',                  type: 'GASTO' },
  { code: '6111', name: 'Papelería y Útiles',                  type: 'GASTO' },
  { code: '6112', name: 'Publicidad y Marketing',              type: 'GASTO' },
  { code: '6113', name: 'Mantenimiento',                       type: 'GASTO' },
  { code: '6116', name: 'Depreciaciones',                      type: 'GASTO' },
  { code: '6201', name: 'Intereses Bancarios',                 type: 'GASTO' },
  { code: '6302', name: 'Gastos Varios',                       type: 'GASTO' },
];

// ─── ISR mensual simplificado (Art.154) ──────────────────────────────────────
function calcISRMensual(bruto) {
  const annual = bruto * 12;
  let isr = 0;
  if (annual <= 4064) isr = 0;
  else if (annual <= 9142.86) isr = (annual - 4064) * 0.1 + 212.12;
  else if (annual <= 22857.14) isr = (annual - 9142.86) * 0.2 + 720;
  else isr = (annual - 22857.14) * 0.3 + 3462.86;
  return usd(Math.max(0, isr / 12));
}

async function main() {
  console.log('🌱 Iniciando seed de App Factory S.A. de C.V.\n');

  // ── 1. Obtener el SUPER_ADMIN (primer usuario) ──────────────────────────────
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) {
    console.error('❌ No hay usuario SUPER_ADMIN. Crea uno primero en /register');
    process.exit(1);
  }
  console.log(`✅ Usuario admin: ${admin.email}`);

  // ── 2. Crear empresa ────────────────────────────────────────────────────────
  const existing = await prisma.company.findFirst({ where: { name: 'App Factory' } });
  if (existing) {
    console.log(`ℹ️  Empresa "App Factory" ya existe (id: ${existing.id}). Eliminando datos previos...`);
    // Limpiar datos previos de esta empresa para re-sembrar limpio
    await prisma.$executeRawUnsafe(`DELETE FROM "AssetDepreciation" WHERE "assetId" IN (SELECT id FROM "FixedAsset" WHERE "companyId" = '${existing.id}')`);
    await prisma.$executeRawUnsafe(`DELETE FROM "FixedAsset" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "LoanPayment" WHERE "loanId" IN (SELECT id FROM "Loan" WHERE "companyId" = '${existing.id}')`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Loan" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Provision" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "PayrollEmployee" WHERE "payrollId" IN (SELECT id FROM "Payroll" WHERE "companyId" = '${existing.id}')`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Payroll" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "JournalEntryLine" WHERE "journalEntryId" IN (SELECT id FROM "JournalEntry" WHERE "companyId" = '${existing.id}')`);
    await prisma.$executeRawUnsafe(`DELETE FROM "JournalEntry" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Transaction" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Account" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "AccountClient" WHERE "companyId" = '${existing.id}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Category" WHERE "companyId" = '${existing.id}'`);
    await prisma.company.delete({ where: { id: existing.id } });
    console.log('🗑️  Datos previos eliminados.');
  }

  const company = await prisma.company.create({
    data: {
      name: 'App Factory',
      taxId: fakeEncrypt('0614-190195-101-5'),
      country: 'SV',
      metadata: {
        legalForm: 'S.A. de C.V.',
        nrc: '123456-7',
        nit: '0614-190195-101-5',
        address: 'Colonia Escalón, Calle La Reforma #255, San Salvador',
        economicActivity: 'Desarrollo de software y consultoría tecnológica',
        shareCapital: 25000,
        municipality: 'San Salvador',
        department: 'San Salvador',
      },
      users: { connect: { id: admin.id } },
    },
  });
  const cid = company.id;
  console.log(`✅ Empresa creada: ${company.name} (id: ${cid})`);

  // ── 3. Membresía ────────────────────────────────────────────────────────────
  await prisma.companyMember.create({ data: { userId: admin.id, companyId: cid, role: 'CONTADOR' } }).catch(() => {});

  // ── 4. Cuentas contables ────────────────────────────────────────────────────
  await prisma.account.createMany({
    data: ACCOUNTS.map(a => ({ ...a, companyId: cid })),
    skipDuplicates: true,
  });
  console.log(`✅ ${ACCOUNTS.length} cuentas contables creadas`);

  // Helper: obtener accountId por código
  const accountCache = {};
  const getAccId = async (code) => {
    if (accountCache[code]) return accountCache[code];
    const a = await prisma.account.findUnique({ where: { companyId_code: { companyId: cid, code } } });
    if (a) accountCache[code] = a.id;
    return a?.id;
  };

  // Helper: crear JournalEntry
  const journal = async (date, description, lines, metadata = {}) => {
    const debitAccId  = await getAccId(lines[0].code);
    const creditAccId = await getAccId(lines[1].code);
    if (!debitAccId || !creditAccId) return null;
    return prisma.journalEntry.create({
      data: {
        date, description, companyId: cid,
        metadata: { autoGenerated: true, ...metadata },
        lines: { create: [
          { accountId: debitAccId,  debit: lines[0].amount, credit: 0 },
          { accountId: creditAccId, debit: 0, credit: lines[1].amount },
        ]},
      },
    });
  };

  // ── 5. Categorías con mapeo contable ────────────────────────────────────────
  const cats = await prisma.category.createMany({
    data: [
      { name: 'Desarrollo de Software', type: 'INGRESO', icon: '💻', color: '#3b82f6', companyId: cid, debitAccountCode: '1101', creditAccountCode: '4102' },
      { name: 'Consultoría TI',         type: 'INGRESO', icon: '🔍', color: '#10b981', companyId: cid, debitAccountCode: '1101', creditAccountCode: '4102' },
      { name: 'Mantenimiento Sistema',  type: 'INGRESO', icon: '⚙️', color: '#8b5cf6', companyId: cid, debitAccountCode: '1101', creditAccountCode: '4102' },
      { name: 'Otros Ingresos',         type: 'INGRESO', icon: '📈', color: '#06b6d4', companyId: cid, debitAccountCode: '1101', creditAccountCode: '4104' },
      { name: 'Sueldos y Salarios',     type: 'EGRESO',  icon: '👥', color: '#ef4444', companyId: cid, debitAccountCode: '6101', creditAccountCode: '1101' },
      { name: 'Cargas Sociales',        type: 'EGRESO',  icon: '🏛',  color: '#f59e0b', companyId: cid, debitAccountCode: '6102', creditAccountCode: '1101' },
      { name: 'Alquiler Oficina',       type: 'EGRESO',  icon: '🏢', color: '#6b7280', companyId: cid, debitAccountCode: '6107', creditAccountCode: '1101' },
      { name: 'Electricidad',           type: 'EGRESO',  icon: '💡', color: '#f97316', companyId: cid, debitAccountCode: '6108', creditAccountCode: '1101' },
      { name: 'Internet y Telefonía',   type: 'EGRESO',  icon: '📡', color: '#06b6d4', companyId: cid, debitAccountCode: '6110', creditAccountCode: '1101' },
      { name: 'Papelería',             type: 'EGRESO',  icon: '📄', color: '#84cc16', companyId: cid, debitAccountCode: '6111', creditAccountCode: '1101' },
      { name: 'Marketing Digital',      type: 'EGRESO',  icon: '📢', color: '#ec4899', companyId: cid, debitAccountCode: '6112', creditAccountCode: '1101' },
      { name: 'Mantenimiento Equipo',   type: 'EGRESO',  icon: '🔧', color: '#78716c', companyId: cid, debitAccountCode: '6113', creditAccountCode: '1101' },
      { name: 'Intereses Préstamo',     type: 'EGRESO',  icon: '🏦', color: '#dc2626', companyId: cid, debitAccountCode: '6201', creditAccountCode: '1101' },
      { name: 'Gastos Varios',          type: 'EGRESO',  icon: '💸', color: '#94a3b8', companyId: cid, debitAccountCode: '6302', creditAccountCode: '1101' },
    ],
    skipDuplicates: true,
  });
  const allCats = await prisma.category.findMany({ where: { companyId: cid } });
  const catByName = Object.fromEntries(allCats.map(c => [c.name, c]));
  console.log(`✅ ${allCats.length} categorías creadas con mapeo contable`);

  // ── 6. Clientes ─────────────────────────────────────────────────────────────
  const clientsData = [
    { name: 'Banco Agrícola S.A.',        email: 'tecnologia@bancoagricola.com', nit: '0614-0101-1001-1', type: 'EMPRESA',    role: 'CLIENT'    },
    { name: 'Ministerio de Educación',    email: 'sistemas@mined.gob.sv',        nit: '0614-0101-2001-2', type: 'EMPRESA',    role: 'CLIENT'    },
    { name: 'Grupo Roble S.A.',           email: 'it@gruporoble.com',            nit: '0614-0101-3001-3', type: 'EMPRESA',    role: 'CLIENT'    },
    { name: 'Almacenes Simán',            email: 'tech@siman.com',               nit: '0614-0101-4001-4', type: 'EMPRESA',    role: 'CLIENT'    },
    { name: 'Hospital Diagnóstico',       email: 'sistemas@diagnostico.com.sv',  nit: '0614-0101-5001-5', type: 'EMPRESA',    role: 'CLIENT'    },
    { name: 'StartupSV',                  email: 'hola@startupsv.com',           nit: '0614-0101-6001-6', type: 'EMPRESA',    role: 'CLIENT'    },
    // Proveedores
    { name: 'Dell El Salvador',           email: 'ventas@dell.com.sv',           nit: '0614-0201-1001-1', type: 'EMPRESA',    role: 'SUPPLIER'  },
    { name: 'Claro El Salvador',          email: 'empresas@claro.com.sv',        nit: '0614-0201-2001-2', type: 'EMPRESA',    role: 'SUPPLIER'  },
    { name: 'WeWork San Salvador',        email: 'sv@wework.com',                nit: '0614-0201-3001-3', type: 'EMPRESA',    role: 'SUPPLIER'  },
    { name: 'Google Workspace',           email: 'billing@google.com',           nit: '0614-0201-4001-4', type: 'EMPRESA',    role: 'SUPPLIER'  },
    { name: 'Banco de América Central',   email: 'empresas@bac.net',             nit: '0614-0201-5001-5', type: 'EMPRESA',    role: 'SUPPLIER'  },
    { name: 'Impresiones Rápidas',        email: 'ventas@impresiones.com.sv',    nit: '0614-0201-6001-6', type: 'EMPRESA',    role: 'SUPPLIER'  },
  ];

  const createdClients = [];
  for (const c of clientsData) {
    const client = await prisma.accountClient.create({
      data: { ...c, companyId: cid },
    });
    createdClients.push(client);
  }
  const clients = createdClients.filter(c => c.role === 'CLIENT');
  const suppliers = createdClients.filter(c => c.role === 'SUPPLIER');
  console.log(`✅ ${clients.length} clientes + ${suppliers.length} proveedores creados`);

  // ── 7. Capital inicial ──────────────────────────────────────────────────────
  await journal(d(2024,1,1), 'Aportación de capital inicial', [
    { code: '1101', amount: 25000 },
    { code: '3101', amount: 25000 },
  ]);
  console.log('✅ Capital inicial $25,000 registrado');

  // ── 8. Préstamo bancario ────────────────────────────────────────────────────
  const loan = await prisma.loan.create({
    data: {
      companyId: cid,
      bankName: 'Banco de América Central',
      description: 'Préstamo para capital de trabajo',
      originalAmount: 30000,
      balance: 30000,
      interestRate: 9.5,
      termMonths: 36,
      startDate: d(2024, 1, 15),
      status: 'ACTIVE',
    },
  });

  // Asiento: recibo préstamo
  await journal(d(2024,1,15), 'Recepción préstamo BAC', [
    { code: '1101', amount: 30000 },
    { code: '2201', amount: 30000 },
  ]);

  // Pagos mensuales del préstamo (2024: 12 cuotas, 2025: 12 cuotas)
  const monthlyRate = 0.095 / 12;
  const cuota = usd(30000 * monthlyRate / (1 - Math.pow(1 + monthlyRate, -36)));
  let loanBalance = 30000;

  const loanPayments = [];
  for (let i = 0; i < 24; i++) {
    const year = i < 12 ? 2024 : 2025;
    const month = (i % 12) + 1;
    const payDate = d(year, month, 15);
    const interest = usd(loanBalance * monthlyRate);
    const principal = usd(cuota - interest);
    loanBalance = usd(loanBalance - principal);

    loanPayments.push({ loanId: loan.id, paymentDate: payDate, totalPayment: cuota, principal, interest, balance: Math.max(0, loanBalance) });

    // Asiento: pago cuota (capital + interés)
    await journal(payDate, `Pago cuota préstamo BAC ${month}/${year}`, [
      { code: '2201', amount: principal },
      { code: '1101', amount: principal },
    ]);
    await journal(payDate, `Intereses préstamo BAC ${month}/${year}`, [
      { code: '6201', amount: interest },
      { code: '1101', amount: interest },
    ]);
  }
  await prisma.loanPayment.createMany({ data: loanPayments });

  // Actualizar saldo del préstamo
  await prisma.loan.update({ where: { id: loan.id }, data: { balance: loanBalance } });
  console.log(`✅ Préstamo BAC $30,000 con ${loanPayments.length} pagos registrados`);

  // ── 9. Activos fijos ────────────────────────────────────────────────────────
  const assets = [
    { name: 'Laptops MacBook Pro (5 unidades)', accountCode: '1206', purchaseDate: d(2024,1,10), purchaseCost: 12000 },
    { name: 'Servidor Dell PowerEdge',         accountCode: '1206', purchaseDate: d(2024,1,10), purchaseCost: 5000  },
    { name: 'Sillas y escritorios oficina',    accountCode: '1205', purchaseDate: d(2024,2,1),  purchaseCost: 3500  },
    { name: 'Toyota Hilux 2022',               accountCode: '1204', purchaseDate: d(2024,3,1),  purchaseCost: 28000 },
  ];

  const deprRates = { '1206': { rate: 0.5, years: 2, deprCode: '1206D' }, '1205': { rate: 0.5, years: 2, deprCode: '1205D' }, '1204': { rate: 0.25, years: 4, deprCode: '1204D' } };

  for (const a of assets) {
    const rate = deprRates[a.accountCode];
    const asset = await prisma.fixedAsset.create({
      data: {
        companyId: cid,
        name: a.name, accountCode: a.accountCode,
        purchaseDate: a.purchaseDate, purchaseCost: a.purchaseCost,
        residualValue: 0, usefulLifeYears: rate.years,
        accumulatedDepr: 0, bookValue: a.purchaseCost, status: 'ACTIVE',
      },
    });

    // Asiento: compra del activo
    await journal(a.purchaseDate, `Compra: ${a.name}`, [
      { code: a.accountCode, amount: a.purchaseCost },
      { code: '1101', amount: a.purchaseCost },
    ]);

    // Depreciar 24 meses (2024 + 2025)
    const monthlyDepr = usd(a.purchaseCost / (rate.years * 12));
    let accumulated = 0;

    const deprRecords = [];
    for (let i = 0; i < 24; i++) {
      const year = i < 12 ? 2024 : 2025;
      const month = (i % 12) + 1;
      accumulated = usd(accumulated + monthlyDepr);
      const bookValue = usd(a.purchaseCost - accumulated);

      deprRecords.push({ assetId: asset.id, year, month, amount: monthlyDepr, accumulatedDepr: accumulated });

      await journal(d(year, month, 28), `Depreciación: ${a.name} ${month}/${year}`, [
        { code: '6116', amount: monthlyDepr },
        { code: rate.deprCode, amount: monthlyDepr },
      ]);
    }
    await prisma.assetDepreciation.createMany({ data: deprRecords, skipDuplicates: true });
    const finalBook = usd(a.purchaseCost - accumulated);
    await prisma.fixedAsset.update({ where: { id: asset.id }, data: { accumulatedDepr: accumulated, bookValue: Math.max(0, finalBook) } });
  }
  console.log(`✅ ${assets.length} activos fijos con 24 meses de depreciación`);

  // ── 10. Empleados y planillas ────────────────────────────────────────────────
  const employees = [
    { name: 'Carlos Martínez Rivas',    jobTitle: 'CEO / Gerente General',     salary: 3500, dui: '00112233-4', nup: '00112233', afpName: 'AFP Crecer', startYear: 2024, startMonth: 1,  active: true  },
    { name: 'Ana García López',         jobTitle: 'CTO / Lead Developer',      salary: 2800, dui: '00223344-5', nup: '00223345', afpName: 'AFP Confía', startYear: 2024, startMonth: 1,  active: true  },
    { name: 'Roberto Hernández',        jobTitle: 'Full Stack Developer',       salary: 1800, dui: '00334455-6', nup: '00334456', afpName: 'AFP Crecer', startYear: 2024, startMonth: 1,  active: true  },
    { name: 'María Vásquez Portillo',   jobTitle: 'Full Stack Developer',       salary: 1800, dui: '00445566-7', nup: '00445567', afpName: 'AFP Confía', startYear: 2024, startMonth: 1,  active: true  },
    { name: 'Luis Alvarado Chávez',     jobTitle: 'UI/UX Designer',            salary: 1500, dui: '00556677-8', nup: '00556678', afpName: 'AFP Crecer', startYear: 2024, startMonth: 3,  active: true  },
    { name: 'Sofía Ramírez Cruz',       jobTitle: 'Project Manager',           salary: 2200, dui: '00667788-9', nup: '00667789', afpName: 'AFP Confía', startYear: 2024, startMonth: 4,  active: true  },
    { name: 'Diego Flores Mendoza',     jobTitle: 'QA Tester',                 salary: 1200, dui: '00778899-0', nup: '00778890', afpName: 'AFP Crecer', startYear: 2024, startMonth: 6,  active: false, endYear: 2025, endMonth: 3  }, // DESPIDO
    { name: 'Claudia Torres Bonilla',   jobTitle: 'Contadora',                  salary: 1600, dui: '00889900-1', nup: '00889901', afpName: 'AFP Confía', startYear: 2024, startMonth: 1,  active: true  },
  ];

  // AFP/ISSS/INSAFORP rates
  const AFP_L = 0.0725, AFP_P = 0.0875;
  const ISSS_L = 0.03, ISSS_P = 0.075, ISSS_MAX = 1000;
  const INSAFORP = 0.01;

  function calcEmp(salary) {
    const afpL = usd(salary * AFP_L);
    const afpP = usd(salary * AFP_P);
    const isssBase = Math.min(salary, ISSS_MAX);
    const isssL = usd(isssBase * ISSS_L);
    const isssP = usd(isssBase * ISSS_P);
    const insaforp = usd(Math.min(salary, 1000) * INSAFORP);
    const isr = calcISRMensual(salary);
    const descuentos = usd(afpL + isssL + isr);
    const neto = usd(salary - descuentos);
    const patronal = usd(afpP + isssP + insaforp);
    return { salary, afpL, afpP, isssL, isssP, insaforp, isr, descuentos, neto, patronal };
  }

  // Generar planillas mes a mes
  const payrollPeriods = [];
  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      payrollPeriods.push({ year: y, month: m });
    }
  }

  let payrollCount = 0;
  for (const { year, month } of payrollPeriods) {
    const periodDate = d(year, month, 28);

    // Empleados activos en este período
    const activeEmps = employees.filter(e => {
      const started = e.startYear < year || (e.startYear === year && e.startMonth <= month);
      const ended = !e.active && e.endYear && (e.endYear < year || (e.endYear === year && e.endMonth < month));
      return started && !ended;
    });

    if (activeEmps.length === 0) continue;

    const period = `${year}-${String(month).padStart(2,'0')}`;
    const calc = activeEmps.map(e => calcEmp(e.salary));
    const totals = calc.reduce((acc, c) => ({
      bruto: usd(acc.bruto + c.salary),
      neto: usd(acc.neto + c.neto),
      afpL: usd(acc.afpL + c.afpL),
      afpP: usd(acc.afpP + c.afpP),
      isssL: usd(acc.isssL + c.isssL),
      isssP: usd(acc.isssP + c.isssP),
      insaforp: usd(acc.insaforp + c.insaforp),
      isr: usd(acc.isr + c.isr),
      patronal: usd(acc.patronal + c.patronal),
    }), { bruto:0, neto:0, afpL:0, afpP:0, isssL:0, isssP:0, insaforp:0, isr:0, patronal:0 });

    const payroll = await prisma.payroll.create({
      data: {
        companyId: cid,
        period,
        status: 'PAID',
        totalBruto: totals.bruto,
        totalNeto: totals.neto,
        totalAFPLaboral: totals.afpL,
        totalAFPPatronal: totals.afpP,
        totalISSSLaboral: totals.isssL,
        totalISSSPatronal: totals.isssP,
        totalINSAFORP: totals.insaforp,
        totalISR: totals.isr,
        totalCargaPatronal: totals.patronal,
        employees: {
          create: activeEmps.map((e, i) => {
            const c = calc[i];
            return {
              employeeName: e.name, jobTitle: e.jobTitle, dui: e.dui,
              nup: e.nup, afpName: e.afpName, salary: e.salary,
              otrosIngresos: 0, totalBruto: e.salary,
              afpLaboral: c.afpL, isssLaboral: c.isssL, isrRetencion: c.isr,
              totalDescuentos: c.descuentos, salarioNeto: c.neto,
              afpPatronal: c.afpP, isssPatronal: c.isssP, insaforp: c.insaforp,
            };
          }),
        },
      },
    });

    // Asiento: sueldos netos
    await journal(periodDate, `Planilla ${period} — sueldos netos`, [
      { code: '6101', amount: totals.neto },
      { code: '1101', amount: totals.neto },
    ]);
    // Asiento: retenciones laborales
    await journal(periodDate, `Planilla ${period} — AFP/ISSS/ISR laboral`, [
      { code: '6101', amount: usd(totals.afpL + totals.isssL + totals.isr) },
      { code: '1101', amount: usd(totals.afpL + totals.isssL + totals.isr) },
    ]);
    // Asiento: carga patronal
    await journal(periodDate, `Planilla ${period} — carga patronal`, [
      { code: '6102', amount: totals.patronal },
      { code: '1101', amount: totals.patronal },
    ]);

    payrollCount++;
  }
  console.log(`✅ ${payrollCount} planillas mensuales (2024-2025) con ${employees.length} empleados`);

  // ── 11. Previsiones laborales (aguinaldo y vacaciones anuales) ───────────────
  const provisionData = [];
  for (const emp of employees.filter(e => e.active || (e.endYear === 2025))) {
    // Aguinaldo diciembre 2024
    const aguinaldo = usd(emp.salary * (15/30)); // 15 días
    provisionData.push({
      companyId: cid, type: 'AGUINALDO',
      description: `Aguinaldo 2024 — ${emp.name}`,
      year: 2024, month: 12,
      accruedAmount: aguinaldo, paidAmount: aguinaldo,
    });
    await journal(d(2024,12,15), `Aguinaldo ${emp.name}`, [
      { code: '6104', amount: aguinaldo },
      { code: '1101', amount: aguinaldo },
    ]);

    // Vacaciones acumuladas 2024 (15 días + 30% recargo)
    const diasVac = 15;
    const vacBase = usd(emp.salary / 30 * diasVac);
    const recargo = usd(vacBase * 0.30);
    const totalVac = usd(vacBase + recargo);
    provisionData.push({
      companyId: cid, type: 'VACATION',
      description: `Previsión vacaciones 2024 — ${emp.name}`,
      year: 2024, month: 12,
      accruedAmount: totalVac, paidAmount: 0,
    });

    // Aguinaldo diciembre 2025
    if (emp.active) {
      const aguinaldo2 = usd(emp.salary * (18/30)); // 18 días (>3 años)
      provisionData.push({
        companyId: cid, type: 'AGUINALDO',
        description: `Aguinaldo 2025 — ${emp.name}`,
        year: 2025, month: 12,
        accruedAmount: aguinaldo2, paidAmount: aguinaldo2,
      });
      await journal(d(2025,12,15), `Aguinaldo 2025 ${emp.name}`, [
        { code: '6104', amount: aguinaldo2 },
        { code: '1101', amount: aguinaldo2 },
      ]);
    }
  }

  // ── 12. DESPIDO — Diego Flores (Marzo 2025) ──────────────────────────────────
  const diegoSalary = 1200;
  const yearsOfService = 0.75; // 9 meses ≈ 0.75 años
  const indemnizacion = usd(diegoSalary / 30 * 15 * yearsOfService);

  provisionData.push({
    companyId: cid, type: 'INDEMNIZACION',
    description: 'Indemnización — Diego Flores Mendoza (despido sin justa causa)',
    year: 2025, month: 3,
    accruedAmount: indemnizacion, paidAmount: indemnizacion,
  });

  await journal(d(2025,3,31), 'Indemnización Diego Flores — despido', [
    { code: '6105', amount: indemnizacion },
    { code: '1101', amount: indemnizacion },
  ]);

  // Vacaciones proporcionales Diego
  const vacProporcionales = usd(diegoSalary / 30 * 15 * yearsOfService * 1.30);
  provisionData.push({
    companyId: cid, type: 'VACATION',
    description: 'Vacaciones proporcionales — Diego Flores (despido)',
    year: 2025, month: 3,
    accruedAmount: vacProporcionales, paidAmount: vacProporcionales,
  });
  await journal(d(2025,3,31), 'Vacaciones proporcionales Diego Flores', [
    { code: '6103', amount: vacProporcionales },
    { code: '1101', amount: vacProporcionales },
  ]);

  await prisma.provision.createMany({ data: provisionData });
  console.log(`✅ ${provisionData.length} previsiones laborales (aguinaldos, vacaciones, indemnización)`);

  // ── 13. Transacciones de ingresos (2024-2025) ────────────────────────────────
  const ingresoTxs = [
    // 2024 — Proyecto Banco Agrícola
    { desc: 'Factura #001 — App mobile Banco Agrícola (fase 1)', amount: 18000, date: d(2024,2,15),  catName: 'Desarrollo de Software', clientIdx: 0, paid: true  },
    { desc: 'Factura #002 — App mobile Banco Agrícola (fase 2)', amount: 12000, date: d(2024,5,30),  catName: 'Desarrollo de Software', clientIdx: 0, paid: true  },
    { desc: 'Factura #003 — Consultoría migración cloud MINED',  amount: 8500,  date: d(2024,3,10),  catName: 'Consultoría TI',         clientIdx: 1, paid: true  },
    { desc: 'Factura #004 — Portal web Grupo Roble',             amount: 15000, date: d(2024,4,20),  catName: 'Desarrollo de Software', clientIdx: 2, paid: true  },
    { desc: 'Factura #005 — ERP Almacenes Simán (módulo ventas)',amount: 22000, date: d(2024,6,1),   catName: 'Desarrollo de Software', clientIdx: 3, paid: true  },
    { desc: 'Factura #006 — Mantenimiento mensual MINED Jul',    amount: 2500,  date: d(2024,7,31),  catName: 'Mantenimiento Sistema',  clientIdx: 1, paid: true  },
    { desc: 'Factura #007 — Mantenimiento mensual MINED Ago',    amount: 2500,  date: d(2024,8,31),  catName: 'Mantenimiento Sistema',  clientIdx: 1, paid: true  },
    { desc: 'Factura #008 — App hospitales diagnóstico',         amount: 11000, date: d(2024,8,15),  catName: 'Desarrollo de Software', clientIdx: 4, paid: true  },
    { desc: 'Factura #009 — Consultoría startup SV',             amount: 3500,  date: d(2024,9,10),  catName: 'Consultoría TI',         clientIdx: 5, paid: true  },
    { desc: 'Factura #010 — Mantenimiento mensual MINED Sep',    amount: 2500,  date: d(2024,9,30),  catName: 'Mantenimiento Sistema',  clientIdx: 1, paid: true  },
    { desc: 'Factura #011 — ERP Simán (módulo inventario)',      amount: 18000, date: d(2024,10,15), catName: 'Desarrollo de Software', clientIdx: 3, paid: true  },
    { desc: 'Factura #012 — API integración Banco Agrícola',     amount: 7500,  date: d(2024,11,5),  catName: 'Desarrollo de Software', clientIdx: 0, paid: true  },
    { desc: 'Factura #013 — Mantenimiento dic MINED',            amount: 2500,  date: d(2024,12,20), catName: 'Mantenimiento Sistema',  clientIdx: 1, paid: true  },
    // 2025
    { desc: 'Factura #014 — Dashboard analytics Grupo Roble',    amount: 14000, date: d(2025,1,20),  catName: 'Desarrollo de Software', clientIdx: 2, paid: true  },
    { desc: 'Factura #015 — Mantenimiento ene MINED',            amount: 2500,  date: d(2025,1,31),  catName: 'Mantenimiento Sistema',  clientIdx: 1, paid: true  },
    { desc: 'Factura #016 — App móvil Hospital Diagnóstico',     amount: 13500, date: d(2025,2,10),  catName: 'Desarrollo de Software', clientIdx: 4, paid: true  },
    { desc: 'Factura #017 — Consultoría ciberseguridad BAC',     amount: 9000,  date: d(2025,3,5),   catName: 'Consultoría TI',         clientIdx: 0, paid: true  },
    { desc: 'Factura #018 — ERP Simán (módulo RRHH)',            amount: 20000, date: d(2025,4,1),   catName: 'Desarrollo de Software', clientIdx: 3, paid: false, dueDate: d(2025,5,1)  },
    { desc: 'Factura #019 — Startup SV plataforma freelancers',  amount: 8500,  date: d(2025,4,15),  catName: 'Desarrollo de Software', clientIdx: 5, paid: false, dueDate: d(2025,5,15) },
    { desc: 'Factura #020 — Mantenimiento may MINED',            amount: 2500,  date: d(2025,5,31),  catName: 'Mantenimiento Sistema',  clientIdx: 1, paid: true  },
    { desc: 'Factura #021 — Portal turismo MITUR (nuevo)',        amount: 25000, date: d(2025,6,1),   catName: 'Desarrollo de Software', clientIdx: 2, paid: false, dueDate: d(2025,7,1)  },
    { desc: 'Factura #022 — Capacitación MINED Q3',              amount: 5000,  date: d(2025,7,10),  catName: 'Consultoría TI',         clientIdx: 1, paid: true  },
    { desc: 'Factura #023 — App delivery Hospital',              amount: 11000, date: d(2025,8,5),   catName: 'Desarrollo de Software', clientIdx: 4, paid: true  },
    { desc: 'Factura #024 — Audit system BAC',                   amount: 16000, date: d(2025,9,1),   catName: 'Desarrollo de Software', clientIdx: 0, paid: false, dueDate: d(2025,10,1) },
    { desc: 'Factura #025 — Mantenimiento oct MINED',            amount: 2500,  date: d(2025,10,31), catName: 'Mantenimiento Sistema',  clientIdx: 1, paid: true  },
    { desc: 'Factura #026 — ERP Simán (módulo finanzas)',        amount: 22000, date: d(2025,11,1),  catName: 'Desarrollo de Software', clientIdx: 3, paid: false, dueDate: d(2025,12,15) },
    { desc: 'Factura #027 — Consultoría año 2 BAC',             amount: 12000, date: d(2025,12,1),  catName: 'Consultoría TI',         clientIdx: 0, paid: false, dueDate: d(2026,1,15)  },
  ];

  // Egresos recurrentes
  const egresoTxs = [];
  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      egresoTxs.push(
        { desc: `Alquiler oficina WeWork ${m}/${y}`,     amount: 1800,          date: d(y,m,1),   catName: 'Alquiler Oficina',   supplierIdx: 2, paid: true },
        { desc: `Electricidad CAESS ${m}/${y}`,          amount: rnd(180,320),  date: d(y,m,10),  catName: 'Electricidad',       supplierIdx: null, paid: true },
        { desc: `Internet+Telefonía Claro ${m}/${y}`,    amount: 350,           date: d(y,m,5),   catName: 'Internet y Telefonía',supplierIdx: 1, paid: true },
        { desc: `Google Workspace licencias ${m}/${y}`,  amount: 120,           date: d(y,m,15),  catName: 'Mantenimiento Equipo',supplierIdx: 3, paid: true },
      );
      if (m % 3 === 1) egresoTxs.push({ desc: `Papelería y útiles Q${Math.ceil(m/3)} ${y}`, amount: rnd(80,200), date: d(y,m,20), catName: 'Papelería', supplierIdx: 5, paid: true });
      if (m % 2 === 0) egresoTxs.push({ desc: `Marketing digital ${m}/${y}`, amount: rnd(300,800), date: d(y,m,18), catName: 'Marketing Digital', supplierIdx: null, paid: true });
      if (m % 4 === 0) egresoTxs.push({ desc: `Mantenimiento equipos ${m}/${y}`, amount: rnd(150,400), date: d(y,m,25), catName: 'Mantenimiento Equipo', supplierIdx: null, paid: true });
    }
  }
  // Cuentas por pagar pendientes (proveedores)
  egresoTxs.push(
    { desc: 'Licencias Adobe Creative 2025', amount: 1200, date: d(2025,10,1), catName: 'Mantenimiento Equipo', supplierIdx: 3, paid: false, dueDate: d(2025,11,1) },
    { desc: 'Servicio hosting AWS Nov 2025',  amount: 850,  date: d(2025,11,1), catName: 'Gastos Varios',        supplierIdx: null, paid: false, dueDate: d(2025,12,1) },
    { desc: 'Renovación dominio + SSL 2026',  amount: 320,  date: d(2025,12,1), catName: 'Gastos Varios',        supplierIdx: null, paid: false, dueDate: d(2026,1,31) },
  );

  // Crear transacciones de ingresos
  let txCount = 0;
  for (const t of ingresoTxs) {
    const cat = catByName[t.catName];
    const client = t.clientIdx !== null ? clients[t.clientIdx] : null;
    if (!cat) continue;

    const tx = await prisma.transaction.create({
      data: {
        type: 'INGRESO', amount: t.amount, description: t.desc,
        date: t.date, categoryId: cat.id, companyId: cid,
        userId: admin.id, clientId: client?.id || null,
        isPaid: t.paid, dueDate: t.dueDate || null,
      },
    });

    // Asiento contable
    if (cat.debitAccountCode && cat.creditAccountCode) {
      await journal(t.date, `Auto: ${t.desc}`, [
        { code: cat.debitAccountCode,  amount: t.amount },
        { code: cat.creditAccountCode, amount: t.amount },
      ], { transactionId: tx.id });
    }
    txCount++;
  }

  // Crear transacciones de egresos
  for (const t of egresoTxs) {
    const cat = catByName[t.catName];
    const supplier = t.supplierIdx !== null ? suppliers[t.supplierIdx] : null;
    if (!cat) continue;

    const tx = await prisma.transaction.create({
      data: {
        type: 'EGRESO', amount: t.amount, description: t.desc,
        date: t.date, categoryId: cat.id, companyId: cid,
        userId: admin.id, clientId: supplier?.id || null,
        isPaid: t.paid, dueDate: t.dueDate || null,
      },
    });

    if (cat.debitAccountCode && cat.creditAccountCode) {
      await journal(t.date, `Auto: ${t.desc}`, [
        { code: cat.debitAccountCode,  amount: t.amount },
        { code: cat.creditAccountCode, amount: t.amount },
      ], { transactionId: tx.id });
    }
    txCount++;
  }

  console.log(`✅ ${txCount} transacciones creadas (ingresos + egresos + aging)`);

  // ── 14. Resumen final ────────────────────────────────────────────────────────
  const totalAccounts = await prisma.account.count({ where: { companyId: cid } });
  const totalJournalEntries = await prisma.journalEntry.count({ where: { companyId: cid } });
  const totalPayrolls = await prisma.payroll.count({ where: { companyId: cid } });
  const totalProvisions = await prisma.provision.count({ where: { companyId: cid } });
  const totalFixedAssets = await prisma.fixedAsset.count({ where: { companyId: cid } });

  console.log('\n════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETO — App Factory S.A. de C.V.');
  console.log('════════════════════════════════════════════════');
  console.log(`📊 Cuentas contables:     ${totalAccounts}`);
  console.log(`📝 Asientos contables:    ${totalJournalEntries}`);
  console.log(`💼 Transacciones:         ${txCount}`);
  console.log(`👥 Empleados:             ${employees.length} (1 despedido)`);
  console.log(`📋 Planillas:             ${totalPayrolls} meses`);
  console.log(`🏦 Préstamos:             1 (BAC $30,000)`);
  console.log(`🏢 Activos fijos:         ${totalFixedAssets}`);
  console.log(`📌 Previsiones:           ${totalProvisions}`);
  console.log(`👔 Clientes:              ${clients.length}`);
  console.log(`🏭 Proveedores:           ${suppliers.length}`);
  console.log('════════════════════════════════════════════════');
  console.log('🚀 Inicia sesión y selecciona "App Factory" para ver los datos');
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
