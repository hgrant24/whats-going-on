/**
 * What's Going On — Event Extraction Script  v4
 * Google Apps Script — paste into your Google Sheet via Extensions → Apps Script
 *
 * Handles three input types from the form:
 *   1. URL  — fetches the page and extracts events
 *   2. Notes — if the text looks like event schedules, sends to Claude directly
 *   3. Image — if a Drive file is uploaded, reads it and uses Claude Vision
 *
 * One-time setup:
 *  1. Open your Google Sheet → Extensions → Apps Script
 *  2. Select all, delete, paste this entire file, Save (Cmd+S)
 *  3. Gear icon → Project Settings → Script Properties → Add:
 *       CLAUDE_API_KEY = sk-ant-...your key...
 *  4. Function dropdown → setupTriggers → Run → approve permissions
 *  5. Function dropdown → authorizeDrive → Run → approve the Drive permission
 *     (REQUIRED for reading uploaded chalkboard/poster photos)
 *  6. Function dropdown → runNow → Run
 *
 * If image submissions error with "You do not have permission to call
 * DriveApp.getFileById", run authorizeDrive once and approve the prompt.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const CLAUDE_API_KEY_PROP = 'CLAUDE_API_KEY';
const CLAUDE_MODEL        = 'claude-haiku-4-5-20251001';
const APPROVED_SHEET_NAME = 'Approved Events';
const PROCESSED_COL_HDR   = 'Processed';
const DEFAULT_TOWN        = 'Bristol';
const MONTHS_AHEAD        = 3;
const STALE_PROCESSING_MS = 15 * 60 * 1000;
const MAX_IMAGE_BYTES     = 25 * 1024 * 1024; // 25 MB — skip larger images

const APPROVED_HEADERS = [
  'Event name','Venue','Town','Category',
  'Start date','Start time','End time',
  'Recurring?','Recurrence rule','Description',
  'Source link','Last verified','Tags',
  'Cost','Age friendly?','Outdoor?',
  'Image URL','Submitted by',
];

// ═══════════════════════════════════════════════════════════════════════════
// SHEET HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getOrCreateApprovedSheet(ss) {
  let sheet = ss.getSheetByName(APPROVED_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(APPROVED_SHEET_NAME);
    Logger.log('Created "Approved Events" sheet.');
  }
  // Always reconcile the header row so columns stay correctly labeled.
  // Sheets created by older versions had column R as "Notes" instead of
  // "Submitted by" — this relabels it without touching the data rows.
  const r = sheet.getRange(1, 1, 1, APPROVED_HEADERS.length);
  const current = r.getValues()[0];
  const matches = APPROVED_HEADERS.every((h, i) => (current[i] || '').toString().trim() === h);
  if (!matches) {
    r.setValues([APPROVED_HEADERS]);
    r.setFontWeight('bold');
    r.setBackground('#f0f9ff');
    Logger.log('Reconciled Approved Events header row.');
  }
  return sheet;
}

function getRawSheet(ss) {
  for (const name of ['Form Responses 1','Form responses 1','Responses','Sheet1']) {
    const s = ss.getSheetByName(name);
    if (s) return s;
  }
  return ss.getSheets()[0];
}

function getOrAddProcessedCol(rawSheet) {
  const headers = rawSheet.getRange(1, 1, 1, Math.max(rawSheet.getLastColumn(), 1)).getValues()[0];
  const idx = headers.findIndex(h => h.toString().trim() === PROCESSED_COL_HDR);
  if (idx !== -1) return idx + 1;
  const col = rawSheet.getLastColumn() + 1;
  rawSheet.getRange(1, col).setValue(PROCESSED_COL_HDR).setFontWeight('bold');
  return col;
}

function findCol(headers, ...terms) {
  return headers.findIndex(h => {
    const s = h.toString().toLowerCase().trim();
    return terms.some(t => s === t || s.includes(t));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML CLEANING
// ═══════════════════════════════════════════════════════════════════════════

function cleanHtmlToText(html) {
  html = html.replace(/<head\b[\s\S]*?<\/head>/gi, ' ');
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
  html = html.replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  html = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ');
  html = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ');
  html = html.replace(/<\/?(div|section|article|p|h[1-6]|li|tr|td|th|br|hr|blockquote)[^>]*>/gi, '\n');
  html = html.replace(/<[^>]+>/g, ' ');
  html = html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
             .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&#\d+;/g, ' ');
  html = html.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT PATTERN PREPROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

const EVENT_TITLE_RE = /\b(LIVE MUSIC|COMEDY|TRIVIA|KARAOKE|OPEN MIC|BINGO|GAME NIGHT|DJ\b|JAZZ|BLUES|FOLK|ROCK|ACOUSTIC|BAND|ARTIST|PERFORMER|BRUNCH|HAPPY HOUR|POETRY|OPEN JAM|COMEDY NIGHT)\b/i;
const DATE_LINE_RE   = /\b(MON|TUE|WED|THU|FRI|SAT|SUN|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b.{0,50}@.{0,30}\d{1,2}:\d{2}/i;

function extractEventChunks(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  const chunks = [];
  const used = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    if (EVENT_TITLE_RE.test(lines[i]) || DATE_LINE_RE.test(lines[i])) {
      const start = Math.max(0, i - 1);
      const end   = Math.min(lines.length, i + 5);
      chunks.push(lines.slice(start, end).join(' | '));
      for (let j = start; j < end; j++) used.add(j);
    }
  }
  return chunks;
}

function looksLikeEventPage(text) {
  return EVENT_TITLE_RE.test(text) || DATE_LINE_RE.test(text) ||
    /\b(FRIDAY|SATURDAY|SUNDAY)\b.*@\s*\d{1,2}:\d{2}/i.test(text) ||
    /\bno cover\b|\bcover charge\b|\bdoors at\b|\bshowtime\b/i.test(text);
}

// Notes text that looks like structured event schedules
function looksLikeEventSchedule(text) {
  const t = (text || '').trim();
  if (t.length < 12) return false; // ignore trivial notes like "thanks!"
  return (
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(t) ||
    /\bevery\b/i.test(t) ||                                  // "every wednesday"
    /\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(t) ||               // "7pm", "7:30 pm", "7-9pm"
    /\b(music|trivia|open mic|karaoke|bingo|comedy|game night|happy hour|concert|market|festival|show|tasting|brunch|live|night)\b/i.test(t) ||
    /(\n.*){2,}/.test(t)                                     // multi-line = pasted schedule
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════

function fetchViaJina(url) {
  try {
    const resp = UrlFetchApp.fetch('https://r.jina.ai/' + url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
    });
    if (resp.getResponseCode() !== 200) return null;
    const text = resp.getContentText().trim();
    if (text.length < 200) return null;
    Logger.log('  Jina: ' + text.length + ' chars');
    return text.substring(0, 25000);
  } catch (e) {
    Logger.log('  Jina failed: ' + e.message);
    return null;
  }
}

function fetchViaWordPressRest(url) {
  try {
    const parsed = new URL(url);
    const base   = parsed.origin;
    const endpoints = [
      base + '/wp-json/wp/v2/pages?slug=events&per_page=5',
      base + '/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc',
      base + '/wp-json/tribe/events/v1/events?per_page=30',
    ];
    for (const ep of endpoints) {
      try {
        const r = UrlFetchApp.fetch(ep, { muteHttpExceptions: true });
        if (r.getResponseCode() !== 200) continue;
        const items = JSON.parse(r.getContentText());
        if (!Array.isArray(items) || items.length === 0) continue;
        const texts = items.map(item => {
          const rendered = (item.content && item.content.rendered) || item.description || '';
          return cleanHtmlToText(rendered);
        }).join('\n---\n');
        if (texts.length > 300) {
          Logger.log('  WP REST: ' + texts.length + ' chars');
          return texts.substring(0, 25000);
        }
      } catch (_) {}
    }
  } catch (e) {
    Logger.log('  WP REST failed: ' + e.message);
  }
  return null;
}

function fetchViaDirect(url) {
  try {
    const resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsGoingOnBot/1.0)' },
    });
    if (resp.getResponseCode() !== 200) {
      Logger.log('  Direct: HTTP ' + resp.getResponseCode());
      return null;
    }
    const rawHtml = resp.getContentText();
    const cleaned = cleanHtmlToText(rawHtml);
    Logger.log('  Direct: raw=' + rawHtml.length + ' → cleaned=' + cleaned.length);
    return cleaned.substring(0, 30000);
  } catch (e) {
    Logger.log('  Direct fetch error: ' + e.message);
    return null;
  }
}

function fetchPageText(url) {
  Logger.log('Fetching URL: ' + url);
  const jina = fetchViaJina(url);
  if (jina && jina.length > 300) return jina;
  const wp = fetchViaWordPressRest(url);
  if (wp && wp.length > 300) return wp;
  return fetchViaDirect(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVE IMAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isDriveUrl(value) {
  return /drive\.google\.com/i.test(value);
}

function extractDriveFileId(url) {
  const m1 = url.match(/[?&]id=([^&\s,]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/\/file\/d\/([^/\s,]+)/);
  if (m2) return m2[1];
  return null;
}

function fetchDriveImageAsBase64(fileId) {
  const file = DriveApp.getFileById(fileId);
  const size = file.getSize();
  if (size > MAX_IMAGE_BYTES) {
    Logger.log('  Image too large (' + Math.round(size / 1024) + ' KB) — skipping');
    return null;
  }
  const blob     = file.getBlob();
  const bytes    = blob.getBytes();
  const base64   = Utilities.base64Encode(bytes);
  let mimeType   = blob.getContentType() || 'image/jpeg';
  const allowed  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(mimeType)) mimeType = 'image/jpeg';
  Logger.log('  Image: ' + file.getName() + ' (' + mimeType + ', ' + Math.round(size / 1024) + ' KB)');
  return { base64, mimeType };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE API
// ═══════════════════════════════════════════════════════════════════════════

function buildPrompt(pageText, sourceUrl, isRetry) {
  const tz         = 'America/New_York';
  const today      = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const year       = today.substring(0, 4);
  const endDate    = new Date();
  endDate.setMonth(endDate.getMonth() + MONTHS_AHEAD);
  const endDateStr = Utilities.formatDate(endDate, tz, 'yyyy-MM-dd');
  const retryNote  = isRetry
    ? '\n\nIMPORTANT: The content clearly contains event listings. You MUST extract each event title and its date/time. Do NOT return [] unless there are truly zero event title + date pairs.'
    : '';

  return `You extract events from venue/restaurant websites for a local events guide in Bristol and the East Bay of Rhode Island.

Today: ${today} (year: ${year}). Extract events from ${today} through ${endDateStr}.

Source: ${sourceUrl}
---
${pageText}
---

Rules:
- Extract ALL events: live music, trivia, open mic, karaoke, bingo, comedy, game nights, markets, themed nights, etc.
- IMPORTANT — for RECURRING events (e.g. "Trivia every Tuesday 7pm"), return ONLY ONE object with isRecurring:true and weekday set (e.g. "Tuesday"). Do NOT list out individual dates — the system expands them automatically. This keeps your response short.
- For ONE-TIME events with a specific date, set startDate and leave weekday empty.
- YEAR: dates with only month+day — use ${year} unless that date already passed, then use ${parseInt(year) + 1}.
- Skip any one-time event whose date is before ${today}. Include today's events.
- ORDER the output chronologically, SOONEST upcoming events FIRST. If the page has a very large number of events (e.g. a long concert series), prioritize the next ~8 weeks — list those first so the most relevant upcoming events are never dropped.
- Infer venue name from page title or context if not explicit. Default town: Bristol.
- Cost: "Free", "$X", or empty string.${retryNote}

Return ONLY a JSON array, no markdown, no prose. Schema per object:
{
  "name": "event title",
  "venue": "establishment name",
  "town": "Bristol | Warren | Providence | Newport | Other",
  "category": "Trivia | Live Music | Food/Drink | Sports/League | Market | Family | Comedy | Arts/Culture | Other",
  "startDate": "YYYY-MM-DD (one-time events only, else empty)",
  "weekday": "Monday..Sunday (recurring weekly events only, else empty)",
  "startTime": "HH:MM (24h) or empty",
  "endTime": "HH:MM (24h) or empty",
  "isRecurring": true|false,
  "recurrenceRule": "e.g. Every Tuesday at 7 PM, or empty",
  "description": "1–2 sentences or empty",
  "cost": "Free | $X | empty",
  "ageFriendly": true|false|null,
  "outdoor": true|false|null
}
If no events found after genuinely searching, return [].`;
}

function buildImagePrompt(sourceLabel) {
  const tz         = 'America/New_York';
  const today      = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const year       = today.substring(0, 4);
  const endDate    = new Date();
  endDate.setMonth(endDate.getMonth() + MONTHS_AHEAD);
  const endDateStr = Utilities.formatDate(endDate, tz, 'yyyy-MM-dd');

  return `You extract events from photos of chalkboards, event posters, flyers, menus, and signage for a local events guide in Bristol and the East Bay of Rhode Island.

Today: ${today} (year: ${year}). Extract events from ${today} through ${endDateStr}.

Source: ${sourceLabel}

Carefully read the image and extract ALL visible events:
- Live music, bands, DJs, artists
- Trivia nights, game nights, bingo, karaoke, open mic, comedy
- Special dinners, tastings, food events, markets, art shows
- Any community or recurring weekly/monthly events

Rules:
- IMPORTANT — for recurring events (e.g. "Every Tuesday"), return ONLY ONE object with isRecurring:true and weekday set (e.g. "Tuesday"). Do NOT list out individual dates — the system expands them automatically.
- For ONE-TIME events with a specific date, set startDate and leave weekday empty.
- YEAR: if only month+day shown, use ${year} unless past, then ${parseInt(year) + 1}.
- Skip any one-time event whose date is before ${today}. ORDER the output soonest upcoming first.
- Infer venue from any logos/name visible in the image. Default town: Bristol.
- Cost: "Free", "$X", or empty string.

Return ONLY a JSON array, no markdown, no prose. Schema per object:
{
  "name": "event title",
  "venue": "establishment name",
  "town": "Bristol | Warren | Providence | Newport | Other",
  "category": "Trivia | Live Music | Food/Drink | Sports/League | Market | Family | Comedy | Arts/Culture | Other",
  "startDate": "YYYY-MM-DD (one-time events only, else empty)",
  "weekday": "Monday..Sunday (recurring weekly events only, else empty)",
  "startTime": "HH:MM (24h) or empty",
  "endTime": "HH:MM (24h) or empty",
  "isRecurring": true|false,
  "recurrenceRule": "e.g. Every Tuesday at 7 PM, or empty",
  "description": "1–2 sentences or empty",
  "cost": "Free | $X | empty",
  "ageFriendly": true|false|null,
  "outdoor": true|false|null
}
If no events visible, return [].`;
}

function callClaudeApi(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(CLAUDE_API_KEY_PROP);
  if (!apiKey) throw new Error('CLAUDE_API_KEY not set in Script Properties.');

  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const body = JSON.parse(resp.getContentText());
  if (body.error) throw new Error('Claude API error: ' + body.error.message);
  if (!body.content || !body.content[0] || typeof body.content[0].text !== 'string') {
    Logger.log('Unexpected API response: ' + resp.getContentText().substring(0, 600));
    throw new Error('Claude returned no text content.');
  }

  const continuation = body.content[0].text.trim();
  Logger.log('  Claude stop_reason=' + body.stop_reason + ', length=' + continuation.length);
  Logger.log('  Claude (first 400 chars):\n' + continuation.substring(0, 400));
  // stop_reason "max_tokens" means the JSON was truncated — extractJsonArray repairs it.
  return extractJsonArray(continuation);
}

function extractJsonArray(text) {
  const tryParse = (s) => {
    try { const r = JSON.parse(s); return Array.isArray(r) ? r : null; } catch (_) { return null; }
  };

  // 1. Standard strategies (prefill continuation, echoed array, stripped fences)
  const candidates = [
    '[' + text,
    text,
    text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim(),
  ];
  for (const c of candidates) {
    const r = tryParse(c);
    if (r) return r;
    const s = c.indexOf('['), e = c.lastIndexOf(']');
    if (s !== -1 && e > s) {
      const r2 = tryParse(c.slice(s, e + 1));
      if (r2) return r2;
    }
  }

  // 2. Repair a TRUNCATED array (response hit max_tokens mid-object).
  //    Keep everything up to the last complete "}" and close the array.
  const full     = '[' + text;
  const start    = full.indexOf('[');
  const lastObj  = full.lastIndexOf('}');
  if (start !== -1 && lastObj > start) {
    const repaired = tryParse(full.slice(start, lastObj + 1) + ']');
    if (repaired && repaired.length > 0) {
      Logger.log('  ⚠ Recovered ' + repaired.length + ' events from a truncated response.');
      return repaired;
    }
  }

  Logger.log('All JSON strategies failed. Raw:\n' + text);
  throw new Error('Could not parse Claude response as JSON.');
}

/** Extract events from a fetched page text */
function callClaude(pageText, sourceUrl) {
  const chunks = extractEventChunks(pageText);
  let textToSend = pageText;
  if (chunks.length > 0) {
    textToSend = ('EXTRACTED EVENT BLOCKS:\n' + chunks.join('\n') + '\n\nFULL PAGE TEXT:\n' + pageText).substring(0, 30000);
    Logger.log('  Preprocessor found ' + chunks.length + ' event chunks.');
  }

  let events = callClaudeApi({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [
      { role: 'user', content: buildPrompt(textToSend, sourceUrl, false) },
      { role: 'assistant', content: '[' },
    ],
  });
  Logger.log('  Text pass 1: ' + events.length + ' events');

  if (events.length === 0 && looksLikeEventPage(pageText)) {
    Logger.log('  Page looks like events but got [] — retrying...');
    Utilities.sleep(1500);
    events = callClaudeApi({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      messages: [
        { role: 'user', content: buildPrompt(textToSend, sourceUrl, true) },
        { role: 'assistant', content: '[' },
      ],
    });
    Logger.log('  Text pass 2 (retry): ' + events.length + ' events');
  }
  return events;
}

