export type CoverPalette = {
  primary: [number, number, number];
  accent: [number, number, number];
};

export type CoverGlows = {
  glow: string;
  glowSoft: string;
  glowCool: string;
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue2rgb = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function cssRgb(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0] * 255)} ${Math.round(rgb[1] * 255)} ${Math.round(rgb[2] * 255)})`;
}

function vivid(rgb: [number, number, number], hueShift = 0): [number, number, number] {
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const nextH = (h + hueShift / 360 + 1) % 1;
  const nextS = Math.min(0.78, Math.max(0.52, s * 1.7 + 0.22));
  const nextL = Math.min(0.56, Math.max(0.4, l * 1.65 + 0.18));
  return hslToRgb(nextH, nextS, nextL);
}

export function paletteGlows(palette: CoverPalette): CoverGlows {
  return {
    glow: cssRgb(vivid(palette.accent)),
    glowSoft: cssRgb(vivid(palette.accent, 58)),
    glowCool: cssRgb(vivid(palette.accent, -46)),
  };
}

function deepen(r: number, g: number, b: number): [number, number, number] {
  const satBoost = 1.18;
  const avg = (r + g + b) / 3;
  let nr = avg + (r - avg) * satBoost;
  let ng = avg + (g - avg) * satBoost;
  let nb = avg + (b - avg) * satBoost;
  const peak = Math.max(nr, ng, nb, 0.001);
  const scale = 0.34 / peak;
  nr = Math.min(0.42, Math.max(0.08, nr * scale));
  ng = Math.min(0.42, Math.max(0.08, ng * scale));
  nb = Math.min(0.42, Math.max(0.08, nb * scale));
  return [nr, ng, nb];
}

export const FALLBACK_PALETTE: CoverPalette = {
  primary: [0.28, 0.16, 0.14],
  accent: [0.34, 0.2, 0.16],
};

const cache = new Map<string, CoverPalette>();

function luminance(r: number, g: number, b: number): number {
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

export async function sampleCover(url: string): Promise<CoverPalette> {
  const hit = cache.get(url);
  if (hit) return hit;

  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();

  const size = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FALLBACK_PALETTE;
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  let sr = 0;
  let sg = 0;
  let sb = 0;
  let count = 0;
  let bestSat = 0;
  let accent: [number, number, number] = FALLBACK_PALETTE.accent;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 180) continue;
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const l = luminance(r, g, b);
    const s = saturation(r, g, b);
    if (l < 0.08 || l > 0.92) continue;
    sr += r;
    sg += g;
    sb += b;
    count += 1;
    if (s > bestSat && l > 0.12 && l < 0.72) {
      bestSat = s;
      accent = [r, g, b];
    }
  }

  const palette: CoverPalette =
    count === 0
      ? FALLBACK_PALETTE
      : {
          primary: deepen(sr / count, sg / count, sb / count),
          accent: deepen(
            bestSat > 0.1 ? accent[0] : sr / count,
            bestSat > 0.1 ? accent[1] : sg / count,
            bestSat > 0.1 ? accent[2] : sb / count,
          ),
        };

  cache.set(url, palette);
  return palette;
}
