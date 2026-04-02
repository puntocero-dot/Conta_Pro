# 🚨 Plan de Respuesta a Incidentes - Conta2Go

## Información de Contacto de Emergencia

### Equipo de Respuesta a Incidentes (IRT)
- **Líder IRT:** [Nombre] - [Email] - [Teléfono]
- **Ingeniero Senior:** [Nombre] - [Email] - [Teléfono]
- **Security Officer:** [Nombre] - [Email] - [Teléfono]
- **Administrador DB:** [Nombre] - [Email] - [Teléfono]

### Contactos Externos
- **Proveedor Cloud (Vercel):** support@vercel.com
- **Supabase Support:** support@supabase.io
- **Autoridades (CSIRT):** [Email/Teléfono]

---

## Clasificación de Incidentes

### Nivel 1: CRÍTICO 🔴
- Data breach / Fuga de datos
- Ransomware attack
- Sistema completamente inaccesible
- Corrupción masiva de datos
- **Tiempo de respuesta:** Inmediato (< 15 minutos)

### Nivel 2: ALTO 🟠
- Acceso no autorizado detectado
- DDoS attack sostenido
- Vulnerabilidad crítica identificada
- Servicios parcialmente degradados
- **Tiempo de respuesta:** < 1 hora

### Nivel 3: MEDIO 🟡
- Intentos de intrusión fallidos repetidos
- Vulnerabilidad media identificada
- Degradación menor de servicios
- **Tiempo de respuesta:** < 4 horas

### Nivel 4: BAJO 🟢
- Escaneo de puertos detectado
- Errores de configuración menores
- Logs anómalos aislados
- **Tiempo de respuesta:** < 24 horas

---

## Fase 1: DETECCIÓN Y ANÁLISIS

### 1.1 Indicadores de Compromiso (IoC)

**Síntomas Comunes:**
- [ ] Múltiples login fails simultáneos
- [ ] Acceso desde IPs inusuales/geo-locations
- [ ] Cambios no autorizados en datos críticos
- [ ] Tráfico de red anómalo
- [ ] Errores 500 masivos
- [ ] Logs de auditoría con patrones sospechosos
- [ ] Alertas de Snyk/SonarQube
- [ ] Usuarios reportan datos incorrectos

### 1.2 Análisis Inicial (Primeros 15 minutos)

```bash
# 1. Verificar estado del sistema
curl https://conta2go.com/api/health

# 2. Revisar logs recientes
tail -n 100 /var/log/application.log

# 3. Verificar audit logs en dashboard
# Ir a: https://conta2go.com/security-dashboard

# 4. Revisar métricas
# Ir a: Vercel Dashboard > Analytics
```

**Preguntas Clave:**
- ¿Cuándo comenzó el incidente?
- ¿Cuántos usuarios están afectados?
- ¿Qué datos están comprometidos?
- ¿El atacante aún tiene acceso?

---

## Fase 2: CONTENCIÓN

### 2.1 Contención Inmediata (Crítico)

**Si hay acceso no autorizado activo:**

```bash
# OPCIÓN 1: Bloquear IP sospechosa
node scripts/emergency/block-ip.js --ip=1.2.3.4

# OPCIÓN 2: Deshabilitar usuario comprometido
node scripts/emergency/disable-user.js --email=hacker@evil.com

# OPCIÓN 3: Activar modo mantenimiento
node scripts/emergency/maintenance-mode.js --enable

# OPCIÓN 4: Revocar todos los tokens
node scripts/emergency/revoke-all-sessions.js
```

### 2.2 Contención a Corto Plazo

- [ ] Cambiar todas las credenciales de admin
- [ ] Rotar API keys de servicios externos
- [ ] Habilitar MFA obligatorio para todos
- [ ] Incrementar rate limiting temporalmente
- [ ] Activar geo-blocking si aplica

### 2.3 Documentación

**Crear Incident Report:**
```
Incident ID: INC-YYYY-MM-DD-001
Reported By: [Nombre]
Detection Time: [HH:MM UTC]
Classification: [Nivel 1-4]
Systems Affected: [Lista]
Initial Actions: [Descripción]
```

---

## Fase 3: ERRADICACIÓN

### 3.1 Eliminar Amenaza

**Data Breach:**
```bash
# 1. Identificar datos comprometidos
node scripts/emergency/audit-compromised-data.js --since="2024-01-01"

# 2. Limpiar backdoors
node scripts/emergency/scan-malicious-code.js

# 3. Restaurar desde backup limpio
node scripts/emergency/restore-from-backup.js --date=2024-01-01 --dry-run
```