/** Extract events from pasted notes text */
function callClaudeWithNotes(notes, sourceLabel) {
  Logger.log('  Sending notes text to Claude (' + notes.length + ' chars)');
  return callClaudeApi({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [
      { role: 'user', content: buildPrompt(notes, sourceLabel + ' (pasted notes)', false) },
      { role: 'assistant', content: '[' },
    ],
  });
}

/** Extract events from a Drive image (chalkboard / poster photo) */
function callClaudeWithImage(base64, mimeType, sourceLabel) {
  Logger.log('  Sending image to Claude Vision (' + mimeType + ')');
  return callClaudeApi({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: buildImagePrompt(sourceLabel) },
        ],
      },
      { role: 'assistant', content: '[' },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE EVENTS
// ═══════════════════════════════════════════════════════════════════════════

function eventKey(venue, name, date, time) {
  return [venue, name, date, time].map(s => {
    if (s === null || s === undefined || s === '') return '';
    if (s instanceof Date) return Utilities.formatDate(s, 'America/New_York', 'yyyy-MM-dd');
    return String(s).toLowerCase().trim();
  }).join('|');
}

function buildExistingKeys(approvedSheet) {
  const keys = new Set();
  const vals = approvedSheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    const k = eventKey(vals[i][1], vals[i][0], vals[i][4], vals[i][5]);
    if (k.length > 3) keys.add(k);
  }
  return keys;
}

