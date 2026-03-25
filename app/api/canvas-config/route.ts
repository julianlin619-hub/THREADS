import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data/canvas-config.json');

export async function GET() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return NextResponse.json(JSON.parse(raw));
}

export async function POST(req: Request) {
  const body = await req.json();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2));
  return NextResponse.json({ ok: true });
}
