import { jsonError, jsonOk } from "@/lib/api-response";
import { ApiError, requireUserId } from "@/lib/auth";
import { createInvoiceRecord, listInvoiceRecords } from "@/lib/invoices";
import { parseAfipPdf } from "@/lib/parse-afip-pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError("Tenés que subir un archivo PDF.", 400);
    }

    if (file.type !== "application/pdf") {
      throw new ApiError("El archivo debe ser un PDF.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseAfipPdf(buffer, file.name);

    const record = await createInvoiceRecord({
      userId,
      sourceFileName: file.name,
      invoice: result.invoice,
      warnings: result.warnings,
      qrUrl: result.invoice.qrUrl,
    });

    return jsonOk({
      id: record.id,
      invoice: result.invoice,
      qrDataUrl: result.qrDataUrl,
      warnings: result.warnings,
      processedAt: record.processedAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error, "No se pudo procesar el PDF.");
  }
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");

    const result = await listInvoiceRecords(userId, {
      limit: limitParam ? Number(limitParam) : undefined,
      cursor,
    });

    return jsonOk({
      items: result.items.map((item) => ({
        ...item,
        processedAt: item.processedAt.toISOString(),
      })),
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    return jsonError(error, "No se pudo cargar el historial.");
  }
}
