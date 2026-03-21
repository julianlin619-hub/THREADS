# CANVAS — Tweet-to-Canva Image Generator

Automatically converts high-performing tweets into polished Canva template images.

Instructions to user 
- every week scrape tweets

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env`
```bash
cp .env.example .env
```
Fill in your keys:
| Variable | Where to get it |
|---|---|
| `APIFY_API_KEY` | https://console.apify.com/account/integrations |
| `CANVA_CLIENT_ID` | https://www.canva.com/developers/ → your app |
| `CANVA_CLIENT_SECRET` | Same Canva developer app |

### 3. Set up your Canva template
1. Create a design in Canva
2. Add a text element and **rename the layer** to `tweet_text`
3. Copy the design ID from the URL: `canva.com/design/`**`DAxxxxxx`**`/...`

> The autofill API requires named text elements. The layer name must match exactly.

### 4. Run
```bash
npm run dev
```
Open **http://localhost:3000**

---

## How it works

1. **Configure** — enter X username, like threshold, Canva template ID
2. **Connect Canva** — OAuth popup, token saved in browser
3. **Fetch Tweets** — Apify `apidojo/tweet-scraper` fetches up to 200 recent tweets, filtered by like count
4. **Generate** — for each tweet:
   - Creates a new Canva design from your template
   - Autofills the `tweet_text` element with the tweet content
   - Exports as PNG and saves to `./exports/`
5. **Download** — individual PNGs or bulk ZIP

---

## Notes

- Apify runs take ~1-3 minutes depending on the account size
- Canva export jobs are async and polled every 2 seconds
- Generated images are saved to `./exports/` (gitignored)
- The Canva OAuth token expires after ~1 hour; reconnect if needed
