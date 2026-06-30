"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { InvoiceListItem, InvoiceListResponse } from "@/lib/types";

function formatComprobante(item: InvoiceListItem) {
  if (!item.tipoComprobante || !item.numeroComprobante) return "—";
  return `Factura ${item.tipoComprobante} ${item.numeroComprobante}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvoiceHistory() {
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadInvoices = useCallback(async (cursor?: string | null) => {
    const isInitial = !cursor;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/v2/invoices?${params}`);
      const data = (await response.json()) as InvoiceListResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el historial");
      }

      setItems((prev) => (isInitial ? data.items : [...prev, ...data.items]));
      setNextCursor(data.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Error al cargar el historial",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este comprobante del historial?")) return;

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/v2/invoices/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Error al eliminar",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Cargando historial…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-zinc-600">Todavía no hay comprobantes guardados.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Subí un PDF desde el inicio estando logueado y aparecerá acá.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-zinc-900 underline"
          >
            Ir a subir factura
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Comprobante</th>
                  <th className="px-4 py-3 font-medium">Fecha emisión</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Procesado</th>
                  <th className="px-4 py-3 font-medium">Archivo</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {formatComprobante(item)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {item.fechaEmision ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-900">
                      {item.importeTotal ? `$ ${item.importeTotal}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDate(item.processedAt)}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-zinc-500">
                      {item.sourceFileName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/historial/${item.id}`}
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                        >
                          Reimprimir
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {deletingId === item.id ? "…" : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {nextCursor ? (
        <button
          type="button"
          onClick={() => void loadInvoices(nextCursor)}
          disabled={loadingMore}
          className="self-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
        >
          {loadingMore ? "Cargando…" : "Cargar más"}
        </button>
      ) : null}
    </div>
  );
}
