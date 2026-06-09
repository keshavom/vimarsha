/* Stillness — daily meditation journal
   Pure vanilla JS SPA. Data persists in localStorage; optional remote collection
   can be enabled via config.js (see README). */

/* ----------------------------- Config ----------------------------- */
const CONFIG = window.VIMARSHA_CONFIG || window.STILLNESS_CONFIG || {
  collectEndpoint: null, // optional URL that accepts a POST of one session (e.g. Google Apps Script / Formspree)
};

/* ----------------------------- Model ------------------------------ */
const GROUPS = [
  {
    id: 'quality', title: 'Quality', subtitle: 'During meditation',
    polarity: 'pos', hint: 'higher is better', max: 60,
    aspects: [
      { k: 'Concentration' }, { k: 'Posture' }, { k: 'Mindfulness' },
      { k: 'Alertness' }, { k: 'Duration' }, { k: 'Mood' },
    ],
  },
  {
    id: 'blocks', title: 'Blocks', subtitle: 'During meditation',
    polarity: 'neg', hint: 'higher means a bigger hurdle', max: 60,
    aspects: [
      { k: 'Dullness' }, { k: 'Restlessness' }, { k: 'Emotions' },
      { k: 'Thoughts' }, { k: 'Physical Pain' }, { k: 'Other reason' },
    ],
  },
  {
    id: 'maintain', title: 'Off the cushion', subtitle: 'Maintain at all other times',
    polarity: 'pos', hint: 'higher is better', max: 50,
    aspects: [
      { k: 'Awareness' }, { k: 'Silence' },
      { k: 'Primary Virtues', info: 'Compassion, discipline, gratitude, detachment' },
      { k: 'Secondary Virtues', info: 'Faith, forgiveness, empathy, humility' },
      { k: 'Temperament' },
    ],
  },
];

const LABEL_PRESETS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const QUOTES = [
  { text: 'Ultimately, meditation is silence and presence of the mind.', by: 'Om Swami · A Million Thoughts' },
  { text: 'To see everything as it is requires perfect stillness of the mind. Silence is the way to meditation.', by: 'Om Swami · A Million Thoughts' },
  { text: 'Thoughts that you do not let go leave an imprint on your mind. Meditation is the process of washing away that residue.', by: 'Om Swami · A Million Thoughts' },
];

/* --------------------------- Persistence -------------------------- */
const LS_KEY = 'stillness.sessions.v1';
function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function persist() { localStorage.setItem(LS_KEY, JSON.stringify(state.sessions)); }

/* ----------------------------- State ------------------------------ */
const state = {
  view: 'home',
  sessions: load(),
  draft: null,
};

/* --------------------------- Utilities ---------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function groupTotal(ratings, g) {
  return g.aspects.reduce((s, a) => s + (ratings?.[g.id]?.[a.k] ?? 0), 0);
}
function emptyRatings() {
  const r = {};
  GROUPS.forEach((g) => { r[g.id] = {}; g.aspects.forEach((a) => { r[g.id][a.k] = null; }); });
  return r;
}

/* Wellbeing score: reward quality + off-cushion, subtract blocks. Normalised 0–100. */
function wellbeing(s) {
  const q = groupTotal(s.ratings, GROUPS[0]);   // /60
  const b = groupTotal(s.ratings, GROUPS[1]);   // /60
  const m = groupTotal(s.ratings, GROUPS[2]);   // /50
  const raw = q + m + (60 - b);                 // 0..170
  return Math.round((raw / 170) * 100);
}

