import { del, put } from "@vercel/blob";
import { ApiError } from "@/lib/auth";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function assertBlobConfigured(): void {
  if (!isBlobConfigured()) {
    throw new ApiError(
      "Almacenamiento de logos no configurado (BLOB_READ_WRITE_TOKEN).",
      503,
    );
  }
}

export function validateLogoFile(file: File): void {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    throw new ApiError("Formato de logo no soportado. Usá JPEG, PNG, WebP o GIF.", 400);
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw new ApiError("El logo no puede superar 2 MB.", 400);
  }
}

export async function uploadUserLogo(userId: string, file: File): Promise<string> {
  assertBlobConfigured();
  validateLogoFile(file);

  const extension = file.type.split("/")[1] ?? "png";
  const pathname = `logos/${userId}/logo.${extension}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return blob.url;
}

export async function deleteBlobByUrl(url: string | null | undefined): Promise<void> {
  if (!url || !isBlobConfigured()) return;

  try {
    await del(url);
  } catch (error) {
    console.warn("No se pudo borrar el blob:", error);
  }
}
