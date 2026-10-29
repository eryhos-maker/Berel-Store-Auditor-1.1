// PDF de los reportes en UNA sola hoja carta: se "fotografía" el reporte y se acomoda en la hoja,
// reduciéndolo lo necesario para que quepa completo (nunca se parte en dos páginas).

// html2pdf se carga con <script> en index.html.
declare var html2pdf: any;

const MARGEN = 0.3; // pulgadas

async function documento(el: HTMLElement) {
  const canvas: HTMLCanvasElement = await html2pdf()
    .set({ html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 } })
    .from(el).toCanvas().get('canvas');

  // Hoja carta en blanco (sale de un elemento vacío) donde se pega el reporte.
  const vacio = document.createElement('div');
  vacio.style.width = '1px';
  vacio.style.height = '1px';
  const pdf = await html2pdf()
    .set({ margin: 0, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } })
    .from(vacio).toPdf().get('pdf');

  const anchoHoja = pdf.internal.pageSize.getWidth();
  const altoHoja = pdf.internal.pageSize.getHeight();
  let ancho = anchoHoja - 2 * MARGEN;
  let alto = (canvas.height * ancho) / canvas.width;
  if (alto > altoHoja - 2 * MARGEN) {
    alto = altoHoja - 2 * MARGEN;
    ancho = (canvas.width * alto) / canvas.height;
  }
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (anchoHoja - ancho) / 2, MARGEN, ancho, alto);
  return pdf;
}

export async function guardarPdfUnaHoja(el: HTMLElement, nombreArchivo: string): Promise<void> {
  (await documento(el)).save(nombreArchivo);
}

export async function pdfUnaHojaBlob(el: HTMLElement): Promise<Blob> {
  return (await documento(el)).output('blob');
}
