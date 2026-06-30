import { jsonError, jsonOk } from "@/lib/api-response";
import { ApiError, requireUserId } from "@/lib/auth";
import { deleteBlobByUrl, uploadUserLogo } from "@/lib/blob";
import {
  getProfileByUserId,
  profileToTicketConfig,
  updateProfileLogoUrl,
} from "@/lib/profile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError("Tenés que subir una imagen.", 400);
    }

    const existing = await getProfileByUserId(userId);
    const logoUrl = await uploadUserLogo(userId, file);

    if (existing?.logoUrl && existing.logoUrl !== logoUrl) {
      await deleteBlobByUrl(existing.logoUrl);
    }

    const profile = await updateProfileLogoUrl(userId, logoUrl);

    return jsonOk(profileToTicketConfig(profile));
  } catch (error) {
    return jsonError(error, "No se pudo subir el logo.");
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    const existing = await getProfileByUserId(userId);

    await deleteBlobByUrl(existing?.logoUrl);
    const profile = await updateProfileLogoUrl(userId, null);

    return jsonOk(profileToTicketConfig(profile));
  } catch (error) {
    return jsonError(error, "No se pudo eliminar el logo.");
  }
}
