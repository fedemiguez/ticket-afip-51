# Plan de implementación — Ticket AFIP v2

Documento de referencia para implementar persistencia, usuarios, historial y API en Vercel.

**Estado:** planificado (no implementado)  
**Stack MVP:** Vercel + Neon Postgres + Clerk + Vercel Blob + Drizzle

---

## 1. Objetivo

Pasar de v1 (todo en `localStorage`, sin usuarios) a v2 donde:

- Cada **usuario autenticado** tiene un **perfil comercial** (logo, nombre, dirección, teléfono, etc.).
- Cada PDF procesado guarda **solo los datos parseados** (`AfipInvoiceData`), no el PDF binario.
- El usuario puede **consultar historial** y **rearmar/imprimir** un ticket en cualquier momento.
- Todo se expone vía **API REST** en Next.js, desplegable en **Vercel Hobby** con servicios free tier.

### Qué NO entra en v2 (MVP)

- Guardar el PDF original.
- Multi-sucursal / múltiples perfiles por usuario.
- ESC/POS nativo.
- Facturación o planes de pago.
- App móvil nativa.

---

## 2. Stack y servicios

| Capa | Servicio | Free tier relevante | Rol |
|------|----------|---------------------|-----|
| Hosting + API | Vercel Hobby | Deploy + Route Handlers | App Next.js |
| Base de datos | Neon Postgres (integración Vercel) | 0.5 GB, 100 CU-h/mes | Perfiles + historial |
| Auth | Clerk (Marketplace Vercel) | 50K MRU/app | Login, sesiones, API keys |
| Logos | Vercel Blob | 1 GB, 2K uploads/mes | Archivos de imagen |
| ORM | Drizzle + `@neondatabase/serverless` | — | Queries serverless |

### Por qué no Supabase (para MVP)

Supabase free pausa el proyecto a los **7 días sin actividad**. Neon no pausa por inactividad → mejor para un producto en validación con poco tráfico.

### Path de upgrade (cuando haya uso real)

1. Neon → plan **Launch** (pay-as-you-go, sin mínimo).
2. Vercel → **Pro** si se superan límites Hobby.
3. Clerk → **Pro** solo si se superan 50K usuarios retenidos.

---

## 3. Modelo de datos

### 3.1 Tabla `business_profiles`

Un perfil por usuario en MVP (`user_id` = Clerk `userId`).

```sql
CREATE TABLE business_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL DEFAULT 'Mi Comercio',
  subtitle      TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  footer        TEXT NOT NULL DEFAULT 'Gracias por su compra',
  paper_width_mm INTEGER NOT NULL DEFAULT 51,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Mapeo directo desde `TicketConfig` actual (`src/lib/types.ts`), con `logoDataUrl` → `logo_url` (URL de Blob, no base64).

### 3.2 Tabla `invoice_records`

```sql
CREATE TABLE invoice_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  source_file_name TEXT,
  invoice_data     JSONB NOT NULL,
  warnings         JSONB NOT NULL DEFAULT '[]',
  qr_url           TEXT,
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_records_user_processed
  ON invoice_records (user_id, processed_at DESC);

-- Anti-duplicados opcional (activar en Fase 2)
-- CREATE UNIQUE INDEX idx_invoice_unique_per_user
--   ON invoice_records (
--     user_id,
--     (invoice_data->>'cuit'),
--     (invoice_data->>'puntoVenta'),
--     (invoice_data->>'numeroComprobante'),
--     (invoice_data->>'tipoComprobante')
--   );
```

`invoice_data` almacena el tipo `AfipInvoiceData` completo. **No guardar** `rawText` por defecto (pesado, poco útil para reimpresión).

### 3.3 Estimación de storage

- Perfil: ~1 KB.
- Factura parseada: ~2–15 KB.
- Logo en Blob: ~20–200 KB c/u.
- Con 0.5 GB de Neon: decenas de miles de registros antes de pagar.

---

## 4. API REST (v2)

Prefijo: `/api/v2/`

Todas las rutas (excepto health) requieren auth Clerk (`auth()` en server) o API key M2M en integraciones futuras.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v2/profile` | Obtener perfil comercial del usuario |
| `PUT` | `/api/v2/profile` | Crear/actualizar perfil |
| `POST` | `/api/v2/profile/logo` | Subir logo → Blob → actualizar `logo_url` |
| `DELETE` | `/api/v2/profile/logo` | Borrar logo |
| `POST` | `/api/v2/invoices` | Subir PDF → parse → persistir → responder |
| `GET` | `/api/v2/invoices` | Listar historial (`?limit=&cursor=`) |
| `GET` | `/api/v2/invoices/[id]` | Detalle de un comprobante |
| `DELETE` | `/api/v2/invoices/[id]` | Eliminar del historial |

### Contratos de respuesta (borrador)

