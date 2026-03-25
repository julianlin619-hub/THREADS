import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'tweet-history.json');

interface TweetHistory {
  seenIds: string[];
  postCount: number;
}

function getHistory(): TweetHistory {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as TweetHistory;
  } catch {
    const defaults: TweetHistory = { seenIds: [], postCount: 0 };
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

export function incrementPostCount(): void {
  const history = getHistory();
  writeHistory({ ...history, postCount: history.postCount + 1 });
}

export function resetHistory(): void {
  writeHistory({ seenIds: [], postCount: 0 });
}

export { getHistory };
