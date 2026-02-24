-- 1. YA REALIZADO: RLS en _CompanyToUser

-- 2. CORREGIR "RLS Policy Always True" (Warnigns 1 y 2)
-- Primero eliminamos cualquier rastro previo para evitar errores
DROP POLICY IF EXISTS "Strict company access" ON "public"."Company";
DROP POLICY IF EXISTS "Users can only see their managed companies" ON "public"."Company";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."Company";

CREATE POLICY "Strict company access" 
ON "public"."Company" 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "public"."_CompanyToUser" 
    WHERE "public"."_CompanyToUser"."A" = "public"."Company".id 
    AND "public"."_CompanyToUser"."B" = auth.uid()::text
  )
);

-- Para AuditLog
DROP POLICY IF EXISTS "Strict audit log access" ON "public"."AuditLog";
DROP POLICY IF EXISTS "Users can only see their own logs" ON "public"."AuditLog";
DROP POLICY IF EXISTS "Enable read access for all" ON "public"."AuditLog";

CREATE POLICY "Strict audit log access" 
ON "public"."AuditLog" 
FOR SELECT 
TO authenticated
USING (
  auth.uid()::text = "userId"
);

-- 3. NOTA SOBRE "Leaked Password Protection" (Warning 3)
-- Esta advertencia NO se quita con SQL, se activa en el panel de Supabase:
-- Auth -> Settings -> Password Protection -> Enable "Hibp" (Have I Been Pwned)
