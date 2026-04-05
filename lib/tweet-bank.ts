import fs from 'fs';
import path from 'path';

const BANK_FILE = path.join(process.cwd(), 'data', 'tweet_bank_1.csv');
const HISTORY_FILE = path.join(process.cwd(), 'data', 'tweet-bank-history.json');

interface BankHistory {
  postedIndices: number[];
}

function getHistory(): BankHistory {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as BankHistory;
  } catch {
    const defaults: BankHistory = { postedIndices: [] };
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

function writeHistory(history: BankHistory): void {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/** Parse single-column CSV with quoted multi-line entries */
function parseCsv(): string[] {
  const raw = fs.readFileSync(BANK_FILE, 'utf-8');
  const tweets: string[] = [];
  let i = 0;

  while (i < raw.length) {
    if (raw[i] === '"') {
      let end = i + 1;
      while (end < raw.length) {
        if (raw[end] === '"' && raw[end + 1] === '"') {
          end += 2;
          continue;
        }
        if (
          raw[end] === '"' &&
          (end + 1 >= raw.length || raw[end + 1] === '\n' || raw[end + 1] === '\r')
        ) {
          break;
        }
        end++;
      }
      tweets.push(raw.substring(i + 1, end).replace(/""/g, '"'));
      i = end + 1;
      if (raw[i] === '\r') i++;
      if (raw[i] === '\n') i++;
    } else {
      let end = raw.indexOf('\n', i);
      if (end === -1) end = raw.length;
      const line = raw.substring(i, end).replace(/\r$/, '');
      if (line.trim()) tweets.push(line);
      i = end + 1;
    }
  }

  return tweets;
}

/** Randomly select `count` unposted tweets from the bank */
export function selectTweets(count: number): { index: number; text: string }[] {
  const allTweets = parseCsv();
  const history = getHistory();
  const postedSet = new Set(history.postedIndices);

  const available = allTweets
    .map((text, index) => ({ index, text }))
    .filter((t) => !postedSet.has(t.index));

  if (available.length === 0) return [];

  // Fisher-Yates shuffle on available, then take first `count`
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  return available.slice(0, count);
}

/** Mark tweets as posted by their CSV index */
export function markPosted(indices: number[]): void {
  const history = getHistory();
  const merged = Array.from(new Set([...history.postedIndices, ...indices]));
  writeHistory({ postedIndices: merged });
}

/** Get stats about the tweet bank */
export function getBankStats(): { total: number; posted: number; remaining: number } {
  const total = parseCsv().length;
  const posted = getHistory().postedIndices.length;
  return { total, posted, remaining: total - posted };
}
