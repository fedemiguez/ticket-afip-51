import QRCode from "qrcode";
import type { AfipInvoiceData } from "./types";

const TIPO_COMPROBANTE: Record<string, number> = {
  A: 1,
  B: 6,
  C: 11,
  E: 19,
  M: 51,
};

function toAfipDate(fecha?: string): string | undefined {
  if (!fecha) return undefined;
  const match = fecha.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return undefined;
  return `${match[3]}${match[2]}${match[1]}`;
}

function parseAmount(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}

export function buildAfipQrUrl(invoice: AfipInvoiceData): string | null {
  if (invoice.qrUrl) {
    return invoice.qrUrl;
  }

  const cuit = invoice.cuit ? Number(invoice.cuit) : undefined;
  const ptoVta = invoice.puntoVenta ? Number(invoice.puntoVenta) : undefined;
  const nroCmp = invoice.numeroComprobante
    ? Number(invoice.numeroComprobante)
    : undefined;
  const importe = parseAmount(invoice.importeTotal);
  const fecha = toAfipDate(invoice.fechaEmision);
  const tipoCmp = invoice.tipoComprobante
    ? TIPO_COMPROBANTE[invoice.tipoComprobante]
    : undefined;

  if (!cuit || !ptoVta || !nroCmp || !importe || !fecha || !invoice.cae || !tipoCmp) {
    return null;
  }

  const payload = {
    ver: 1,
    fecha,
    cuit,
    ptoVta,
    tipoCmp,
    nroCmp,
    importe,
    moneda: invoice.moneda ?? "PES",
    ctz: invoice.cotizacion ? Number(invoice.cotizacion) : 1,
    tipoDocRec: invoice.tipoDocReceptor
      ? Number(invoice.tipoDocReceptor)
      : 99,
    nroDocRec: invoice.nroDocReceptor
      ? Number(invoice.nroDocReceptor.replace(/\D/g, ""))
      : 0,
    tipoCodAut: "E",
    codAut: Number(invoice.cae),
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `https://www.afip.gob.ar/fe/qr/?p=${encoded}`;
}

export async function generateQrDataUrl(
  invoice: AfipInvoiceData,
): Promise<string | null> {
  const url = buildAfipQrUrl(invoice);
  if (!url) return null;

  return QRCode.toDataURL(url, {
    margin: 1,
    width: 180,
    errorCorrectionLevel: "M",
  });
}
