import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** Margen en blanco al final del PDF para el corte de impresoras térmicas. */
const PDF_BOTTOM_CUT_MARGIN_MM = 5;

function createScaledTicketClone(
  element: HTMLElement,
  sourceWidthMm: number,
  targetWidthMm: number,
): { captureRoot: HTMLElement; cleanup: () => void } {
  const scale = targetWidthMm / sourceWidthMm;
  const clone = element.cloneNode(true) as HTMLElement;

  clone.style.width = `${sourceWidthMm}mm`;
  clone.style.transform = `scale(${scale})`;
  clone.style.transformOrigin = "top left";
  clone.style.boxShadow = "none";
  clone.style.margin = "0";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${targetWidthMm}mm`,
    "overflow:hidden",
    "background:#fff",
  ].join(";");

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return {
    captureRoot: wrapper,
    cleanup: () => wrapper.remove(),
  };
}

export async function downloadTicketPdf(
  element: HTMLElement,
  options: {
    widthMm: number;
    filename: string;
    sourceWidthMm?: number;
  },
) {
  const targetWidthMm = options.widthMm;
  const sourceWidthMm = options.sourceWidthMm ?? targetWidthMm;
  const needsScaling = Math.abs(targetWidthMm - sourceWidthMm) > 0.01;

  const { captureRoot, cleanup } = needsScaling
    ? createScaledTicketClone(element, sourceWidthMm, targetWidthMm)
    : { captureRoot: element, cleanup: () => undefined };

  let canvas;
  try {
    canvas = await html2canvas(captureRoot, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
  } finally {
    cleanup();
  }

  const widthMm = targetWidthMm;
  const contentHeightMm = (canvas.height / canvas.width) * widthMm;
  const heightMm = contentHeightMm + PDF_BOTTOM_CUT_MARGIN_MM;

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
    contentHeightMm,
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
    .ticket-title { text-align:center; font-size:15px; font-weight:700; margin:0; }
    .ticket-subtitle, .ticket-address, .ticket-phone, .ticket-footer {
      text-align:center; font-size:12px; font-weight:700; line-height:1.4; margin:0;
    }
    .ticket-muted { text-align:center; font-size:9px; margin:0; }
    .ticket-divider { border-top:1px dashed #999; margin:2mm 0; }
    .ticket-row, .ticket-item { display:flex; justify-content:space-between; gap:2mm; margin-bottom:1mm; }
    .ticket-item span { flex:1; }
    .ticket-qr-wrap { margin-top:2mm; text-align:center; }
    .ticket-qr { width:28mm; height:28mm; margin:0 auto; display:block; }
    .ticket-warning { margin-top:2mm; text-align:center; font-size:9px; color:#b45309; }
    .ticket-cut-spacer { height:8mm; min-height:24px; }
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
