# Setup infra v2 — Vercel + Neon + Clerk + Blob

Guía para conectar los servicios free tier antes de usar la API v2.

## 1. Deploy en Vercel

1. Importá el repo en [vercel.com](https://vercel.com).
2. Framework preset: **Next.js** (detectado automáticamente).
3. Root directory: `.` (raíz del repo).

## 2. Neon Postgres

1. En el proyecto Vercel → **Storage** → **Connect Store** → **Neon Postgres**.
2. Creá la base (plan Free).
3. Vercel inyecta `DATABASE_URL` automáticamente.

### Migrar el esquema

Con `DATABASE_URL` en tu `.env.local` (copiá desde Vercel → Settings → Environment Variables, o desde Neon Console):

```bash
cp .env.example .env.local
# Editá .env.local y pegá DATABASE_URL=postgresql://...

npm run db:migrate
```

> `drizzle-kit` no lee `.env.local` solo: el proyecto ya carga ese archivo en `drizzle.config.ts` vía `dotenv`. Si falta `DATABASE_URL`, el comando falla con un mensaje explícito.

Alternativa rápida en dev (sin archivos de migración):

```bash
npm run db:push
```

Verificá tablas `business_profiles` e `invoice_records` en Neon Console.

## 3. Clerk (auth)

1. Vercel → **Integrations** → **Clerk** → Add.
2. Creá la aplicación Clerk (plan Free).
3. Variables que deben quedar en Vercel:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`

En local, copiá las mismas keys a `.env.local`.

## 4. Vercel Blob (logos)

1. Vercel → **Storage** → **Create Database/Store** → **Blob**.
2. Conectá el store al proyecto.
3. Variable inyectada: `BLOB_READ_WRITE_TOKEN`.

## 5. Variables locales

```bash
vercel env pull .env.local
```

O manualmente desde `.env.example`.

## 6. Health check

Con el dev server corriendo:

```bash
npm run dev
curl http://localhost:3000/api/v2/health
```

Respuesta esperada cuando todo está OK:

```json
{
  "status": "ok",
  "version": "v2",
  "services": {
    "clerk": true,
    "database": { "configured": true, "reachable": true },
    "blob": true
  }
}
```

`status: "degraded"` indica qué servicio falta configurar.

## 7. Rutas protegidas (middleware)

| Ruta | Auth |
|------|------|
| `/` | Pública (v1 sigue funcionando) |
| `/sign-in`, `/sign-up` | Pública |
| `/api/parse-pdf` | Pública (v1) |
| `/api/v2/health` | Pública |
| `/api/v2/*` (resto) | Requiere sesión Clerk |
| `/historial` | Requiere sesión Clerk |

## 8. Scripts útiles

| Comando | Uso |
|---------|-----|
| `npm run db:generate` | Generar migración tras cambiar `src/db/schema.ts` |
| `npm run db:migrate` | Aplicar migraciones en Neon |
| `npm run db:push` | Sync schema directo (solo dev) |
| `npm run db:studio` | UI para inspeccionar datos |

## 9. Próximo paso (Fase 1)

Implementar `GET/PUT /api/v2/profile` y conectar `TicketSettings` a la API.

Ver [`PLAN-V2.md`](./PLAN-V2.md) para el roadmap completo.
