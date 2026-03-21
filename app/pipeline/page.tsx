'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Tweet {
  id: string;
  text: string;
  likeCount: number;
  createdAt: string;
  url: string;
}

interface GeneratedFile {
  id: string;
  filePath: string;
  fileName: string;
  videoFilePath: string;
  videoFileName: string;
}

interface UploadResult {
  fileName: string;
  driveId: string;
}

interface BatchFolder {
  id: string;
  name: string;
}

const DRIVE_ROOT_URL = 'https://drive.google.com/drive/folders/0AEw3aJ2mMki4Uk9PVA';

export default function PipelinePage() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [batchFolder, setBatchFolder] = useState<BatchFolder | null>(null);

  const [fetchLoading, setFetchLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleReset() {
    setResetLoading(true);
    setResetSuccess(false);
    try {
      await fetch('/api/reset-history', { method: 'POST' });
      setTweets([]);
      setSelectedIds(new Set());
      setError(null);
      setResetConfirm(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } finally {
      setResetLoading(false);
    }
  }

  async function fetchTweets() {
    setFetchLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fetch-tweets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tweets');
      setTweets(data.tweets);
      setSelectedIds(new Set(data.tweets.map((t: Tweet) => t.id)));
      if (data.tweets.length === 0) setError('No new tweets — all recent 4k+ tweets have already been seen. Reset history to re-fetch them.');
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

  async function generateAndUpload() {
    setGenerateLoading(true);
    setError(null);
    setBatchFolder(null);
    setUploadResults([]);
    try {
      const selectedTweets = tweets.filter((t) => selectedIds.has(t.id));
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweets: selectedTweets }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Failed to generate images');
      setGeneratedFiles(genData.files);

      setGenerateLoading(false);
      setUploadLoading(true);

      const upRes = await fetch('/api/upload-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: genData.files }),
      });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || 'Failed to upload to Drive');
      setBatchFolder(upData.batchFolder);
      setUploadResults(upData.uploadedFiles);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerateLoading(false);
      setUploadLoading(false);
    }
  }

  const selectedCount = selectedIds.size;
  const isRunning = generateLoading || uploadLoading;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-8 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
          C
        </div>
        <h1 className="font-bold text-lg tracking-tight">CANVAS</h1>
        <span className="text-muted-foreground text-sm">Tweet Pipeline</span>
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
                <Button onClick={fetchTweets} disabled={fetchLoading || resetLoading}>
                  {fetchLoading ? 'Fetching…' : tweets.length > 0 ? 'Re-fetch from Apify' : 'Fetch from Apify'}
                </Button>
                {!resetConfirm ? (
                  <button
                    onClick={() => setResetConfirm(true)}
                    disabled={fetchLoading || resetLoading}
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    Reset History
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Clear seen tweet history and reset batch numbering?</span>
                    <button
                      onClick={handleReset}
                      disabled={resetLoading}
                      className="text-destructive hover:underline font-medium"
                    >
                      {resetLoading ? 'Resetting…' : 'Confirm Reset'}
                    </button>
                    <button
                      onClick={() => setResetConfirm(false)}
                      className="text-muted-foreground hover:underline"
                    >
                      Cancel
                    </button>
                  </span>
                )}
                {resetSuccess && (
                  <span className="text-sm text-green-500">History cleared. Next batch will be #1.</span>
                )}
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
                            <span>{tweet.likeCount.toLocaleString()} likes</span>
                            <span>{new Date(tweet.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate & Upload — shown once tweets are fetched */}
          {tweets.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="primary">2</Badge>
                    Generate & Upload
                  </CardTitle>
                  {batchFolder && <Badge variant="success">Done</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!batchFolder && (
                  <Button onClick={generateAndUpload} disabled={isRunning || selectedCount === 0}>
                    {generateLoading
                      ? `Generating ${selectedCount} PNG${selectedCount !== 1 ? 's' : ''} + MP4${selectedCount !== 1 ? 's' : ''}…`
                      : uploadLoading
                      ? 'Uploading to Drive…'
                      : `Generate & Upload ${selectedCount} PNG${selectedCount !== 1 ? 's' : ''} + MP4${selectedCount !== 1 ? 's' : ''}`}
                  </Button>
                )}

                {generateLoading && (
                  <p className="text-sm text-muted-foreground">Rendering images…</p>
                )}

                {uploadLoading && generatedFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Generated {generatedFiles.length} image{generatedFiles.length !== 1 ? 's' : ''}, uploading…
                  </p>
                )}

                {batchFolder && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {uploadResults.length} file{uploadResults.length !== 1 ? 's' : ''} uploaded to{' '}
                      <span className="text-foreground font-medium">{batchFolder.name}</span>.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={`https://drive.google.com/drive/folders/${batchFolder.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Open {batchFolder.name} ↗
                      </a>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const imageFilenames = generatedFiles.map((f) => f.fileName);
                          const videoFilenames = generatedFiles.map((f) => f.videoFileName);
                          const res = await fetch('/api/download-zip', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageFilenames, videoFilenames }),
                          });
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'tweet-exports.zip';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download ZIP
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setTweets([]);
                          setSelectedIds(new Set());
                          setGeneratedFiles([]);
                          setUploadResults([]);
                          setBatchFolder(null);
                          setError(null);
                        }}
                      >
                        Start Over
                      </Button>
                    </div>

                    {generatedFiles.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Downloads</p>
                        <div className="space-y-1">
                          {generatedFiles.map((f) => (
                            <div key={f.id} className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground truncate flex-1">{f.fileName}</span>
                              <a
                                href={`/api/download/${f.fileName}`}
                                className="text-primary hover:underline"
                              >
                                PNG
                              </a>
                              <a
                                href={`/api/download/${f.videoFileName}`}
                                className="text-primary hover:underline"
                              >
                                MP4
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Google Drive shortcut */}
          <div className="pt-2">
            <a
              href={DRIVE_ROOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Open Google Drive ↗
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
