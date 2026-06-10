/* Vimarsha — daily meditation journal
   Pure vanilla JS SPA. Data persists in localStorage; optional remote collection
   can be enabled via config.js (see README).

   Two kinds of entry:
     • Session  — what happened ON the cushion (Quality + Blocks). Log as many as you sit.
     • Reflection — how you carried it OFF the cushion, once at day's end (one per day). */

/* ----------------------------- Config ----------------------------- */
const UPI = { vpa: 'keshavrmk@okhdfcbank', name: 'Vimarsha' };
const CONFIG = window.VIMARSHA_CONFIG || window.STILLNESS_CONFIG || {
  collectEndpoint: null, // optional URL that accepts a POST of one entry (e.g. Google Apps Script / Formspree)
};

/* ----------------------------- Model ------------------------------ */
const QUALITY = {
  id: 'quality', title: 'Quality', subtitle: 'During meditation',
  polarity: 'pos', hint: 'higher is better', max: 60,
  aspects: [
    { k: 'Concentration' }, { k: 'Posture' }, { k: 'Mindfulness' },
    { k: 'Alertness' },
    { k: 'Duration', info: 'How well you sustained the full sit — staying for your intended length without cutting it short.' },
    { k: 'Mood' },
  ],
};
const BLOCKS = {
  id: 'blocks', title: 'Blocks', subtitle: 'During meditation',
  polarity: 'neg', hint: 'higher means a bigger hurdle', max: 60,
  aspects: [
    { k: 'Dullness' }, { k: 'Restlessness' }, { k: 'Emotions' },
    { k: 'Thoughts' }, { k: 'Physical Pain' }, { k: 'Other reason' },
  ],
};
const OFF = {
  id: 'maintain', title: 'Off the cushion', subtitle: 'How you carried the practice through your day',
  polarity: 'pos', hint: 'higher is better', max: 50,
  aspects: [
    { k: 'Awareness' }, { k: 'Silence' },
    { k: 'Primary Virtues', info: 'Compassion, discipline, gratitude, detachment' },
    { k: 'Secondary Virtues', info: 'Faith, forgiveness, empathy, humility' },
    { k: 'Temperament' },
  ],
};
const SIT_GROUPS = [QUALITY, BLOCKS];   // what a meditation session captures
const ALL_GROUPS = [QUALITY, BLOCKS, OFF]; // for CSV / migration / lookups

const LABEL_PRESETS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const VERSE = {
  sa: 'ध्यान ध्यातृ ध्येयरूपा',
  tr: 'Dhyāna Dhyātṛ Dhyeyarūpā',
  meaning: 'She is the meditation,<br>The one who meditates,<br>And that on which one meditates.',
  by: 'Lalitā Sahasranāma · nāma 254',
};

/* --------------------------- Persistence -------------------------- */
const LS_KEY = 'stillness.sessions.v1';
const LS_REFLECT = 'vimarsha.reflections.v1';
function loadArr(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function persist() { localStorage.setItem(LS_KEY, JSON.stringify(state.sessions)); }
function persistReflect() { localStorage.setItem(LS_REFLECT, JSON.stringify(state.reflections)); }

/* ----------------------------- State ------------------------------ */
const NAME_KEY = 'vimarsha.name';
const THEME_KEY = 'vimarsha.theme';
const state = {
  view: 'home',
  sessions: loadArr(LS_KEY),
  reflections: loadArr(LS_REFLECT),
  draft: null,         // session being edited
  reflectDraft: null,  // reflection being edited
  name: localStorage.getItem(NAME_KEY) || '',
  dark: localStorage.getItem(THEME_KEY) === 'dark',
  installDismissed: localStorage.getItem('vimarsha.installDismissed') === '1',
};
function setName(n) { state.name = (n || '').trim().slice(0, 40); localStorage.setItem(NAME_KEY, state.name); }
function applyTheme() {
  document.documentElement.classList.toggle('dark', state.dark);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', state.dark ? '#161311' : '#fbf6ee');
}

/* One-time migration: lift any off-cushion ratings that used to live inside a
   session out into a per-day reflection, then drop them from the session. */
function migrate() {
  if (localStorage.getItem('vimarsha.migratedV2') === '1') return;
  const byDate = new Map(state.reflections.map((r) => [r.date, r]));
  let changed = false;
  state.sessions.forEach((s) => {
    const m = s.ratings && s.ratings.maintain;
    if (m && Object.values(m).some((v) => v != null)) {
      if (!byDate.has(s.date)) {
        byDate.set(s.date, {
          id: uid(), date: s.date, created: s.created || new Date().toISOString(),
          ratings: { maintain: { ...m } }, notes: '', userName: s.userName || '', type: 'reflection',
        });
      }
      changed = true;
    }
    if (s.ratings && 'maintain' in s.ratings) { delete s.ratings.maintain; changed = true; }
  });
  if (changed) { state.reflections = [...byDate.values()]; persist(); persistReflect(); }
  localStorage.setItem('vimarsha.migratedV2', '1');
}

/* Install-to-home-screen support */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

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
  SIT_GROUPS.forEach((g) => { r[g.id] = {}; g.aspects.forEach((a) => { r[g.id][a.k] = null; }); });
  return r;
}
function emptyOff() {
  const r = { maintain: {} };
  OFF.aspects.forEach((a) => { r.maintain[a.k] = null; });
  return r;
}