// Expand recurring weekly events into individual dated rows IN CODE
// (instead of asking Claude to enumerate them — that blows the token budget).
const WEEKDAY_MAP = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};

function parseWeekday(value) {
  if (!value) return null;
  const k = String(value).toLowerCase().trim();
  if (k in WEEKDAY_MAP) return WEEKDAY_MAP[k];
  for (const key in WEEKDAY_MAP) {
    if (k.indexOf(key) !== -1) return WEEKDAY_MAP[key];
  }
  return null;
}

function expandRecurringEvents(events) {
  const tz    = 'America/New_York';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setMonth(end.getMonth() + MONTHS_AHEAD);

  const out = [];
  for (const e of events) {
    const wd = e.isRecurring ? parseWeekday(e.weekday || e.recurrenceRule) : null;

    if (wd !== null) {
      // Generate one occurrence per matching weekday from today through the window
      const d = new Date(today);
      while (d.getDay() !== wd) d.setDate(d.getDate() + 1);
      let count = 0;
      for (; d <= end && count < 20; d.setDate(d.getDate() + 7), count++) {
        const copy = {};
        for (const k in e) copy[k] = e[k];
        copy.startDate = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
        out.push(copy);
      }
    } else {
      // One-time event, or recurring with no clear weekday — keep as-is
      out.push(e);
    }
  }
  return out;
}

