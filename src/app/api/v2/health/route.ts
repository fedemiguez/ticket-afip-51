import { isDatabaseConfigured, pingDatabase } from "@/db";
import { isBlobConfigured } from "@/lib/blob";
import { jsonOk } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();
  const blobConfigured = isBlobConfigured();
  const clerkConfigured = Boolean(
    process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  const databaseReachable = databaseConfigured ? await pingDatabase() : false;

  const status =
    clerkConfigured && databaseConfigured && databaseReachable && blobConfigured
      ? "ok"
      : "degraded";

  return jsonOk({
    status,
    version: "v2",
    services: {
      clerk: clerkConfigured,
      database: {
        configured: databaseConfigured,
        reachable: databaseReachable,
      },
      blob: blobConfigured,
    },
  });
}
