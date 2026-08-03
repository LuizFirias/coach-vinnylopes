/** Gera um Blob JPEG a partir da área circular visível no editor de avatar. */

export interface AvatarCropArea {
  /** offset X da imagem (px do container) */
  offsetX: number;
  /** offset Y da imagem (px do container) */
  offsetY: number;
  /** escala da imagem (1 = caber no círculo) */
  scale: number;
  /** diâmetro do círculo de crop no viewport (px) */
  cropSize: number;
  /** largura natural da imagem */
  imageWidth: number;
  /** altura natural da imagem */
  imageHeight: number;
}

const OUTPUT_SIZE = 512;
const JPEG_QUALITY = 0.92;

/**
 * Calcula a escala base (cover) para a imagem preencher o círculo.
 */
export function getCoverScale(
  imageWidth: number,
  imageHeight: number,
  cropSize: number
): number {
  return Math.max(cropSize / imageWidth, cropSize / imageHeight);
}

/**
 * Exporta a região circular atual para um Blob JPEG.
 */
export async function exportAvatarCrop(
  imageSrc: string,
  area: AvatarCropArea
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const { offsetX, offsetY, scale, cropSize, imageWidth, imageHeight } = area;

  const displayW = imageWidth * scale;
  const displayH = imageHeight * scale;

  // Centro do círculo no viewport = (cropSize/2, cropSize/2)
  // Posição do canto superior-esquerdo da imagem no viewport = (offsetX, offsetY)
  // Ponto do centro do círculo na imagem (coords da imagem natural):
  const srcCenterX = (cropSize / 2 - offsetX) / scale;
  const srcCenterY = (cropSize / 2 - offsetY) / scale;
  const srcRadius = cropSize / 2 / scale;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível");

  // Exporta QUADRADO preenchido (sem máscara circular).
  // O círculo fica só no CSS (rounded-full) — evita auréola preta do JPEG
  // (JPEG não tem transparência; o fill antigo #0d0d0d vazava nas bordas).
  const sx = srcCenterX - srcRadius;
  const sy = srcCenterY - srcRadius;
  const sSize = srcRadius * 2;

  void displayW;
  void displayH;

  ctx.drawImage(image, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Falha ao gerar imagem"));
        else resolve(blob);
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    img.src = src;
  });
}
