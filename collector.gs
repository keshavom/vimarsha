/**
 * Vimarsha — Google Sheet collector (Google Apps Script)
 * --------------------------------------------------------
 * Receives one entry (POSTed by the app) and appends it as a row to a sheet
 * named "Submissions". Handles both kinds of entry:
 *   • type "session"     — on the cushion (Quality + Blocks)
 *   • type "reflection"  — end-of-day, off the cushion (Awareness, Silence, …)
 *
 * The header row is re-synced on every POST, so adding the Name column (or any
 * new column) takes effect even on a Sheet that already has data.
 *
 * Anonymous POSTs are accepted by design (no login for users).
 */

var ASPECTS = [
  ['quality',  'Concentration'], ['quality',  'Posture'],   ['quality',  'Mindfulness'],
  ['quality',  'Alertness'],     ['quality',  'Duration'],  ['quality',  'Mood'],
  ['blocks',   'Dullness'],      ['blocks',   'Restlessness'], ['blocks', 'Emotions'],
  ['blocks',   'Thoughts'],      ['blocks',   'Physical Pain'], ['blocks', 'Other reason'],
  ['maintain', 'Awareness'],     ['maintain', 'Silence'],
  ['maintain', 'Primary Virtues'], ['maintain', 'Secondary Virtues'], ['maintain', 'Temperament'],
];

function headers_() {
  var h = ['Submitted At', 'Type', 'Name', 'Date', 'Session Name'];
  ASPECTS.forEach(function (a) { h.push(a[0] + ' · ' + a[1]); });
  return h.concat(['Quality /60', 'Blocks /60', 'Off-cushion /50', 'Wellbeing /100', 'Other reason (text)', 'Notes', 'Entry ID', 'Device']);
}

function sum_(ratings, group) {
  var t = 0;
  ASPECTS.forEach(function (a) { if (a[0] === group) { var v = ratings && ratings[group] && ratings[group][a[1]]; t += (typeof v === 'number') ? v : 0; } });
  return t;
}

/* Make sure row 1 holds the current headers. If the existing header row is
   shorter/different (e.g. an older sheet with no Name column), it is rewritten. */
function ensureHeaders_(sh) {
  var want = headers_();
  if (sh.getLastRow() === 0) {
    sh.appendRow(want);
    sh.setFrozenRows(1);
    return;
  }
  var have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var same = have.length === want.length && want.every(function (w, i) { return have[i] === w; });
  if (!same) {
    sh.getRange(1, 1, 1, want.length).setValues([want]);
    sh.setFrozenRows(1);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    var r = d.ratings || {};
    var type = d.type || 'session';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Submissions');
    if (!sh) { sh = ss.insertSheet('Submissions'); }
    ensureHeaders_(sh);

    var q = sum_(r, 'quality'), b = sum_(r, 'blocks'), m = sum_(r, 'maintain');
    var wellbeing = (type === 'reflection')
      ? Math.round((m / 50) * 100)
      : Math.round(((q + (60 - b)) / 120) * 100);

    var row = [
      d.submittedAt || new Date().toISOString(),
      type,
      d.userName || '',
      d.date || '',
      d.label || '',
    ];
    ASPECTS.forEach(function (a) {
      var v = r[a[0]] && r[a[0]][a[1]];
      row.push((typeof v === 'number') ? v : '');
    });
    row.push(q, b, m, wellbeing, d.otherReason || '', d.notes || '', d.id || '', d.ua || '');
    sh.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Lets you confirm the web app is live by opening the /exec URL in a browser.
function doGet() {
  return ContentService.createTextOutput('Vimarsha collector is running.');
}
