"use client";

import { useRef, useState } from "react";
import {
  downloadTicketPdf,
  openPrintWindow,
} from "@/lib/download-ticket-pdf";
import type { AfipInvoiceData, TicketConfig } from "@/lib/types";

interface TicketPreviewProps {
  invoice: AfipInvoiceData;
  config: TicketConfig;
  qrDataUrl: string | null;
}

function formatCuit(cuit?: string) {
  if (!cuit || cuit.length !== 11) return cuit ?? "-";
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="ticket-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function TicketPreview({ invoice, config, qrDataUrl }: TicketPreviewProps) {
  const ticketRef = useRef<HTMLElement>(null);
  const [downloading, setDownloading] = useState(false);

  const comprobante =
    invoice.tipoComprobante && invoice.puntoVenta && invoice.numeroComprobante
      ? `Factura ${invoice.tipoComprobante} ${invoice.puntoVenta.padStart(4, "0")}-${invoice.numeroComprobante.padStart(8, "0")}`
      : undefined;

  async function handleDownloadPdf() {
    if (!ticketRef.current) return;

    setDownloading(true);
    try {
      await downloadTicketPdf(ticketRef.current, {
        widthMm: config.paperWidthMm,
        filename: `ticket-${invoice.puntoVenta ?? "0000"}-${invoice.numeroComprobante ?? "00000000"}.pdf`,
      });
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    if (!ticketRef.current) return;
    openPrintWindow(ticketRef.current, config.paperWidthMm);
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Vista previa {config.paperWidthMm}mm
          </h2>
          <p className="text-sm text-zinc-500">
            Ticket reestructurado, listo para imprimir
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={downloading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {downloading ? "Generando..." : `Descargar PDF ${config.paperWidthMm}mm`}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <p className="font-medium">El navegador no permite elegir 51mm en el diálogo de impresión</p>
        <p className="mt-1 text-blue-900/90">
          Usá <strong>Descargar PDF {config.paperWidthMm}mm</strong> y abrí ese archivo con tu
          impresora térmica. El PDF ya viene con el ancho correcto. En Windows, configurá el
          tamaño personalizado en{" "}
          <strong>Preferencias de impresora → Avanzado → Tamaño de papel</strong>.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-zinc-100 p-4">
        <article
          ref={ticketRef}
          id="thermal-ticket"
          className="thermal-ticket mx-auto bg-white text-black shadow"
          style={{ width: `${config.paperWidthMm}mm` }}
        >
          {config.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.logoDataUrl}
              alt="Logo"
              className="ticket-logo"
            />
          ) : null}

          <h1 className="ticket-title">{config.businessName}</h1>
          {config.subtitle ? <p className="ticket-subtitle">{config.subtitle}</p> : null}
          {config.address ? <p className="ticket-muted">{config.address}</p> : null}
          {config.phone ? <p className="ticket-muted">{config.phone}</p> : null}

          <div className="ticket-divider" />

          <Row label="Emisor" value={invoice.razonSocial} />
          <Row label="CUIT" value={formatCuit(invoice.cuit)} />
          <Row label="IVA" value={invoice.condicionIva} />
          <Row label="Comprobante" value={comprobante} />
          <Row label="Fecha" value={invoice.fechaEmision} />

          <div className="ticket-divider" />

          <Row label="Cliente" value={invoice.receptorRazonSocial} />
          <Row label="Doc." value={invoice.receptorDocumento} />

          {invoice.items.length > 0 ? (
            <>
              <div className="ticket-divider" />
              <div className="ticket-items">
                {invoice.items.map((item, index) => (
                  <div key={`${item.description}-${index}`} className="ticket-item">
                    <span>{item.description}</span>
                    {item.amount ? <strong>${item.amount}</strong> : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="ticket-divider" />

          <Row label="Subtotal" value={invoice.subtotal ? `$ ${invoice.subtotal}` : undefined} />
          <Row label="IVA" value={invoice.iva ? `$ ${invoice.iva}` : undefined} />
          <Row
            label="TOTAL"
            value={invoice.importeTotal ? `$ ${invoice.importeTotal}` : undefined}
          />

          <div className="ticket-divider" />

          <Row label="CAE" value={invoice.cae} />
          <Row label="Vto. CAE" value={invoice.caeVencimiento} />

          {qrDataUrl ? (
            <div className="ticket-qr-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR ARCA" className="ticket-qr" />
              <p className="ticket-muted">Comprobante autorizado ARCA</p>
            </div>
          ) : (
            <p className="ticket-warning">
              QR no disponible. Verificá los datos extraídos del PDF.
            </p>
          )}

          {config.footer ? <p className="ticket-footer">{config.footer}</p> : null}
        </article>
      </div>
    </section>
  );
}