**GET /api/v2/profile** → `TicketConfig` + `logoUrl`

```json
{
  "businessName": "...",
  "subtitle": "...",
  "address": "...",
  "phone": "...",
  "footer": "...",
  "paperWidthMm": 51,
  "logoUrl": "https://..."
}
```

**POST /api/v2/invoices** (multipart `file`)

Reutiliza `parseAfipPdf()` de `src/lib/parse-afip-pdf.ts`. Respuesta:

```json
{
  "id": "uuid",
  "invoice": { /* AfipInvoiceData */ },
  "qrDataUrl": "data:image/png;base64,...",
  "warnings": [],
  "processedAt": "2026-06-29T..."
}
```

**GET /api/v2/invoices**

```json
{
  "items": [
    {
      "id": "uuid",
      "sourceFileName": "factura.pdf",
      "tipoComprobante": "B",
      "numeroComprobante": "00001234",
      "importeTotal": "15000.00",
      "fechaEmision": "29/06/2026",
      "processedAt": "..."
    }
  ],
  "nextCursor": "..."
}
```

### v1 compatible

Mantener `POST /api/parse-pdf` sin auth para no romper v1 hasta migrar la UI. Marcar como deprecated en README cuando v2 esté estable.

---

## 5. Estructura de carpetas (nueva)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # shell autenticado
│   │   ├── page.tsx                # upload + preview (refactor HomeClient)
│   │   └── historial/page.tsx      # lista + reimprimir
│   └── api/
│       ├── parse-pdf/route.ts      # v1, sin cambios inicialmente
│       └── v2/
│           ├── profile/route.ts
│           ├── profile/logo/route.ts
│           └── invoices/
│               ├── route.ts
│               └── [id]/route.ts
├── components/                     # existentes + nuevos
│   ├── InvoiceHistory.tsx
│   └── UserMenu.tsx
├── db/
│   ├── index.ts                    # cliente Neon + Drizzle
│   ├── schema.ts
│   └── migrations/
├── lib/
│   ├── auth.ts                     # helpers Clerk
│   ├── blob.ts                     # upload/delete logo
│   ├── invoices.ts                 # CRUD invoice_records
│   ├── profile.ts                  # CRUD business_profiles
│   └── ...                         # parse-afip-pdf, types, etc. (sin mover)
└── middleware.ts                   # Clerk protect routes
```

---

## 6. Fases de implementación

### Fase 0 — Setup infra (≈ 2–4 h)

**Checklist:**

- [ ] Crear proyecto en Vercel (si no existe).
- [ ] Integrar **Neon** desde Vercel Marketplace → verificar `DATABASE_URL`.
- [ ] Integrar **Clerk** → verificar `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- [ ] Crear **Blob store** → verificar `BLOB_READ_WRITE_TOKEN`.
- [ ] Instalar dependencias:
  ```bash
  npm install @clerk/nextjs @neondatabase/serverless drizzle-orm @vercel/blob
  npm install -D drizzle-kit
  ```
- [ ] Agregar scripts en `package.json`:
  ```json
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
  ```
- [ ] Crear `drizzle.config.ts`.
- [ ] Correr migración inicial en Neon.
- [ ] Documentar variables en `.env.example` (sin secretos).

**Criterio de done:** `npm run db:migrate` OK en local y en preview de Vercel.

---

### Fase 1 — Auth + perfil (≈ 1 día)

**Checklist:**

- [ ] `src/middleware.ts` con `clerkMiddleware()` — rutas públicas: `/`, `/sign-in`, `/sign-up`.
- [ ] Páginas sign-in / sign-up con componentes Clerk.
- [ ] `GET/PUT /api/v2/profile` con upsert por `user_id`.
- [ ] Refactor `TicketSettings` para leer/escribir vía API en lugar de solo `localStorage`.
- [ ] Fallback: si no hay sesión, mantener comportamiento v1 (`localStorage`).
- [ ] Botón "Importar configuración local" al primer login (lee `ticket-afip-51-config`).

**Criterio de done:** usuario logueado ve su perfil persistido entre dispositivos.

---

### Fase 2 — Historial de facturas (≈ 1–2 días)

**Checklist:**

- [ ] `POST /api/v2/invoices` — wrap de `parseAfipPdf` + insert en DB.
- [ ] `GET /api/v2/invoices` — paginación cursor-based.
- [ ] `GET /api/v2/invoices/[id]` — detalle completo.
- [ ] `DELETE /api/v2/invoices/[id]` — solo owner.
- [ ] Pantalla `/historial` con lista resumida.
- [ ] Acción "Reimprimir" → carga registro + perfil actual → `TicketPreview`.
- [ ] Regenerar QR con `qrcode` si hay `qrUrl` en el registro.

**Criterio de done:** subir PDF estando logueado → aparece en historial → reimprimir funciona.