/* Wellbeing of a sit: reward quality, subtract blocks. Normalised 0–100. */
function sitWellbeing(s) {
  const q = groupTotal(s.ratings, QUALITY);   // /60
  const b = groupTotal(s.ratings, BLOCKS);    // /60
  return Math.round(((q + (60 - b)) / 120) * 100);
}
/* Off-cushion score of a reflection, normalised 0–100. */
function offScore(r) {
  return Math.round((groupTotal(r.ratings, OFF) / 50) * 100);
}
function todayReflection() { return state.reflections.find((r) => r.date === todayISO()); }

function streak() {
  if (!state.sessions.length) return 0;
  const days = new Set(state.sessions.map((s) => s.date));
  let n = 0;
  const d = new Date(todayISO() + 'T00:00:00');
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
      <div class="mark"><img src="logo-mark.png" alt="Vimarsha" /></div>
      <div><div class="name">Vimarsha</div><div class="sub">Meditation Journal</div></div>
    </div>
    <div class="head-actions">
      ${actionHtml}
      <button class="icon-btn" data-act="toggle-theme" aria-label="Toggle dark mode">${state.dark
        ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'}</button>
    </div>
  </div>`;
}

function installBanner() {
  if (isStandalone() || state.installDismissed) return '';
  return `<div class="install-banner fade-in">
    <span class="ib-icon"><img src="logo-mark.png" alt="" /></span>
    <span class="ib-text">
      <span class="ib-t">Keep Vimarsha one tap away</span>
      <span class="ib-d">Add to your home screen — app-like &amp; offline.</span>
    </span>
    <button class="ib-cta" data-act="install">Add</button>
    <button class="ib-x" data-act="dismiss-install" aria-label="Dismiss">&times;</button>
  </div>`;
}

function footer() {
  return `<div class="footer fade-in">
    <div class="footer-logo"><img src="logo-mark.png" alt="Vimarsha" /></div>
    <p class="credit-note">This way of journaling is drawn from <strong>Om Swami’s</strong>
      <a href="https://www.amazon.in/Million-Thoughts-Meditation-Himalayan-Mystic/dp/8184959451" target="_blank" rel="noopener"><em>A Million Thoughts</em></a>.</p>
    <p class="offering">This humble effort is offered unto Maa’s Lotus Feet.</p>
    <div class="blessing">All mistakes are mine, all grace is of Maa.
      <svg class="yantra" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5 L20 6.5 L12 20 Z" fill="none" stroke="#c8102e" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="11" r="1.7" fill="#c8102e"/></svg>
      <span class="nm">Narayani Namostute</span></div>
    <button class="support-btn" data-act="support">
      <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.4-9A4.4 4.4 0 0 1 12 6.1 4.4 4.4 0 0 1 21.4 12c-2.4 4.4-9.4 9-9.4 9z"/></svg>
      Support this offering
    </button>
    <div class="footer-actions">
      <a class="ghost-btn" href="mailto:keshavrmk@gmail.com">
        <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg> Reach out
      </a>
    </div>
    <div class="copyright">© 2026 Keshav Sharma</div>
  </div>`;
}

/* Moon glyph for the end-of-day reflection */
function moonSvg() {
  return '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
}

function reflectCard() {
  const r = todayReflection();
  if (r) {
    const m = groupTotal(r.ratings, OFF);
    return `<div class="day-card done fade-in" data-act="reflect-today">
      <div class="day-ico">${moonSvg()}</div>
      <div class="day-body">
        <div class="day-t">Today’s reflection is logged</div>
        <div class="day-d">Off the cushion · ${m}/50 carried through your day</div>
      </div>
      <span class="day-edit">Edit</span>
    </div>`;
  }
  return `<div class="day-card fade-in" data-act="reflect-today">
    <div class="day-ico">${moonSvg()}</div>
    <div class="day-body">
      <div class="day-t">How did you carry it off the cushion?</div>
      <div class="day-d">A gentle end-of-day reflection — awareness, silence, virtue.</div>
    </div>
    <span class="day-cta">Reflect</span>
  </div>`;
}

function viewHome() {
  const sessions = [...state.sessions].sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created));
  const total = sessions.length;
  const avgWell = total ? Math.round(sessions.reduce((s, x) => s + sitWellbeing(x), 0) / total) : 0;

  const list = total
    ? sessions.slice(0, 8).map(entryHtml).join('')
    : `<div class="empty">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></svg>
        <div>No sessions yet.</div>
        <div class="tiny">Tap “Begin a session” to log your first sit.</div>
      </div>`;

  return header() + `
  <div class="card hero fade-in">
    <div class="hero-emblem"><img src="hero.svg" alt="Vimarsha — a hand offering a red lotus" /></div>
    <div class="greet">Namaskaram${state.name ? ', ' + esc(state.name) : ''}</div>
    <h1>How was your practice?</h1>
    <div class="verse">
      <div class="sa">${VERSE.sa}</div>
      <div class="tr">${VERSE.tr}</div>
      <div class="meaning">${VERSE.meaning}</div>
      <span class="cite">— ${VERSE.by}</span>
    </div>
    <button class="cta" data-act="new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Begin a session</button>
  </div>

  ${installBanner()}

  <div class="stat-row fade-in">
    <div class="stat"><div class="num">${total}</div><div class="lbl">Sessions</div></div>
    <div class="stat"><div class="num">${streak()}</div><div class="lbl">Day streak</div></div>
    <div class="stat"><div class="num">${avgWell}</div><div class="lbl">Avg score</div></div>
  </div>

  <div class="section-label">End of day</div>
  ${reflectCard()}

  <div class="section-label">Recent sessions</div>
  <div class="card fade-in">${list}</div>
  ${footer()}`;
}

function entryHtml(s) {
  const q = groupTotal(s.ratings, QUALITY);
  const b = groupTotal(s.ratings, BLOCKS);
  return `<div class="entry" data-open="${s.id}">
    ${ring(sitWellbeing(s))}
    <div class="meta">
      <div class="t">${esc(s.label || 'Session')}</div>
      <div class="d">${fmtDate(s.date)}</div>
      <div class="chips">
        <span class="chip good">Quality ${q}/60</span>
        <span class="chip bad">Blocks ${b}/60</span>
      </div>
    </div>
    <span class="go"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>
  </div>`;
}

/* ------------------------- Session editor ------------------------- */
function startDraft(existing) {
  state.draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), date: todayISO(), label: 'Morning', created: new Date().toISOString(), ratings: emptyRatings(), notes: '', otherReason: '' };
  go('session');
}

function viewSession() {
  const d = state.draft;
  if (!d) { startDraft(); return ''; }
  const isEdit = state.sessions.some((s) => s.id === d.id);

  const presets = LABEL_PRESETS.map((p) =>
    `<button class="preset ${d.label === p ? 'on' : ''}" data-preset="${p}">${p}</button>`).join('');

  const groupsHtml = SIT_GROUPS.map((g) => {
    const tot = groupTotal(d.ratings, g);
    const aspects = g.aspects.map((a) => aspectHtml(g, a, d.ratings[g.id][a.k])).join('');
    return `<div class="card group fade-in">
      <div class="group-head">
        <div class="gt">${g.title}</div>
        <div class="gtot" data-tot="${g.id}">${tot}<small style="color:var(--muted);font-weight:600"> / ${g.max}</small></div>
      </div>
      <div class="group-sub">${g.subtitle} · <span class="pol ${g.polarity}">${g.hint}</span></div>
      ${aspects}
      ${g.id === 'blocks' ? `<div class="field other-reason">
        <label>Other reason — what was it? (optional)</label>
        <textarea id="f-other" placeholder="Describe anything else that got in the way today…">${esc(d.otherReason || '')}</textarea>
      </div>` : ''}
    </div>`;
  }).join('');

  return header(`<button class="ghost-btn" data-act="home"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg> Back</button>`) + `
    <div class="card session-head fade-in">
      <div class="field">
        <label>Your name (optional)</label>
        <input type="text" id="f-name" placeholder="So your reflections stay yours" value="${esc(d.userName || state.name || '')}" autocomplete="name">
      </div>
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
      <button class="notion-btn" data-act="notion-sit">${notionGlyph()} Send to Notion</button>
    </div>

    <div class="totals totals-2 fade-in" style="margin-top:16px">
      <div class="tot"><div class="v" data-tot="quality">${groupTotal(d.ratings, QUALITY)}<small> /60</small></div><div class="k">Quality</div></div>
      <div class="tot"><div class="v" data-tot="blocks">${groupTotal(d.ratings, BLOCKS)}<small> /60</small></div><div class="k">Blocks</div></div>
    </div>

    <div class="save-bar save-bar-float fade-in">
      <button class="btn-secondary" data-act="clear-session">Clear</button>
      ${isEdit ? `<button class="btn-secondary" data-act="delete">Delete</button>` : ''}
      <button class="btn-primary" data-act="save">${isEdit ? 'Update session' : 'Save session'}</button>
    </div>`;
}

/* ------------------- End-of-day reflection editor ----------------- */
function startReflect(existing) {
  const base = existing || todayReflection();
  state.reflectDraft = base
    ? JSON.parse(JSON.stringify(base))
    : { id: uid(), date: todayISO(), created: new Date().toISOString(), ratings: emptyOff(), notes: '', userName: state.name || '', type: 'reflection' };
  go('reflect');
}

function viewReflect() {
  const d = state.reflectDraft;
  if (!d) { startReflect(); return ''; }
  const isEdit = state.reflections.some((r) => r.id === d.id);
  const tot = groupTotal(d.ratings, OFF);
  const aspects = OFF.aspects.map((a) => aspectHtml(OFF, a, d.ratings.maintain[a.k])).join('');

  return header(`<button class="ghost-btn" data-act="home"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg> Back</button>`) + `
    <div class="card reflect-intro fade-in">
      <div class="reflect-emblem">${moonSvg()}</div>
      <h1>End of day</h1>
      <p class="reflect-lead">The sit is one part. This is the other — how steadily you held awareness, silence, and virtue as the day moved. Reflect gently, once, before you rest.</p>
    </div>

    <div class="card session-head fade-in">
      <div class="field">
        <label>Your name (optional)</label>
        <input type="text" id="rf-name" placeholder="So your reflections stay yours" value="${esc(d.userName || state.name || '')}" autocomplete="name">
      </div>
      <div class="field" style="margin-bottom:0">
        <label>Date</label>
        <input type="date" id="rf-date" value="${d.date}" max="${todayISO()}">
      </div>
    </div>

    <div class="card group fade-in">
      <div class="group-head">
        <div class="gt">${OFF.title}</div>
        <div class="gtot" data-tot="maintain">${tot}<small style="color:var(--muted);font-weight:600"> / ${OFF.max}</small></div>
      </div>
      <div class="group-sub">${OFF.subtitle} · <span class="pol pos">${OFF.hint}</span></div>
      ${aspects}
    </div>

    <div class="card fade-in">
      <div class="field" style="margin:0">
        <label>Notes (optional)</label>
        <textarea id="rf-notes" placeholder="How did the day feel, off the cushion?…">${esc(d.notes || '')}</textarea>
      </div>
      <button class="notion-btn" data-act="notion-reflect">${notionGlyph()} Send to Notion</button>
    </div>

    <div class="totals totals-1 fade-in" style="margin-top:16px">
      <div class="tot"><div class="v" data-tot="maintain">${tot}<small> /50</small></div><div class="k">Off the cushion</div></div>
    </div>

    <div class="save-bar save-bar-float fade-in">
      <button class="btn-secondary" data-act="clear-reflect">Clear</button>
      ${isEdit ? `<button class="btn-secondary" data-act="delete-reflect">Delete</button>` : ''}
      <button class="btn-primary" data-act="save-reflect">${isEdit ? 'Update reflection' : 'Save reflection'}</button>
    </div>`;
}

function aspectHtml(g, a, val) {
  const segs = [];
  for (let i = 0; i <= 10; i++) {
    const fill = val != null && i <= val && i > 0 ? 'fill' : '';
    const head = val === i ? 'head' : '';
    const zero = i === 0 ? 'zero' : '';
    segs.push(`<button class="seg ${fill} ${head} ${zero}" data-rate="${g.id}|${a.k}|${i}" aria-label="${i}">${i}</button>`);
  }
  const disp = val == null ? `<span class="aspect-val unset">–</span>` : `<span class="aspect-val" data-val="${g.id}|${a.k}">${val}</span>`;
  return `<div class="aspect">
    <div class="aspect-top">
      <div class="aspect-name-wrap">
        <div class="aspect-name">${esc(a.k)}</div>
        ${a.info ? `<div class="aspect-info">${esc(a.info)}</div>` : ''}
      </div>
      ${disp}
    </div>
    <div class="bar ${g.polarity}" data-bar="${g.id}|${a.k}">${segs.join('')}</div>
  </div>`;
}

/* ---------------------------- Stretches --------------------------- */
function stretchCard(st) {
  return `<div class="card stretch-card fade-in">
    <div class="video">
      <iframe src="https://www.youtube-nocookie.com/embed/${st.yt}?rel=0"
        title="${esc(st.name)} — ${esc(st.channel)}" loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
    <div class="stretch-body">
      <div class="sh"><h3>${esc(st.name)}</h3><span class="dur">${esc(st.duration)}</span></div>
      <div class="target"><em>${esc(st.sanskrit)}</em> · ${esc(st.target)}</div>
      <ol>${st.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="credit">🎥 Video by <strong>${esc(st.channel)}</strong>
        · <a href="https://youtu.be/${st.yt}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div>
    </div>
  </div>`;
}

function viewStretches() {
  return header() + `
    <div class="section-label">Post-meditation stretches</div>
    <p class="stretch-intro">Ease back into the day. Move slowly, breathe through each one, and never force a stretch. Tap any video to play it right here.</p>
    ${STRETCHES.map(stretchCard).join('')}
    ${footer()}`;
}

/* ---------------------------- Insights ---------------------------- */
function viewInsights() {
  const sessions = [...state.sessions].sort((a, b) => (a.date + a.created).localeCompare(b.date + b.created));
  const reflections = [...state.reflections].sort((a, b) => a.date.localeCompare(b.date));
  if (!sessions.length && !reflections.length) {
    return header() + `<div class="card fade-in"><div class="empty">
      <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
      <div>No data yet</div><div class="tiny">Log a few sessions to see your trends.</div></div></div>` + footer();
  }

  const last = sessions.slice(-12);
  const cols = last.map((s) => {
    const q = groupTotal(s.ratings, QUALITY) / 60;
    const b = groupTotal(s.ratings, BLOCKS) / 60;
    return `<div class="col">
      <div class="bars">
        <div class="b q" style="height:${Math.max(3, q * 100)}%"></div>
        <div class="b bl" style="height:${Math.max(3, b * 100)}%"></div>
      </div>
      <div class="lab">${new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</div>
    </div>`;
  }).join('');

  const sitTrend = sessions.length ? `
    <div class="section-label">Last ${last.length} sessions</div>
    <div class="card fade-in">
      <div class="trend">${cols}</div>
      <div class="legend">
        <span><i style="background:var(--brand)"></i>Quality</span>
        <span><i style="background:var(--warn)"></i>Blocks</span>
      </div>
    </div>` : '';

  // Off-cushion trend (reflections)
  const lastR = reflections.slice(-12);
  const offCols = lastR.map((r) => {
    const m = groupTotal(r.ratings, OFF) / 50;
    return `<div class="col">
      <div class="bars"><div class="b m" style="height:${Math.max(3, m * 100)}%"></div></div>
      <div class="lab">${new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</div>
    </div>`;
  }).join('');
  const offTrend = reflections.length ? `
    <div class="section-label">Off the cushion — last ${lastR.length} days</div>
    <div class="card fade-in">
      <div class="trend">${offCols}</div>
      <div class="legend"><span><i style="background:var(--good)"></i>Off the cushion</span></div>
    </div>` : '';

  const avgSit = (g) => sessions.length ? Math.round(sessions.reduce((s, x) => s + groupTotal(x.ratings, g), 0) / sessions.length) : 0;
  const avgQ = avgSit(QUALITY), avgB = avgSit(BLOCKS);
  const avgM = reflections.length ? Math.round(reflections.reduce((s, x) => s + groupTotal(x.ratings, OFF), 0) / reflections.length) : null;
  const avgW = sessions.length ? Math.round(sessions.reduce((s, x) => s + sitWellbeing(x), 0) / sessions.length) : 0;

  return header() + `
    ${sitTrend}
    ${offTrend}
    <div class="section-label">Averages</div>
    <div class="card fade-in">
      <div class="avg-grid">
        ${avgBox('Quality', avgQ, 60)}
        ${avgBox('Blocks', avgB, 60)}
        ${avgBox('Off the cushion', avgM == null ? '–' : avgM, 50)}
        ${avgBox('Wellbeing', avgW, 100)}
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
  const pct = typeof v === 'number' ? Math.round((v / max) * 100) : 0;
  return `<div class="avg"><div class="k">${k}</div><div class="v">${v}<small style="font-size:.6em;color:var(--muted)"> /${max}</small></div>
    <div class="bar-mini"><i style="width:${pct}%"></i></div></div>`;
}

/* ----------------------------- Name sheet ------------------------- */
function showNameSheet(isFirst) {
  if (document.querySelector('.scrim')) return;
  const sheet = document.createElement('div');
  sheet.className = 'scrim';
  sheet.innerHTML = `<div class="sheet" role="dialog">
    <div class="grip"></div>
    <div class="sheet-emblem"><img src="logo.png" alt="Vimarsha" /></div>
    <h2>${isFirst ? 'Welcome to Vimarsha' : 'Your name'}</h2>
    <p class="lead">${isFirst ? 'What may I call you? Your name stays on this device and greets you each visit.' : 'Update how Vimarsha greets you.'}</p>
    <div class="field" style="margin:14px 2px 0">
      <input type="text" id="name-input" placeholder="Your name" maxlength="40"
        value="${esc(state.name)}" autocomplete="given-name" enterkeyhint="done">
    </div>
    <div class="save-bar" style="position:static;margin-top:16px">
      <button class="btn-primary" data-act="save-name">${isFirst ? 'Begin' : 'Save'}</button>
    </div>
  </div>`;
  document.body.appendChild(sheet);
  const input = sheet.querySelector('#name-input');
  setTimeout(() => input.focus(), 60);
  const commit = () => { setName(input.value || 'friend'); sheet.remove(); render(); };
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-act="save-name"]')) commit(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
}

/* ---------------------- Support / donation sheet ------------------ */
function showSupportSheet() {
  const sheet = document.createElement('div');
  sheet.className = 'scrim';
  sheet.innerHTML = `<div class="sheet" role="dialog">
    <div class="grip"></div>
    <button class="sheet-close" data-act="close-support" aria-label="Close">&times;</button>
    <div class="sheet-emblem"><img src="logo-mark.png" alt="Vimarsha" /></div>
    <h2>Support this offering</h2>
    <p class="lead">Any amount is received with gratitude — a contribution toward keeping this practice alive.</p>
    <a class="paypal-btn" href="https://paypal.me/keshavom" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>
      Donate via PayPal
    </a>
    <div class="support-alt"><span>In India? Pay via UPI</span></div>
    <a class="btn-primary" style="display:block;text-align:center;text-decoration:none"
       href="upi://pay?pa=${UPI.vpa}&amp;pn=Vimarsha&amp;cu=INR">Pay via any UPI app</a>
    <div class="upi-id">
      <span class="v">${UPI.vpa}</span>
      <button data-act="copy-upi">Copy</button>
    </div>
    <div class="qr">
      <img src="upi-qr.png" alt="UPI QR code for ${UPI.vpa}" />
      <div class="qr-cap">On a computer? Scan this with any UPI app.</div>
    </div>
    <div class="save-bar" style="position:static;margin-top:16px">
      <button class="btn-secondary" style="flex:1" data-act="close-support">Done</button>
    </div>
  </div>`;
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-act="close-support"]')) { sheet.remove(); return; }
    if (e.target.closest('[data-act="copy-upi"]')) {
      (navigator.clipboard ? navigator.clipboard.writeText(UPI.vpa) : Promise.reject())
        .then(() => toast('UPI ID copied 🙏')).catch(() => toast(UPI.vpa));
    }
  });
  document.body.appendChild(sheet);
}

