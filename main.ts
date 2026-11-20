// news-image-20261120 — one image summing up Friday 20 November 2026.
// Node 22, standard library only. No network, no external assets.
// Renders a 1024x1024 newspaper front page to /output/entry.png
// (or $MAKEFUN_OUTPUT_DIR/entry.png). Deterministic: no randomness,
// no clocks, no timestamps anywhere in the output.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ---------------------------------------------------------------------------
// Canvas: a plain RGB framebuffer, 1024 by 1024.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [251, 247, 236];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [22, 41, 77];
const NIGHT: RGB = [13, 24, 48];
const RED: RGB = [179, 38, 30];
const BLUE: RGB = [36, 86, 166];
const SKY: RGB = [168, 205, 232];
const GOLD: RGB = [201, 162, 39];
const GREEN: RGB = [46, 125, 50];
const GREY: RGB = [107, 107, 107];
const RULE: RGB = [201, 194, 176];
const WHITE: RGB = [255, 255, 255];
const ORANGE: RGB = [232, 126, 32];
const YELLOW: RGB = [244, 196, 48];
const SAND: RGB = [238, 222, 186];
const DARKBLDG: RGB = [44, 64, 104];

function put(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  }
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  for (let x = x0; x <= x1; x++) put(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) put(x, y, c);
}

// Bresenham line, any slope.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    put(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) put(x, y, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    put(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 cells; '#' is ink, '.' is blank.
// Uppercase, lowercase, digits and punctuation the page uses.
// ---------------------------------------------------------------------------
const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.###.', '#...#', '#....', '#...#', '.###.'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#...', '.#...', '####.', '.#...', '.#...', '.#...'],
  g: ['.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '#..#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '####.', '#....'],
  q: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#...', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '..#..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
};

const CHAR_W = 6; // 5 pixels of glyph plus 1 of space

function glyphWidth(s: string, scale: number): number {
  return s.length * CHAR_W * scale - scale;
}

function drawGlyph(x: number, y: number, ch: string, scale: number, c: RGB): void {
  const g = GLYPHS[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row[col] === '#') {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            put(x + col * scale + dx, y + r * scale + dy, c);
          }
        }
      }
    }
  }
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    drawGlyph(cx, y, ch, scale, c);
    cx += CHAR_W * scale;
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(glyphWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap to a pixel width; returns lines of the original text.
function wrap(s: string, maxPx: number, scale: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxPx / (CHAR_W * scale)));
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : cur + ' ' + w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur !== '') lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

function drawPara(x: number, y: number, s: string, maxPx: number, scale: number, c: RGB): number {
  const lines = wrap(s, maxPx, scale);
  const lh = 9 * scale;
  for (let i = 0; i < lines.length; i++) {
    drawText(x, y + i * lh, lines[i], scale, c);
  }
  return y + lines.length * lh;
}