---

### Fase 3 — Logos en Blob (≈ 4–6 h)

**Checklist:**

- [ ] `POST /api/v2/profile/logo` — validar tipo/tamaño (ej. max 2 MB, jpeg/png/webp).
- [ ] Guardar en Blob path: `logos/{userId}/logo.{ext}`.
- [ ] Actualizar `logo_url` en perfil; borrar blob anterior si existe.
- [ ] `TicketPreview` usa `logoUrl` remota.
- [ ] Migración de logos base64 existentes en localStorage (opcional, one-shot al importar).

**Criterio de done:** logo persiste en la nube y se ve en tickets reimpresos.

---

### Fase 4 — Pulido y deploy producción (≈ 1 día)

**Checklist:**

- [ ] Índice único anti-duplicados (decidir si upsert o error 409).
- [ ] Validación Zod en bodies de API.
- [ ] Manejo de errores consistente (`{ error: string }`).
- [ ] Tests mínimos: parser (existente) + repos profile/invoices.
- [ ] README actualizado con setup v2 y variables de entorno.
- [ ] Deploy producción en Vercel.
- [ ] Smoke test manual: registro → perfil → PDF → historial → reimpresión.

**Criterio de done:** flujo completo en producción sin pasos manuales.

---

### Fase 5 — API externa (opcional, post-MVP)

- [ ] Clerk API Keys para clientes M2M.
- [ ] Rate limiting (Vercel WAF o Upstash).
- [ ] OpenAPI spec en `docs/openapi-v2.yaml`.
- [ ] Webhook post-parse (si algún integrador lo necesita).

---

## 7. Cambios en la UI

| Pantalla | v1 | v2 |
|----------|----|----|
| `/` | Upload + preview + settings | Igual, pero settings desde API si hay sesión |
| `/historial` | — | Lista de comprobantes + reimprimir |
| `/sign-in` | — | Clerk |
| Header | — | UserMenu (avatar, logout, historial) |

Flujo principal sin cambios para el usuario: subir PDF → ver ticket → imprimir. Lo nuevo es persistencia y historial.

---

## 8. Seguridad

- Todas las queries filtran por `user_id` del token Clerk — nunca confiar en `userId` del body.
- Validar ownership en `GET/DELETE /invoices/[id]`.
- Logos en Blob: path por `userId`, no URLs adivinables (usar URLs firmadas si se pasa a private access).
- No loguear contenido de PDFs ni datos fiscales completos en producción.
- CORS: same-origin por defecto (Next.js). Si hay API externa, restringir origins.

---

## 9. Variables de entorno

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Neon (auto-inyectadas por Vercel)
DATABASE_URL=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=
```

---

## 10. Orden sugerido de PRs

Para revisar en chunks pequeños:

1. **PR-1:** Infra — Drizzle schema, migraciones, `.env.example`, deps.
2. **PR-2:** Clerk — middleware, sign-in/up, layout autenticado.
3. **PR-3:** API profile — GET/PUT + refactor TicketSettings.
4. **PR-4:** API invoices — POST/GET/DELETE + persistencia.
5. **PR-5:** UI historial — pantalla + reimprimir.
6. **PR-6:** Logo Blob — upload + preview.
7. **PR-7:** Docs + deploy + smoke tests.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Neon free suspende compute al superar 100 CU-h | Scale-to-zero ya ayuda; monitorear uso en Neon console |
| PDF parser falla en formatos ARCA nuevos | Guardar `warnings[]`; permitir editar `qrUrl` manual (ya existe en v1) |
| Logo base64 grande en localStorage | Migrar a Blob en Fase 3; limitar tamaño en upload |
| Usuario pierde acceso Clerk | Export CSV historial (futuro); por ahora confiar en Clerk |
| Cold start Neon (~100–300 ms) | Aceptable para MVP; connection pooling con `@neondatabase/serverless` |

---

## 12. Definición de "v2 lista"

- [ ] Usuario puede registrarse e iniciar sesión.
- [ ] Perfil comercial persiste en DB (sin depender de localStorage).
- [ ] PDF procesado se guarda como JSON en historial.
- [ ] Usuario puede reimprimir cualquier comprobante del historial.
- [ ] Logo se guarda en Blob.
- [ ] App desplegada en Vercel con Neon + Clerk configurados.
- [ ] README documenta setup v2.

---

## 13. Referencias internas

- Tipos actuales: `src/lib/types.ts` (`TicketConfig`, `AfipInvoiceData`)
- Parser PDF: `src/lib/parse-afip-pdf.ts`
- API v1: `src/app/api/parse-pdf/route.ts`
- Preview: `src/components/TicketPreview.tsx`
- Settings: `src/components/TicketSettings.tsx`

---

*Última actualización: junio 2026*