**Malware/Injection:**
```bash
# 1. Escanear código
npm audit --audit-level=high

# 2. Verificar dependencias
snyk test

# 3. Revisar cambios recientes en Git
git log --since="1 day ago" --all --oneline
```

### 3.2 Patch Vulnerabilidades

- [ ] Aplicar parches de seguridad
- [ ] Actualizar dependencias vulnerables
- [ ] Reforzar validaciones de input
- [ ] Revisar y endurecer RLS policies

---

## Fase 4: RECUPERACIÓN

### 4.1 Restaurar Servicios

**Secuencia de Recuperación:**

1. **Base de Datos** (Primero)
```bash
# Restaurar desde backup verificado
pg_restore -d conta2go backup_clean_YYYYMMDD.dump
```

2. **Aplicación** (Segundo)
```bash
# Deploy de versión limpia
git reset --hard <commit-seguro>
vercel --prod
```

3. **Servicios Externos** (Tercero)
```bash
# Re-conectar APIs limpias
# Supabase, Stripe,etc.
```

### 4.2 Validación Post-Recuperación

- [ ] Verificar integridad de datos
- [ ] Probar funcionalidad crítica
- [ ] Revisar logs de errores
- [ ] Monitorear métricas de performance
- [ ] Confirmar con usuarios clave

### 4.3 Comunicación

**A Usuarios (Si aplica):**
```
Asunto: Actualización de Seguridad - Conta2Go

Estimado usuario,

El [fecha] detectamos [descripción general] que pudo haber afectado [alcance].

Acciones tomadas:
- [Lista de medidas]

Se requiere de su parte:
- Cambiar su contraseña
- Habilitar MFA

Disculpe las molestias.
Equipo Conta2Go
```

**A Autoridades (Si aplica):**
- CSIRT nacional
- GDPR Data Protection Authority
- Clientes afectados (si hay breach)

---

## Fase 5: POST-INCIDENTE

### 5.1 Post-Mortem Meeting (Dentro de 48 horas)

**Agenda:**
1. Cronología exacta del incidente
2. ¿Qué funcionó bien?
3. ¿Qué falló?
4. ¿Cómo se pudo prevenir?
5. Acciones correctivas

### 5.2 Documentación Final

**Incident Report Completo:**
```
- Executive Summary
- Timeline detallado
- Impacto y alcance
- Root Cause Analysis
- Datos comprometidos
- Costo estimado
- Lecciones aprendidas
- Action items
```

### 5.3 Mejoras a Implementar

- [ ] Actualizar runbooks
- [ ] Mejorar detección
- [ ] Training del equipo
- [ ] Fortificar controles
- [ ] Actualizar BCP/DRP

---

## Scripts de Emergencia

Todos los scripts están en `/scripts/emergency/`:

```bash
# Modo mantenimiento
node scripts/emergency/maintenance-mode.js --enable

# Bloquear IP
node scripts/emergency/block-ip.js --ip=1.2.3.4

# Deshabilitar usuario
node scripts/emergency/disable-user.js --email=user@example.com

# Revocar sesiones
node scripts/emergency/revoke-all-sessions.js

# Backup completo
node scripts/emergency/full-backup.js

# Restore desde backup
node scripts/emergency/restore-from-backup.js --date=2024-01-01

# Audit de datos comprometidos
node scripts/emergency/audit-compromised-data.js
```

---

## Checklist Rápido (Imprimir y Tener a Mano)

### 🚨 INCIDENTE DETECTADO - Acción Inmediata

- [ ] 1. Notificar al Líder IRT
- [ ] 2. Clasificar severidad (1-4)
- [ ] 3. Activar modo mantenimiento si es crítico
- [ ] 4. Tomar snapshot del estado actual
- [ ] 5. Revisar Security Dashboard
- [ ] 6. Bloquear acceso comprometido
- [ ] 7. Comenzar documentación
- [ ] 8. Notificar stakeholders según protocolo
- [ ] 9. Contener amenaza
- [ ] 10. Erradicar causa raíz
- [ ] 11. Restaurar servicios
- [ ] 12. Validar recuperación
- [ ] 13. Comunicar resolución
- [ ] 14. Programar post-mortem
- [ ] 15. Implementar mejoras

---

## Contactos de Emergencia 24/7

**On-Call Rotation:** [Link a PagerDuty/similar]

**Escalation Path:**
1. Ingeniero On-Call
2. Líder IRT
3. CTO
4. CEO (si es nivel 1)

---

**Última Revisión:** [Fecha]  
**Próxima Revisión:** [Fecha + 6 meses]  
**Versión:** 1.0

---

*"No hay mejor momento para prepararse que ahora"*
