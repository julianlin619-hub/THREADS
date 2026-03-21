import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { normalizeTweetText } from '@/lib/tweet-normalize';
import { renderTweetToBuffer } from '@/lib/canvas-render';
import { renderPngToVideo } from '@/lib/video-render';

export async function POST(req: NextRequest) {
  const { tweets } = await req.json() as { tweets: { id: string; text: string }[] };

  const imagesDir = path.join(process.cwd(), 'exports', 'images');
  const videosDir = path.join(process.cwd(), 'exports', 'videos');
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });

  const files: { id: string; filePath: string; fileName: string; videoFilePath: string; videoFileName: string }[] = [];

  for (const tweet of tweets) {
    const normalized = normalizeTweetText(tweet.text);
    const buffer = await renderTweetToBuffer(normalized);
    const fileName = `tweet-${tweet.id}.png`;
    const videoFileName = `tweet-${tweet.id}.mp4`;
    const filePath = path.join(imagesDir, fileName);
    const videoFilePath = path.join(videosDir, videoFileName);
    await fs.writeFile(filePath, buffer);
    await renderPngToVideo(filePath, videoFilePath);
    files.push({ id: tweet.id, filePath, fileName, videoFilePath, videoFileName });
  }

  return NextResponse.json({ files });
}