/* ---------------------- Add-to-home-screen sheet ------------------ */
function showInstallSheet() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const android = /Android/.test(ua);
  let steps;
  if (iOS) {
    steps = `<li>Tap the <strong>Share</strong> icon (the square with an upward arrow) in Safari’s bar.</li>
      <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
      <li>Tap <strong>Add</strong> — Vimarsha now sits on your home screen like an app. 🪷</li>`;
  } else if (android) {
    steps = `<li>Tap the <strong>⋮</strong> menu at the top-right of your browser.</li>
      <li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).</li>
      <li>Confirm <strong>Add</strong> — the Vimarsha icon appears on your home screen. 🪷</li>`;
  } else {
    steps = `<li>Click the <strong>install</strong> icon in the address bar (a small screen/＋ icon), or open the browser menu.</li>
      <li>Choose <strong>Install Vimarsha</strong> / <strong>Add to Home screen</strong>.</li>
      <li>It opens in its own window, like an app. 🪷</li>`;
  }
  const sheet = document.createElement('div');
  sheet.className = 'scrim';
  sheet.innerHTML = `<div class="sheet" role="dialog">
    <div class="grip"></div>
    <div class="sheet-emblem"><img src="logo-mark.png" alt="Vimarsha" /></div>
    <h2>Keep Vimarsha one tap away</h2>
    <p class="lead">Add it to your home screen — full-screen, app-like, and works offline.</p>
    <ol class="install-steps">${steps}</ol>
    <div class="save-bar" style="position:static;margin-top:8px">
      <button class="btn-primary" data-act="close-install">Got it</button>
    </div>
  </div>`;
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-act="close-install"]')) sheet.remove();
  });
  document.body.appendChild(sheet);
}

