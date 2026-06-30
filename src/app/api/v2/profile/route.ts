import { jsonError, jsonOk } from "@/lib/api-response";
import { ApiError, requireUserId } from "@/lib/auth";
import { getProfileByUserId, profileToTicketConfig, upsertProfile } from "@/lib/profile";
import { DEFAULT_TICKET_CONFIG } from "@/lib/types";

export const runtime = "nodejs";

function parseProfileBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new ApiError("Cuerpo de solicitud inválido.", 400);
  }

  const data = body as Record<string, unknown>;
  const paperWidthMm = Number(data.paperWidthMm ?? DEFAULT_TICKET_CONFIG.paperWidthMm);

  if (!Number.isFinite(paperWidthMm) || paperWidthMm < 48 || paperWidthMm > 80) {
    throw new ApiError("El ancho de papel debe estar entre 48 y 80 mm.", 400);
  }

  return {
    businessName:
      typeof data.businessName === "string"
        ? data.businessName.trim() || DEFAULT_TICKET_CONFIG.businessName
        : DEFAULT_TICKET_CONFIG.businessName,
    subtitle: typeof data.subtitle === "string" ? data.subtitle : "",
    address: typeof data.address === "string" ? data.address : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    footer:
      typeof data.footer === "string"
        ? data.footer.trim() || DEFAULT_TICKET_CONFIG.footer
        : DEFAULT_TICKET_CONFIG.footer,
    paperWidthMm: Math.round(paperWidthMm),
  };
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return jsonOk({ ...DEFAULT_TICKET_CONFIG, logoUrl: null });
    }

    return jsonOk(profileToTicketConfig(profile));
  } catch (error) {
    return jsonError(error, "No se pudo cargar el perfil.");
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireUserId();
    const body = parseProfileBody(await request.json());
    const profile = await upsertProfile(userId, body);

    return jsonOk(profileToTicketConfig(profile));
  } catch (error) {
    return jsonError(error, "No se pudo guardar el perfil.");
  }
}
