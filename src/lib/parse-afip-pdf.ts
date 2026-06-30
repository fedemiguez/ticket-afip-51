import pdf from "pdf-parse";
import { extractAfipFields, extractItems } from "./afip-patterns";
import { generateQrDataUrl } from "./afip-qr";
import type { AfipInvoiceData, ParsePdfResponse } from "./types";

function buildWarnings(invoice: AfipInvoiceData): string[] {
  const warnings: string[] = [];

  if (!invoice.cae) {
    warnings.push("No se detectó el CAE. Revisá el PDF manualmente.");
  }
  if (!invoice.qrUrl && !invoice.cae) {
    warnings.push(
      "No se pudo reconstruir el QR ARCA. El código QR es obligatorio en comprobantes electrónicos.",
    );
  }
  if (!invoice.importeTotal) {
    warnings.push("No se detectó el importe total.");
  }
  if (!invoice.numeroComprobante || !invoice.puntoVenta) {
    warnings.push("No se detectó punto de venta o número de comprobante.");
  }

  return warnings;
}

export async function parseAfipPdf(
  buffer: Buffer,
  filename?: string,
): Promise<ParsePdfResponse> {
  const parsed = await pdf(buffer);
  const text = parsed.text ?? "";
  const fields = extractAfipFields(text, filename);

  const invoice: AfipInvoiceData = {
    razonSocial: fields.razonSocial,
    domicilioComercial: fields.domicilioComercial,
    cuit: fields.cuit,
    condicionIva: fields.condicionIva,
    tipoComprobante: fields.tipoComprobante,
    puntoVenta: fields.puntoVenta,
    numeroComprobante: fields.numeroComprobante,
    fechaEmision: fields.fechaEmision,
    receptorRazonSocial: fields.receptorRazonSocial,
    receptorDocumento: fields.receptorDocumento,
    tipoDocReceptor: fields.tipoDocReceptor,
    nroDocReceptor: fields.nroDocReceptor,
    subtotal: fields.subtotal,
    iva: fields.iva,
    importeTotal: fields.importeTotal,
    cae: fields.cae,
    caeVencimiento: fields.caeVencimiento,
    qrUrl: fields.qrUrl,
    items: extractItems(text),
    rawText: text,
  };

  const qrDataUrl = await generateQrDataUrl(invoice);
  const warnings = buildWarnings(invoice);

  if (!qrDataUrl && invoice.cae) {
    warnings.push(
      "Se extrajo el CAE pero faltan datos para regenerar el QR. Podés pegar la URL del QR manualmente.",
    );
  }

  return { invoice, qrDataUrl, warnings };
}
