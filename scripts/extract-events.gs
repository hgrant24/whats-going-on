/**
 * What's Going On — Event Extraction Script
 * Google Apps Script (paste into your Google Sheet via Extensions → Apps Script)
 *
 * What it does:
 *  1. Fires automatically when a new form submission arrives
 *  2. Fetches the submitted URL, strips the HTML down to readable text
 *  3. Sends it to Claude to extract events and generate 3+ months of specific dates
 *  4. Writes structured rows into an "Approved Events" tab
 *  5. Runs a full re-scan every Sunday morning to pick up newly added events
 *
 * One-time setup:
 *  1. Open your Google Sheet → Extensions → Apps Script
 *  2. Replace the default code with this entire file
 *  3. Click the gear icon (Project Settings) → Script Properties → Add property
 *     Name: CLAUDE_API_KEY   Value: sk-ant-...your key...
 *  4. Save, then run setupTriggers() once (select it in the dropdown → Run)
 *  5. Approve the permissions popup — this is needed for UrlFetch and Sheets access
 *
 * After events are generated:
 *  - A new "Approved Events" tab appears in your sheet
 *  - Publish it: File → Share → Publish to web → Approved Events → CSV → Copy URL
 *  - Update GOOGLE_SHEET_CSV_URL in Vercel to that new URL
 *  - Future pushes: git push → Vercel auto-deploys, no env var change needed
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const CLAUDE_API_KEY_PROP = 'CLAUDE_API_KEY';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap; swap to claude-sonnet-4-6 for better results
const APPROVED_SHEET_NAME = 'Approved Events';
const PROCESSED_COL_HEADER = 'Processed';
const DEFAULT_TOWN = 'Bristol'; // fallback town when Claude can't determine it
const MONTHS_AHEAD = 3; // how many months of dates to generate for recurring events

const APPROVED_HEADERS = [
  'Event name', 'Venue', 'Town', 'Category',
  'Start date', 'Start time', 'End time',
  'Recurring?', 'Recurrence rule', 'Description',
  'Source link', 'Last verified', 'Tags',
  'Cost', 'Age friendly?', 'Outdoor?',
  'Image URL', 'Notes',
];

// ─── Sheet helpers ────────────────────────────────────────────────────────────

function getOrCreateApprovedSheet(ss) {
  let sheet = ss.getSheetByName(APPROVED_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(APPROVED_SHEET_NAME);
    const headerRange = sheet.getRange(1, 1, 1, APPROVED_HEADERS.length);
    headerRange.setValues([APPROVED_HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f9ff');
    Logger.log('Created "Approved Events" sheet.');
  }
  return sheet;
}

function getRawSheet(ss) {
  const candidates = ['Form Responses 1', 'Form responses 1', 'Responses', 'Sheet1'];
  for (const name of candidates) {
    const s = ss.getSheetByName(name);
    if (s) return s;
  }
  return ss.getSheets()[0];
}

function getOrAddProcessedCol(rawSheet) {
  const headers = rawSheet.getRange(1, 1, 1, Math.max(rawSheet.getLastColumn(), 1)).getValues()[0];
  const idx = headers.findIndex(h => h.toString().trim() === PROCESSED_COL_HEADER);
  if (idx !== -1) return idx + 1; // 1-indexed
  const col = rawSheet.getLastColumn() + 1;
  rawSheet.getRange(1, col).setValue(PROCESSED_COL_HEADER).setFontWeight('bold');
  return col;
}

function getUrlColIdx(headers) {
  return headers.findIndex(h => {
    const s = h.toString().toLowerCase().trim();
    return s === 'url' || s === 'link' || s.includes('url') || s.includes('link');
  });
}

function getNotesColIdx(headers) {
  return headers.findIndex(h => h.toString().toLowerCase().trim().includes('notes'));
}

// ─── Web fetch ────────────────────────────────────────────────────────────────

function fetchPageText(url) {
  // Primary: Jina.ai reader — renders JavaScript, returns clean markdown text.
  // Free, no API key, handles Squarespace/Wix/React/etc.
  try {
    const jinaResp = UrlFetchApp.fetch('https://r.jina.ai/' + url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'Accept': 'text/plain' },
    });
    if (jinaResp.getResponseCode() === 200) {
      const text = jinaResp.getContentText().trim();
      if (text.length > 300) {
        Logger.log('Jina reader: ' + text.length + ' chars from ' + url);
        return text.substring(0, 12000);
      }
    }
    Logger.log('Jina returned short/empty response, falling back to direct fetch.');
  } catch (e) {
    Logger.log('Jina reader failed (' + e.message + '), falling back to direct fetch.');
  }

  // Fallback: direct fetch + strip HTML tags manually
  try {
    const resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsGoingOnBot/1.0)' },
    });
    if (resp.getResponseCode() !== 200) {
      Logger.log('Non-200 from ' + url + ': ' + resp.getResponseCode());
      return null;
    }
    let html = resp.getContentText().substring(0, 40000);
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    html = html.replace(/<[^>]+>/g, ' ');
    html = html.replace(/\s{2,}/g, ' ').trim();
    Logger.log('Direct fetch: ' + html.length + ' chars from ' + url);
    return html.substring(0, 10000);
  } catch (e) {
    Logger.log('Direct fetch error for ' + url + ': ' + e.message);
    return null;
  }
}

// ─── Claude API ───────────────────────────────────────────────────────────────

function callClaude(pageText, sourceUrl) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(CLAUDE_API_KEY_PROP);
  if (!apiKey) throw new Error('CLAUDE_API_KEY not set in Script Properties.');

  const tz = 'America/New_York';
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + MONTHS_AHEAD);
  const endDateStr = Utilities.formatDate(endDate, tz, 'yyyy-MM-dd');

  const prompt = `You extract events from venue/restaurant websites for a local events guide in Bristol and the East Bay of Rhode Island.

Today: ${today}. The current year is ${today.substring(0, 4)}. Generate events from ${today} through ${endDateStr}.

Webpage from: ${sourceUrl}
---
${pageText}
---

Instructions:
- Extract ALL events: trivia nights, live music, open mic, karaoke, game nights, markets, themed nights, etc.
- For RECURRING events (e.g. "Trivia every Tuesday at 7pm"), generate one entry per date from today through ${endDateStr}.
- YEAR HANDLING: If a date shows only month/day (like "8/1" or "August 1"), assume the current year (${today.substring(0, 4)}) unless that month has already passed this year, in which case use next year.
- Include today's events — do not skip them.
- Only skip events that ended more than 1 day ago.
- If the venue/town is unclear, use "Bristol" and infer the venue name from the page title or content.
- For cost: use "Free" if free, "$X" for paid, or leave blank if unknown.

Return ONLY a JSON array — no markdown fences, no extra text. Schema:
[
  {
    "name": "string — clear event name",
    "venue": "string — establishment name",
    "town": "string — Bristol, Warren, Providence, Newport, or Other",
    "category": "Trivia | Live Music | Food/Drink | Sports/League | Market | Family | Comedy | Arts/Culture | Other",
    "startDate": "YYYY-MM-DD",
    "startTime": "HH:MM in 24h, or empty string",
    "endTime": "HH:MM in 24h, or empty string",
    "isRecurring": true | false,
    "recurrenceRule": "e.g. Every Tuesday at 7 PM, or empty string",
    "description": "1–2 sentence description, or empty string",
    "cost": "Free | $X | empty string",
    "ageFriendly": true | false | null,
    "outdoor": true | false | null
  }
]

If no events found, return [].`;

  const payload = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: '[' }, // prefill — forces Claude to continue the JSON array
    ],
  });

  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    payload,
    muteHttpExceptions: true,
  });

  const body = JSON.parse(resp.getContentText());
  if (body.error) throw new Error('Claude error: ' + body.error.message);

  // Prepend the '[' we used as the prefill, then parse
  const raw = '[' + body.content[0].text.trim();
  Logger.log('Claude raw response (first 300 chars): ' + raw.substring(0, 300));

  try {
    return JSON.parse(raw);
  } catch (e) {
    // Last-resort: find the array boundaries
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (_) {}
    }
    Logger.log('Full Claude response:\n' + raw);
    throw new Error('Could not parse Claude response as JSON. Check Execution Log for raw output.');
  }
}

// ─── Write events ─────────────────────────────────────────────────────────────

function buildExistingKeys(approvedSheet) {
  const keys = new Set();
  const vals = approvedSheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    const name = (vals[i][0] || '').toString().toLowerCase().trim();
    const date = (vals[i][4] || '').toString().trim();
    if (name && date) keys.add(name + '|' + date);
  }
  return keys;
}

function eventKey(name, date) {
  return name.toLowerCase().trim() + '|' + date.trim();
}

function writeEvents(approvedSheet, events, sourceUrl, notes, existingKeys) {
  const tz = 'America/New_York';
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  let added = 0;

  // Cutoff = yesterday, so today's events are always included
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoff = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');

  for (const e of events) {
    if (!e.name || !e.startDate) continue;
    if (e.startDate < cutoff) continue; // skip events older than yesterday
    const key = eventKey(e.name, e.startDate);
    if (existingKeys.has(key)) continue; // skip duplicates
    existingKeys.add(key);

    approvedSheet.appendRow([
      e.name.trim(),
      (e.venue || '').trim(),
      (e.town || DEFAULT_TOWN).trim(),
      (e.category || 'Other').trim(),
      e.startDate,
      e.startTime || '',
      e.endTime || '',
      e.isRecurring ? 'Yes' : 'No',
      (e.recurrenceRule || '').trim(),
      (e.description || notes || '').trim(),
      sourceUrl,
      today,
      '',
      (e.cost || '').trim(),
      e.ageFriendly === true ? 'Yes' : e.ageFriendly === false ? 'No' : '',
      e.outdoor === true ? 'Yes' : e.outdoor === false ? 'No' : '',
      '',
      '',
    ]);
    added++;
  }
  return added;
}

// ─── Main processing ──────────────────────────────────────────────────────────

function processNewSubmissions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = getRawSheet(ss);
  const approvedSheet = getOrCreateApprovedSheet(ss);
  const processedCol = getOrAddProcessedCol(rawSheet);

  const data = rawSheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No submissions yet.');
    return;
  }

  const headers = data[0];
  const urlCol = getUrlColIdx(headers);
  const notesCol = getNotesColIdx(headers);

  if (urlCol === -1) {
    Logger.log('Cannot find URL/Link column in raw sheet. Headers: ' + headers.join(', '));
    return;
  }

  const existingKeys = buildExistingKeys(approvedSheet);
  const tz = 'America/New_York';
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  let totalAdded = 0;

  for (let row = 1; row < data.length; row++) {
    const url = (data[row][urlCol] || '').toString().trim();
    const notes = notesCol !== -1 ? (data[row][notesCol] || '').toString().trim() : '';
    const status = (data[row][processedCol - 1] || '').toString().trim();

    if (!url) continue;
    if (status.startsWith('done') || status.startsWith('processing')) continue;
    // Allow 'recheck' (set by weeklyRecheck) to fall through

    Logger.log('[Row ' + (row + 1) + '] Processing: ' + url);
    rawSheet.getRange(row + 1, processedCol).setValue('processing...');
    SpreadsheetApp.flush();

    try {
      // Check execution time — Apps Script has a 6-min limit
      const pageText = fetchPageText(url);
      if (!pageText) {
        rawSheet.getRange(row + 1, processedCol).setValue('error: could not fetch page');
        continue;
      }

      const events = callClaude(pageText, url);
      Logger.log('  → Extracted ' + events.length + ' events');

      const added = writeEvents(approvedSheet, events, url, notes, existingKeys);
      totalAdded += added;

      rawSheet.getRange(row + 1, processedCol).setValue(
        'done — ' + added + ' events added ' + today
      );
    } catch (err) {
      Logger.log('  → Error: ' + err.message);
      rawSheet.getRange(row + 1, processedCol).setValue(
        'error: ' + err.message.substring(0, 120)
      );
    }

    // Small pause between submissions to avoid rate limits
    if (row < data.length - 1) Utilities.sleep(2000);
  }

  Logger.log('Finished. Added ' + totalAdded + ' new events total.');
}

// ─── Weekly re-scan ───────────────────────────────────────────────────────────

function weeklyRecheck() {
  // Reset all processed rows so we re-scan every URL for new future dates
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = getRawSheet(ss);
  const processedCol = getOrAddProcessedCol(rawSheet);
  const data = rawSheet.getDataRange().getValues();

  for (let row = 1; row < data.length; row++) {
    const status = (data[row][processedCol - 1] || '').toString().trim();
    if (status.startsWith('done')) {
      rawSheet.getRange(row + 1, processedCol).setValue('recheck');
    }
  }

  // Also purge Approved Events rows that are now in the past (older than 2 days)
  const approvedSheet = ss.getSheetByName(APPROVED_SHEET_NAME);
  if (approvedSheet) {
    const tz = 'America/New_York';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const cutoff = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');

    const rows = approvedSheet.getDataRange().getValues();
    const toDelete = [];
    for (let i = rows.length - 1; i >= 1; i--) {
      const date = (rows[i][4] || '').toString().trim();
      const isRecurring = (rows[i][7] || '').toString().trim().toLowerCase() === 'yes';
      if (date && date < cutoff && !isRecurring) toDelete.push(i + 1);
    }
    toDelete.forEach(r => approvedSheet.deleteRow(r));
    if (toDelete.length > 0) Logger.log('Removed ' + toDelete.length + ' past events.');
  }

  processNewSubmissions();
}

// ─── Trigger setup (run once) ─────────────────────────────────────────────────

function setupTriggers() {
  // Remove any existing triggers first
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Fire when a new form response arrives
  ScriptApp.newTrigger('onFormSubmitHandler')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  // Full weekly re-scan every Sunday at 6 AM Eastern
  ScriptApp.newTrigger('weeklyRecheck')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(6)
    .inTimezone('America/New_York')
    .create();

  Logger.log('✓ Triggers created: onFormSubmit + weekly Sunday 6 AM ET');
}

function onFormSubmitHandler(e) {
  // Called automatically on new form submission
  Utilities.sleep(2000); // give Sheets a moment to write the row
  processNewSubmissions();
}

// ─── Manual test / one-off run ────────────────────────────────────────────────

function runNow() {
  // Select this function and hit Run to process all pending URLs immediately
  processNewSubmissions();
}

function resetErrors() {
  // Clears only "error: ..." rows so they'll be re-processed.
  _resetRows(status => status.startsWith('error'));
}

function resetAll() {
  // Clears ALL processed statuses (errors, done, done-0, recheck) — re-processes every URL.
  _resetRows(() => true);
}

function _resetRows(predicate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = getRawSheet(ss);
  const processedCol = getOrAddProcessedCol(rawSheet);
  const data = rawSheet.getDataRange().getValues();
  let cleared = 0;
  for (let row = 1; row < data.length; row++) {
    const status = (data[row][processedCol - 1] || '').toString().trim();
    if (status && predicate(status)) {
      rawSheet.getRange(row + 1, processedCol).setValue('');
      cleared++;
    }
  }
  Logger.log('Cleared ' + cleared + ' rows. Run runNow() to re-process them.');
}