/* ---------------------- Post-session stretch check ---------------- */
function showStretchSheet(score, entry) {
  const sheet = document.createElement('div');
  sheet.className = 'scrim';
  sheet.innerHTML = `<div class="sheet" role="dialog">
    <div class="grip"></div>
    <div class="celebrate">🧘</div>
    <h2>Session saved</h2>
    <p class="lead">Wellbeing score <strong>${score}/100</strong>.</p>
    <div class="stretch-check" id="check-step">
      <p class="ask">Have you done your post-meditation stretches?</p>
      <div class="choice-row">
        <button class="choice" data-act="stretched-yes">Yes, I’ve stretched</button>
        <button class="choice" data-act="stretched-no">Not yet</button>
      </div>
      <button class="notion-btn ghost-wide" data-act="notion-saved">${notionGlyph()} Send to Notion</button>
    </div>
  </div>`;
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="notion-saved"]')) { sendToNotion(entry, 'session'); return; }
    if (e.target === sheet) { sheet.remove(); go('home'); return; }
    if (e.target.closest('[data-act="stretched-yes"]')) { sheet.remove(); toast('🙏 Well done'); go('home'); return; }
    if (e.target.closest('[data-act="stretched-no"]')) {
      sheet.querySelector('#check-step').innerHTML = `
        <p class="ask">Take a gentle pause. 🪷<br>Recontemplate, return to that quiet, and move through your stretches before you carry on.</p>
        <div class="choice-row">
          <button class="btn-primary" data-act="go-stretches">Take me to the stretches</button>
        </div>`;
      return;
    }
    if (e.target.closest('[data-act="go-stretches"]')) { sheet.remove(); go('stretches'); return; }
  });
  document.body.appendChild(sheet);
}

