import { NextResponse } from 'next/server';
import { renderTweetToBuffer, CanvasConfig } from '@/lib/canvas-render';

export async function POST(req: Request) {
  try {
    const { text, config } = await req.json() as { text: string; config?: Partial<CanvasConfig> };
    const buffer = await renderTweetToBuffer(text, config);
    const base64 = buffer.toString('base64');
    return NextResponse.json({ image: `data:image/png;base64,${base64}` });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
