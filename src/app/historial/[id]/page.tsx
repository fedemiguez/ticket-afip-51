import { InvoiceReprintClient } from "@/components/InvoiceReprintClient";

interface HistorialDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function HistorialDetailPage({
  params,
}: HistorialDetailPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <InvoiceReprintClient invoiceId={id} />
    </main>
  );
}
