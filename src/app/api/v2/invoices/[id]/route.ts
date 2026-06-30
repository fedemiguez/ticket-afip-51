import { generateQrDataUrl } from "@/lib/afip-qr";
import { jsonError, jsonOk } from "@/lib/api-response";
import { ApiError, requireUserId } from "@/lib/auth";
import { deleteInvoiceRecord, getInvoiceRecordById } from "@/lib/invoices";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    const record = await getInvoiceRecordById(userId, id);

    if (!record) {
      throw new ApiError("Comprobante no encontrado.", 404);
    }

    const invoice = { ...record.invoiceData };
    if (record.qrUrl && !invoice.qrUrl) {
      invoice.qrUrl = record.qrUrl;
    }

    const qrDataUrl = await generateQrDataUrl(invoice);

    return jsonOk({
      id: record.id,
      sourceFileName: record.sourceFileName,
      invoice,
      qrDataUrl,
      warnings: record.warnings,
      processedAt: record.processedAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error, "No se pudo cargar el comprobante.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    const deleted = await deleteInvoiceRecord(userId, id);

    if (!deleted) {
      throw new ApiError("Comprobante no encontrado.", 404);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, "No se pudo eliminar el comprobante.");
  }
}
