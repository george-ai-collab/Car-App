// Quick checks on a photo, done on the phone (free, instant): is it too dark, or blurry?
// Looks at a small copy of the photo. Returns { dark, blurry, brightness (0-255), sharpness }.
export const DARK_BELOW = 45;    // average brightness
export const BLURRY_BELOW = 10;  // how much the edges vary (Laplacian); sharp photos are well above this

export function checkPhoto(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = 160, H = Math.max(1, Math.round((img.height / img.width) * 160));
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      const lum = new Float32Array(W * H);
      let sum = 0;
      for (let i = 0; i < W * H; i++) { lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; sum += lum[i]; }
      const brightness = sum / (W * H);
      // Laplacian variance: blurry photos have soft edges, so this number is small.
      let n = 0, mean = 0, m2 = 0;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const v = 4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - W] - lum[i + W];
        n++; const delta = v - mean; mean += delta / n; m2 += delta * (v - mean);
      }
      const sharpness = n ? Math.sqrt(m2 / n) : 0;
      resolve({ brightness: Math.round(brightness), sharpness: Math.round(sharpness), dark: brightness < DARK_BELOW, blurry: sharpness < BLURRY_BELOW });
    };
    img.onerror = () => resolve({ dark: false, blurry: false });
    img.src = src;
  });
}
