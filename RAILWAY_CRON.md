# Configuración de Cron Jobs en Railway

## 1. Variable de entorno requerida

En Railway → proyecto → Variables, agrega:

```
CRON_SECRET=genera-un-string-aleatorio-largo-aqui
```

También en `.env.local` para probar localmente.

## 2. Crear los Cron Jobs en Railway

Railway → proyecto → "New Service" → "Cron Job"

### Job 1 — Generar transacciones recurrentes
- **Name:** recurring-processor
- **Schedule:** `0 13 * * *` (07:00 hora SV = 13:00 UTC)
- **Command:**
```bash
curl -X POST https://TU-APP.railway.app/api/cron/recurring \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Job 2 — Enviar recordatorios por Telegram
- **Name:** telegram-reminders
- **Schedule:** `0 14 * * *` (08:00 hora SV = 14:00 UTC)
- **Command:**
```bash
curl -X POST https://TU-APP.railway.app/api/cron/reminders \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json"
```

## 3. Prueba manual (antes de activar el schedule)

```bash
# Reemplaza con tu URL y CRON_SECRET real
APP_URL="https://patrimoniumpro-production.up.railway.app"
SECRET="tu-cron-secret"

# Probar generación de recurrentes
curl -X POST "$APP_URL/api/cron/recurring" \
  -H "x-cron-secret: $SECRET"
# Respuesta esperada: { "processed": N, "errors": [], "total": N }

# Para que procese algo: crea una plantilla en /recurring con nextRunDate = hoy o antes
# (o modifica directamente en DB para testing)

# Probar recordatorios
curl -X POST "$APP_URL/api/cron/reminders" \
  -H "x-cron-secret: $SECRET"
# Respuesta esperada: { "sent": N, "skipped": N, "errors": [], "candidates": N }
```

## 4. Verificar idempotencia

Ejecutar el mismo curl dos veces el mismo día:
- Primera vez: `sent: 1`
- Segunda vez: `sent: 0, skipped: 1`

## 5. Endpoints disponibles

| Método | Ruta | Header requerido | Descripción |
|--------|------|-----------------|-------------|
| POST | `/api/cron/recurring` | `x-cron-secret` | Genera transacciones vencidas |
| POST | `/api/cron/reminders` | `x-cron-secret` | Envía recordatorios Telegram |
| PATCH | `/api/recurring-transactions/[id]` | auth JWT | Ejecuta 1 recurrente manualmente |
