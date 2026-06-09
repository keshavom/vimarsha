/**
 * Vimarsha — Google Sheet collector (Google Apps Script)
 * --------------------------------------------------------
 * Receives one meditation session (POSTed by the app) and appends it as a row
 * to a sheet named "Submissions". See COLLECTION.md for click-by-click setup.
 *
 * The secret stays here on Google's servers — nothing sensitive is ever in the
 * public web app. Anonymous POSTs are accepted by design (no login for users).
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
  var h = ['Submitted At', 'Session Date', 'Session Name'];
  ASPECTS.forEach(function (a) { h.push(a[0] + ' · ' + a[1]); });
  return h.concat(['Quality /60', 'Blocks /60', 'Off-cushion /50', 'Wellbeing /100', 'Notes', 'Entry ID', 'Device']);
}

function sum_(ratings, group) {
  var t = 0;
  ASPECTS.forEach(function (a) { if (a[0] === group) { var v = ratings && ratings[group] && ratings[group][a[1]]; t += (typeof v === 'number') ? v : 0; } });
  return t;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    var r = d.ratings || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Submissions');
    if (!sh) { sh = ss.insertSheet('Submissions'); }
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers_());
      sh.setFrozenRows(1);
    }

    var q = sum_(r, 'quality'), b = sum_(r, 'blocks'), m = sum_(r, 'maintain');
    var wellbeing = Math.round(((q + m + (60 - b)) / 170) * 100);

    var row = [d.submittedAt || new Date().toISOString(), d.date || '', d.label || ''];
    ASPECTS.forEach(function (a) {
      var v = r[a[0]] && r[a[0]][a[1]];
      row.push((typeof v === 'number') ? v : '');
    });
    row.push(q, b, m, wellbeing, d.notes || '', d.id || '', d.ua || '');
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
