# THREADS — Tweet-to-Threads Syndication Pipeline

Automated pipeline that scrapes @LeilaHormozi tweets and reposts them to Threads via Buffer. Runs daily as a GitHub Actions cron job.

## How it works

1. GitHub Actions triggers daily at 4:00 AM PST
2. Apify scrapes the 5 most recent tweets from @LeilaHormozi, filtered to past 24 hours
3. Each tweet is queued to Threads via Buffer's GraphQL API

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set GitHub Secrets
| Secret | Where to get it |
|---|---|
| `APIFY_API_KEY` | https://console.apify.com/account/integrations |
| `BUFFER_ACCESS_TOKEN` | Existing Buffer developer app |
| `BUFFER_THREADS_CHANNEL_ID` | Buffer API — query account channels |

### 3. Deploy
Push to GitHub. The workflow runs automatically on schedule or via manual `workflow_dispatch`.
