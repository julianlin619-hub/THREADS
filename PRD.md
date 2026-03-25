# THREADS — Product Requirements Document

## Overview

THREADS is an automated pipeline that scrapes recent tweets from @AlexHormozi on X (Twitter) and reposts them verbatim to Threads via Buffer. It runs on a daily schedule via GitHub Actions and can also be triggered manually through a web dashboard.

The goal is zero-touch content syndication: every tweet posted in the last 24 hours by a source account gets queued to Threads automatically, without any editing or reformatting.

---

## Architecture

```
[GitHub Actions cron / Web UI]
         ↓
POST /api/fetch-tweets
  ├── Calls Apify actor: apidojo/tweet-scraper
  ├── Target: @AlexHormozi, past 24 hours, sort: Latest
  ├── Deduplicates against tweet-history.json
  └── Returns: { tweets: [{ id, text, createdAt, url }] }
         ↓
POST /api/post-threads
  ├── For each tweet: POST to Buffer API queue
  ├── Buffer adds it to Threads scheduled queue
  ├── Records posted tweet IDs to tweet-history.json
  └── Returns: { posted: N, errors: [] }
```

---

## Apify Integration

**Actor:** `apidojo/tweet-scraper`
**API endpoint:** `POST https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs`
**Auth:** Bearer token via `APIFY_API_KEY` env var

**Input parameters:**
```json
{
  "twitterHandles": ["AlexHormozi"],
  "maxItems": 50,
  "sort": "Latest"
}
```

**24-hour filtering:** After the actor returns results, tweets are filtered client-side by `createdAt` timestamp to include only those from the past 24 hours. This is more reliable than relying on Apify's search date filters.

**Output fields used per tweet:**
- `id` — unique tweet ID (used for deduplication)
- `text` — full tweet text (reposted verbatim)
- `createdAt` — ISO timestamp (used for 24h filter)
- `url` — source tweet URL (stored for reference)

**Pricing:** $0.25 per 1,000 tweets on paid plan. $5/month free credits included. A paid Apify plan is required (free plan does not allow API calls).

---

## Buffer Integration

**Endpoint:** `POST https://api.bufferapp.com/1/updates/create.json`
**Auth:** OAuth long-lived access token via `BUFFER_ACCESS_TOKEN` env var
**Content-Type:** `application/x-www-form-urlencoded`

**Request parameters:**
- `access_token` — long-lived OAuth token
- `profile_ids[]` — Buffer profile ID for the connected Threads account (`BUFFER_THREADS_PROFILE_ID`)
- `text` — verbatim tweet text
- `now` — `false` (adds to scheduled queue, not immediate post)

**How to get your Threads profile ID:**
```bash
curl "https://api.bufferapp.com/1/profiles.json?access_token=YOUR_TOKEN"
```
Find the object where `"service": "threads"` and copy its `"id"` field.

**Rate limits:** 60 authenticated requests per user per minute.

**Important constraint:** Buffer no longer accepts new developer app registrations. You must already have an existing Buffer developer app. Contact Buffer support if you need API access.

---

## Deduplication Strategy

All processed tweet IDs are stored in `data/tweet-history.json`:

```json
{
  "seenIds": ["tweet_id_1", "tweet_id_2"],
  "postCount": 3
}
```

- `seenIds` — IDs of all tweets ever fetched (prevents reposting)
- `postCount` — running count of pipeline runs

The fetch step checks `seenIds` before returning tweets. Already-seen tweets are silently skipped. `postCount` increments on each successful post run.

To reset and reprocess all tweets: use the "Reset History" button in the web UI or call `POST /api/reset-history`.

---

## GitHub Actions Schedule

**File:** `.github/workflows/threads-pipeline.yml`
**Schedule:** Weekdays (Mon–Fri) at 9:00 AM UTC
**Manual trigger:** `workflow_dispatch` (GitHub UI or API)

**Pipeline steps:**
1. Checkout repo + setup Node 20
2. Install npm dependencies
3. Write `.env.local` from GitHub Secrets
4. Build Next.js app
5. Start server, wait for readiness
6. `POST /api/fetch-tweets` — scrape @AlexHormozi (past 24h)
7. If tweets found: `POST /api/post-threads` — queue to Buffer
8. Log results
9. Clean up secrets from disk

**Required GitHub Secrets:**
- `APIFY_API_KEY`
- `BUFFER_ACCESS_TOKEN`
- `BUFFER_THREADS_PROFILE_ID`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APIFY_API_KEY` | Yes | Apify API token for tweet scraping |
| `BUFFER_ACCESS_TOKEN` | Yes | Buffer OAuth long-lived access token |
| `BUFFER_THREADS_PROFILE_ID` | Yes | Buffer profile ID for connected Threads account |
| `PORT` | No | Server port (default: 3000) |

---

## Web Dashboard

URL: `/pipeline`

The dashboard provides:
1. **Fetch Tweets** — manually trigger Apify scrape, shows list of new tweets with timestamps
2. **Post to Threads** — select tweets and queue them to Buffer (deselect any you want to skip)
3. **Reset History** — clear `seenIds` so all recent tweets can be re-fetched

---

## Known Constraints

1. **Buffer new apps blocked:** Buffer closed new developer app registrations. An existing Buffer developer account with API access is required.
2. **Apify paid plan required:** Free Apify plan does not allow API calls; a paid plan ($5/month free credits) is needed.
3. **24h window is approximate:** Apify actor runtime varies (1–3 min). The 24h lookback is computed at request time and applied client-side after the actor completes.
4. **Threads character limit:** Threads posts max out at 500 characters. Long tweets will be truncated by Buffer silently — monitor for this if @AlexHormozi posts long threads.
