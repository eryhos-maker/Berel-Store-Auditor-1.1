// Reduce la foto en el celular antes de subirla: máximo 1200 px de ancho, JPEG.
const ANCHO_MAX = 1200;
const CALIDAD = 0.7;

export async function comprimirFoto(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falla) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falla(new Error('No se pudo leer la foto. Intenta tomarla de nuevo.'));
      i.src = url;
    });
    const escala = Math.min(1, ANCHO_MAX / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este celular no permitió procesar la foto.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', CALIDAD);
  } finally {
    URL.revokeObjectURL(url);
  }
}
