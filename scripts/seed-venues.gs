/**
 * What's Going On — One-time Venue Seeder (Aug 2026 research pass)
 *
 * Seeds 69 researched venue URLs (Bristol, Warren, Barrington, Portsmouth,
 * Newport, Fall River) into the raw submissions sheet, then processes them
 * through the normal extraction pipeline in self-re-arming background batches.
 *
 * REQUIRES extract-events.gs in the SAME Apps Script project (it reuses
 * getRawSheet, ensureRawColumn, findCol, getOrAddProcessedCol, and
 * processNewSubmissions from there). Use the version that supports the
 * raw-sheet "Town" column.
 *
 * How to run:
 *   1. Apps Script editor → Files "+" → Script → name it "seed-venues"
 *   2. Paste this entire file, Save
 *   3. Function dropdown → seedVenues → Run  (approve permissions if asked)
 *   4. That's it. Processing continues in the background for ~1–2 hours
 *      (5-minute batches, re-armed every 2 minutes until the backlog is done).
 *
 * Check progress anytime:
 *   - Run seedReport() and read the Execution Log, or
 *   - Watch the "Processed" column fill in on the raw sheet
 *
 * Safe to re-run: URLs already present in the sheet are skipped.
 */

const SEED_SUBMITTER = 'Claude research pass';
const SEED_MAX_CYCLES = 30;        // hard stop for the background processor
const SEED_CYCLES_PROP = 'SEED_CYCLES';

