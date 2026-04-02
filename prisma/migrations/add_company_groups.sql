-- Add CompanyGroup model
CREATE TABLE IF NOT EXISTS "CompanyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompanyGroup_ownerId_idx" ON "CompanyGroup"("ownerId");

ALTER TABLE "CompanyGroup" ADD CONSTRAINT "CompanyGroup_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add groupId to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

CREATE INDEX IF NOT EXISTS "Company_groupId_idx" ON "Company"("groupId");

ALTER TABLE "Company" ADD CONSTRAINT "Company_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "CompanyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add CompanyMember model
CREATE TABLE IF NOT EXISTS "CompanyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENTE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyMember_userId_companyId_key" ON "CompanyMember"("userId", "companyId");
CREATE INDEX IF NOT EXISTS "CompanyMember_companyId_idx" ON "CompanyMember"("companyId");
CREATE INDEX IF NOT EXISTS "CompanyMember_userId_idx" ON "CompanyMember"("userId");

ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed CompanyMember from existing M2M relation (_CompanyToUser)
INSERT INTO "CompanyMember" ("id", "userId", "companyId", "role", "joinedAt")
SELECT
    gen_random_uuid()::text,
    u."B",
    u."A",
    'CONTADOR'::"Role",
    NOW()
FROM "_CompanyToUser" u
ON CONFLICT ("userId", "companyId") DO NOTHING;
