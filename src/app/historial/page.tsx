import Link from "next/link";
import { InvoiceHistory } from "@/components/InvoiceHistory";

export default function HistorialPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Historial de comprobantes
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Facturas procesadas guardadas en tu cuenta. Podés reimprimir o
            descargar el PDF del ticket en cualquier momento.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-zinc-900 underline"
        >
          Subir nueva factura
        </Link>
      </header>

      <InvoiceHistory />
    </main>
  );
}
