import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ hasApifyKey: !!process.env.APIFY_API_KEY });
}
