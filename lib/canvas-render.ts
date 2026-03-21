import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';

// Register font at module load time (once)
registerFont(path.join(process.cwd(), 'public/fonts/LibreFranklin-Regular.otf'), {
  family: 'Libre Franklin',
  weight: '400',
});

// ─── Constants (must match app/page.tsx exactly) ────────────────────────────

const FONT_WEIGHT = 400;
const LINE_HEIGHT_MULT = 1.4;
const MAX_FONT_SIZE = 52;
const MIN_FONT_SIZE = 12;
const GAP = 40;
const TOP_OFFSET = 20;
const W = 1080;
const H = 1350;

interface WrappedLine {
  text: string;
  isBlank: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapTextToLines(ctx: any, text: string, maxWidth: number): WrappedLine[] {
  const result: WrappedLine[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      result.push({ text: '', isBlank: true });
      continue;
    }
    let currentLine = '';
    for (const word of paragraph.split(' ')) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && currentLine) {
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
  headerH: number
): { fontSize: number; lineHeight: number; lines: WrappedLine[]; padding: number } {
  const sizes: number[] = [];
  for (let s = MAX_FONT_SIZE; s > MIN_FONT_SIZE; s -= 3) sizes.push(s);
  sizes.push(MIN_FONT_SIZE);

  for (let i = 0; i < sizes.length; i++) {
    const fontSize = sizes[i];
    ctx.font = `${FONT_WEIGHT} ${fontSize}px "Libre Franklin"`;
    const lineHeight = fontSize * LINE_HEIGHT_MULT;
    const blankH = lineHeight * 0.55;
    const lines = wrapTextToLines(ctx, text, maxWidth);
    const totalTextH = lines.reduce((acc, l) => acc + (l.isBlank ? blankH : lineHeight), 0);
    const padding = (H - headerH - GAP - totalTextH) / 2;

    const isLast = i === sizes.length - 1;
    if (padding >= 0 || isLast) {
      return { fontSize, lineHeight, lines, padding: Math.max(0, padding) };
    }
  }

  return { fontSize: MIN_FONT_SIZE, lineHeight: MIN_FONT_SIZE * LINE_HEIGHT_MULT, lines: [], padding: 0 };
}

export async function renderTweetToBuffer(text: string): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // 1. White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 2. Load header image and compute its height
  const headerImage = await loadImage(path.join(process.cwd(), 'public/Header.png'));
  const headerX = 108;
  const headerWidth = 721;
  const ratio = headerImage.height / headerImage.width;
  const headerH = headerWidth * ratio;

  // 3. Compute layout
  const maxTextWidth = W - 108 - 108; // textX=108, textRightPadding=108
  const layout = computeLayout(ctx, text, maxTextWidth, headerH);

  // 4. Draw header
  ctx.drawImage(headerImage, headerX, layout.padding - TOP_OFFSET, headerWidth, headerH);

  // 5. Draw text
  const textY = layout.padding - TOP_OFFSET + headerH + GAP;
  ctx.fillStyle = '#0f1419';
  ctx.textBaseline = 'top';
  ctx.font = `${FONT_WEIGHT} ${layout.fontSize}px "Libre Franklin"`;

  let currentY = textY;
  for (const line of layout.lines) {
    if (line.isBlank) {
      currentY += layout.lineHeight * 0.55;
    } else {
      ctx.fillText(line.text, 108, currentY);
      currentY += layout.lineHeight;
    }
  }

  return canvas.toBuffer('image/png');
}