function writeEvents(approvedSheet, events, sourceUrl, submittedBy, existingKeys) {
  const tz      = 'America/New_York';
  const today   = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const cutoff  = Utilities.formatDate(new Date(Date.now() - 86400000), tz, 'yyyy-MM-dd');
  let added = 0;

  for (const e of events) {
    if (!e.name) continue;
    // Require a date OR a recurring flag (undated recurring → "Always Happening")
    if (!e.startDate && !e.isRecurring) continue;
    if (e.startDate && e.startDate < cutoff) continue;
    const key = eventKey(e.venue, e.name, e.startDate, e.startTime);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);

    approvedSheet.appendRow([
      (e.name            || '').trim(),
      (e.venue           || '').trim(),
      (e.town            || DEFAULT_TOWN).trim(),
      (e.category        || 'Other').trim(),
      e.startDate        || '',
      e.startTime        || '',
      e.endTime          || '',
      e.isRecurring      ? 'Yes' : 'No',
      (e.recurrenceRule  || '').trim(),
      (e.description     || '').trim(),
      sourceUrl,
      today,
      '',
      (e.cost            || '').trim(),
      e.ageFriendly === true ? 'Yes' : e.ageFriendly === false ? 'No' : '',
      e.outdoor     === true ? 'Yes' : e.outdoor     === false ? 'No' : '',
      '',
      (submittedBy       || '').trim(),
    ]);
    added++;
  }
  return added;
}

