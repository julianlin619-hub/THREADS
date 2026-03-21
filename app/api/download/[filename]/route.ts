import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename);
  const ext = path.extname(filename).toLowerCase();

  let subfolder: string;
  let contentType: string;
  if (ext === '.mp4') {
    subfolder = 'videos';
    contentType = 'video/mp4';
  } else {
    subfolder = 'images';
    contentType = 'image/png';
  }

  const filepath = path.join(process.cwd(), 'exports', subfolder, filename);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const file = fs.readFileSync(filepath);
  return new Response(file, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
