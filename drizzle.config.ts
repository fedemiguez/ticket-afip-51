import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" });

// Migraciones: preferir conexión directa (Neon/Vercel suele exponer DATABASE_URL_UNPOOLED).
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    [
      "DATABASE_URL no está definida.",
      "1. Copiá .env.example a .env.local",
      "2. Pegá la connection string de Neon en DATABASE_URL (o DATABASE_URL_UNPOOLED)",
      "3. Volvé a correr: npm run db:migrate",
    ].join("\n"),
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
