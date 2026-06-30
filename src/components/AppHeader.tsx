"use client";

import {
  SignInButton,
  SignUpButton,
  useAuth,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

export function AppHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <Link href="/" className="text-sm font-semibold text-zinc-900">
            Ticket AFIP 51mm
          </Link>
          <p className="truncate text-xs text-zinc-500">
            v2 — perfil, historial y API
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isLoaded ? (
            <span className="text-xs text-zinc-400">Cargando…</span>
          ) : isSignedIn ? (
            <>
              <Link
                href="/historial"
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Historial
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Ingresar
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Registrarse
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
