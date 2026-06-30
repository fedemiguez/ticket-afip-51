import {
  DEFAULT_TICKET_CONFIG,
  TICKET_CONFIG_STORAGE_KEY,
  type TicketConfig,
} from "@/lib/types";

export const TICKET_CONFIG_IMPORTED_KEY = "ticket-afip-51-imported";

export function loadLocalTicketConfig(): TicketConfig | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(TICKET_CONFIG_STORAGE_KEY);
  if (!stored) return null;

  try {
    return { ...DEFAULT_TICKET_CONFIG, ...JSON.parse(stored) };
  } catch {
    return null;
  }
}

export function saveLocalTicketConfig(config: TicketConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TICKET_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function hasLocalTicketConfig(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TICKET_CONFIG_STORAGE_KEY) !== null;
}

export function wasLocalConfigImported(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TICKET_CONFIG_IMPORTED_KEY) === "1";
}

export function markLocalConfigImported(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TICKET_CONFIG_IMPORTED_KEY, "1");
}

export function hasCustomLocalConfig(): boolean {
  const local = loadLocalTicketConfig();
  if (!local) return false;

  return (
    local.businessName !== DEFAULT_TICKET_CONFIG.businessName ||
    Boolean(local.subtitle) ||
    Boolean(local.address) ||
    Boolean(local.phone) ||
    local.footer !== DEFAULT_TICKET_CONFIG.footer ||
    local.paperWidthMm !== DEFAULT_TICKET_CONFIG.paperWidthMm ||
    Boolean(local.logoDataUrl)
  );
}
