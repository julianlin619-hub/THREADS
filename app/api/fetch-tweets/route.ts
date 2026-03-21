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
      twitterHandles: ['AlexHormozi'],   // ✅ profile-specific param
      maxItems: 30,
      sort: 'Latest',
      minimumFavorites: 4000,
    });

    const { items } = await client.dataset(defaultDatasetId).listItems();
    const raw = items as Record<string, unknown>[];

    const tweets = raw
      .map((t) => ({
        id: String(t.id ?? ''),
        text: decodeHtml(String(t.text ?? '')),
        likeCount: Number(t.likeCount ?? 0),
        createdAt: String(t.createdAt ?? ''),
        url: String(t.url ?? ''),              // ✅ useful to have
        retweetCount: Number(t.retweetCount ?? 0), // ✅ useful to have
      }))
      .filter((t) => t.text.trim() && t.likeCount >= 4000)
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