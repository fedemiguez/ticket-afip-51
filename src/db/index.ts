import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cachedDb: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (cachedDb) return cachedDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no está configurada. Conectá Neon desde el dashboard de Vercel.",
    );
  }

  cachedDb = drizzle(neon(databaseUrl), { schema });
  return cachedDb;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function pingDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { schema };
