import jsPDF from 'jspdf';

export async function exportElementToPdf(element: HTMLElement, filename: string, scalePercent: number) {
  type Html2Canvas = (
    elementToCapture: HTMLElement,
    options?: Record<string, unknown>,
  ) => Promise<HTMLCanvasElement>;
  const html2canvasModule = await import('html2canvas');
  const html2canvas = (html2canvasModule as unknown as { default: Html2Canvas }).default;
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: Math.max(0.5, scalePercent / 100),
    useCORS: true,
  });
  const image = canvas.toDataURL('image/png');
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const imageWidth = canvas.width * ratio;
  const imageHeight = canvas.height * ratio;
  const x = (pageWidth - imageWidth) / 2;
  const y = (pageHeight - imageHeight) / 2;
  pdf.addImage(image, 'PNG', x, y, imageWidth, imageHeight);
  pdf.save(filename);
}
