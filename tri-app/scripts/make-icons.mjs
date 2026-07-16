// Gera os ícones do app a partir da arte de capa (assets/images/app-icon-source.png):
// crop central + downsample (box filter) para os tamanhos de PWA, ícone nativo e favicon.
// Uso: node scripts/make-icons.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const SRC = new URL('../assets/images/app-icon-source.png', import.meta.url);
const src = PNG.sync.read(readFileSync(SRC));

// corta a margem preta externa, mantendo o quadrado arredondado da arte
const CROP = 0.88;
const cropSize = Math.floor(Math.min(src.width, src.height) * CROP);
const offX = Math.floor((src.width - cropSize) / 2);
const offY = Math.floor((src.height - cropSize) / 2);

function resize(target) {
  const out = new PNG({ width: target, height: target });
  const scale = cropSize / target;
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      // média dos pixels de origem cobertos (box filter)
      const x0 = offX + Math.floor(x * scale);
      const x1 = offX + Math.max(Math.floor((x + 1) * scale), Math.floor(x * scale) + 1);
      const y0 = offY + Math.floor(y * scale);
      const y1 = offY + Math.max(Math.floor((y + 1) * scale), Math.floor(y * scale) + 1);
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (src.width * sy + sx) << 2;
          r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++;
        }
      }
      const o = (target * y + x) << 2;
      out.data[o] = Math.round(r / n);
      out.data[o + 1] = Math.round(g / n);
      out.data[o + 2] = Math.round(b / n);
      out.data[o + 3] = 255;
    }
  }
  return PNG.sync.write(out);
}

mkdirSync(new URL('../public/icons', import.meta.url), { recursive: true });
const jobs = [
  ['../public/icons/icon-180.png', 180],
  ['../public/icons/icon-192.png', 192],
  ['../public/icons/icon-512.png', 512],
  ['../assets/images/icon.png', 1024],
  ['../assets/images/splash-icon.png', 512],
  ['../assets/images/favicon.png', 64],
];
for (const [path, size] of jobs) {
  writeFileSync(new URL(path, import.meta.url), resize(size));
  console.log(`${path} (${size}px) ok`);
}
