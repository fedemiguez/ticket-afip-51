import { NextResponse } from "next/server";
import { ApiError } from "@/lib/auth";

export function jsonError(error: unknown, fallbackMessage = "Error inesperado.") {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
