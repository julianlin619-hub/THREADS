import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'tweet-history.json');

interface TweetHistory {
  seenIds: string[];
  batchCount: number;
}

function getHistory(): TweetHistory {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as TweetHistory;
  } catch {
    const defaults: TweetHistory = { seenIds: [], batchCount: 0 };
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

function writeHistory(history: TweetHistory): void {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function addSeenIds(ids: string[]): void {
  const history = getHistory();
  const merged = Array.from(new Set([...history.seenIds, ...ids]));
  writeHistory({ ...history, seenIds: merged });
}

export function getNextBatchNumber(): number {
  const history = getHistory();
  const next = history.batchCount + 1;
  writeHistory({ ...history, batchCount: next });
  return next;
}

export function resetHistory(): void {
  writeHistory({ seenIds: [], batchCount: 0 });
}

export { getHistory };
