
-- ==========================================================
-- MANUAL DATABASE SYNCHRONIZATION SCRIPT
-- ==========================================================
-- INSTRUCTIONS:
-- 1. Log in to your Supabase Dashboard.
-- 2. Go to the "SQL Editor" section.
-- 3. Create a "New query".
-- 4. Paste ALL the code below.
-- 5. Click "Run".
-- ==========================================================

-- 1. Create Enums if they don't exist
-- Note: 'CREATE TYPE' doesn't support 'IF NOT EXISTS' in some Postgres versions, 
-- so we use a DO block to check manually.

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CONTADOR', 'CLIENTE', 'AUDITOR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
        CREATE TYPE "TransactionType" AS ENUM ('INGRESO', 'EGRESO');
    END IF;
END $$;

-- 2. Create New Tables

CREATE TABLE IF NOT EXISTS "AccountClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "nit" TEXT,
    "dui" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JournalEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "companyId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JournalEntryLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CountryRule" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "triggerText" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryRule_pkey" PRIMARY KEY ("id")
);

-- 3. Create Indexes (These will fail if they exist, so we use DO blocks or drop them first)

DROP INDEX IF EXISTS "Account_companyId_code_key";
CREATE UNIQUE INDEX "Account_companyId_code_key" ON "Account"("companyId", "code");

DROP INDEX IF EXISTS "AccountClient_companyId_idx";
CREATE INDEX "AccountClient_companyId_idx" ON "AccountClient"("companyId");

DROP INDEX IF EXISTS "JournalEntry_companyId_idx";
CREATE INDEX "JournalEntry_companyId_idx" ON "JournalEntry"("companyId");

DROP INDEX IF EXISTS "JournalEntry_date_idx";
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");

DROP INDEX IF EXISTS "JournalEntryLine_journalEntryId_idx";
CREATE INDEX "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");

DROP INDEX IF EXISTS "JournalEntryLine_accountId_idx";
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");

DROP INDEX IF EXISTS "CountryRule_country_triggerText_idx";
CREATE INDEX "CountryRule_country_triggerText_idx" ON "CountryRule"("country", "triggerText");

-- 4. Foreign Keys

-- We use checks to avoid errors if FKs already exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AccountClient_companyId_fkey') THEN
        ALTER TABLE "AccountClient" ADD CONSTRAINT "AccountClient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Account_companyId_fkey') THEN
        ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'JournalEntry_companyId_fkey') THEN
        ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'JournalEntryLine_accountId_fkey') THEN
        ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'JournalEntryLine_journalEntryId_fkey') THEN
        ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
