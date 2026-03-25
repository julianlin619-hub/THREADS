import { NextRequest, NextResponse } from 'next/server';
import { postToBuffer } from '@/lib/buffer';
import { addSeenIds, incrementPostCount } from '@/lib/tweet-history';

interface Tweet {
  id: string;
  text: string;
}

export async function POST(req: NextRequest) {
  const { tweets } = (await req.json()) as { tweets: Tweet[] };

  if (!Array.isArray(tweets) || tweets.length === 0) {
    return NextResponse.json({ error: 'No tweets provided' }, { status: 400 });
  }

  const errors: { id: string; error: string }[] = [];
  const posted: string[] = [];

  for (const tweet of tweets) {
    try {
      await postToBuffer(tweet.text);
      posted.push(tweet.id);
    } catch (err) {
      errors.push({ id: tweet.id, error: (err as Error).message });
    }
  }

  if (posted.length > 0) {
    addSeenIds(posted);
    incrementPostCount();
  }

  return NextResponse.json({ posted: posted.length, errors });
}