/* --------------------- Reflection saved sheet --------------------- */
function showReflectSavedSheet(entry) {
  const sheet = document.createElement('div');
  sheet.className = 'scrim';
  sheet.innerHTML = `<div class="sheet" role="dialog">
    <div class="grip"></div>
    <div class="celebrate">🌙</div>
    <h2>Reflection saved</h2>
    <p class="lead">Off the cushion <strong>${groupTotal(entry.ratings, OFF)}/50</strong> — rest well.</p>
    <button class="notion-btn ghost-wide" data-act="notion-saved">${notionGlyph()} Send to Notion</button>
    <div class="save-bar" style="position:static;margin-top:14px">
      <button class="btn-primary" data-act="close-saved">Done</button>
    </div>
  </div>`;
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="notion-saved"]')) { sendToNotion(entry, 'reflection'); return; }
    if (e.target === sheet || e.target.closest('[data-act="close-saved"]')) { sheet.remove(); go('home'); }
  });
  document.body.appendChild(sheet);
}

/* ============================== Notion ============================= */
function notionGlyph() {
  // simple page/arrow glyph; styled via .notion-btn svg
  return '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7zM14 3v5h5"/><path d="M10 13h6M10 17h4"/></svg>';
}

function entryMarkdown(e, kind) {
  const who = (e.userName || '').trim();
  const lines = [];
  if (kind === 'reflection') {
    lines.push('# 🪷 Vimarsha — End-of-day reflection');
    lines.push(`**Date:** ${fmtDate(e.date)}${who ? `  ·  **By:** ${who}` : ''}  ·  **Off the cushion:** ${groupTotal(e.ratings, OFF)}/50 (${offScore(e)}/100)`);
    lines.push('');
    lines.push(`## ${OFF.title}`);
    OFF.aspects.forEach((a) => {
      const v = e.ratings?.maintain?.[a.k];
      lines.push(`- ${a.k}: ${v == null ? '—' : v}/10`);
    });
    lines.push('');
  } else {
    lines.push(`# 🪷 Vimarsha — ${e.label || 'Session'}`);
    lines.push(`**Date:** ${fmtDate(e.date)}${who ? `  ·  **By:** ${who}` : ''}  ·  **Wellbeing:** ${sitWellbeing(e)}/100`);
    lines.push('');
    SIT_GROUPS.forEach((g) => {
      lines.push(`## ${g.title} (${groupTotal(e.ratings, g)}/${g.max})`);
      g.aspects.forEach((a) => {
        const v = e.ratings?.[g.id]?.[a.k];
        lines.push(`- ${a.k}: ${v == null ? '—' : v}/10`);
      });
      lines.push('');
    });
    if ((e.otherReason || '').trim()) { lines.push(`**Other reason:** ${e.otherReason.trim()}`); lines.push(''); }
  }
  if ((e.notes || '').trim()) { lines.push('## Notes'); lines.push(e.notes.trim()); lines.push(''); }
  lines.push('— Logged in Vimarsha · vimarsha-daily.vercel.app');
  return lines.join('\n');
}

