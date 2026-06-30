import Link from "next/link";

export default function HistorialPlaceholderPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900">Historial</h1>
      <p className="text-sm text-zinc-600">
        La lista de comprobantes guardados se implementa en la Fase 2. La ruta ya
        está protegida con Clerk.
      </p>
      <Link href="/" className="text-sm font-medium text-zinc-900 underline">
        Volver al inicio
      </Link>
    </main>
  );
}
