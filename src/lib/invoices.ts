import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { invoiceRecords, type InvoiceRecord } from "@/db/schema";
import type { AfipInvoiceData } from "@/lib/types";

export interface InvoiceListItem {
  id: string;
  sourceFileName: string | null;
  tipoComprobante: string | null;
  numeroComprobante: string | null;
  importeTotal: string | null;
  fechaEmision: string | null;
  processedAt: Date;
}

export interface InvoiceListResult {
  items: InvoiceListItem[];
  nextCursor: string | null;
}

function toListItem(record: InvoiceRecord): InvoiceListItem {
  const invoice = record.invoiceData;

  return {
    id: record.id,
    sourceFileName: record.sourceFileName,
    tipoComprobante: invoice.tipoComprobante ?? null,
    numeroComprobante: invoice.numeroComprobante ?? null,
    importeTotal: invoice.importeTotal ?? null,
    fechaEmision: invoice.fechaEmision ?? null,
    processedAt: record.processedAt,
  };
}

export async function createInvoiceRecord(input: {
  userId: string;
  sourceFileName?: string | null;
  invoice: AfipInvoiceData;
  warnings?: string[];
  qrUrl?: string | null;
}): Promise<InvoiceRecord> {
  const db = getDb();
  const invoiceData = { ...input.invoice };
  delete invoiceData.rawText;

  const [created] = await db
    .insert(invoiceRecords)
    .values({
      userId: input.userId,
      sourceFileName: input.sourceFileName ?? null,
      invoiceData,
      warnings: input.warnings ?? [],
      qrUrl: input.qrUrl ?? invoiceData.qrUrl ?? null,
    })
    .returning();

  return created;
}

export async function listInvoiceRecords(
  userId: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<InvoiceListResult> {
  const db = getDb();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  const conditions = [eq(invoiceRecords.userId, userId)];

  if (options.cursor) {
    conditions.push(lt(invoiceRecords.processedAt, new Date(options.cursor)));
  }

  const rows = await db
    .select()
    .from(invoiceRecords)
    .where(and(...conditions))
    .orderBy(desc(invoiceRecords.processedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toListItem);
  const nextCursor =
    hasMore && items.length > 0
      ? items[items.length - 1].processedAt.toISOString()
      : null;

  return { items, nextCursor };
}

export async function getInvoiceRecordById(
  userId: string,
  id: string,
): Promise<InvoiceRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(invoiceRecords)
    .where(and(eq(invoiceRecords.id, id), eq(invoiceRecords.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function deleteInvoiceRecord(
  userId: string,
  id: string,
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(invoiceRecords)
    .where(and(eq(invoiceRecords.id, id), eq(invoiceRecords.userId, userId)))
    .returning({ id: invoiceRecords.id });

  return deleted.length > 0;
}
