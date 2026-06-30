"use client";

import { useCallback, useState } from "react";
import { TicketPreview } from "@/components/TicketPreview";
import { TicketSettings } from "@/components/TicketSettings";
import {
  DEFAULT_TICKET_CONFIG,
  type AfipInvoiceData,
  type ParsePdfResponse,
  type TicketConfig,
} from "@/lib/types";

export function HomeClient() {
  const [config, setConfig] = useState<TicketConfig>(DEFAULT_TICKET_CONFIG);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsePdfResponse | null>(null);
  const [manualQrUrl, setManualQrUrl] = useState("");

  const handleConfigChange = useCallback((next: TicketConfig) => {
    setConfig(next);
  }, []);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ParsePdfResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo procesar el PDF");
      }

      setResult(data);
    } catch (uploadError) {
      setResult(null);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Error inesperado al leer el PDF",
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function applyManualQr() {
    if (!result || !manualQrUrl.trim()) return;

    void (async () => {
      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(manualQrUrl.trim(), {
        margin: 1,
        width: 180,
        errorCorrectionLevel: "M",
      });

      setResult({
        ...result,
        invoice: {
          ...result.invoice,
          qrUrl: manualQrUrl.trim(),
        },
        qrDataUrl,
        warnings: result.warnings.filter(
          (warning) => !warning.includes("QR"),
        ),
      });
    })();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Proyecto independiente
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">Ticket AFIP 51mm</h1>
        <p className="max-w-3xl text-zinc-600">
          Subí el PDF de una factura emitida en ARCA. La app extrae los datos
          fiscales, reconstruye el QR obligatorio y genera un ticket térmico
          reestructurado con tu logo y datos comerciales.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
        <label className="inline-flex cursor-pointer flex-col items-center gap-3">
          <span className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white">
            {loading ? "Leyendo PDF..." : "Subir factura PDF de ARCA"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={loading}
          />
          {fileName ? (
            <span className="text-sm text-zinc-500">Archivo: {fileName}</span>
          ) : null}
        </label>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <TicketSettings config={config} onChange={handleConfigChange} />

      {result?.warnings.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Advertencias de extracción</p>
          <ul className="mt-2 list-disc pl-5">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result ? (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Datos extraídos del PDF
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Estos campos alimentan el ticket. No se reescala la factura A4.
            </p>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              {Object.entries({
                Emisor: result.invoice.razonSocial,
                CUIT: result.invoice.cuit,
                Comprobante: result.invoice.numeroComprobante,
                "Punto de venta": result.invoice.puntoVenta,
                Total: result.invoice.importeTotal,
                CAE: result.invoice.cae,
                "Vto. CAE": result.invoice.caeVencimiento,
                "QR detectado": result.invoice.qrUrl ? "Sí" : "No",
              }).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-zinc-50 px-3 py-2">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="font-medium text-zinc-900">{value ?? "-"}</dd>
                </div>
              ))}
            </dl>

            {!result.invoice.qrUrl ? (
              <div className="mt-4 flex flex-col gap-2 md:flex-row">
                <input
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Pegar URL del QR si no se detectó automáticamente"
                  value={manualQrUrl}
                  onChange={(event) => setManualQrUrl(event.target.value)}
                />
                <button
                  type="button"
                  onClick={applyManualQr}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
                >
                  Usar QR manual
                </button>
              </div>
            ) : null}
          </section>

          <TicketPreview
            invoice={result.invoice as AfipInvoiceData}
            config={config}
            qrDataUrl={result.qrDataUrl}
          />
        </>
      ) : null}
    </div>
  );
}