function streak() {
  if (!state.sessions.length) return 0;
  const days = new Set(state.sessions.map((s) => s.date));
  let n = 0;
  const d = new Date(todayISO() + 'T00:00:00');
  // allow streak to count from today or yesterday
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ----------------------------- Toast ------------------------------ */
let toastTimer;
function toast(msg) {
  let t = $('.toast');
  if (t) t.remove();
  t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}

/* --------------------------- Ring SVG ----------------------------- */
function ring(score, size = 46) {
  const r = (size - 7) / 2, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  const col = score >= 66 ? '#46d6a6' : score >= 40 ? '#a892ff' : '#ffb86b';
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="5"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
      fill="#eef1ff" font-size="${size * 0.3}" font-weight="800">${score}</text>
  </svg>`;
}

/* =============================== VIEWS ============================== */
function header(actionHtml = '') {
  return `<div class="app-head">
    <div class="brand">
      <div class="mark"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9.5"/></svg></div>
      <div><div class="name">Vimarsha</div><div class="sub">Meditation Journal</div></div>
    </div>
    ${actionHtml}
  </div>`;
}

function footer() {
  return `<div class="footer fade-in">
    <div class="lotus">🪷</div>
    <div class="blessing">All mistakes are mine, all grace is of Maa.
      <span class="nm">Narayani Namostute.</span></div>
    <div class="reach">Built with devotion for the practice<a href="mailto:keshavrmk@gmail.com">reach out</a></div>
  </div>`;
}

function viewHome() {
  const greet = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
  const q = QUOTES[new Date().getDate() % QUOTES.length];
  const sessions = [...state.sessions].sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created));
  const total = sessions.length;
  const avgWell = total ? Math.round(sessions.reduce((s, x) => s + wellbeing(x), 0) / total) : 0;

  const list = total
    ? sessions.slice(0, 8).map(entryHtml).join('')
    : `<div class="empty">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></svg>
        <div>No sessions yet.</div>
        <div class="tiny">Tap “Begin a session” to log your first sit.</div>
      </div>`;

  return header() + `
  <div class="card hero fade-in">
    <div class="greet">${greet}, Keshav</div>
    <h1>How was your practice?</h1>
    <div class="quote">“${q.text}”<span class="cite">— ${q.by}</span></div>
    <button class="cta" data-act="new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Begin a session</button>
  </div>

  <div class="stat-row fade-in">
    <div class="stat"><div class="num">${total}</div><div class="lbl">Sessions</div></div>
    <div class="stat"><div class="num">${streak()}</div><div class="lbl">Day streak</div></div>
    <div class="stat"><div class="num">${avgWell}</div><div class="lbl">Avg score</div></div>
  </div>

  <div class="section-label">Recent sessions</div>
  <div class="card fade-in">${list}</div>
  ${footer()}`;
}

function entryHtml(s) {
  const q = groupTotal(s.ratings, GROUPS[0]);
  const b = groupTotal(s.ratings, GROUPS[1]);
  const m = groupTotal(s.ratings, GROUPS[2]);
  return `<div class="entry" data-open="${s.id}">
    ${ring(wellbeing(s))}
    <div class="meta">
      <div class="t">${esc(s.label || 'Session')}</div>
      <div class="d">${fmtDate(s.date)}</div>
      <div class="chips">
        <span class="chip good">Quality ${q}/60</span>
        <span class="chip bad">Blocks ${b}/60</span>
        <span class="chip">Off-cushion ${m}/50</span>
      </div>
    </div>
    <span class="go"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
  </div>`;
}

/* ------------------------- Session editor ------------------------- */
function startDraft(existing) {
  state.draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), date: todayISO(), label: 'Morning', created: new Date().toISOString(), ratings: emptyRatings(), notes: '' };
  go('session');
}

function viewSession() {
  const d = state.draft;
  if (!d) { startDraft(); return ''; }
  const isEdit = state.sessions.some((s) => s.id === d.id);

  const presets = LABEL_PRESETS.map((p) =>
    `<button class="preset ${d.label === p ? 'on' : ''}" data-preset="${p}">${p}</button>`).join('');

  const groupsHtml = GROUPS.map((g) => {
    const tot = groupTotal(d.ratings, g);
    const aspects = g.aspects.map((a) => aspectHtml(g, a, d.ratings[g.id][a.k])).join('');
    return `<div class="card group fade-in">
      <div class="group-head">
        <div class="gt">${g.title}</div>
        <div class="gtot" data-tot="${g.id}">${tot}<small style="color:var(--muted);font-weight:600"> / ${g.max}</small></div>
      </div>
      <div class="group-sub">${g.subtitle} · <span class="pol ${g.polarity}">${g.hint}</span></div>
      ${aspects}
    </div>`;
  }).join('');

  return header(`<button class="ghost-btn" data-act="home"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg> Back</button>`) + `
    <div class="card session-head fade-in">
      <div class="field">
        <label>Date</label>
        <input type="date" id="f-date" value="${d.date}" max="${todayISO()}">
      </div>
      <div class="field" style="margin-bottom:6px">
        <label>Session name — call it whatever fits</label>
        <input type="text" id="f-label" placeholder="e.g. Morning sit, Sunset breathwork…" value="${esc(d.label)}">
        <div class="label-presets">${presets}</div>
      </div>
    </div>

    ${groupsHtml}

    <div class="card fade-in">
      <div class="field" style="margin:0">
        <label>Notes (optional)</label>
        <textarea id="f-notes" placeholder="Anything you noticed today…">${esc(d.notes || '')}</textarea>
      </div>
    </div>

    <div class="totals fade-in" style="margin-top:16px">
      <div class="tot"><div class="v" data-tot="quality">${groupTotal(d.ratings, GROUPS[0])}<small> /60</small></div><div class="k">Quality</div></div>
      <div class="tot"><div class="v" data-tot="blocks">${groupTotal(d.ratings, GROUPS[1])}<small> /60</small></div><div class="k">Blocks</div></div>
      <div class="tot"><div class="v" data-tot="maintain">${groupTotal(d.ratings, GROUPS[2])}<small> /50</small></div><div class="k">Off-cushion</div></div>
    </div>

    <div class="save-bar fade-in">
      ${isEdit ? `<button class="btn-secondary" data-act="delete">Delete</button>` : ''}
      <button class="btn-primary" data-act="save">${isEdit ? 'Update session' : 'Save session'}</button>
    </div>`;
}

function aspectHtml(g, a, val) {
  const segs = [];
  for (let i = 0; i <= 10; i++) {
    const fill = val != null && i <= val && i > 0 ? 'fill' : '';
    const head = val === i ? 'head' : '';
    const zero = i === 0 ? 'zero' : '';
    const z = i === 0 && val !== 0 ? '·' : i;
    segs.push(`<button class="seg ${fill} ${head} ${zero}" data-rate="${g.id}|${a.k}|${i}" aria-label="${i}">${z}</button>`);
  }
  const info = a.info ? `<span class="info" title="${esc(a.info)}">i</span>` : '';
  const disp = val == null ? `<span class="aspect-val unset">–</span>` : `<span class="aspect-val" data-val="${g.id}|${a.k}">${val}</span>`;
  return `<div class="aspect">
    <div class="aspect-top">
      <div class="aspect-name">${esc(a.k)}${info}</div>
      ${disp}
    </div>
    <div class="bar ${g.polarity}" data-bar="${g.id}|${a.k}">${segs.join('')}</div>
  </div>`;
}

/* ---------------------------- Stretches --------------------------- */
function viewStretches() {
  const cards = STRETCHES.map((st) => `
    <div class="card stretch-card fade-in">
      <div class="illus">${st.svg}</div>
      <div class="stretch-body">
        <div class="sh"><h3>${esc(st.name)}</h3><span class="dur">${esc(st.duration)}</span></div>
        <div class="target">${esc(st.target)}</div>
        <ol>${st.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </div>
    </div>`).join('');
  return header() + `
    <div class="section-label">Post-meditation stretches</div>
    <p class="stretch-intro">Ease back into the day. Move slowly, breathe through each one, and never force a stretch.</p>
    ${cards}
    ${footer()}`;
}

/* ---------------------------- Insights ---------------------------- */
function viewInsights() {
  const sessions = [...state.sessions].sort((a, b) => (a.date + a.created).localeCompare(b.date + b.created));
  if (!sessions.length) {
    return header() + `<div class="card fade-in"><div class="empty">
      <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
      <div>No data yet</div><div class="tiny">Log a few sessions to see your trends.</div></div></div>`;
  }
  const last = sessions.slice(-12);
  const cols = last.map((s) => {
    const q = groupTotal(s.ratings, GROUPS[0]) / 60;
    const m = groupTotal(s.ratings, GROUPS[2]) / 50;
    const b = groupTotal(s.ratings, GROUPS[1]) / 60;
    return `<div class="col">
      <div class="bars">
        <div class="b q" style="height:${Math.max(3, q * 100)}%"></div>
        <div class="b m" style="height:${Math.max(3, m * 100)}%"></div>
        <div class="b bl" style="height:${Math.max(3, b * 100)}%"></div>
      </div>
      <div class="lab">${new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</div>
    </div>`;
  }).join('');

  const avg = (g, max) => Math.round(sessions.reduce((s, x) => s + groupTotal(x.ratings, g), 0) / sessions.length);
  const avgQ = avg(GROUPS[0]), avgB = avg(GROUPS[1]), avgM = avg(GROUPS[2]);

  return header() + `
    <div class="section-label">Last ${last.length} sessions</div>
    <div class="card fade-in">
      <div class="trend">${cols}</div>
      <div class="legend">
        <span><i style="background:var(--brand)"></i>Quality</span>
        <span><i style="background:#3a8fd6"></i>Off-cushion</span>
        <span><i style="background:var(--warn)"></i>Blocks</span>
      </div>
    </div>
    <div class="section-label">Averages</div>
    <div class="card fade-in">
      <div class="avg-grid">
        ${avgBox('Quality', avgQ, 60)}
        ${avgBox('Blocks', avgB, 60)}
        ${avgBox('Off-cushion', avgM, 50)}
        ${avgBox('Wellbeing', Math.round(sessions.reduce((s, x) => s + wellbeing(x), 0) / sessions.length), 100)}
      </div>
    </div>
    <div class="section-label">Your data</div>
    <div class="card fade-in">
      <p class="tiny muted" style="margin-top:0">Your entries are saved on this device. Export a backup or share it.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-secondary" data-act="export-json">Export JSON</button>
        <button class="btn-secondary" data-act="export-csv">Export CSV</button>
        <button class="btn-secondary" data-act="import">Import backup</button>
      </div>
      <input type="file" id="import-file" accept="application/json" hidden>
    </div>
    ${footer()}`;
}
function avgBox(k, v, max) {
  return `<div class="avg"><div class="k">${k}</div><div class="v">${v}<small style="font-size:.6em;color:var(--muted)"> /${max}</small></div>
    <div class="bar-mini"><i style="width:${Math.round((v / max) * 100)}%"></i></div></div>`;
}

/* ---------------------- Post-session stretch sheet ---------------- */
function showStretchSheet(score) {
  const picks = [...STRETCHES].sort(() => 0.5 - Math.random()).slice(0, 3);
  const cards = picks.map((st) => `
    <div class="card stretch-card" style="margin-top:12px">
      <div class="illus">${st.svg}</div>
      <div class="stretch-body">
        <div class="sh"><h3>${esc(st.name)}</h3><span class="dur">${esc(st.duration)}</span></div>
        <ol>${st.steps.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </div>
    </div>`).join('');
  const sheet = document.createElement('div');
  sheet.className = 'scrim';
  sheet.innerHTML = `<div class="sheet" role="dialog">
    <div class="grip"></div>
    <div class="celebrate">🧘</div>
    <h2>Session saved</h2>
    <p class="lead">Wellbeing score <strong>${score}/100</strong>. Before you rush off — unwind with a few stretches.</p>
    ${cards}
    <div class="save-bar" style="position:static;margin-top:16px">
      <button class="btn-secondary" data-act="all-stretches">See all stretches</button>
      <button class="btn-primary" data-act="close-sheet">Done</button>
    </div>
  </div>`;
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-act="close-sheet"]')) { sheet.remove(); go('home'); }
    if (e.target.closest('[data-act="all-stretches"]')) { sheet.remove(); go('stretches'); }
  });
  document.body.appendChild(sheet);
}

/* ============================== Router ============================= */
const VIEWS = { home: viewHome, session: viewSession, stretches: viewStretches, insights: viewInsights };
function go(view) {
  state.view = view;
  if (view === 'session' && !state.draft) startDraft();
  render();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
function render() {
  $('#app').innerHTML = VIEWS[state.view]();
  const tabbar = $('#tabbar');
  tabbar.hidden = false;
  tabbar.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.view === state.view || (state.view === 'session' && t.dataset.view === 'session')));
}

/* ============================== Events ============================= */
function saveDraft() {
  const d = state.draft;
  d.label = ($('#f-label')?.value || '').trim() || 'Session';
  d.date = $('#f-date')?.value || todayISO();
  d.notes = ($('#f-notes')?.value || '').trim();

  const idx = state.sessions.findIndex((s) => s.id === d.id);
  if (idx >= 0) state.sessions[idx] = d; else state.sessions.push(d);
  persist();
  const score = wellbeing(d);
  const wasNew = idx < 0;
  submitRemote(d); // no-op unless an endpoint is configured
  state.draft = null;
  if (wasNew) showStretchSheet(score);
  else { toast('Session updated'); go('home'); }
}

function submitRemote(session) {
  if (!CONFIG.collectEndpoint) return;
  try {
    fetch(CONFIG.collectEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight for Apps Script
      body: JSON.stringify({ ...session, ua: navigator.userAgent, submittedAt: new Date().toISOString() }),
    }).catch(() => {});
  } catch { /* offline — already saved locally */ }
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCSV() {
  const cols = ['date', 'label'];
  GROUPS.forEach((g) => g.aspects.forEach((a) => cols.push(`${g.id}:${a.k}`)));
  cols.push('quality_total', 'blocks_total', 'maintain_total', 'wellbeing', 'notes');
  const rows = [cols.join(',')];
  state.sessions.forEach((s) => {
    const r = [s.date, `"${(s.label || '').replace(/"/g, '""')}"`];
    GROUPS.forEach((g) => g.aspects.forEach((a) => r.push(s.ratings?.[g.id]?.[a.k] ?? '')));
    r.push(groupTotal(s.ratings, GROUPS[0]), groupTotal(s.ratings, GROUPS[1]), groupTotal(s.ratings, GROUPS[2]), wellbeing(s));
    r.push(`"${(s.notes || '').replace(/"/g, '""')}"`);
    rows.push(r.join(','));
  });
  download('stillness-export.csv', rows.join('\n'), 'text/csv');
}