const SEED_VENUES = [
  // ── Bristol, RI ──────────────────────────────────────────────────────
  { town: 'Bristol', name: 'Portside Tavern',        url: 'https://www.portsidetavern.com/live-music' },
  { town: 'Bristol', name: 'Common Pub & Grille',    url: 'https://www.commonpubandgrille.com/events' },
  { town: 'Bristol', name: 'DeWolf Tavern',          url: 'https://www.dewolftavern.com/weekly-specials' },
  { town: 'Bristol', name: 'Pivotal Brewing',        url: 'https://pivotalbrewing.com/bristol-pivotal-brewing-company-taproom-happenings' },
  { town: 'Bristol', name: 'The Lobster Pot',        url: 'https://lobsterpotri.com/entertainment' },
  { town: 'Bristol', name: 'Thames Waterside',       url: 'https://www.thameswaterside.com/' },
  { town: 'Bristol', name: "Aidan's Pub",            url: 'https://aidanspub.com/' },
  { town: 'Bristol', name: 'Judge Roy Bean Saloon',  url: 'https://judgeroybeansaloon.com/' },
  { town: 'Bristol', name: 'Twelve Guns Brewing',    url: 'https://www.twelvegunsbrewing.com/' },
  { town: 'Bristol', name: "O'Brien & Brough",       url: 'https://www.obrienandbrough.com/' },

  // ── Warren, RI ───────────────────────────────────────────────────────
  { town: 'Warren', name: 'Hometown Tavern',         url: 'https://www.hometowntavernri.com/entertainment' },
  { town: 'Warren', name: 'The Revival',             url: 'https://therevivalcraftkitchenandbar.com/warren-the-revival-craft-kitchen-and-bar-happy-hours-specials' },
  { town: 'Warren', name: 'The Wharf',               url: 'https://thewharftavernri.com/warren-the-wharf-rooftop-bar' },
  { town: 'Warren', name: 'Trafford',                url: 'https://traffordrestaurant.com/specials' },
  { town: 'Warren', name: 'Galactic Theatre',        url: 'https://galactictheatre.com/schedule' },
  { town: 'Warren', name: 'In Your Ear Records',     url: 'https://www.iye.com/event-details-registration/music-trivia' },
  { town: 'Warren', name: 'The Guild Warren',        url: 'https://www.theguildwarren.com/' },
  { town: 'Warren', name: 'Chomp',                   url: 'https://www.chompri.com/location/chomp-kitchen-and-drinks-warren/' },
  { town: 'Warren', name: 'The Square Peg',          url: 'https://squarepegwarren.com/' },
  { town: 'Warren', name: 'Crossroad Pub',           url: 'https://www.crossroadpub.net/' },
  { town: 'Warren', name: 'Saint Martha',            url: 'https://stmarthari.com/' },
  { town: 'Warren', name: 'Blount Clam Shack',       url: 'https://blountretail.com/warren/home/' },

  // ── Barrington, RI ───────────────────────────────────────────────────
  { town: 'Barrington', name: 'Bluewater Bar + Grill', url: 'https://www.bluewatergrillri.com/' },
  { town: 'Barrington', name: 'East Bay Oyster Bar',   url: 'https://eastbayoysterbar.com/' },
  { town: 'Barrington', name: 'Viola Cucina',          url: 'https://www.violacucina.com/' },
  { town: 'Barrington', name: 'Spaghetti Lane',        url: 'https://spaghettilane.com/' },
  { town: 'Barrington', name: 'Tong-D',                url: 'https://www.tongdrestaurant.com/' },
  { town: 'Barrington', name: 'Miku',                  url: 'https://www.mikusushirestaurant.com/' },

  // ── Portsmouth, RI ───────────────────────────────────────────────────
  { town: 'Portsmouth', name: 'Ragged Island Brewing',    url: 'https://raggedislandbrewing.com/food-trucks-and-events-at-ragged/' },
  { town: 'Portsmouth', name: 'Gulf Stream Bar & Grille', url: 'https://www.gulfstreambar.com/whats-happening' },
  { town: 'Portsmouth', name: "Tremblay's",               url: 'https://www.tremblaysbarandgrill.com/entertainment/' },
  { town: 'Portsmouth', name: 'Localz',                   url: 'https://www.localzri.com/events-portsmouth' },
  { town: 'Portsmouth', name: 'Greenvale Vineyards',      url: 'https://www.greenvale.com/' },
  { town: 'Portsmouth', name: 'Green Valley Restaurant',  url: 'https://www.greenvalleyrestaurantportsmouth.com/' },
  { town: 'Portsmouth', name: 'Music at the Point',       url: 'https://www.commonfencepoint.org/events-activities-calendar/' },
  { town: 'Portsmouth', name: 'Portsmouth Publick House', url: 'https://portsmouthpublickhouse.com/' },
  { town: 'Portsmouth', name: 'Fieldstones Grille',       url: 'https://www.fieldstonesgrille.com/' },
  { town: 'Portsmouth', name: 'Sunset Cove',              url: 'https://sunsetcoveri.com/' },
  { town: 'Portsmouth', name: '15 Point Road',            url: 'https://www.15pointroad.com/' },

  // ── Newport, RI ──────────────────────────────────────────────────────
  { town: 'Newport', name: 'Newport Craft Brewing',  url: 'https://newportcraft.com/newport-newport-craft-brewing-taproom-events' },
  { town: 'Newport', name: 'Pour Judgement',         url: 'https://www.pourjudgementnewportri.com/events/' },
  { town: 'Newport', name: 'The Fastnet Pub',        url: 'https://www.thefastnetpub.com/' },
  { town: 'Newport', name: 'Tickets Newport',        url: 'https://www.ticketsnewport.com/events' },
  { town: 'Newport', name: "Benjamin's",             url: 'https://benjaminsnewportri.com/' },
  { town: 'Newport', name: "Diego's",                url: 'https://www.diegosnewport.com/new-page' },
  { town: 'Newport', name: 'Brick Alley Pub',        url: 'https://www.brickalley.com/menu/Specials/' },
  { town: 'Newport', name: "O'Brien's Pub",          url: 'https://www.theobrienspub.net/weekly-events' },
  { town: 'Newport', name: 'One Pelham East',        url: 'https://thepelham.com/livecal/' },
  { town: 'Newport', name: 'Newport Blues Cafe',     url: 'https://newportblues.com/events/' },
  { town: 'Newport', name: 'Tavern on Broadway',     url: 'https://www.tavernonbroadway.com/specials' },
  { town: 'Newport', name: 'The Landing',            url: 'https://thelandingrestaurantnewport.com/specials' },
  { town: 'Newport', name: 'The Fifth Element',      url: 'https://www.thefifthri.com/' },
  { town: 'Newport', name: 'Bar & Board',            url: 'https://www.barandboard.com/weekly-events' },
  { town: 'Middletown', name: 'Newport Vineyards / Taproot', url: 'https://newportvineyards.com/upcoming-events/' },
  { town: 'Newport', name: 'Midtown Oyster Bar',     url: 'https://www.midtownoyster.com/menus/' },
  { town: 'Newport', name: 'The Mooring',            url: 'https://www.mooringrestaurant.com/' },
  { town: 'Newport', name: 'Gas Lamp Grille',        url: 'https://www.gaslampgrille.com/' },

  // ── Fall River, MA ───────────────────────────────────────────────────
  { town: 'Fall River', name: 'Mesa 21',                 url: 'https://mesa21fallriver.com/specials' },
  { town: 'Fall River', name: 'The Tipsy Toboggan',      url: 'https://www.thetipsytoboggan.com/' },
  { town: 'Fall River', name: 'Scotties Pub',            url: 'https://www.scottiespubfr.com/events' },
  { town: 'Fall River', name: 'St. James Irish Pub',     url: 'https://stjamesirishpub.com/' },
  { town: 'Fall River', name: "Barrett's Waterfront",    url: 'https://www.barrettsalehouse.com/waterfront-promotions' },
  { town: 'Fall River', name: "Barrett's Alehouse",      url: 'https://www.barrettsalehouse.com/fall-river-promotions' },
  { town: 'Fall River', name: 'Sagres',                  url: 'https://sagresfr.com/' },
  { town: 'Fall River', name: 'The Tipsy Seagull',       url: 'https://www.thetipsyseagull.com/' },
  { town: 'Fall River', name: 'The Cove',                url: 'https://cove392.com/entertainment' },
  { town: 'Fall River', name: 'The Belmont Club',        url: 'https://www.belmontclubfallriver.com/' },
  { town: 'Fall River', name: 'Troy City Brewing',       url: 'https://www.troycitybeer.com/' },
  { town: 'Fall River', name: 'Tequila Lime Cantina',    url: 'https://tequilalimecantina.com/' },
];

