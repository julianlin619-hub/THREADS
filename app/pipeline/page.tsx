'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  url: string;
}

interface PostError {
  id: string;
  error: string;
}

export default function PipelinePage() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [fetchLoading, setFetchLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postResult, setPostResult] = useState<{ posted: number; errors: PostError[] } | null>(null);

  async function fetchTweets() {
    setFetchLoading(true);
    setError(null);
    setPostResult(null);
    try {
      const res = await fetch('/api/fetch-tweets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tweets');
      setTweets(data.tweets);
      setSelectedIds(new Set(data.tweets.map((t: Tweet) => t.id)));
      if (data.tweets.length === 0) {
        setError('No new tweets from @LeilaHormozi in the past 24 hours.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetchLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(tweets.map((t) => t.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  async function postToThreads() {
    setPostLoading(true);
    setError(null);
    setPostResult(null);
    try {
      const selectedTweets = tweets.filter((t) => selectedIds.has(t.id));
      const res = await fetch('/api/post-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweets: selectedTweets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post to Threads');
      setPostResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPostLoading(false);
    }
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-8 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
          T
        </div>
        <h1 className="font-bold text-lg tracking-tight">THREADS</h1>
        <span className="text-muted-foreground text-sm">Tweet → Threads Pipeline</span>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {error && (
            <div className="rounded-md border border-red-800 bg-red-950 text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Fetch Tweets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="primary">1</Badge>
                  Fetch Tweets
                </CardTitle>
                {tweets.length > 0 && (
                  <Badge variant="success">{tweets.length} fetched</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={fetchTweets} disabled={fetchLoading}>
                  {fetchLoading ? 'Fetching…' : tweets.length > 0 ? 'Re-fetch from Apify' : 'Fetch from Apify'}
                </Button>
              </div>

              {tweets.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <button onClick={selectAll} className="text-primary hover:underline">
                      Select All
                    </button>
                    <span className="text-muted-foreground">/</span>
                    <button onClick={selectNone} className="text-primary hover:underline">
                      None
                    </button>
                    <span className="text-muted-foreground ml-auto">{selectedCount} selected</span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tweets.map((tweet) => (
                      <label
                        key={tweet.id}
                        className="flex items-start gap-3 p-3 rounded-md border border-border bg-secondary cursor-pointer hover:bg-secondary/80"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tweet.id)}
                          onChange={() => toggleSelect(tweet.id)}
                          className="mt-0.5 accent-primary flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{tweet.text}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>{new Date(tweet.createdAt).toLocaleString()}</span>
                            <a
                              href={tweet.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View tweet ↗
                            </a>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post to Threads */}
          {tweets.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="primary">2</Badge>
                    Post to Threads
                  </CardTitle>
                  {postResult && <Badge variant="success">{postResult.posted} queued</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!postResult && (
                  <Button onClick={postToThreads} disabled={postLoading || selectedCount === 0}>
                    {postLoading
                      ? `Queueing ${selectedCount} tweet${selectedCount !== 1 ? 's' : ''}…`
                      : `Queue ${selectedCount} tweet${selectedCount !== 1 ? 's' : ''} to Buffer`}
                  </Button>
                )}

                {postResult && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{postResult.posted}</span> tweet{postResult.posted !== 1 ? 's' : ''} added to your Buffer queue for Threads.
                    </p>
                    {postResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-red-400 font-medium">{postResult.errors.length} error{postResult.errors.length !== 1 ? 's' : ''}:</p>
                        {postResult.errors.map((e) => (
                          <p key={e.id} className="text-xs text-red-400">{e.error}</p>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setTweets([]);
                        setSelectedIds(new Set());
                        setPostResult(null);
                        setError(null);
                      }}
                    >
                      Start Over
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
