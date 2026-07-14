/* AD Training — app logic. All state persisted to localStorage under STORE_KEY. */
'use strict';

const STORE_KEY = 'adtrain_v1';

/* ============================================================
   State
   ============================================================ */
function defaultState() {
  return {
    v: 1,
    targets: { ...DEFAULT_TARGETS },
    plan: DEFAULT_PLAN.map(d => ({ am: [...d.am], pm: [...d.pm] })),
    sets: [],                    // {id, ex, w, r, d:'YYYY-MM-DD', t:epoch, sess:'am'|'pm', pr:bool}
    favFoods: DEFAULT_FOODS.map(f => ({ ...f })),
    foodLog: {},                 // { 'YYYY-MM-DD': [{id, name, k, p, t}] }
    metrics: { weight: [], muscle: [], fat: [] },  // [{d, v}] sorted by d
    strengthEx: 'bench',
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return defaultState();
    // backfill any missing keys so older exports stay importable
    const d = defaultState();
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    for (const k of Object.keys(d.targets)) if (typeof s.targets[k] !== 'number') s.targets[k] = d.targets[k];
    for (const k of Object.keys(d.metrics)) if (!Array.isArray(s.metrics[k])) s.metrics[k] = [];
    if (!Array.isArray(s.plan) || s.plan.length !== 7) s.plan = d.plan;
    s.plan = s.plan.map(day => ({
      am: Array.isArray(day && day.am) ? day.am.filter(id => EX_BY_ID[id]) : [],
      pm: Array.isArray(day && day.pm) ? day.pm.filter(id => EX_BY_ID[id]) : [],
    }));
    return s;
  } catch (e) {
    console.error('State load failed, starting fresh', e);
    return defaultState();
  }
}

let state = loadState();
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ============================================================
   Helpers
   ============================================================ */
const $ = id => document.getElementById(id);
let uidCounter = 0;
const uid = () => Date.now().toString(36) + (uidCounter++).toString(36);

function dateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const todayKey = () => dateKey(new Date());
const mondayIndex = d => (d.getDay() + 6) % 7;   // 0 = Monday

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtW(w) { return (Math.round(w * 10) / 10).toString(); }

function toast(msg, isPR = false) {
  const el = $('toast');
  el.textContent = msg;
  el.className = isPR ? 'show pr' : 'show';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = ''; }, isPR ? 2800 : 2000);
}

