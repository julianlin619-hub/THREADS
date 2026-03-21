import { NextResponse } from 'next/server';
import { resetHistory } from '@/lib/tweet-history';

export async function POST() {
  resetHistory();
  return NextResponse.json({ ok: true });
}
