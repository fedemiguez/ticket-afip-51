import { DEFAULT_TICKET_CONFIG, type ProfileResponse, type TicketConfig } from "@/lib/types";

export function profileResponseToTicketConfig(
  profile: ProfileResponse,
): TicketConfig {
  const logo = profile.logoUrl ?? profile.logoDataUrl ?? null;

  return {
    businessName: profile.businessName,
    subtitle: profile.subtitle,
    address: profile.address,
    phone: profile.phone,
    footer: profile.footer,
    paperWidthMm: profile.paperWidthMm,
    logoDataUrl: logo,
  };
}

export function isDefaultProfile(profile: ProfileResponse): boolean {
  return (
    profile.businessName === DEFAULT_TICKET_CONFIG.businessName &&
    !profile.logoUrl &&
    !profile.subtitle &&
    !profile.address &&
    !profile.phone &&
    profile.footer === DEFAULT_TICKET_CONFIG.footer &&
    profile.paperWidthMm === DEFAULT_TICKET_CONFIG.paperWidthMm
  );
}

export function ticketConfigToProfileBody(config: TicketConfig) {
  return {
    businessName: config.businessName,
    subtitle: config.subtitle,
    address: config.address,
    phone: config.phone,
    footer: config.footer,
    paperWidthMm: config.paperWidthMm,
  };
}

export function dataUrlToFile(dataUrl: string, filename = "logo.png"): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mime });
}