// ═══════════════════════════════════════════════════════════════════════════
// STUCK-ROW DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function processingStatus() { return 'processing|' + Date.now(); }

function isStuckProcessing(status) {
  if (!status.startsWith('processing')) return false;
  const parts = status.split('|');
  if (parts.length < 2) return true;
  const ts = parseInt(parts[1], 10);
  return isNaN(ts) || (Date.now() - ts > STALE_PROCESSING_MS);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROCESSING LOOP
// ═══════════════════════════════════════════════════════════════════════════

function processNewSubmissions() {
  const ss            = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet      = getRawSheet(ss);
  const approvedSheet = getOrCreateApprovedSheet(ss);
  const processedCol  = getOrAddProcessedCol(rawSheet);

  const data = rawSheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log('No submissions yet.'); return; }

  const headers       = data[0];
  const urlCol        = findCol(headers, 'url', 'link');
  const notesCol      = findCol(headers, 'notes');
  const imageCol      = findCol(headers, 'upload image', 'image instead', 'image', 'photo', 'picture', 'file upload');
  const submittedByCol = findCol(headers, 'submitted by', 'your name', 'submitter', 'name');

  Logger.log('Columns — url:' + urlCol + ' notes:' + notesCol + ' image:' + imageCol + ' submittedBy:' + submittedByCol);

  const existingKeys = buildExistingKeys(approvedSheet);
  const tz           = 'America/New_York';
  const today        = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  let totalAdded = 0;

  for (let row = 1; row < data.length; row++) {
    const url         = urlCol         !== -1 ? (data[row][urlCol]         || '').toString().trim() : '';
    const notes       = notesCol       !== -1 ? (data[row][notesCol]       || '').toString().trim() : '';
    const imageValue  = imageCol       !== -1 ? (data[row][imageCol]       || '').toString().trim() : '';
    const submittedBy = submittedByCol !== -1 ? (data[row][submittedByCol] || '').toString().trim() : '';
    const status      = (data[row][processedCol - 1] || '').toString().trim();

    // Need at least one input
    if (!url && !notes && !imageValue) continue;
    if (status.startsWith('done')) continue;
    if (status.startsWith('processing') && !isStuckProcessing(status)) continue;

    const sources = [url && 'URL', notes && 'notes', imageValue && 'image'].filter(Boolean).join('+');
    Logger.log('[Row ' + (row + 1) + '] Processing (' + sources + ')'
      + (submittedBy ? ' by ' + submittedBy : ''));

    rawSheet.getRange(row + 1, processedCol).setValue(processingStatus());
    SpreadsheetApp.flush();

    try {
      let allEvents = [];

      // 1. URL → fetch and extract
      if (url) {
        const pageText = fetchPageText(url);
        if (pageText) {
          const ev = callClaude(pageText, url);
          Logger.log('  URL → ' + ev.length + ' events');
          allEvents = allEvents.concat(ev);
        } else {
          Logger.log('  URL fetch failed: ' + url);
        }
      }

      // 2. Notes → extract if it looks like a schedule
      if (notes && looksLikeEventSchedule(notes)) {
        Utilities.sleep(1000);
        const ev = callClaudeWithNotes(notes, url || 'Pasted schedule');
        Logger.log('  Notes → ' + ev.length + ' events');
        allEvents = allEvents.concat(ev);
      }

      // 3. Image → Claude Vision
      if (imageValue) {
        // Form may produce a comma-separated list of Drive URLs
        const driveUrls = imageValue.split(',').map(v => v.trim()).filter(v => isDriveUrl(v));
        for (const driveUrl of driveUrls) {
          const fileId = extractDriveFileId(driveUrl);
          if (!fileId) { Logger.log('  Could not extract Drive ID from: ' + driveUrl); continue; }
          const img = fetchDriveImageAsBase64(fileId);
          if (!img) continue;
          Utilities.sleep(1000);
          const ev = callClaudeWithImage(img.base64, img.mimeType, url || 'Uploaded image');
          Logger.log('  Image → ' + ev.length + ' events');
          allEvents = allEvents.concat(ev);
        }
      }

      if (allEvents.length === 0) {
        const noInput = !url && !imageValue;
        rawSheet.getRange(row + 1, processedCol).setValue(
          noInput ? 'done — 0 events (notes only, no extractable dates)' : 'done — 0 events found'
        );
        continue;
      }

      // Expand recurring weekly events into individual dated rows (in code)
      const expanded = expandRecurringEvents(allEvents);
      Logger.log('  Expanded ' + allEvents.length + ' → ' + expanded.length + ' dated rows');

      const added = writeEvents(approvedSheet, expanded, url || imageValue || 'manual', submittedBy, existingKeys);
      totalAdded += added;
      rawSheet.getRange(row + 1, processedCol).setValue('done — ' + added + ' events added ' + today);
    } catch (err) {
      Logger.log('  → Error: ' + err.message);
      rawSheet.getRange(row + 1, processedCol).setValue('error: ' + err.message.substring(0, 120));
    }

    if (row < data.length - 1) Utilities.sleep(2000);
  }

  Logger.log('Finished. Total new events added: ' + totalAdded);
}