function sendToNotion(entry, kind) {
  const md = entryMarkdown(entry, kind);
  (navigator.clipboard ? navigator.clipboard.writeText(md) : Promise.reject())
    .then(() => showNotionSheet(md, true))
    .catch(() => showNotionSheet(md, false));
}

function showNotionSheet(md, copied) {
  const existing = document.querySelector('.scrim.notion-scrim');
  if (existing) existing.remove();
  const sheet = document.createElement('div');
  sheet.className = 'scrim notion-scrim';
  sheet.innerHTML = `<div class="sheet" role="dialog">
    <div class="grip"></div>
    <button class="sheet-close" data-act="close-notion" aria-label="Close">&times;</button>
    <div class="celebrate">${copied ? '📋' : '📝'}</div>
    <h2>${copied ? 'Copied for Notion' : 'Copy for Notion'}</h2>
    <p class="lead">${copied
      ? 'Open Notion, create or open any page, and paste (⌘/Ctrl + V). It turns into a clean page automatically.'
      : 'Select the text below, copy it, then paste it into any Notion page (⌘/Ctrl + V).'}</p>
    ${copied ? '' : `<div class="field" style="margin:14px 2px 0"><textarea id="notion-md" readonly style="min-height:160px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.82rem">${esc(md)}</textarea></div>`}
    <a class="paypal-btn" style="margin-top:14px" href="https://www.notion.so/" target="_blank" rel="noopener">
      ${notionGlyph()} Open Notion ↗
    </a>
    <div class="save-bar" style="position:static;margin-top:12px">
      ${copied ? '' : '<button class="btn-secondary" style="flex:1" data-act="copy-notion">Copy text</button>'}
      <button class="btn-primary" data-act="close-notion">Done</button>
    </div>
  </div>`;
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-act="close-notion"]')) { sheet.remove(); return; }
    if (e.target.closest('[data-act="copy-notion"]')) {
      const ta = sheet.querySelector('#notion-md');
      ta.select(); ta.setSelectionRange(0, md.length);
      try { document.execCommand('copy'); toast('Copied 📋'); } catch { toast('Select all & copy'); }
    }
  });
  document.body.appendChild(sheet);
}

