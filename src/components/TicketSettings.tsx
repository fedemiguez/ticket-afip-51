"use client";

import { useState } from "react";
import type { TicketConfig } from "@/lib/types";

interface TicketSettingsProps {
  config: TicketConfig;
  onChange: (config: TicketConfig) => void;
  isPersisted?: boolean;
  loading?: boolean;
  saving?: boolean;
  logoUploading?: boolean;
  showImportPrompt?: boolean;
  onImportLocal?: () => void;
  onDismissImport?: () => void;
  onLogoUpload?: (file: File) => void;
  onLogoDelete?: () => void;
}

export function TicketSettings({
  config,
  onChange,
  isPersisted = false,
  loading = false,
  saving = false,
  logoUploading = false,
  showImportPrompt = false,
  onImportLocal,
  onDismissImport,
  onLogoUpload,
  onLogoDelete,
}: TicketSettingsProps) {
  const [open, setOpen] = useState(false);

  function updateField<K extends keyof TicketConfig>(
    key: K,
    value: TicketConfig[K],
  ) {
    onChange({ ...config, [key]: value });
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (onLogoUpload) {
      void onLogoUpload(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        updateField("logoDataUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    event.target.value = "";
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Personalización del ticket
          </h2>
          <p className="text-sm text-zinc-500">
            Logo, datos del comercio y ancho de papel ({config.paperWidthMm}mm)
            {isPersisted ? " · guardado en tu cuenta" : " · solo en este navegador"}
          </p>
        </div>
        <span className="text-sm text-zinc-500">{open ? "Ocultar" : "Editar"}</span>
      </button>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Cargando configuración…</p>
      ) : null}

      {showImportPrompt ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <p className="font-medium">Tenés configuración guardada en este navegador</p>
          <p className="mt-1 text-blue-900/90">
            ¿Querés importarla a tu cuenta para usarla en cualquier dispositivo?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onImportLocal?.()}
              disabled={saving}
              className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? "Importando…" : "Importar configuración local"}
            </button>
            <button
              type="button"
              onClick={onDismissImport}
              className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100"
            >
              Ahora no
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Nombre comercial</span>
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              value={config.businessName}
              onChange={(event) =>
                updateField("businessName", event.target.value)
              }
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Subtítulo</span>
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              value={config.subtitle}
              onChange={(event) => updateField("subtitle", event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-zinc-700">Dirección</span>
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              value={config.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Teléfono</span>
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              value={config.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Ancho papel (mm)</span>
            <input
              type="number"
              min={48}
              max={80}
              className="rounded-lg border border-zinc-300 px-3 py-2"
              value={config.paperWidthMm}
              onChange={(event) =>
                updateField("paperWidthMm", Number(event.target.value) || 51)
              }
            />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-zinc-700">Pie de ticket</span>
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              value={config.footer}
              onChange={(event) => updateField("footer", event.target.value)}
            />
          </label>

          <div className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-zinc-700">Logo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleLogoChange}
              disabled={logoUploading}
            />
            {isPersisted ? (
              <p className="text-xs text-zinc-500">
                Se guarda en la nube (máx. 2 MB, JPEG/PNG/WebP/GIF).
              </p>
            ) : null}
            {config.logoDataUrl ? (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.logoDataUrl}
                  alt="Logo"
                  className="h-16 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => void onLogoDelete?.()}
                  disabled={logoUploading}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  {logoUploading ? "Procesando…" : "Quitar logo"}
                </button>
              </div>
            ) : null}
          </div>

          {saving ? (
            <p className="text-xs text-zinc-500 md:col-span-2">Guardando cambios…</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
