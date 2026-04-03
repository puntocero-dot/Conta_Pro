import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Statements in order, each atomic
const STATEMENTS = [
  // 1. Category new columns
  `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "debitAccountCode" TEXT`,
  `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "creditAccountCode" TEXT`,

  // 2. Transaction new columns
  `ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3)`,
  `ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "creditDays" INTEGER`,

  // 3. Transaction index
  `CREATE INDEX IF NOT EXISTS "Transaction_isPaid_idx" ON "Transaction"("isPaid")`,

  // 4. FixedAsset table
  `CREATE TABLE IF NOT EXISTS "FixedAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchaseCost" DOUBLE PRECISION NOT NULL,
    "residualValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usefulLifeYears" INTEGER NOT NULL,
    "accumulatedDepr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bookValue" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE INDEX IF NOT EXISTS "FixedAsset_companyId_idx" ON "FixedAsset"("companyId")`,

  `ALTER TABLE "FixedAsset" DROP CONSTRAINT IF EXISTS "FixedAsset_companyId_fkey"`,
  `ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // 5. AssetDepreciation table
  `CREATE TABLE IF NOT EXISTS "AssetDepreciation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accumulatedDepr" DOUBLE PRECISION NOT NULL,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetDepreciation_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE INDEX IF NOT EXISTS "AssetDepreciation_assetId_idx" ON "AssetDepreciation"("assetId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AssetDepreciation_assetId_year_month_key" ON "AssetDepreciation"("assetId", "year", "month")`,

  `ALTER TABLE "AssetDepreciation" DROP CONSTRAINT IF EXISTS "AssetDepreciation_assetId_fkey"`,
  `ALTER TABLE "AssetDepreciation" ADD CONSTRAINT "AssetDepreciation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];

async function main() {
  console.log(`Applying ${STATEMENTS.length} migration statements...\n`);
  let ok = 0, skipped = 0, errors = 0;

  for (const stmt of STATEMENTS) {
    const preview = stmt.replace(/\s+/g, ' ').trim().slice(0, 80);
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`✅ ${preview}`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('column') && msg.includes('of relation') && msg.includes('already exists')
      ) {
        console.log(`⏭️  SKIP (exists): ${preview}`);
        skipped++;
      } else {
        console.error(`❌ ERROR: ${msg.slice(0, 120)}`);
        console.error(`   Statement: ${preview}`);
        errors++;
      }
    }
  }

  console.log(`\n✅ OK: ${ok} | ⏭️  Skipped: ${skipped} | ❌ Errors: ${errors}`);
  await prisma.$disconnect();
}

main();