/* ============================== Router ============================= */
const VIEWS = { home: viewHome, session: viewSession, reflect: viewReflect, stretches: viewStretches, insights: viewInsights };
function go(view) {
  state.view = view;
  if (view === 'session' && !state.draft) startDraft();
  if (view === 'reflect' && !state.reflectDraft) startReflect();
  render();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
function render() {
  $('#app').innerHTML = VIEWS[state.view]();
  const tabbar = $('#tabbar');
  tabbar.hidden = false;
  tabbar.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.view === state.view));
}

/* ============================== Events ============================= */
function syncSitDraft() {
  const d = state.draft;
  d.label = ($('#f-label')?.value || '').trim() || 'Session';
  d.date = $('#f-date')?.value || todayISO();
  d.notes = ($('#f-notes')?.value || '').trim();
  d.otherReason = ($('#f-other')?.value || '').trim();
  d.userName = ($('#f-name')?.value || '').trim();
}
function syncReflectDraft() {
  const d = state.reflectDraft;
  d.date = $('#rf-date')?.value || todayISO();
  d.notes = ($('#rf-notes')?.value || '').trim();
  d.userName = ($('#rf-name')?.value || '').trim();
}

function saveDraft() {
  syncSitDraft();
  const d = state.draft;
  if (d.userName) setName(d.userName);
  const idx = state.sessions.findIndex((s) => s.id === d.id);
  if (idx >= 0) state.sessions[idx] = d; else state.sessions.push(d);
  persist();
  const score = sitWellbeing(d);
  const wasNew = idx < 0;
  const saved = JSON.parse(JSON.stringify(d));
  submitRemote({ ...d, type: 'session' });
  state.draft = null;
  if (wasNew) showStretchSheet(score, saved);
  else { toast('Session updated'); go('home'); }
}

function saveReflect() {
  syncReflectDraft();
  const d = state.reflectDraft;
  if (d.userName) setName(d.userName);
  // one reflection per calendar day — replace any other entry on the same date
  const clash = state.reflections.find((r) => r.date === d.date && r.id !== d.id);
  if (clash) state.reflections = state.reflections.filter((r) => r.id !== clash.id);
  const idx = state.reflections.findIndex((r) => r.id === d.id);
  if (idx >= 0) state.reflections[idx] = d; else state.reflections.push(d);
  persistReflect();
  const saved = JSON.parse(JSON.stringify(d));
  submitRemote({ ...d, type: 'reflection' });
  state.reflectDraft = null;
  showReflectSavedSheet(saved);
}