// ═══════════════════════════════════════════════════════════════════════════
// WEEKLY RE-SCAN
// ═══════════════════════════════════════════════════════════════════════════

function weeklyRecheck() {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet     = getRawSheet(ss);
  const processedCol = getOrAddProcessedCol(rawSheet);
  const data         = rawSheet.getDataRange().getValues();

  for (let row = 1; row < data.length; row++) {
    const status = (data[row][processedCol - 1] || '').toString().trim();
    if (status.startsWith('done')) rawSheet.getRange(row + 1, processedCol).setValue('recheck');
  }

  const approvedSheet = ss.getSheetByName(APPROVED_SHEET_NAME);
  if (approvedSheet) {
    const tz      = 'America/New_York';
    const cutoff  = Utilities.formatDate(new Date(Date.now() - 2 * 86400000), tz, 'yyyy-MM-dd');
    const rows    = approvedSheet.getDataRange().getValues();
    const toDelete = [];
    for (let i = rows.length - 1; i >= 1; i--) {
      const date        = (rows[i][4] || '').toString().trim();
      const isRecurring = (rows[i][7] || '').toString().trim().toLowerCase() === 'yes';
      if (date && date < cutoff && !isRecurring) toDelete.push(i + 1);
    }
    toDelete.forEach(r => approvedSheet.deleteRow(r));
    if (toDelete.length) Logger.log('Purged ' + toDelete.length + ' past events.');
  }

  processNewSubmissions();
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onFormSubmitHandler').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('weeklyRecheck').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(6).inTimezone('America/New_York').create();
  Logger.log('✓ Triggers set: onFormSubmit + Sunday 6 AM ET');
}

