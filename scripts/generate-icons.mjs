#!/usr/bin/env node
/**
 * Rasterizes the LiveTranslate app icon directly to PNG using a small
 * hand-rolled renderer (rounded-rect gradient background + speech-bubble +
 * translate-arrows + soundwave glyph, mirroring resources/public/icon.svg)
 * and a minimal zlib-based PNG encoder. This avoids depending on a browser
 * compositor (Chromium OSR needs a real display/GPU, which isn't available
 * in headless CI or sandboxed dev environments), so icon generation works
 * anywhere Node runs.
 *
 * Run via `npm run icons`, then build/icon.iconset -> build/icon.icns with
 * `iconutil` (macOS only, wired into the same npm script).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const iconsetDir = path.join(root, 'build', 'icon.iconset');
const publicDir = path.join(root, 'resources', 'public');

const ICONSET_SIZES = [16, 32, 64, 128, 256, 512, 1024];

// --- tiny PNG encoder -------------------------------------------------

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = makeCrcTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    crc = (crc >>> 8) ^ table[c];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- vector-ish scene, rasterized with simple SDF-like shape tests ----

function mix(a, b, t) {
  return a + (b - a) * t;
}

function inRoundedRect(x, y, w, h, r) {
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r || (x >= r && x <= w - r) || (y >= r && y <= h - r);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1)),
  );
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const S = size / 512;

  const strokes = [
    // speech bubble outline (approximate as line segments)
    [128, 158, 168, 118],
    [168, 118, 344, 118],
    [344, 118, 384, 158],
    [384, 158, 384, 262],
    [384, 262, 344, 302],
    [344, 302, 230, 302],
    [230, 302, 178, 348],
    [178, 348, 178, 302],
    [178, 302, 168, 302],
    [168, 302, 128, 262],
    [128, 262, 128, 158],
    // translate arrows
    [186, 188, 302, 188],
    [272, 168, 302, 188],
    [302, 188, 272, 208],
    [326, 232, 210, 232],
    [240, 212, 210, 232],
    [210, 232, 240, 252],
    // soundwave
    [256, 330, 256, 400],
    [222, 344, 222, 386],
    [290, 344, 290, 386],
    [188, 358, 188, 372],
    [324, 358, 324, 372],
  ];
  const strokeWidth = 9 * S;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;
      const x = px / S;
      const y = py / S;

      // background: rounded rect with diagonal gradient
      const bgAlpha = inRoundedRect(x, y, 512, 512, 112) ? 1 : 0;
      const t = (x + y) / (512 + 512);
      const r = Math.round(mix(0x6c, 0x39, t));
      const g = Math.round(mix(0x8b, 0x46, t));
      const b = Math.round(mix(0xff, 0xd9, t));

      let outR = r;
      let outG = g;
      let outB = b;
      let outA = bgAlpha;

      if (bgAlpha) {
        let minDist = Infinity;
        for (const [ax, ay, bx, by] of strokes) {
          const d = distToSegment(x, y, ax, ay, bx, by);
          if (d < minDist) minDist = d;
        }
        if (minDist < strokeWidth / S) {
          outR = 255;
          outG = 255;
          outB = 255;
          outA = 1;
        }
      }

      rgba[idx] = outR;
      rgba[idx + 1] = outG;
      rgba[idx + 2] = outB;
      rgba[idx + 3] = Math.round(outA * 255);
    }
  }

  return encodePng(size, size, rgba);
}

async function main() {
  await fs.mkdir(iconsetDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });

  const cache = new Map();
  const get = (size) => {
    if (!cache.has(size)) cache.set(size, renderIcon(size));
    return cache.get(size);
  };

  for (const size of ICONSET_SIZES) {
    await fs.writeFile(path.join(iconsetDir, `icon_${size}x${size}.png`), get(size));
    if (size <= 512) {
      await fs.writeFile(path.join(iconsetDir, `icon_${size}x${size}@2x.png`), get(size * 2));
    }
  }

  await fs.writeFile(path.join(publicDir, 'icon.png'), get(512));
  await fs.writeFile(path.join(publicDir, 'favicon.png'), get(32));
  await fs.writeFile(path.join(publicDir, 'tray-icon.png'), get(36));

  console.log('Icons generated in build/icon.iconset and resources/public/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
