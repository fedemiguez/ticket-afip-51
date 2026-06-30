"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_TICKET_CONFIG,
  TICKET_CONFIG_STORAGE_KEY,
  type TicketConfig,
} from "@/lib/types";

interface TicketSettingsProps {
  config: TicketConfig;
  onChange: (config: TicketConfig) => void;
}

export function TicketSettings({ config, onChange }: TicketSettingsProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TICKET_CONFIG_STORAGE_KEY);
    if (!stored) return;

    try {
      onChange({ ...DEFAULT_TICKET_CONFIG, ...JSON.parse(stored) });
    } catch {
      // ignore invalid stored config
    }
  }, [onChange]);

  useEffect(() => {
    localStorage.setItem(TICKET_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  function updateField<K extends keyof TicketConfig>(
    key: K,
    value: TicketConfig[K],
  ) {
    onChange({ ...config, [key]: value });
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateField("logoDataUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
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
          </p>
        </div>
        <span className="text-sm text-zinc-500">{open ? "Ocultar" : "Editar"}</span>
      </button>

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

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="font-medium text-zinc-700">Logo</span>
            <input type="file" accept="image/*" onChange={handleLogoChange} />
            {config.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.logoDataUrl}
                alt="Logo"
                className="mt-2 h-16 w-auto object-contain"
              />
            ) : null}
          </label>
        </div>
      ) : null}
    </section>
  );
}
