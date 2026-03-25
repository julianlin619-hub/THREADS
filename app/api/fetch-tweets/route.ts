import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { getHistory, addSeenIds } from '@/lib/tweet-history';

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export async function POST() {
  const apiKey = process.env.APIFY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'APIFY_API_KEY not configured in .env.local' },
      { status: 400 }
    );
  }

  try {
    const client = new ApifyClient({ token: apiKey });

    const { defaultDatasetId } = await client.actor('apidojo~tweet-scraper').call({
      twitterHandles: ['AlexHormozi'],
      maxItems: 50,
      sort: 'Latest',
    });

    const { items } = await client.dataset(defaultDatasetId).listItems();
    const raw = items as Record<string, unknown>[];

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const tweets = raw
      .map((t) => ({
        id: String(t.id ?? ''),
        text: decodeHtml(String(t.text ?? '')),
        createdAt: String(t.createdAt ?? ''),
        url: String(t.url ?? ''),
      }))
      .filter((t) => t.text.trim() && new Date(t.createdAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const { seenIds } = getHistory();
    const seenSet = new Set(seenIds);
    const newTweets = tweets.filter((t) => !seenSet.has(t.id));

    if (newTweets.length > 0) {
      addSeenIds(newTweets.map((t) => t.id));
    }

    return NextResponse.json({ tweets: newTweets });
  } catch (err) {
    const error = err as { message?: string };
    console.error('Apify error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}