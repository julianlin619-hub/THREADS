import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs';

// Register font at module load time (once)
registerFont(path.join(process.cwd(), 'public/fonts/LibreFranklin-Regular.otf'), {
  family: 'Libre Franklin',
  weight: '400',
});

const FONT_WEIGHT = 400;
const W = 1080;
const H = 1920;

interface CanvasConfig {
  minTopPadding: number;
  contentAreaHeight: number;
  maxFontSize: number;
  minFontSize: number;
  fontSizeStep: number;
  lineHeightMult: number;
  letterSpacing: number;
  blankLineRatio: number;
  gap: number;
  topOffset: number;
  headerX: number;
  headerWidth: number;
  textPaddingX: number;
  textRightBoundary: number;
  bgColor: string;
  textColor: string;
}

function loadConfig(): CanvasConfig {
  const raw = fs.readFileSync(path.join(process.cwd(), 'data/canvas-config.json'), 'utf8');
  return JSON.parse(raw);
}

interface WrappedLine {
  text: string;
  isBlank: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function measureText(ctx: any, text: string, letterSpacing: number): number {
  return ctx.measureText(text).width + letterSpacing * Math.max(0, text.length - 1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fillTextWithSpacing(ctx: any, text: string, x: number, y: number, letterSpacing: number): void {
  let currentX = x;
  for (const char of text) {
    ctx.fillText(char, currentX, y);
    currentX += ctx.measureText(char).width + letterSpacing;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapTextToLines(ctx: any, text: string, maxWidth: number, letterSpacing: number): WrappedLine[] {
  const result: WrappedLine[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      result.push({ text: '', isBlank: true });
      continue;
    }
    let currentLine = '';
    for (const word of paragraph.split(' ')) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (measureText(ctx, candidate, letterSpacing) > maxWidth && currentLine) {
        result.push({ text: currentLine, isBlank: false });
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) result.push({ text: currentLine, isBlank: false });
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeLayout(
  ctx: any,
  text: string,
  maxWidth: number,
  headerH: number,
  cfg: CanvasConfig
): { fontSize: number; lineHeight: number; lines: WrappedLine[]; padding: number } {
  const sizes: number[] = [];
  for (let s = cfg.maxFontSize; s > cfg.minFontSize; s -= cfg.fontSizeStep) sizes.push(s);
  sizes.push(cfg.minFontSize);

  for (let i = 0; i < sizes.length; i++) {
    const fontSize = sizes[i];
    ctx.font = `${FONT_WEIGHT} ${fontSize}px "Libre Franklin"`;
    const lineHeight = fontSize * cfg.lineHeightMult;
    const blankH = lineHeight * cfg.blankLineRatio;
    const lines = wrapTextToLines(ctx, text, maxWidth, cfg.letterSpacing);
    const totalTextH = lines.reduce((acc, l) => acc + (l.isBlank ? blankH : lineHeight), 0);
    const contentH = headerH + cfg.gap + totalTextH;
    // Center in full canvas height, but clamp so content bottom stays within contentAreaHeight
    const idealPadding = (H - contentH) / 2;
    const maxPadding = cfg.contentAreaHeight - contentH; // bottom of content at dead zone boundary
    const padding = Math.min(idealPadding, maxPadding);

    const isLast = i === sizes.length - 1;
    if (padding >= cfg.minTopPadding || isLast) {
      return { fontSize, lineHeight, lines, padding: Math.max(0, padding) };
    }
  }

  return { fontSize: cfg.minFontSize, lineHeight: cfg.minFontSize * cfg.lineHeightMult, lines: [], padding: 0 };
}

export async function renderTweetToBuffer(text: string, configOverride?: Partial<CanvasConfig>): Promise<Buffer> {
  const cfg: CanvasConfig = { ...loadConfig(), ...configOverride };
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // 1. Background
  ctx.fillStyle = cfg.bgColor;
  ctx.fillRect(0, 0, W, H);

  // 2. Load header image and compute its height
  const headerImage = await loadImage(path.join(process.cwd(), 'public/Header.png'));
  const ratio = headerImage.height / headerImage.width;
  const headerH = cfg.headerWidth * ratio;

  // 3. Compute layout
  const maxTextWidth = cfg.textRightBoundary - cfg.textPaddingX;
  const layout = computeLayout(ctx, text, maxTextWidth, headerH, cfg);

  // 4. Draw header (centered within active area, with topOffset cosmetic shift)
  const headerY = layout.padding - cfg.topOffset;
  ctx.drawImage(headerImage, cfg.headerX, headerY, cfg.headerWidth, headerH);

  // 5. Draw text
  const textY = headerY + headerH + cfg.gap;
  ctx.fillStyle = cfg.textColor;
  ctx.textBaseline = 'top';
  ctx.font = `${FONT_WEIGHT} ${layout.fontSize}px "Libre Franklin"`;

  let currentY = textY;
  for (const line of layout.lines) {
    if (line.isBlank) {
      currentY += layout.lineHeight * cfg.blankLineRatio;
    } else {
      fillTextWithSpacing(ctx, line.text, cfg.textPaddingX, currentY, cfg.letterSpacing);
      currentY += layout.lineHeight;
    }
  }

  return canvas.toBuffer('image/png');
}

export type { CanvasConfig };
