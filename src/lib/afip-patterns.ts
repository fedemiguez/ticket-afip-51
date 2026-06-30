import type { AfipComprobanteTipo, AfipInvoiceItem } from "./types";

const COD_TO_TIPO: Record<string, AfipComprobanteTipo> = {
  "001": "A",
  "006": "B",
  "011": "C",
  "019": "E",
  "051": "M",
};

const TIPO_FROM_COD: Record<string, AfipComprobanteTipo> = {
  "1": "A",
  "6": "B",
  "11": "C",
  "19": "E",
  "51": "M",
};

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function isDateLine(line: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(line);
}

function isCuitLine(line: string): boolean {
  return /^\d{11}$/.test(line);
}

function isCaeLine(line: string): boolean {
  return /^\d{14}$/.test(line);
}

function parseAmountLine(line: string): number | undefined {
  if (!/^[\d.,]+$/.test(line)) return undefined;
  if (/^\d{11}$/.test(line) || /^\d{14}$/.test(line)) return undefined;
  if (!line.includes(",")) return undefined;

  const normalized = line.replace(/\./g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 99_999_999) {
    return undefined;
  }

  return amount;
}

function formatAmount(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function looksLikePersonName(line: string): boolean {
  if (line.length < 5 || line.length > 80) return false;
  if (/^\d/.test(line)) return false;
  if (
    /^(ORIGINAL|DUPLICADO|TRIPLICADO|FACTURA|COD\.|Pág\.|Contado|unidades|Consumidor Final|Responsable Monotributo|IVA\b)/i.test(
      line,
    )
  ) {
    return false;
  }
  if (/[:$]/.test(line)) return false;
  return /^[A-ZÁÉÍÓÚÑÜ\s.]+$/.test(line);
}

function isIvaCondition(line: string): boolean {
  return /^(Responsable Monotributo|IVA Responsable Inscripto|IVA Sujeto Exento|IVA No Alcanzado|Consumidor Final)$/i.test(
    line,
  );
}

/** ARCA suele incluir ORIGINAL + DUPLICADO + TRIPLICADO en un solo PDF. */
export function getPrimaryInvoiceText(text: string): string {
  const normalized = text.replace(/\r/g, "\n");
  const duplicateIndex = normalized.search(/\n(?:DUPLICADO|TRIPLICADO)\n/);

  if (duplicateIndex >= 0) {
    return normalized.slice(0, duplicateIndex);
  }

  return normalized;
}

export function parseFilenameHints(filename?: string) {
  if (!filename) return {};

  const match = filename.match(/(\d{11})_(\d{3})_(\d{5})_(\d{8})/i);
  if (!match) return {};

  const cod = match[2];
  return {
    cuit: match[1],
    codComprobante: cod,
    tipoComprobante: COD_TO_TIPO[cod],
    puntoVenta: String(Number(match[3])),
    numeroComprobante: String(Number(match[4])),
  };
}

function extractReceptor(
  lines: string[],
  options: {
    emisorRazonSocial?: string;
    emisorIva?: string;
    receiverCuit?: string;
  },
) {
  const { emisorRazonSocial, emisorIva, receiverCuit } = options;

  const condicionIvaReceptor = lines.find(
    (line) => line !== emisorIva && isIvaCondition(line),
  );

  const facturaIndex = lines.findIndex((line) => line === "FACTURA");
  const productHeaderIndex = lines.findIndex((line) =>
    /^Código.*Producto/i.test(line),
  );
  const searchStart = facturaIndex >= 0 ? facturaIndex : 0;
  const searchEnd =
    productHeaderIndex >= 0 ? productHeaderIndex : lines.length;
  const receptorSection = lines.slice(searchStart, searchEnd);

  const emisorIvaIndex = emisorIva
    ? receptorSection.findIndex((line) => line === emisorIva)
    : -1;
  const afterEmisorIva =
    emisorIvaIndex >= 0
      ? receptorSection.slice(emisorIvaIndex + 1)
      : receptorSection;

  const receptorName = afterEmisorIva.find(looksLikePersonName);
  const docLine = afterEmisorIva.find((line) => /^Doc\.\s*:/i.test(line));
  const docValue = docLine?.replace(/^Doc\.\s*:\s*/i, "").trim();

  let receptorRazonSocial = receptorName;
  if (!receptorRazonSocial && condicionIvaReceptor) {
    receptorRazonSocial = condicionIvaReceptor;
  }
  if (receptorRazonSocial === emisorRazonSocial && condicionIvaReceptor) {
    receptorRazonSocial = condicionIvaReceptor;
  }

  const receptorDocumento = docValue ?? receiverCuit;
  const hasDocument =
    Boolean(receiverCuit) ||
    (Boolean(docValue) && docValue !== "-" && docValue !== "0");

  return {
    receptorRazonSocial,
    receptorDocumento,
    condicionIvaReceptor,
    tipoDocReceptor: hasDocument ? "80" : "99",
    nroDocReceptor: hasDocument
      ? (receiverCuit ?? docValue?.replace(/\D/g, "") ?? "0")
      : "0",
  };
}

function parseCombinedCompNumber(line: string) {
  const digits = line.replace(/\D/g, "");
  if (digits.length !== 13) return null;

  return {
    puntoVenta: String(Number(digits.slice(0, 5))),
    numeroComprobante: String(Number(digits.slice(5))),
  };
}

function extractArcaLayout(lines: string[], filename?: string) {
  const hints = parseFilenameHints(filename);
  const dates = lines.filter(isDateLine);
  const caeIndex = lines.findIndex(isCaeLine);
  const cae = caeIndex >= 0 ? lines[caeIndex] : undefined;
  const caeVencimiento =
    caeIndex > 0 && isDateLine(lines[caeIndex - 1])
      ? lines[caeIndex - 1]
      : undefined;

  const fechaEmision =
    dates.find((date) => {
      const year = Number(date.slice(6));
      return year >= 2020 && date !== caeVencimiento;
    }) ?? dates[0];

  const combinedCompIndex = lines.findIndex(
    (line) =>
      /^\d{13}$/.test(line.replace(/\D/g, "")) &&
      line.replace(/\D/g, "").length === 13,
  );
  const combinedComp =
    combinedCompIndex >= 0
      ? parseCombinedCompNumber(lines[combinedCompIndex])
      : null;

  const standaloneCuits = lines.filter(isCuitLine);

  const receiverCuit = firstMatch(lines.join("\n"), [
    /CUIT:\s*(\d{11})/i,
    /CUIT\s+(\d{11})/i,
  ]);

  const emitterCuit =
    hints.cuit ??
    standaloneCuits.find((value) => value !== receiverCuit) ??
    standaloneCuits[0];

  const facturaIndex = lines.findIndex((line) => line === "FACTURA");
  const tipoFromLetter =
    facturaIndex >= 0 && /^[ABCEM]$/.test(lines[facturaIndex + 1] ?? "")
      ? (lines[facturaIndex + 1] as AfipComprobanteTipo)
      : undefined;

  const codLine = lines.find((line) => /^COD\.\s*\d{3}$/i.test(line));
  const codComprobante = codLine?.match(/\d{3}/)?.[0];
  const tipoFromCod = codComprobante
    ? COD_TO_TIPO[codComprobante.padStart(3, "0")]
    : undefined;

  const amountCandidates = lines
    .map(parseAmountLine)
    .filter((value): value is number => value !== undefined && value >= 1);

  const importeTotal =
    amountCandidates.length > 0
      ? formatAmount(Math.max(...amountCandidates))
      : undefined;

  const originalIndex = lines.findIndex((line) => line === "ORIGINAL");
  const razonSocialCandidates = lines.filter(looksLikePersonName);
  const razonSocial =
    (originalIndex >= 0 ? lines[originalIndex + 1] : undefined) ??
    razonSocialCandidates[0];

  const condicionIvaEmisor = lines.find(isIvaCondition);

  const receptor = extractReceptor(lines, {
    emisorRazonSocial: razonSocial,
    emisorIva: condicionIvaEmisor,
    receiverCuit,
  });

  const domicilioComercial = lines.find((line) =>
    /^\d{2,5}\s+.+(Córdoba|Buenos Aires|Santa Fe|Cordoba)/i.test(line),
  );

  return {
    cuit: emitterCuit,
    cae,
    caeVencimiento,
    puntoVenta: combinedComp?.puntoVenta ?? hints.puntoVenta,
    numeroComprobante:
      combinedComp?.numeroComprobante ?? hints.numeroComprobante,
    fechaEmision,
    importeTotal,
    razonSocial,
    domicilioComercial,
    condicionIva: condicionIvaEmisor,
    tipoComprobante:
      hints.tipoComprobante ?? tipoFromLetter ?? tipoFromCod,
    receptorRazonSocial: receptor.receptorRazonSocial,
    receptorDocumento: receptor.receptorDocumento,
    tipoDocReceptor: receptor.tipoDocReceptor,
    nroDocReceptor: receptor.nroDocReceptor,
    condicionIvaReceptor: receptor.condicionIvaReceptor,
    codComprobante: hints.codComprobante ?? codComprobante,
  };
}

export function extractAfipFields(text: string, filename?: string) {
  const normalized = getPrimaryInvoiceText(text).replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const arca = extractArcaLayout(lines, filename);

  if (arca.cae && arca.puntoVenta && arca.cuit) {
    return {
      ...arca,
      qrUrl: firstMatch(normalized, [
        /(https?:\/\/(?:www\.)?afip\.gob\.ar\/fe\/qr\/\?p=[A-Za-z0-9+/=_-]+)/i,
        /(https?:\/\/(?:www\.)?arca\.gob\.ar\/fe\/qr\/\?p=[A-Za-z0-9+/=_-]+)/i,
      ]),
      subtotal: arca.importeTotal,
      iva: undefined,
    };
  }

  const cuit = firstMatch(normalized, [
    /C\.?U\.?I\.?T\.?\s*:?\s*(\d{2}-\d{8}-\d)/i,
    /CUIT\s+(\d{11})/i,
  ]);

  const cae = firstMatch(normalized, [
    /C\.?A\.?E\.?\s*(?:N[°º.]?\s*)?:?\s*(\d{14})/i,
    /Código de Autorización(?:\s*de\s*Impresión)?\s*:?\s*(\d{14})/i,
  ]);

  return {
    cuit: cuit?.replace(/\D/g, "") ?? arca.cuit,
    cae: cae ?? arca.cae,
    caeVencimiento:
      firstMatch(normalized, [
        /Fecha de Vto\.?\s*(?:de\s*)?C\.?A\.?E\.?\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
      ]) ?? arca.caeVencimiento,
    puntoVenta:
      firstMatch(normalized, [/Punto de Venta\s*:?\s*(\d{1,5})/i]) ??
      arca.puntoVenta,
    numeroComprobante:
      firstMatch(normalized, [/Comp(?:robante)?\.?\s*N(?:ro|°|º)\.?\s*:?\s*(\d{1,8})/i]) ??
      arca.numeroComprobante,
    fechaEmision:
      firstMatch(normalized, [/Fecha de Emisión\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i]) ??
      arca.fechaEmision,
    importeTotal:
      firstMatch(normalized, [/Importe Total\s*:?\s*\$?\s*([\d.,]+)/i]) ??
      arca.importeTotal,
    razonSocial:
      firstMatch(normalized, [/Raz[oó]n Social\s*:?\s*(.+)/i]) ?? arca.razonSocial,
    domicilioComercial:
      firstMatch(normalized, [/Domicilio Comercial\s*:?\s*(.+)/i]) ??
      arca.domicilioComercial,
    condicionIva:
      firstMatch(normalized, [/Condici[oó]n frente al IVA\s*:?\s*(.+)/i]) ??
      arca.condicionIva,
    tipoComprobante:
      (firstMatch(normalized, [/Factura\s+([ABCEM])/i]) as
        | AfipComprobanteTipo
        | undefined) ?? arca.tipoComprobante,
    qrUrl: firstMatch(normalized, [
      /(https?:\/\/(?:www\.)?afip\.gob\.ar\/fe\/qr\/\?p=[A-Za-z0-9+/=_-]+)/i,
      /(https?:\/\/(?:www\.)?arca\.gob\.ar\/fe\/qr\/\?p=[A-Za-z0-9+/=_-]+)/i,
    ]),
    receptorRazonSocial:
      firstMatch(normalized, [
        /Apellido y Nombre\s*\/\s*Raz[oó]n Social\s*:?\s*(.+)/i,
      ]) ?? arca.receptorRazonSocial,
    receptorDocumento:
      firstMatch(normalized, [/CUIT\/CUIL\/CDI\s*:?\s*([\d.-]+)/i]) ??
      arca.receptorDocumento,
    tipoDocReceptor: arca.tipoDocReceptor,
    nroDocReceptor: arca.nroDocReceptor,
    subtotal:
      firstMatch(normalized, [/Subtotal\s*:?\s*\$?\s*([\d.,]+)/i]) ??
      arca.importeTotal,
    iva: firstMatch(normalized, [/IVA(?:\s+\d+%)?\s*:?\s*\$?\s*([\d.,]+)/i]),
  };
}

export function extractItems(text: string): AfipInvoiceItem[] {
  const lines = getPrimaryInvoiceText(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: AfipInvoiceItem[] = [];
  const seen = new Set<string>();

  function addItem(item: AfipInvoiceItem) {
    const key = `${item.description}|${item.quantity ?? ""}|${item.amount ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const productMatch = line.match(/^(.+?)(\d+,\d{2})$/);
    if (!productMatch) continue;
    if (lines[index + 1] !== "unidades") continue;

    const priceLine = lines[index + 2] ?? "";
    const amountParts = priceLine.match(/\d+,\d{2}/g) ?? [];
    const subtotal = amountParts[1] ?? amountParts[0];

    addItem({
      description: productMatch[1].trim(),
      quantity: productMatch[2],
      amount: subtotal,
    });

    index += 2;
  }

  if (items.length > 0) {
    return items.slice(0, 20);
  }

  for (const line of lines) {
    const itemMatch = line.match(/^(.{3,}?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/);
    if (itemMatch) {
      addItem({
        description: itemMatch[1].trim(),
        amount: itemMatch[4].trim(),
      });
    }
  }

  return items.slice(0, 20);
}

export { TIPO_FROM_COD };