document.addEventListener('click', (e) => {
  const rate = e.target.closest('[data-rate]');
  if (rate) {
    const [gid, k, vStr] = rate.dataset.rate.split('|');
    const v = +vStr;
    state.draft.ratings[gid][k] = v;
    // re-render just this group's bar + totals without full re-render (keeps scroll)
    const bar = rate.closest('.bar');
    bar.querySelectorAll('.seg').forEach((seg, i) => {
      seg.classList.toggle('fill', i <= v && i > 0);
      seg.classList.toggle('head', i === v);
    });
    const top = rate.closest('.aspect').querySelector('.aspect-val');
    top.classList.remove('unset'); top.textContent = v; top.dataset.val = `${gid}|${k}`;
    const tot = groupTotal(state.draft.ratings, GROUPS.find((g) => g.id === gid));
    document.querySelectorAll(`[data-tot="${gid}"]`).forEach((el) => {
      const small = el.querySelector('small');
      el.firstChild ? (el.childNodes[0].nodeValue = tot) : (el.textContent = tot);
      if (small) el.appendChild(small);
    });
    return;
  }

  const preset = e.target.closest('[data-preset]');
  if (preset) {
    $('#f-label').value = preset.dataset.preset;
    state.draft.label = preset.dataset.preset;
    document.querySelectorAll('.preset').forEach((p) => p.classList.toggle('on', p === preset));
    return;
  }

  const open = e.target.closest('[data-open]');
  if (open) { const s = state.sessions.find((x) => x.id === open.dataset.open); if (s) startDraft(s); return; }

  const tab = e.target.closest('.tab');
  if (tab) { if (tab.dataset.view === 'session') startDraft(); else go(tab.dataset.view); return; }

  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  switch (act) {
    case 'new': startDraft(); break;
    case 'home': state.draft = null; go('home'); break;
    case 'save': saveDraft(); break;
    case 'delete':
      if (confirm('Delete this session?')) {
        state.sessions = state.sessions.filter((s) => s.id !== state.draft.id);
        persist(); state.draft = null; toast('Deleted'); go('home');
      }
      break;
    case 'export-json': download('stillness-backup.json', JSON.stringify(state.sessions, null, 2), 'application/json'); break;
    case 'export-csv': exportCSV(); break;
    case 'import': $('#import-file').click(); break;
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'import-file' && e.target.files[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        if (!Array.isArray(data)) throw 0;
        const byId = new Map(state.sessions.map((s) => [s.id, s]));
        data.forEach((s) => byId.set(s.id, s));
        state.sessions = [...byId.values()];
        persist(); toast(`Imported ${data.length} sessions`); go('insights');
      } catch { toast('Could not read that file'); }
    };
    fr.readAsText(e.target.files[0]);
  }
  if (e.target.id === 'f-label') state.draft.label = e.target.value;
});

/* ----------------------------- Boot ------------------------------- */
render();
