export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function prepareCardImage(source: File | string): Promise<string> {
  if (source instanceof File && (!/^image\/(jpeg|png|webp)$/.test(source.type) || source.size > 10 * 1024 * 1024)) {
    throw new Error("Välj en JPEG-, PNG- eller WebP-bild på högst 10 MB.");
  }
  const objectUrl = source instanceof File ? URL.createObjectURL(source) : null;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Bilden kunde inte läsas."));
      img.src = objectUrl ?? source as string;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Bilden är tom.");
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bilden kunde inte bearbetas.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.8);
    if (data.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 100) throw new Error("Bilden är för stor efter komprimering. Välj en mindre bild.");
    return data;
  } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
}
