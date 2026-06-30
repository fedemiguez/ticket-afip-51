import { auth } from "@clerk/nextjs/server";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new ApiError("No autenticado.", 401);
  }

  return userId;
}

export async function getOptionalUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}
