import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function downloadTicketPdf(
  element: HTMLElement,
  options: {
    widthMm: number;
    filename: string;
  },
) {
  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const widthMm = options.widthMm;
  const heightMm = (canvas.height / canvas.width) * widthMm;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [widthMm, heightMm],
    compress: true,
  });

  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0,
    0,
    widthMm,
    heightMm,
    undefined,
    "FAST",
  );

  pdf.save(options.filename);
}

export function openPrintWindow(element: HTMLElement, widthMm: number) {
  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    window.print();
    return;
  }

  const styles = `
    @page { size: ${widthMm}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { display: flex; justify-content: center; }
    .thermal-ticket {
      width: ${widthMm}mm;
      padding: 4mm 3mm;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.35;
      color: #000;
      box-sizing: border-box;
    }
    .ticket-logo { display:block; max-height:18mm; margin:0 auto 2mm; object-fit:contain; }
    .ticket-title { text-align:center; font-size:12px; font-weight:700; margin:0; }
    .ticket-subtitle, .ticket-muted, .ticket-footer { text-align:center; font-size:9px; margin:0; }
    .ticket-divider { border-top:1px dashed #999; margin:2mm 0; }
    .ticket-row, .ticket-item { display:flex; justify-content:space-between; gap:2mm; margin-bottom:1mm; }
    .ticket-item span { flex:1; }
    .ticket-qr-wrap { margin-top:2mm; text-align:center; }
    .ticket-qr { width:28mm; height:28mm; margin:0 auto; display:block; }
    .ticket-warning { margin-top:2mm; text-align:center; font-size:9px; color:#b45309; }
  `;

  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Ticket ${widthMm}mm</title>
        <style>${styles}</style>
      </head>
      <body>${element.outerHTML}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };
}
