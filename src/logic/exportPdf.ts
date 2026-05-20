import jsPDF from 'jspdf';

const COLOR_PROPERTIES = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
] as const;

function canvasSafeColor(value: string, fallback: string) {
  return value.includes('oklch') || value.includes('oklab') ? fallback : value;
}

function applyCanvasSafeColors(element: HTMLElement) {
  const nodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  const previousStyles = nodes.map((node) => node.getAttribute('style'));
  nodes.forEach((node) => {
    const computed = window.getComputedStyle(node);
    node.style.color = canvasSafeColor(computed.color, '#172033');
    node.style.backgroundColor = canvasSafeColor(computed.backgroundColor, 'rgba(0, 0, 0, 0)');
    node.style.borderColor = canvasSafeColor(computed.borderColor, '#cfd8e3');
    node.style.borderTopColor = canvasSafeColor(computed.borderTopColor, '#cfd8e3');
    node.style.borderRightColor = canvasSafeColor(computed.borderRightColor, '#cfd8e3');
    node.style.borderBottomColor = canvasSafeColor(computed.borderBottomColor, '#cfd8e3');
    node.style.borderLeftColor = canvasSafeColor(computed.borderLeftColor, '#cfd8e3');
    node.style.outlineColor = canvasSafeColor(computed.outlineColor, '#003d82');
    node.style.boxShadow = 'none';
  });
  return () => {
    nodes.forEach((node, index) => {
      const previousStyle = previousStyles[index];
      if (previousStyle === null) node.removeAttribute('style');
      else node.setAttribute('style', previousStyle);
    });
  };
}

export async function exportElementToPdf(element: HTMLElement, filename: string, scalePercent: number) {
  type Html2Canvas = (
    elementToCapture: HTMLElement,
    options?: Record<string, unknown>,
  ) => Promise<HTMLCanvasElement>;
  const html2canvasModule = await import('html2canvas');
  const html2canvas = (html2canvasModule as unknown as { default: Html2Canvas }).default;
  const restoreStyles = applyCanvasSafeColors(element);
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: Math.max(0.5, scalePercent / 100),
      useCORS: true,
    });
  } finally {
    restoreStyles();
  }
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
