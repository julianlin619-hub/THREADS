import { NextResponse } from 'next/server';
import { postToBuffer } from '@/lib/buffer';
import { selectTweets, markPosted, getBankStats } from '@/lib/tweet-bank';

const DEFAULT_COUNT = 5;

export async function POST() {
  try {
    const tweets = selectTweets(DEFAULT_COUNT);

    if (tweets.length === 0) {
      const stats = getBankStats();
      return NextResponse.json({
        posted: 0,
        errors: [],
        message: `Tweet bank exhausted — all ${stats.total} tweets have been posted.`,
      });
    }

    const errors: { index: number; error: string }[] = [];
    const posted: number[] = [];

    for (const tweet of tweets) {
      try {
        await postToBuffer(tweet.text);
        posted.push(tweet.index);
      } catch (err) {
        errors.push({ index: tweet.index, error: (err as Error).message });
      }
    }

    if (posted.length > 0) {
      markPosted(posted);
    }

    const stats = getBankStats();

    return NextResponse.json({
      posted: posted.length,
      errors,
      remaining: stats.remaining,
    });
  } catch (err) {
    const error = err as { message?: string };
    console.error('Bank tweet error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
