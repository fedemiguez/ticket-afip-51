export type AfipComprobanteTipo = "A" | "B" | "C" | "E" | "M" | "X";

export interface AfipInvoiceItem {
  description: string;
  quantity?: string;
  unitPrice?: string;
  amount?: string;
}

export interface AfipInvoiceData {
  razonSocial?: string;
  domicilioComercial?: string;
  cuit?: string;
  ingresosBrutos?: string;
  inicioActividades?: string;
  condicionIva?: string;
  tipoComprobante?: AfipComprobanteTipo;
  puntoVenta?: string;
  numeroComprobante?: string;
  fechaEmision?: string;
  periodoDesde?: string;
  periodoHasta?: string;
  fechaVencimientoPago?: string;
  receptorRazonSocial?: string;
  receptorDocumento?: string;
  receptorCondicionIva?: string;
  items: AfipInvoiceItem[];
  subtotal?: string;
  iva?: string;
  otrosTributos?: string;
  importeTotal?: string;
  cae?: string;
  caeVencimiento?: string;
  moneda?: string;
  cotizacion?: string;
  tipoDocReceptor?: string;
  nroDocReceptor?: string;
  qrUrl?: string;
  rawText?: string;
}

export interface TicketConfig {
  businessName: string;
  subtitle: string;
  address: string;
  phone: string;
  footer: string;
  logoDataUrl: string | null;
  paperWidthMm: number;
}

export interface ParsePdfResponse {
  invoice: AfipInvoiceData;
  qrDataUrl: string | null;
  warnings: string[];
}

export const DEFAULT_TICKET_CONFIG: TicketConfig = {
  businessName: "Mi Comercio",
  subtitle: "",
  address: "",
  phone: "",
  footer: "Gracias por su compra",
  logoDataUrl: null,
  paperWidthMm: 51,
};

export const TICKET_CONFIG_STORAGE_KEY = "ticket-afip-51-config";