function onFormSubmitHandler(e) {
  Utilities.sleep(2000);
  processNewSubmissions();
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB APP ENDPOINT  (native submit form on hansonsguide.com posts here)
// ═══════════════════════════════════════════════════════════════════════════
//
// Deploy: Apps Script editor → Deploy → New deployment → type "Web app"
//   - Execute as: Me
//   - Who has access: Anyone
//   Copy the /exec URL → set NEXT_PUBLIC_SUBMIT_ENDPOINT in Vercel + .env.local
//
// Re-deploy (Deploy → Manage deployments → edit → Version: New) after any change.

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "What's Going On submit endpoint" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const url   = (p.url   || '').toString().trim();
    const notes = (p.notes || '').toString().trim();
    const name  = (p.name  || '').toString().trim();

    if (!url && !notes && !p.imageData) {
      return jsonOut({ ok: false, error: 'Empty submission' });
    }

    // Optional photo (base64 from the browser) → saved to Drive
    let imageUrl = '';
    if (p.imageData) {
      imageUrl = saveBase64ToDrive(p.imageData, p.imageName || 'submission.jpg', p.imageType || 'image/jpeg');
    }

    const ss       = SpreadsheetApp.getActiveSpreadsheet();
    const rawSheet  = getRawSheet(ss);
    const headers   = rawSheet.getRange(1, 1, 1, Math.max(rawSheet.getLastColumn(), 1)).getValues()[0];

    // Place values into the matching form columns (by header name)
    const row     = new Array(headers.length).fill('');
    const tsCol   = findCol(headers, 'timestamp');
    const urlCol  = findCol(headers, 'url', 'link');
    const noteCol = findCol(headers, 'notes');
    const imgCol  = findCol(headers, 'upload image', 'image instead', 'image', 'photo', 'picture', 'file upload');
    const nameCol = findCol(headers, 'submitted by', 'your name', 'submitter', 'name');

    if (tsCol   !== -1) row[tsCol]   = new Date();
    if (urlCol  !== -1) row[urlCol]  = url;
    if (noteCol !== -1) row[noteCol] = notes;
    if (imgCol  !== -1 && imageUrl) row[imgCol] = imageUrl;
    if (nameCol !== -1) row[nameCol] = name;

    rawSheet.appendRow(row);
    SpreadsheetApp.flush();

    // Process immediately (programmatic appends don't fire the onFormSubmit trigger).
    // Wrapped so a processing hiccup never fails the submission — the row is saved
    // and the weekly/manual run will still pick it up.
    try { processNewSubmissions(); } catch (err) { Logger.log('post-submit processing failed: ' + err); }

    return jsonOut({ ok: true });
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function saveBase64ToDrive(dataUrlOrBase64, name, mimeType) {
  // Accept either a data URL ("data:image/jpeg;base64,...") or raw base64
  let raw = dataUrlOrBase64;
  const comma = dataUrlOrBase64.indexOf(',');
  if (comma !== -1 && dataUrlOrBase64.substring(0, comma).indexOf('base64') !== -1) {
    raw = dataUrlOrBase64.substring(comma + 1);
  }
  const blob = Utilities.newBlob(Utilities.base64Decode(raw), mimeType, name);
  return getSubmitFolder().createFile(blob).getUrl();
}

function getSubmitFolder() {
  const FOLDER = "What's Going On Submissions";
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function runNow()      { processNewSubmissions(); }
function resetErrors() { _resetRows(s => s.startsWith('error') || isStuckProcessing(s)); }

/** Clear rows that finished with 0 events (e.g. short notes wrongly skipped) → retry them. */
function resetEmpty()  { _resetRows(s => /0 events/i.test(s)); }

/**
 * Run this ONCE manually after adding image support.
 * Touching DriveApp forces Google to show the Drive permission consent screen.
 * Triggers (form-submit, weekly) can't prompt for new permissions on their own,
 * so you must approve the Drive scope here first.
 */
function authorizeDrive() {
  const root = DriveApp.getRootFolder();
  Logger.log('✓ Drive access authorized. Root folder: ' + root.getName());
  Logger.log('You can now process image submissions. Run resetErrors() then runNow().');
}
function resetAll()    { _resetRows(() => true); }

function _resetRows(predicate) {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet     = getRawSheet(ss);
  const processedCol = getOrAddProcessedCol(rawSheet);
  const data         = rawSheet.getDataRange().getValues();
  let cleared = 0;
  for (let row = 1; row < data.length; row++) {
    const status = (data[row][processedCol - 1] || '').toString().trim();
    if (status && predicate(status)) {
      rawSheet.getRange(row + 1, processedCol).setValue('');
      cleared++;
    }
  }
  Logger.log('Cleared ' + cleared + ' rows. Run runNow() to re-process.');
}

// ═══════════════════════════════════════════════════════════════════════════
// DEBUG HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function debugFetch(url) {
  url = url || 'https://www.borealiscoffee.com/events/';
  Logger.log('=== debugFetch: ' + url + ' ===');
  const jina   = fetchViaJina(url);
  Logger.log('Jina: ' + (jina ? jina.length + ' chars' : 'null'));
  if (jina) Logger.log(jina.substring(0, 800));
  const wp     = fetchViaWordPressRest(url);
  Logger.log('WP REST: ' + (wp ? wp.length + ' chars' : 'null'));
  const direct = fetchViaDirect(url);
  Logger.log('Direct: ' + (direct ? direct.length + ' chars' : 'null'));
  if (direct) Logger.log(direct.substring(0, 1500));
  const text   = jina || wp || direct || '';
  const chunks = extractEventChunks(text);
  Logger.log('Event chunks: ' + chunks.length);
  chunks.slice(0, 5).forEach((c, i) => Logger.log('  ' + (i+1) + ': ' + c));
  Logger.log('Looks like event page: ' + looksLikeEventPage(text));
}

function debugBorealis() { debugFetch('https://www.borealiscoffee.com/events/'); }

function debugClaude(url) {
  url = url || 'https://www.borealiscoffee.com/events/';
  Logger.log('=== debugClaude: ' + url + ' ===');
  const pageText = fetchPageText(url);
  if (!pageText) { Logger.log('fetchPageText returned null'); return; }
  Logger.log('Page text: ' + pageText.length + ' chars');
  const events = callClaude(pageText, url);
  Logger.log('Events: ' + events.length);
  events.slice(0, 5).forEach((e, i) => Logger.log('  ' + (i+1) + ': ' + JSON.stringify(e)));
}

/** Test image extraction — pass a Drive share URL */
function debugImage(driveUrl) {
  driveUrl = driveUrl || 'https://drive.google.com/file/d/YOUR_FILE_ID/view';
  Logger.log('=== debugImage: ' + driveUrl + ' ===');
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) { Logger.log('Could not extract file ID'); return; }
  const img = fetchDriveImageAsBase64(fileId);
  if (!img) { Logger.log('Could not fetch image'); return; }
  Logger.log('Image loaded: ' + img.mimeType + ', base64 length: ' + img.base64.length);
  const events = callClaudeWithImage(img.base64, img.mimeType, 'Test image');
  Logger.log('Events found: ' + events.length);
  events.forEach((e, i) => Logger.log('  ' + (i+1) + ': ' + JSON.stringify(e)));
}