// ═══════════════════════════════════════════════════════════════════════════
// SEEDING
// ═══════════════════════════════════════════════════════════════════════════

function seedVenues() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = getRawSheet(ss);
  ensureRawColumn(rawSheet, 'Location');
  ensureRawColumn(rawSheet, 'Town');
  getOrAddProcessedCol(rawSheet);

  const headers = rawSheet.getRange(1, 1, 1, rawSheet.getLastColumn()).getValues()[0];
  const tsCol   = findCol(headers, 'timestamp');
  const urlCol  = findCol(headers, 'url', 'link');
  const nameCol = findCol(headers, 'submitted by', 'your name', 'submitter', 'name');
  const townCol = findCol(headers, 'town');
  if (urlCol === -1) throw new Error('No URL/Link column found in the raw sheet.');

  // Dedupe against every URL already in the sheet (safe to re-run)
  const normUrl  = u => (u || '').toString().trim().toLowerCase().replace(/\/+$/, '');
  const data     = rawSheet.getDataRange().getValues();
  const existing = new Set();
  for (let r = 1; r < data.length; r++) {
    const u = normUrl(data[r][urlCol]);
    if (u) existing.add(u);
  }

  let added = 0, skipped = 0;
  for (const v of SEED_VENUES) {
    const key = normUrl(v.url);
    if (existing.has(key)) { skipped++; continue; }
    existing.add(key);
    const row = new Array(headers.length).fill('');
    if (tsCol   !== -1) row[tsCol]   = new Date();
    row[urlCol] = v.url;
    if (townCol !== -1) row[townCol] = v.town;
    if (nameCol !== -1) row[nameCol] = SEED_SUBMITTER;
    // Location left blank on purpose → events fall to the default (Bristol) hub
    rawSheet.appendRow(row);
    added++;
  }
  SpreadsheetApp.flush();
  Logger.log('Seeded ' + added + ' venues (' + skipped + ' already in the sheet).');

  PropertiesService.getScriptProperties().setProperty(SEED_CYCLES_PROP, '0');
  armSeedBacklog_(10);
  Logger.log('Background processor armed. Run seedReport() anytime for a progress summary.');
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-RE-ARMING BACKLOG PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

function armSeedBacklog_(seconds) {
  ScriptApp.newTrigger('processSeedBacklog').timeBased().after(seconds * 1000).create();
}