// ---------------------------------------------------------------------------
// PNG encoder: signature, IHDR, one IDAT (zlib, filter 0 per row), IEND.
// ---------------------------------------------------------------------------
const CRC_TABLE = ((): Uint32Array => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Page: fill the paper, then draw the front page top to bottom.
// ---------------------------------------------------------------------------
rect(0, 0, W, H, PAPER);

// --- Masthead ---------------------------------------------------------------
rect(0, 0, W, 104, NAVY);
drawTextCentered(512, 22, 'THE WORLD DAILY', 6, WHITE);
rect(0, 104, W, 4, RED);
drawTextCentered(512, 118, 'FRIDAY, 20 NOVEMBER 2026', 2, INK);
hline(40, 330, 126, RULE);
hline(694, 984, 126, RULE);
drawTextCentered(512, 140, 'WAR, MARKETS AND DIPLOMACY SHARE THE FRONT PAGE', 2, RED);

// --- Lead story: Kyiv --------------------------------------------------------
drawText(40, 168, 'MISSILES STRIKE KYIV', 5, INK);
drawPara(
  40,
  222,
  "Overnight, Russian ballistic missiles struck Kyiv, killing three people and damaging three bridges, retaliation for Ukraine's strikes on the Kerch Bridge.",
  560,
  3,
  INK,
);
// Stat strip under the lead text.
rect(40, 380, 170, 54, NAVY);
drawTextCentered(125, 392, '3 KILLED', 3, WHITE);
rect(226, 380, 170, 54, RED);
drawTextCentered(311, 392, '3 BRIDGES', 3, WHITE);
rect(412, 380, 170, 54, INK);
drawTextCentered(497, 392, '1 NIGHT', 3, WHITE);
drawText(40, 452, 'RETALIATION FOR THE KERCH BRIDGE STRIKES', 2, GREY);

// Lead illustration: night sky over Kyiv, missiles, explosion, bridge.
rect(640, 168, 344, 306, NIGHT);
// Stars: a fixed scatter, no randomness.
for (let i = 0; i < 40; i++) {
  const sx = 648 + ((i * 53) % 328);
  const sy = 176 + ((i * 91) % 120);
  put(sx, sy, WHITE);
  if (i % 3 === 0) put(sx + 1, sy, WHITE);
}
// Skyline silhouettes.
const towers: [number, number][] = [
  [648, 110],
  [712, 150],
  [776, 100],
  [840, 170],
  [908, 120],
];
for (const [bx, bh] of towers) {
  rect(bx, 474 - bh, 56, bh, DARKBLDG);
  // Windows: fixed gold dots.
  for (let wy = 474 - bh + 8; wy < 466; wy += 16) {
    for (let wx = bx + 8; wx < bx + 48; wx += 16) {
      if ((wx + wy) % 32 === 0) rect(wx, wy, 4, 5, GOLD);
    }
  }
}
// Bridge deck and piers at the bottom of the sky.
rect(640, 452, 344, 8, [96, 116, 158]);
rect(680, 460, 10, 14, [96, 116, 158]);
rect(800, 460, 10, 14, [96, 116, 158]);
rect(920, 460, 10, 14, [96, 116, 158]);
// Explosion over the middle tower.
disc(830, 300, 26, RED);
disc(830, 300, 18, ORANGE);
disc(830, 300, 10, YELLOW);
line(830, 262, 830, 240, YELLOW);
line(830, 338, 830, 360, YELLOW);
line(792, 300, 770, 300, YELLOW);
line(868, 300, 890, 300, YELLOW);
// Three missile trails diving from the top right.
line(960, 180, 880, 260, WHITE);
line(961, 180, 881, 260, WHITE);
line(940, 176, 850, 280, WHITE);
line(941, 176, 851, 280, WHITE);
line(900, 172, 830, 250, WHITE);
line(901, 172, 831, 250, WHITE);
disc(880, 260, 5, ORANGE);
disc(850, 280, 5, ORANGE);
disc(830, 250, 5, ORANGE);
line(960, 180, 972, 168, RED);
line(940, 176, 952, 164, RED);
line(900, 172, 912, 160, RED);

// --- Divider -----------------------------------------------------------------
hline(40, 984, 500, RULE);

// --- Row 2: markets (left) and youth mobility (right) ------------------------
drawText(40, 522, 'MARKETS TUMBLE', 3, INK);
// Chart panel.
rect(40, 556, 452, 96, WHITE);
rect(40, 556, 452, 2, INK);
rect(40, 650, 452, 2, INK);
rect(40, 556, 2, 96, INK);
rect(490, 556, 2, 96, INK);
for (let gy = 576; gy <= 636; gy += 20) hline(42, 488, gy, RULE);
// Falling red line with bars.
const chart: [number, number][] = [
  [60, 572],
  [110, 580],
  [160, 576],
  [210, 596],
  [260, 592],
  [310, 612],
  [360, 624],
  [410, 632],
  [460, 640],
];
for (let i = 0; i < chart.length - 1; i++) {
  line(chart[i][0], chart[i][1], chart[i + 1][0], chart[i + 1][1], RED);
  line(chart[i][0], chart[i][1] + 1, chart[i + 1][0], chart[i + 1][1] + 1, RED);
}
for (const [bx, by] of chart) disc(bx, by, 3, RED);
drawText(56, 566, 'NIKKEI -4.8%', 2, RED);
drawText(56, 596, 'TAIWAN -2,200', 2, RED);
drawPara(
  40,
  668,
  "Asian markets tumbled, with Japan's Nikkei down 4.8 percent and Taiwan shedding over 2,200 points after Wall Street's fifth straight fall.",
  452,
  2,
  INK,
);

drawText(532, 522, 'YOUTH MOBILITY DEAL', 3, INK);
// Channel crossing: sky, sea, bridge, two flags.
rect(532, 556, 452, 96, SKY);
rect(532, 620, 452, 32, BLUE);
for (let wx = 540; wx < 976; wx += 24) hline(wx, wx + 12, 632, WHITE);
for (let wx = 548; wx < 976; wx += 32) hline(wx, wx + 14, 644, WHITE);
// Bridge deck and arch.
rect(532, 600, 452, 6, INK);
for (let a = 0; a <= 180; a += 3) {
  const t = (a * Math.PI) / 180;
  put(Math.round(758 + 180 * Math.cos(t)), Math.round(606 - 34 * Math.sin(t)), INK);
  put(Math.round(758 + 180 * Math.cos(t)), Math.round(607 - 34 * Math.sin(t)), INK);
  put(Math.round(758 + 180 * Math.cos(t)), Math.round(608 - 34 * Math.sin(t)), INK);
}
// UK flag (left bank) and EU flag (right bank).
rect(560, 566, 34, 22, WHITE);
hline(560, 593, 577, RED);
vline(577, 566, 587, RED);
rect(560, 566, 34, 2, RED);
rect(560, 586, 34, 2, RED);
rect(920, 566, 34, 22, BLUE);
for (let a = 0; a < 360; a += 30) {
  const t = (a * Math.PI) / 180;
  put(Math.round(937 + 8 * Math.cos(t)), Math.round(577 + 8 * Math.sin(t)), YELLOW);
}
drawPara(
  532,
  668,
  'In London, Britain and the EU agreed a youth mobility scheme, letting young people live and work across the Channel again.',
  452,
  2,
  INK,
);

// --- Divider -----------------------------------------------------------------
hline(40, 984, 744, RULE);

// --- Row 3: three stories -----------------------------------------------------
// Column 1: Riyadh tower.
drawText(40, 766, 'RIYADH TOWER HIT', 3, INK);
rect(40, 798, 296, 76, SAND);
// PIF tower with a damaged top.
rect(150, 806, 76, 68, NAVY);
for (let wy = 812; wy < 868; wy += 10) {
  for (let wx = 156; wx < 220; wx += 12) rect(wx, wy, 6, 4, SKY);
}
line(150, 806, 166, 798, NAVY);
line(166, 798, 182, 808, NAVY);
line(182, 808, 198, 800, NAVY);
line(198, 800, 226, 806, NAVY);
disc(190, 792, 7, GREY);
disc(202, 786, 5, GREY);
disc(178, 788, 4, GREY);
line(300, 806, 236, 830, RED);
disc(236, 830, 4, ORANGE);
drawPara(40, 886, 'Houthi missiles hit Riyadh, damaging the Saudi sovereign wealth fund tower.', 296, 2, INK);

// Column 2: peace talks.
drawText(364, 766, 'PEACE TALKS NEXT', 3, INK);
rect(364, 798, 296, 76, [214, 234, 214]);
// Table with two flags and a dove.
rect(400, 846, 224, 8, [120, 84, 48]);
rect(410, 854, 8, 20, [120, 84, 48]);
rect(606, 854, 8, 20, [120, 84, 48]);
// Blue flag left, yellow flag right.
rect(420, 812, 30, 20, BLUE);
rect(580, 812, 30, 20, GOLD);
vline(435, 812, 846, INK);
vline(595, 812, 846, INK);
// Dove: body, wing, head, olive branch.
disc(512, 826, 12, WHITE);
line(500, 822, 478, 810, WHITE);
line(500, 830, 482, 836, WHITE);
disc(526, 818, 6, WHITE);
line(532, 816, 538, 818, GOLD);
line(540, 824, 560, 832, GREEN);
disc(548, 826, 3, GREEN);
disc(556, 830, 3, GREEN);
drawPara(364, 886, "Europe's leaders said they would join new Ukraine peace talks soon.", 296, 2, INK);

// Column 3: Word of the Year.
drawText(688, 766, 'WORD OF THE YEAR', 3, INK);
rect(688, 798, 296, 76, [250, 240, 214]);
// Open book.
rect(716, 812, 120, 48, WHITE);
rect(716, 812, 120, 2, INK);
rect(716, 858, 120, 2, INK);
rect(716, 812, 2, 48, INK);
rect(834, 812, 2, 48, INK);
vline(776, 812, 858, INK);
for (let ly = 822; ly <= 850; ly += 8) {
  hline(724, 768, ly, RULE);
  hline(784, 828, ly, RULE);
}
drawTextCentered(836, 824, '"human"', 3, RED);
drawPara(688, 886, "Cambridge Dictionary named 'human' its Word of the Year.", 296, 2, INK);

// --- Footer -------------------------------------------------------------------
hline(40, 984, 952, RULE);
drawTextCentered(512, 968, 'THE WORLD DAILY  ·  FRIDAY 20 NOVEMBER 2026  ·  SIX STORIES, ONE FRONT PAGE', 1, GREY);

// --- Write the file ------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'entry.png'), encodePng());
