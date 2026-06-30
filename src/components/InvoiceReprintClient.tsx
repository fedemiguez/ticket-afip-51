"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TicketPreview } from "@/components/TicketPreview";
import { profileResponseToTicketConfig } from "@/lib/ticket-config";
import type {
  AfipInvoiceData,
  InvoiceDetailResponse,
  ProfileResponse,
  TicketConfig,
} from "@/lib/types";
import { DEFAULT_TICKET_CONFIG } from "@/lib/types";

interface InvoiceReprintClientProps {
  invoiceId: string;
}

export function InvoiceReprintClient({ invoiceId }: InvoiceReprintClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<AfipInvoiceData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [config, setConfig] = useState<TicketConfig>(DEFAULT_TICKET_CONFIG);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [processedAt, setProcessedAt] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [invoiceRes, profileRes] = await Promise.all([
          fetch(`/api/v2/invoices/${invoiceId}`),
          fetch("/api/v2/profile"),
        ]);

        const invoiceData = (await invoiceRes.json()) as InvoiceDetailResponse & {
          error?: string;
        };
        const profileData = (await profileRes.json()) as ProfileResponse & {
          error?: string;
        };

        if (!invoiceRes.ok) {
          throw new Error(invoiceData.error ?? "Comprobante no encontrado");
        }

        setInvoice(invoiceData.invoice);
        setQrDataUrl(invoiceData.qrDataUrl);
        setWarnings(invoiceData.warnings);
        setSourceFileName(invoiceData.sourceFileName);
        setProcessedAt(invoiceData.processedAt);

        if (profileRes.ok) {
          setConfig(profileResponseToTicketConfig(profileData));
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Error al cargar el comprobante",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Cargando comprobante…
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Comprobante no encontrado"}
        </div>
        <Link
          href="/historial"
          className="text-sm font-medium text-zinc-900 underline"
        >
          Volver al historial
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/historial"
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            ← Volver al historial
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            Reimprimir comprobante
          </h1>
          <p className="text-sm text-zinc-500">
            {sourceFileName ? `Archivo: ${sourceFileName}` : null}
            {processedAt
              ? ` · Procesado ${new Date(processedAt).toLocaleString("es-AR")}`
              : null}
          </p>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Advertencias al procesar</p>
          <ul className="mt-2 list-disc pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <TicketPreview invoice={invoice} config={config} qrDataUrl={qrDataUrl} />
    </div>
  );
}
