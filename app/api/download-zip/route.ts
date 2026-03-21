import { NextRequest } from 'next/server';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';

export async function POST(request: NextRequest) {
  const { imageFilenames, videoFilenames } = await request.json();
  if (!imageFilenames?.length && !videoFilenames?.length) {
    return new Response('No filenames provided', { status: 400 });
  }

  const passthrough = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(passthrough);

  for (const filename of (imageFilenames ?? []) as string[]) {
    const safe = path.basename(filename);
    const filepath = path.join(process.cwd(), 'exports', 'images', safe);
    if (fs.existsSync(filepath)) {
      archive.file(filepath, { name: `images/${safe}` });
    }
  }

  for (const filename of (videoFilenames ?? []) as string[]) {
    const safe = path.basename(filename);
    const filepath = path.join(process.cwd(), 'exports', 'videos', safe);
    if (fs.existsSync(filepath)) {
      archive.file(filepath, { name: `videos/${safe}` });
    }
  }

  archive.finalize();

  const chunks: Uint8Array[] = [];
  await new Promise<void>((resolve, reject) => {
    passthrough.on('data', (chunk) => chunks.push(chunk));
    passthrough.on('end', resolve);
    passthrough.on('error', reject);
  });

  const buffer = Buffer.concat(chunks);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="tweet-exports.zip"',
    },
  });
}
