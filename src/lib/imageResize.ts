/** Redimensiona imagem no browser (max lado) e devolve data URL JPEG. */
export function resizeImageFileToDataUrl(file: File, maxSide = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w <= 0 || h <= 0) {
        reject(new Error("imagem inválida"));
        return;
      }
      if (w > h && w > maxSide) {
        h = Math.round((h * maxSide) / w);
        w = maxSide;
      } else if (h > maxSide) {
        w = Math.round((w * maxSide) / h);
        h = maxSide;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}
