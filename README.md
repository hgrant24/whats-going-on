# What's Going On

Community-powered local events guide for Bristol & East Bay, Rhode Island.

**Live:** [whats-going-on-chi.vercel.app](https://whats-going-on-chi.vercel.app)
**Repo:** [github.com/hgrant24/whats-going-on](https://github.com/hgrant24/whats-going-on)

---

## How it works

1. Someone submits a venue/restaurant URL via the Google Form
2. The Apps Script (see `scripts/extract-events.gs`) fires automatically, fetches the page, and sends it to Claude
3. Claude extracts all events and generates 3+ months of specific dated instances for recurring events
4. Structured rows land in the **Approved Events** tab in Google Sheets
5. The Vercel site reads from that tab and displays Tonight / This Week / Upcoming / Recurring sections
6. Every Sunday at 6 AM the script re-scans all URLs for newly added events

---

## AI event extraction setup (one-time)

### 1. Add the script to Google Sheets

1. Open your [Google Sheet](https://docs.google.com/spreadsheets/d/1DTteqgBdqt2MWj-voDDLTv9nJ2_GomlUILdR9oaLX4o)
2. **Extensions → Apps Script**
3. Replace all default code with the contents of `scripts/extract-events.gs`
4. Save (Cmd+S)

### 2. Add your Claude API key

1. In Apps Script, click the **gear icon → Project Settings → Script Properties**
2. Add property: `CLAUDE_API_KEY` = `sk-ant-...`
   - Get a key at [console.anthropic.com](https://console.anthropic.com)

### 3. Set up auto-triggers (run once)

1. In the function dropdown at the top, select **`setupTriggers`**
2. Click **Run**
3. Approve the permissions popup

This creates two triggers:
- **On form submit** — processes the URL immediately when someone submits the form
- **Weekly (Sunday 6 AM ET)** — re-scans all URLs for new events and purges past dates

### 4. Test it manually

1. Select **`runNow`** in the dropdown → click **Run**
2. Check the Execution Log (View → Logs) — you should see events being extracted
3. A new **"Approved Events"** tab will appear in your sheet

### 5. Update the site to read from Approved Events

Once the Approved Events tab exists:

1. In Google Sheets: **File → Share → Publish to web**
2. Choose the **Approved Events** tab → **Comma-separated values (.csv)** → **Publish**
3. Copy the URL (format: `...pub?gid=GID&single=true&output=csv`)
4. In [Vercel project settings](https://vercel.com/hgrant24s-projects/whats-going-on/settings/environment-variables):
   - Update `GOOGLE_SHEET_CSV_URL` to the new Approved Events CSV URL
   - Optionally set `RAW_SUBMISSIONS_CSV_URL` to the old URL (keeps showing submitted spots)
5. Redeploy: `git commit --allow-empty -m "trigger redeploy" && git push`

---

## Local development

```bash
npm install
cp .env.local.example .env.local
# Fill in your values
npm run dev
```

Open http://localhost:3001 (or whatever port Next picks).

---

## Environment variables

| Variable | Description |
|---|---|
| `GOOGLE_SHEET_CSV_URL` | CSV URL for the **Approved Events** tab (or raw submissions until that tab exists) |
| `RAW_SUBMISSIONS_CSV_URL` | CSV URL for raw form submissions tab (shows as "Submitted Spots") |
| `NEXT_PUBLIC_GOOGLE_FORM_URL` | Google Form `viewform` link |

---

## Site sections

| Section | What shows |
|---|---|
| **Tonight** | Events happening today |
| **This Week** | Next 7 days |
| **Upcoming** | Beyond 7 days |
| **Recurring** | No fixed date or marked recurring |
| **Submitted Spots** | Raw form links (shown until Approved Events tab exists) |

---

## Approved Events sheet columns

The app auto-detects these columns regardless of capitalization:

`Event name` · `Venue` · `Town` · `Category` · `Start date` · `Start time` · `End time` · `Recurring?` · `Recurrence rule` · `Description` · `Source link` · `Last verified` · `Tags` · `Cost` · `Age friendly?` · `Outdoor?` · `Image URL` · `Notes`

---

## Deploy

```bash
git push  # Vercel auto-deploys on push (GitHub connected)
```

Data refreshes every ~10 minutes via Next.js `revalidate: 600`.
