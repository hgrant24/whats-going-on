# What's Going On

A community-powered local events guide for Bristol & East Bay, Rhode Island.

## Local development

```bash
npm install
cp .env.local.example .env.local
# Fill in your values in .env.local
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_SHEET_CSV_URL` | Yes | Published CSV URL for the **Approved Events** tab |
| `RAW_SUBMISSIONS_CSV_URL` | No | Published CSV URL for the raw form submissions tab |
| `NEXT_PUBLIC_GOOGLE_FORM_URL` | Yes | Google Form `viewform` URL for public submissions |

## Publishing your Google Sheet as CSV

1. Open your Google Sheet.
2. Select the **Approved Events** tab.
3. **File → Share → Publish to web**.
4. Under "Link", choose the **Approved Events** tab and **Comma-separated values (.csv)**.
5. Click **Publish** and copy the URL.
6. Paste it as `GOOGLE_SHEET_CSV_URL`.

The URL format is:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/pub?gid=GID&single=true&output=csv
```

## Approved Events sheet columns

The app looks for these columns (capitalization and extra spaces are ignored):

| Column | Notes |
|---|---|
| Event name | Required |
| Venue | |
| Town | Bristol, Warren, Providence, Newport, etc. |
| Category | Trivia / Live Music / Food/Drink / Sports/League / Market / Family / Comedy / Arts/Culture / Other |
| Start date | YYYY-MM-DD or MM/DD/YYYY |
| Start time | HH:MM (24h or 12h) |
| End time | |
| Recurring? | Yes / No |
| Recurrence rule | e.g. "Every Wednesday, 7–9 PM" |
| Description | |
| Source link | Full URL |
| Last verified | |
| Tags | Comma-separated |
| Cost | e.g. "Free" or "$10" |
| Age friendly? | Yes / No |
| Outdoor? | Yes / No |
| Image URL | |
| Notes | Internal notes, not shown publicly |

## Sections

- **Tonight** — events happening today
- **This Week** — events in the next 7 days
- **Upcoming** — events beyond 7 days
- **Recurring** — events with no fixed date or marked as recurring

## Raw form submissions

If your sheet only has raw Google Form data (Timestamp, Link, Notes), the app will show a "Needs Review" list instead of the public feed. Create an **Approved Events** tab with structured columns to enable the public feed. An AI automation (Zapier, Make, etc.) can read the raw tab, scrape the link, and write structured rows into the Approved Events tab.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com).
3. Add environment variables in **Project → Settings → Environment Variables**.
4. Deploy.

Data refreshes automatically every ~10 minutes via Next.js `revalidate`.