/* Sparkline SVG from numeric series */
function sparkline(values, w = 300, h = 44) {
  if (!values.length) return '<div class="empty">No data yet</div>';
  if (values.length === 1) values = [values[0], values[0]];
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `${pad},${h} ${line} ${w - pad},${h}`;
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polygon class="fillarea" points="${area}"></polygon>
    <polyline points="${line}"></polyline>
    <circle cx="${last[0]}" cy="${last[1]}" r="3"></circle>
  </svg>`;
}

/* ============================================================
   Derived stats
   ============================================================ */
function daysWithSets() {
  return new Set(state.sets.map(s => s.d));
}

function streak() {
  const days = daysWithSets();
  if (!days.size) return 0;
  let n = 0;
  const cur = new Date();
  // streak may start today or yesterday
  if (!days.has(dateKey(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(dateKey(cur))) { n++; cur.setDate(cur.getDate() - 1); }
  return n;
}

function sessionsThisWeek() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - mondayIndex(now)); mon.setHours(0, 0, 0, 0);
  const seen = new Set();
  for (const s of state.sets) {
    const d = new Date(s.d + 'T12:00:00');
    if (d >= mon) seen.add(s.d + '|' + s.sess);
  }
  return seen.size;
}

function latestMetric(key) {
  const arr = state.metrics[key];
  return arr.length ? arr[arr.length - 1].v : null;
}

function todayFood() { return state.foodLog[todayKey()] || []; }
function foodTotals() {
  return todayFood().reduce((a, f) => ({ k: a.k + f.k, p: a.p + f.p }), { k: 0, p: 0 });
}

/* Last set logged for an exercise (any day) — used to pre-fill steppers */
function lastSetOf(exId) {
  for (let i = state.sets.length - 1; i >= 0; i--) if (state.sets[i].ex === exId) return state.sets[i];
  return null;
}

/* Top set of the most recent previous day for "beat this" */
function lastSessionTopSet(exId, beforeDay) {
  const prior = state.sets.filter(s => s.ex === exId && s.d < beforeDay);
  if (!prior.length) return null;
  const lastDay = prior[prior.length - 1].d;
  const daySets = prior.filter(s => s.d === lastDay);
  return daySets.reduce((top, s) => (s.w > top.w || (s.w === top.w && s.r > top.r)) ? s : top);
}

function isPR(exId, w, r) {
  const prev = state.sets.filter(s => s.ex === exId);
  if (!prev.length) return false;
  const maxW = Math.max(...prev.map(s => s.w));
  if (w > maxW) return true;
  if (w === maxW) {
    const maxR = Math.max(...prev.filter(s => s.w === w).map(s => s.r));
    if (r > maxR) return true;
  }
  return false;
}

/* ============================================================
   Tab navigation
   ============================================================ */
let activeTab = 'today';
function showTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('main').scrollTop = 0;
  renderTab(tab);
}
document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

function renderTab(tab) {
  if (tab === 'today') renderToday();
  else if (tab === 'train') renderTrain();
  else if (tab === 'food') renderFood();
  else if (tab === 'progress') renderProgress();
  else if (tab === 'plan') renderPlan();
}
function renderAll() { renderTab(activeTab); }

/* ============================================================
   TODAY
   ============================================================ */
function renderToday() {
  const w = latestMetric('weight');
  $('snapshotStats').innerHTML = `
    <div class="stat"><div class="val">${streak()}<small>d</small></div><div class="lbl">Streak</div></div>
    <div class="stat"><div class="val">${w !== null ? fmtW(w) : '—'}<small>${w !== null ? 'kg' : ''}</small></div><div class="lbl">Weight</div></div>
    <div class="stat"><div class="val">${sessionsThisWeek()}</div><div class="lbl">Sessions / wk</div></div>`;

  const dayIdx = mondayIndex(new Date());
  const day = state.plan[dayIdx];
  const tk = todayKey();
  let html = '';
  for (const sess of ['am', 'pm']) {
    const ids = day[sess];
    const label = sess === 'am' ? 'Morning' : 'Afternoon';
    if (!ids.length) {
      html += `<div class="card session-card">
        <div class="sess-head"><span class="sess-tag">${label}</span><span class="sess-count">Rest</span></div>
        <div class="rest-note">Nothing planned — recovery counts too.</div></div>`;
      continue;
    }
    const doneSet = new Set(state.sets.filter(s => s.d === tk && s.sess === sess).map(s => s.ex));
    const items = ids.map(id => {
      const ex = EX_BY_ID[id];
      return doneSet.has(id) ? `<b>✓ ${esc(ex.n)}</b>` : esc(ex.n);
    }).join('<br>');
    html += `<div class="card session-card">
      <div class="sess-head"><span class="sess-tag">${label}</span><span class="sess-count">${ids.length} exercises · ${doneSet.size} done</span></div>
      <div class="sess-ex-list">${items}</div>
      <button class="btn small" data-start="${sess}">Start ${label} Session</button></div>`;
  }
  $('todaySessions').innerHTML = html;
  document.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => {
    trainSess = b.dataset.start;
    trainIdx = 0;
    showTab('train');
  }));

  const t = foodTotals();
  $('todayFuel').innerHTML = fuelBarsHTML(t, true);
}

function fuelBarsHTML(t, compact) {
  const { kcal, protein } = state.targets;
  const kPct = Math.min(100, (t.k / kcal) * 100);
  const pPct = Math.min(100, (t.p / protein) * 100);
  const kOver = t.k > kcal, pDone = t.p >= protein;
  const kSub = kOver ? `+${t.k - kcal} kcal over` : `${kcal - t.k} kcal left`;
  const pSub = pDone ? `Protein target hit ✓` : `${protein - t.p}g to go`;
  return `
    <div class="bar-block">
      <div class="bar-head"><span class="name">Calories</span><span class="nums">${t.k}<small> / ${kcal}</small></span></div>
      <div class="bar"><i class="${kOver ? 'over' : ''}" style="width:${kPct}%"></i></div>
      <div class="bar-sub ${kOver ? 'over' : ''}">${kSub}</div>
    </div>
    <div class="bar-block">
      <div class="bar-head"><span class="name">Protein</span><span class="nums">${t.p}<small>g / ${protein}g</small></span></div>
      <div class="bar"><i class="${pDone ? 'done' : ''}" style="width:${pPct}%"></i></div>
      <div class="bar-sub ${pDone ? 'done' : ''}">${pSub}</div>
    </div>`;
}

/* ============================================================
   TRAIN
   ============================================================ */
let trainSess = 'am';
let trainIdx = 0;
let stepW = null, stepR = null;   // current stepper values; null = derive from history

function currentSessionIds() {
  return state.plan[mondayIndex(new Date())][trainSess];
}

$('trainSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  trainSess = b.dataset.sess;
  trainIdx = 0;
  stepW = stepR = null;
  renderTrain();
}));

function renderTrain() {
  $('trainSeg').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.sess === trainSess));
  const ids = currentSessionIds();
  const tk = todayKey();
  if (trainIdx >= ids.length) trainIdx = 0;

  // exercise chips
  const doneSet = new Set(state.sets.filter(s => s.d === tk && s.sess === trainSess).map(s => s.ex));
  $('exChips').innerHTML = ids.map((id, i) => {
    const ex = EX_BY_ID[id];
    return `<div class="ex-chip ${i === trainIdx ? 'active' : ''}" data-i="${i}">
      ${doneSet.has(id) ? '<span class="done-mark">✓</span>' : ''}${esc(ex.n)}</div>`;
  }).join('');
  $('exChips').querySelectorAll('.ex-chip').forEach(c => c.addEventListener('click', () => {
    trainIdx = +c.dataset.i; stepW = stepR = null; renderTrain();
  }));

  // main body
  if (!ids.length) {
    $('trainBody').innerHTML = `<div class="card"><div class="empty">Nothing planned for the ${trainSess === 'am' ? 'morning' : 'afternoon'} today.<br>Add exercises in the Plan tab.</div></div>`;
  } else {
    const ex = EX_BY_ID[ids[trainIdx]];
    if (stepW === null) {
      const last = lastSetOf(ex.i);
      stepW = last ? last.w : 20;
      stepR = last ? last.r : 8;
    }
    const beat = lastSessionTopSet(ex.i, tk);
    const beatHTML = beat
      ? `<div class="beat-line">Last time: <b>${fmtW(beat.w)}kg × ${beat.r}</b> &nbsp;<span class="flame">— beat this 🔥</span></div>`
      : `<div class="beat-line">First time logging this — <span class="flame">set the bar.</span></div>`;
    $('trainBody').innerHTML = `
      <div class="card">
        <div class="ex-title">${esc(ex.n)}</div>
        <div class="ex-meta"><span class="tag red">${esc(ex.g)}</span><span class="tag">${esc(ex.e)}</span><span class="tag">${ex.r}s rest</span></div>
        <div class="ex-cue">${esc(ex.c)}</div>
        ${beatHTML}
        <div class="steppers">
          <div class="stepper"><div class="lbl">Weight</div>
            <div class="row">
              <button class="step-btn" id="wMinus">−</button>
              <div class="val" id="wVal">${fmtW(stepW)}<small>kg</small></div>
              <button class="step-btn" id="wPlus">+</button>
            </div></div>
          <div class="stepper"><div class="lbl">Reps</div>
            <div class="row">
              <button class="step-btn" id="rMinus">−</button>
              <div class="val" id="rVal">${stepR}</div>
              <button class="step-btn" id="rPlus">+</button>
            </div></div>
        </div>
        <button class="btn" id="logSet">Log Set</button>
      </div>`;
    $('wMinus').addEventListener('click', () => { stepW = Math.max(0, Math.round((stepW - 2.5) * 10) / 10); $('wVal').innerHTML = `${fmtW(stepW)}<small>kg</small>`; });
    $('wPlus').addEventListener('click', () => { stepW = Math.round((stepW + 2.5) * 10) / 10; $('wVal').innerHTML = `${fmtW(stepW)}<small>kg</small>`; });
    $('rMinus').addEventListener('click', () => { stepR = Math.max(1, stepR - 1); $('rVal').textContent = stepR; });
    $('rPlus').addEventListener('click', () => { stepR += 1; $('rVal').textContent = stepR; });
    $('logSet').addEventListener('click', () => logSet(ex));
  }

  renderSetHistory();
}

function logSet(ex) {
  const pr = isPR(ex.i, stepW, stepR);
  state.sets.push({ id: uid(), ex: ex.i, w: stepW, r: stepR, d: todayKey(), t: Date.now(), sess: trainSess, pr });
  save();
  if (pr) toast(`🏆 New PR — ${fmtW(stepW)}kg × ${stepR}`, true);
  else toast(`Logged ${fmtW(stepW)}kg × ${stepR}`);
  startTimer(ex.r);
  renderTrain();
}

function renderSetHistory() {
  const tk = todayKey();
  const sets = state.sets.filter(s => s.d === tk && s.sess === trainSess).slice().reverse();
  $('setHistory').innerHTML = sets.length ? sets.map(s => {
    const ex = EX_BY_ID[s.ex];
    return `<div class="set-item">
      <div><div class="set-nums">${fmtW(s.w)}kg × ${s.r}</div><div class="set-ex">${ex ? esc(ex.n) : s.ex}</div></div>
      <div style="display:flex;align-items:center;gap:6px">
        ${s.pr ? '<span class="pr-badge">PR</span>' : ''}
        <button class="icon-x" data-del="${s.id}" aria-label="Delete set">✕</button>
      </div></div>`;
  }).join('') : '<div class="empty">No sets logged yet — get after it.</div>';
  $('setHistory').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    state.sets = state.sets.filter(s => s.id !== b.dataset.del);
    save(); renderTrain();
  }));
}

/* ---------- Rest timer ---------- */
const RING_C = 2 * Math.PI * 66; // matches SVG r=66
let timer = null; // {end, total, iv}

function startTimer(seconds) {
  stopTimer(false);
  timer = { end: Date.now() + seconds * 1000, total: seconds, iv: setInterval(tickTimer, 200) };
  $('timerWrap').classList.add('on');
  tickTimer();
}

function tickTimer() {
  if (!timer) return;
  const remain = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  const m = Math.floor(remain / 60), s = remain % 60;
  $('timerNum').textContent = `${m}:${String(s).padStart(2, '0')}`;
  const frac = timer.total > 0 ? remain / timer.total : 0;
  $('timerProg').style.strokeDashoffset = String(RING_C * (1 - frac));
  if (remain <= 0) {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    toast('Rest over — next set 💪');
    stopTimer(true);
  }
}

function stopTimer(hide) {
  if (timer) { clearInterval(timer.iv); timer = null; }
  if (hide) $('timerWrap').classList.remove('on');
}

$('timerMinus').addEventListener('click', () => { if (timer) { timer.end -= 15000; tickTimer(); } });
$('timerPlus').addEventListener('click', () => { if (timer) { timer.end += 15000; timer.total += 15; tickTimer(); } });
$('timerSkip').addEventListener('click', () => stopTimer(true));

/* ============================================================
   FOOD
   ============================================================ */
function renderFood() {
  $('foodBars').innerHTML = fuelBarsHTML(foodTotals());

  $('quickFoods').innerHTML = state.favFoods.length ? state.favFoods.map(f => `
    <div class="food-row">
      <div><div class="fname">${esc(f.name)}</div><div class="fmacros">${f.k} kcal · ${f.p}g protein</div></div>
      <div style="display:flex;gap:6px">
        <button class="icon-x" data-unfav="${f.id}" aria-label="Remove from quick add">✕</button>
        <button class="food-add" data-fav="${f.id}" aria-label="Log ${esc(f.name)}">+</button>
      </div></div>`).join('') : '<div class="empty">No saved foods — add one below.</div>';

  $('quickFoods').querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', () => {
    const f = state.favFoods.find(x => x.id === b.dataset.fav);
    if (f) logFood(f.name, f.k, f.p);
  }));
  $('quickFoods').querySelectorAll('[data-unfav]').forEach(b => b.addEventListener('click', () => {
    state.favFoods = state.favFoods.filter(x => x.id !== b.dataset.unfav);
    save(); renderFood();
  }));

  const log = todayFood().slice().reverse();
  $('foodLog').innerHTML = log.length ? log.map(f => `
    <div class="food-row">
      <div><div class="fname">${esc(f.name)}</div><div class="fmacros">${f.k} kcal · ${f.p}g protein</div></div>
      <button class="icon-x" data-delfood="${f.id}" aria-label="Delete entry">✕</button>
    </div>`).join('') : '<div class="empty">Nothing logged today.</div>';
  $('foodLog').querySelectorAll('[data-delfood]').forEach(b => b.addEventListener('click', () => {
    const tk = todayKey();
    state.foodLog[tk] = (state.foodLog[tk] || []).filter(x => x.id !== b.dataset.delfood);
    save(); renderFood();
  }));
}

function logFood(name, k, p) {
  const tk = todayKey();
  if (!state.foodLog[tk]) state.foodLog[tk] = [];
  state.foodLog[tk].push({ id: uid(), name, k, p, t: Date.now() });
  save();
  toast(`Logged ${name}`);
  renderFood();
  if (activeTab === 'today') renderToday();
}

function readCustomFood() {
  const name = $('cfName').value.trim();
  const k = Math.round(+$('cfKcal').value);
  const p = Math.round(+$('cfProt').value);
  if (!name) { toast('Enter a food name'); return null; }
  if (!(k >= 0) || !(p >= 0) || (k === 0 && p === 0)) { toast('Enter kcal / protein'); return null; }
  return { name, k, p };
}
function clearCustomFood() { $('cfName').value = ''; $('cfKcal').value = ''; $('cfProt').value = ''; }

$('cfLogOnce').addEventListener('click', () => {
  const f = readCustomFood();
  if (f) { logFood(f.name, f.k, f.p); clearCustomFood(); }
});
$('cfLogSave').addEventListener('click', () => {
  const f = readCustomFood();
  if (f) {
    state.favFoods.push({ id: uid(), name: f.name, k: f.k, p: f.p });
    logFood(f.name, f.k, f.p);
    clearCustomFood();
  }
});

/* ============================================================
   PROGRESS
   ============================================================ */
const METRIC_DEFS = [
  { key: 'weight', name: 'Weight', unit: 'kg', goalKey: 'goalWeight' },
  { key: 'muscle', name: 'Muscle Mass', unit: 'kg', goalKey: 'goalMuscle' },
  { key: 'fat', name: 'Body Fat', unit: '%', goalKey: 'goalFat' },
];

function renderProgress() {
  $('metricCards').innerHTML = METRIC_DEFS.map(m => {
    const arr = state.metrics[m.key];
    const goal = state.targets[m.goalKey];
    if (!arr.length) {
      return `<div class="card"><div class="metric-head"><div>
        <div class="metric-name">${m.name}</div><div class="metric-val">—</div>
        <div class="metric-delta flat">No entries yet · goal ${goal}${m.unit}</div>
        </div></div><div class="empty">Log your first weekly entry below.</div></div>`;
    }
    const first = arr[0].v, cur = arr[arr.length - 1].v;
    const delta = Math.round((cur - first) * 10) / 10;
    const towardGoal = (goal - first === 0) ? true : Math.sign(goal - first) === Math.sign(delta || (goal - first));
    const deltaCls = delta === 0 ? 'flat' : (towardGoal ? 'good' : 'bad');
    const deltaTxt = (delta > 0 ? '+' : '') + delta + m.unit + ' since start';
    let pct = 100;
    if (goal !== first) pct = Math.max(0, Math.min(100, ((cur - first) / (goal - first)) * 100));
    return `<div class="card">
      <div class="metric-head">
        <div><div class="metric-name">${m.name}</div>
          <div class="metric-val">${fmtW(cur)}<small>${m.unit}</small></div>
          <div class="metric-delta ${deltaCls}">${deltaTxt}</div></div>
        <div style="text-align:right"><div class="metric-name">Goal ${goal}${m.unit}</div>
          <div class="metric-val" style="font-size:24px">${Math.round(pct)}<small>%</small></div></div>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="goal-line"><span>start ${fmtW(first)}${m.unit}</span><span>goal ${goal}${m.unit}</span></div>
      ${sparkline(arr.map(x => x.v))}
    </div>`;
  }).join('');

  renderStrength();
}

$('saveMetrics').addEventListener('click', () => {
  const tk = todayKey();
  let saved = 0;
  const fields = [['inWeight', 'weight'], ['inMuscle', 'muscle'], ['inFat', 'fat']];
  for (const [inputId, key] of fields) {
    const raw = $(inputId).value;
    if (raw === '') continue;
    const v = Math.round(parseFloat(raw) * 10) / 10;
    if (!(v > 0)) continue;
    const arr = state.metrics[key];
    const existing = arr.find(x => x.d === tk);
    if (existing) existing.v = v; else { arr.push({ d: tk, v }); arr.sort((a, b) => a.d < b.d ? -1 : 1); }
    saved++;
    $(inputId).value = '';
  }
  if (saved) { save(); toast('Entry saved'); renderProgress(); }
  else toast('Enter at least one value');
});

function renderStrength() {
  const exWithHistory = [...new Set(state.sets.map(s => s.ex))].filter(id => EX_BY_ID[id]);
  if (!exWithHistory.length) {
    $('strengthCard').innerHTML = '<div class="empty">Log some sets first — your top-set trend will show here.</div>';
    return;
  }
  if (!exWithHistory.includes(state.strengthEx)) state.strengthEx = exWithHistory[0];
  const options = exWithHistory.map(id => `<option value="${id}" ${id === state.strengthEx ? 'selected' : ''}>${esc(EX_BY_ID[id].n)}</option>`).join('');

  // per-day top set weight for the chosen exercise
  const byDay = {};
  for (const s of state.sets) {
    if (s.ex !== state.strengthEx) continue;
    if (!byDay[s.d] || s.w > byDay[s.d]) byDay[s.d] = s.w;
  }
  const days = Object.keys(byDay).sort();
  const seriesVals = days.map(d => byDay[d]);
  const first = seriesVals[0], cur = seriesVals[seriesVals.length - 1];
  const delta = Math.round((cur - first) * 10) / 10;

  $('strengthCard').innerHTML = `
    <select id="strengthSel" style="margin-bottom:10px">${options}</select>
    <div class="metric-head"><div>
      <div class="metric-name">Top Set</div>
      <div class="metric-val">${fmtW(cur)}<small>kg</small></div>
      <div class="metric-delta ${delta > 0 ? 'good' : delta < 0 ? 'bad' : 'flat'}">${delta > 0 ? '+' : ''}${delta}kg over ${days.length} session${days.length === 1 ? '' : 's'}</div>
    </div></div>
    ${sparkline(seriesVals)}`;
  $('strengthSel').addEventListener('change', e => {
    state.strengthEx = e.target.value;
    save(); renderStrength();
  });
}

/* ============================================================
   PLAN
   ============================================================ */
let planDay = mondayIndex(new Date());

function renderPlan() {
  const todayIdx = mondayIndex(new Date());
  $('dayChips').innerHTML = DAY_SHORT.map((d, i) =>
    `<div class="day-chip ${i === planDay ? 'active' : ''} ${i === todayIdx ? 'today-dot' : ''}" data-day="${i}">${d}</div>`).join('');
  $('dayChips').querySelectorAll('.day-chip').forEach(c => c.addEventListener('click', () => {
    planDay = +c.dataset.day; renderPlan();
  }));

  const day = state.plan[planDay];
  let html = '';
  for (const sess of ['am', 'pm']) {
    const label = sess === 'am' ? 'Morning' : 'Afternoon';
    const rows = day[sess].map((id, i) => {
      const ex = EX_BY_ID[id];
      return `<div class="plan-ex">
        <div><div class="pname">${esc(ex.n)}</div><div class="pmeta">${esc(ex.g)} · ${esc(ex.e)}</div></div>
        <button class="icon-x" data-rm="${sess}:${i}" aria-label="Remove">✕</button></div>`;
    }).join('');
    html += `<div class="card">
      <div class="sess-head" style="margin-bottom:10px"><span class="sess-tag">${DAY_NAMES[planDay]} — ${label}</span><span class="sess-count">${day[sess].length}</span></div>
      ${rows || '<div class="empty">Empty slot</div>'}
      <button class="btn small ghost" data-addto="${sess}" style="margin-top:6px">+ Add Exercise</button></div>`;
  }
  $('planDay').innerHTML = html;

  $('planDay').querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
    const [sess, i] = b.dataset.rm.split(':');
    state.plan[planDay][sess].splice(+i, 1);
    save(); renderPlan();
  }));
  $('planDay').querySelectorAll('[data-addto]').forEach(b => b.addEventListener('click', () => {
    openLibrary(exId => {
      state.plan[planDay][b.dataset.addto].push(exId);
      save(); renderPlan();
      toast(`Added ${EX_BY_ID[exId].n}`);
    });
  }));

  // targets
  $('tKcal').value = state.targets.kcal;
  $('tProt').value = state.targets.protein;
  $('tWeight').value = state.targets.goalWeight;
  $('tMuscle').value = state.targets.goalMuscle;
  $('tFat').value = state.targets.goalFat;
}

$('saveTargets').addEventListener('click', () => {
  const fields = [['tKcal', 'kcal', 1], ['tProt', 'protein', 1], ['tWeight', 'goalWeight', 10], ['tMuscle', 'goalMuscle', 10], ['tFat', 'goalFat', 10]];
  for (const [id, key, prec] of fields) {
    const v = Math.round(parseFloat($(id).value) * prec) / prec;
    if (v > 0) state.targets[key] = v;
  }
  save();
  toast('Targets saved');
  renderPlan();
});

/* ---------- Export / Import / Reset ---------- */
$('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ad-training-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast('Backup exported');
});

$('btnImport').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || data.v !== 1 || !Array.isArray(data.sets) || !data.targets) throw new Error('bad shape');
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      state = loadState();
      save();
      toast('Backup restored ✓');
      renderAll();
    } catch (err) {
      console.error(err);
      toast('Import failed — not a valid AD Training backup');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

$('btnReset').addEventListener('click', () => {
  if (!confirm('Delete ALL data — plan, history, food logs, metrics? This cannot be undone.')) return;
  state = defaultState();
  save();
  toast('All data reset');
  renderAll();
});

/* ============================================================
   Exercise Library (browser + picker)
   ============================================================ */
let libPick = null;   // callback(exId) when in picker mode
let libGroup = 'All';

function openLibrary(pickCb) {
  libPick = pickCb || null;
  $('libTitle').textContent = libPick ? 'Add Exercise' : 'Exercise Library';
  $('libSearch').value = '';
  libGroup = 'All';
  $('libModal').classList.add('open');
  renderLibrary();
}
function closeLibrary() { $('libModal').classList.remove('open'); libPick = null; }

$('openLibrary').addEventListener('click', () => openLibrary(null));
$('libClose').addEventListener('click', closeLibrary);
$('libModal').addEventListener('click', e => { if (e.target === $('libModal')) closeLibrary(); });
$('libSearch').addEventListener('input', renderLibrary);

function renderLibrary() {
  const groups = ['All', ...MUSCLE_GROUPS];
  $('libChips').innerHTML = groups.map(g => `<div class="chip ${g === libGroup ? 'active' : ''}" data-g="${g}">${g}</div>`).join('');
  $('libChips').querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    libGroup = c.dataset.g; renderLibrary();
  }));

  const q = $('libSearch').value.trim().toLowerCase();
  const list = EXERCISES.filter(ex =>
    (libGroup === 'All' || ex.g === libGroup) &&
    (!q || ex.n.toLowerCase().includes(q) || ex.g.toLowerCase().includes(q) || ex.e.toLowerCase().includes(q)));

  $('libList').innerHTML = list.length ? list.map(ex => `
    <div class="lib-item" data-ex="${ex.i}">
      <div><div class="lname">${esc(ex.n)}</div>
        <div class="ltags"><span class="tag red">${esc(ex.g)}</span><span class="tag">${esc(ex.e)}</span><span class="tag">${ex.r}s</span></div>
        <div class="lcue">${esc(ex.c)}</div></div>
      ${libPick ? '<div class="add-mark">+</div>' : ''}
    </div>`).join('') : '<div class="empty">No exercises match.</div>';

  $('libList').querySelectorAll('.lib-item').forEach(item => item.addEventListener('click', () => {
    if (libPick) { libPick(item.dataset.ex); closeLibrary(); }
  }));
}

/* ============================================================
   Boot
   ============================================================ */
function renderHeaderDate() {
  const now = new Date();
  $('headerDate').textContent = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

let lastDay = todayKey();
setInterval(() => {
  // day rollover: refresh everything at midnight
  if (todayKey() !== lastDay) {
    lastDay = todayKey();
    planDay = mondayIndex(new Date());
    renderHeaderDate();
    renderAll();
  }
}, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && todayKey() !== lastDay) {
    lastDay = todayKey();
    renderHeaderDate();
    renderAll();
  }
});

renderHeaderDate();
renderToday();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e)));
}