function processSeedBacklog() {
  // Delete spent triggers for this handler so they never accumulate
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processSeedBacklog') ScriptApp.deleteTrigger(t);
  });

  const props  = PropertiesService.getScriptProperties();
  const cycles = parseInt(props.getProperty(SEED_CYCLES_PROP) || '0', 10) + 1;
  props.setProperty(SEED_CYCLES_PROP, String(cycles));

  processNewSubmissions(); // runs up to ~5 minutes, then returns

  const pending = countUnprocessedRows_();
  if (pending > 0 && cycles < SEED_MAX_CYCLES) {
    Logger.log('Seed backlog: ' + pending + ' row(s) left — re-arming (cycle ' + cycles + '/' + SEED_MAX_CYCLES + ').');
    armSeedBacklog_(120);
  } else {
    Logger.log('Seed backlog finished after ' + cycles + ' cycle(s). Run seedReport() for the summary.');
  }
}

// Rows with a URL but a completely blank Processed status (never attempted).
// Rows marked "error:" are counted separately by seedReport(), not retried
// forever: once no blank rows remain, the re-arm loop stops.
function countUnprocessedRows_() {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet     = getRawSheet(ss);
  const processedCol = getOrAddProcessedCol(rawSheet);
  const data         = rawSheet.getDataRange().getValues();
  const headers      = data[0];
  const urlCol       = findCol(headers, 'url', 'link');

  let pending = 0;
  for (let r = 1; r < data.length; r++) {
    const hasUrl = urlCol !== -1 && (data[r][urlCol] || '').toString().trim();
    const status = (data[r][processedCol - 1] || '').toString().trim();
    if (hasUrl && !status) pending++;
  }
  return pending;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS / TROUBLESHOOTING REPORT
// ═══════════════════════════════════════════════════════════════════════════

function seedReport() {
  const ss           = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet     = getRawSheet(ss);
  const processedCol = getOrAddProcessedCol(rawSheet);
  const data         = rawSheet.getDataRange().getValues();
  const headers      = data[0];
  const urlCol       = findCol(headers, 'url', 'link');
  const nameCol      = findCol(headers, 'submitted by', 'your name', 'submitter', 'name');

  let done = 0, doneZero = 0, errors = 0, pending = 0, processing = 0;
  let eventsAdded = 0;
  const errorLines = [];
  const zeroLines  = [];

  for (let r = 1; r < data.length; r++) {
    const submitter = nameCol !== -1 ? (data[r][nameCol] || '').toString().trim() : '';
    if (submitter !== SEED_SUBMITTER) continue; // only report on seeded rows
    const url    = urlCol !== -1 ? (data[r][urlCol] || '').toString().trim() : '';
    const status = (data[r][processedCol - 1] || '').toString().trim();

    if (!status) { pending++; }
    else if (status.startsWith('processing')) { processing++; }
    else if (status.startsWith('error')) { errors++; errorLines.push('  Row ' + (r + 1) + ': ' + url + ' → ' + status); }
    else if (status.startsWith('done')) {
      done++;
      const m = status.match(/done — (\d+) events/);
      const n = m ? parseInt(m[1], 10) : 0;
      eventsAdded += n;
      if (n === 0) zeroLines.push('  Row ' + (r + 1) + ': ' + url);
    }
  }

  // Happy hour count in Approved Events
  let happyHours = 0;
  const approved = ss.getSheetByName(APPROVED_SHEET_NAME);
  if (approved) {
    const rows = approved.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][3] || '').toString().trim().toLowerCase() === 'happy hour') happyHours++;
    }
  }

  Logger.log('═══ SEED REPORT ═══');
  Logger.log('Done: ' + done + ' (' + eventsAdded + ' events extracted, ' + happyHours + ' happy hour rows in Approved)');
  Logger.log('Still pending: ' + pending + ' · in flight: ' + processing + ' · errors: ' + errors);
  if (zeroLines.length)  Logger.log('Done but 0 events found:\n' + zeroLines.join('\n'));
  if (errorLines.length) Logger.log('ERRORS (paste these back to Claude to troubleshoot):\n' + errorLines.join('\n'));
  if (pending > 0 && !ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'processSeedBacklog')) {
    Logger.log('⚠ Rows pending but no processor trigger is armed — run processSeedBacklog() to resume.');
  }
}