function submitRemote(entry) {
  if (!CONFIG.collectEndpoint) return;
  try {
    fetch(CONFIG.collectEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight for Apps Script
      body: JSON.stringify({ ...entry, ua: navigator.userAgent, submittedAt: new Date().toISOString() }),
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
  const cols = ['date', 'name', 'label'];
  SIT_GROUPS.forEach((g) => g.aspects.forEach((a) => cols.push(`${g.id}:${a.k}`)));
  cols.push('quality_total', 'blocks_total', 'wellbeing', 'other_reason', 'notes');
  const rows = [cols.join(',')];
  state.sessions.forEach((s) => {
    const r = [s.date, `"${(s.userName || '').replace(/"/g, '""')}"`, `"${(s.label || '').replace(/"/g, '""')}"`];
    SIT_GROUPS.forEach((g) => g.aspects.forEach((a) => r.push(s.ratings?.[g.id]?.[a.k] ?? '')));
    r.push(groupTotal(s.ratings, QUALITY), groupTotal(s.ratings, BLOCKS), sitWellbeing(s));
    r.push(`"${(s.otherReason || '').replace(/"/g, '""')}"`);
    r.push(`"${(s.notes || '').replace(/"/g, '""')}"`);
    rows.push(r.join(','));
  });
  // reflections as their own block below the sits
  if (state.reflections.length) {
    rows.push('');
    const rc = ['date', 'name'];
    OFF.aspects.forEach((a) => rc.push(`maintain:${a.k}`));
    rc.push('offcushion_total', 'notes');
    rows.push(rc.join(','));
    state.reflections.forEach((r) => {
      const row = [r.date, `"${(r.userName || '').replace(/"/g, '""')}"`];
      OFF.aspects.forEach((a) => row.push(r.ratings?.maintain?.[a.k] ?? ''));
      row.push(groupTotal(r.ratings, OFF));
      row.push(`"${(r.notes || '').replace(/"/g, '""')}"`);
      rows.push(row.join(','));
    });
  }
  download('vimarsha-export.csv', rows.join('\n'), 'text/csv');
}

document.addEventListener('click', (e) => {
  const rate = e.target.closest('[data-rate]');
  if (rate) {
    const [gid, k, vStr] = rate.dataset.rate.split('|');
    const v = +vStr;
    const target = state.view === 'reflect' ? state.reflectDraft : state.draft;
    target.ratings[gid][k] = v;
    // re-render just this group's bar + totals without full re-render (keeps scroll)
    const bar = rate.closest('.bar');
    bar.querySelectorAll('.seg').forEach((seg, i) => {
      seg.classList.toggle('fill', i <= v && i > 0);
      seg.classList.toggle('head', i === v);
    });
    const top = rate.closest('.aspect').querySelector('.aspect-val');
    top.classList.remove('unset'); top.textContent = v; top.dataset.val = `${gid}|${k}`;
    const tot = groupTotal(target.ratings, ALL_GROUPS.find((g) => g.id === gid));
    document.querySelectorAll(`[data-tot="${gid}"]`).forEach((el) => {
      const small = el.querySelector('small');
      el.childNodes[0] ? (el.childNodes[0].nodeValue = tot) : (el.textContent = tot);
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
  if (tab) {
    if (tab.dataset.view === 'session') startDraft();
    else if (tab.dataset.view === 'reflect') startReflect();
    else go(tab.dataset.view);
    return;
  }

  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  switch (act) {
    case 'new': startDraft(); break;
    case 'reflect-today': startReflect(); break;
    case 'toggle-theme':
      state.dark = !state.dark;
      localStorage.setItem(THEME_KEY, state.dark ? 'dark' : 'light');
      applyTheme(); render();
      break;
    case 'edit-name': showNameSheet(false); break;
    case 'support': showSupportSheet(); break;
    case 'notion-sit': syncSitDraft(); sendToNotion(state.draft, 'session'); break;
    case 'notion-reflect': syncReflectDraft(); sendToNotion(state.reflectDraft, 'reflection'); break;
    case 'clear-session':
      if (confirm('Clear all ratings and notes for this session? (Date, name and session label stay.)')) {
        state.draft.ratings = emptyRatings();
        state.draft.notes = '';
        state.draft.otherReason = '';
        toast('Session cleared');
        render();
      }
      break;
    case 'clear-reflect':
      if (confirm('Clear all ratings and notes for this reflection? (Date and name stay.)')) {
        state.reflectDraft.ratings = emptyOff();
        state.reflectDraft.notes = '';
        toast('Reflection cleared');
        render();
      }
      break;
    case 'install':
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; }); }
      else showInstallSheet();
      break;
    case 'dismiss-install':
      state.installDismissed = true;
      localStorage.setItem('vimarsha.installDismissed', '1');
      render();
      break;
    case 'home': state.draft = null; state.reflectDraft = null; go('home'); break;
    case 'save': saveDraft(); break;
    case 'save-reflect': saveReflect(); break;
    case 'delete':
      if (confirm('Delete this session?')) {
        state.sessions = state.sessions.filter((s) => s.id !== state.draft.id);
        persist(); state.draft = null; toast('Deleted'); go('home');
      }
      break;
    case 'delete-reflect':
      if (confirm('Delete this reflection?')) {
        state.reflections = state.reflections.filter((r) => r.id !== state.reflectDraft.id);
        persistReflect(); state.reflectDraft = null; toast('Deleted'); go('home');
      }
      break;
    case 'export-json':
      download('vimarsha-backup.json', JSON.stringify({ _v: 2, sessions: state.sessions, reflections: state.reflections }, null, 2), 'application/json');
      break;
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
        const incomingSessions = Array.isArray(data) ? data : (data.sessions || []);
        const incomingReflections = Array.isArray(data) ? [] : (data.reflections || []);
        const byId = new Map(state.sessions.map((s) => [s.id, s]));
        incomingSessions.forEach((s) => byId.set(s.id, s));
        state.sessions = [...byId.values()];
        const byR = new Map(state.reflections.map((r) => [r.id, r]));
        incomingReflections.forEach((r) => byR.set(r.id, r));
        state.reflections = [...byR.values()];
        persist(); persistReflect();
        toast(`Imported ${incomingSessions.length} sessions${incomingReflections.length ? ` · ${incomingReflections.length} reflections` : ''}`);
        go('insights');
      } catch { toast('Could not read that file'); }
    };
    fr.readAsText(e.target.files[0]);
  }
  if (e.target.id === 'f-label') state.draft.label = e.target.value;
});

/* ----------------------------- Boot ------------------------------- */
migrate();
applyTheme();
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
