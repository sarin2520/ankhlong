/* อ่านคล่อง — แอปฝึกอ่านภาษาไทยสำหรับปุณและเปญ่า */
'use strict';

// ---------------------------------------------------------------- config
const STORE_KEY = 'ankhlong-v1';
const APP_VERSION = '1.0.6';
const XP_PER_STEP = 10;
const XP_LESSON_BONUS = 20;
const XP_REPLAY_BONUS = 10;

const ANIMALS = [
  { id: 'tiger', e: '🐯', name: 'เสือ' },
  { id: 'fox', e: '🦊', name: 'จิ้งจอก' },
  { id: 'panda', e: '🐼', name: 'แพนด้า' },
  { id: 'frog', e: '🐸', name: 'กบ' },
  { id: 'octo', e: '🐙', name: 'ปลาหมึก' },
  { id: 'owl', e: '🦉', name: 'นกฮูก' },
  { id: 'koala', e: '🐨', name: 'โคอาลา' },
  { id: 'dino', e: '🦖', name: 'ไดโนเสาร์' },
  { id: 'dragon', e: '🐉', name: 'มังกร', team: 10 },
];
const COLORS = [
  { id: 'blue', c: '#3f8fd9' }, { id: 'pink', c: '#e8618c' }, { id: 'green', c: '#2fb27a' },
  { id: 'purple', c: '#8a5ad6' }, { id: 'orange', c: '#f08a24' }, { id: 'navy', c: '#2c3a6e' },
  { id: 'rainbow', c: 'rainbow', team: 20 },
];
const ACCS = [
  { id: 'none', e: '✖️', name: 'ไม่ใส่', pos: '' },
  { id: 'cap', e: '🧢', name: 'หมวกแก๊ป', pos: 'top' },
  { id: 'phones', e: '🎧', name: 'หูฟัง', pos: 'top', level: 2 },
  { id: 'shades', e: '🕶️', name: 'แว่นกันแดด', pos: 'eyes', level: 3 },
  { id: 'bow', e: '🎀', name: 'โบว์', pos: 'top', level: 4 },
  { id: 'tophat', e: '🎩', name: 'หมวกทรงสูง', pos: 'top', level: 5 },
  { id: 'ball', e: '⚽', name: 'ลูกบอล', pos: 'side', level: 6 },
  { id: 'star', e: '🌟', name: 'ดาวทีม', pos: 'side', team: 32 },
  { id: 'crown', e: '👑', name: 'มงกุฎ', pos: 'top', unlock: 'mascot-crown' },
];
const TEAM_GOALS = [
  { n: 10, e: '🐉', name: 'มาสคอตมังกร' },
  { n: 20, e: '🌈', name: 'สีรุ้ง' },
  { n: 32, e: '🌟', name: 'ดาวทีม' },
  { n: 48, e: '🏅', name: 'ทีมนักอ่านตัวจริง' },
];
const STICKERS = {
  'tiger-boat': '🐯⛵', 'candle-star': '🕯️⭐', 'lotus-cow': '🪷🐄', 'leaf-heart': '🍃❤️',
  'forest-egg': '🌳🥚', 'elephant-water': '🐘💧', 'news-dog': '📰🐶', 'noodle-bear': '🍜🐻',
  'monkey-orange': '🐒🍊', 'frog-bird': '🐸🐦', 'car-photo': '🚗📷', 'moon-phone': '🌙📱',
  'fish-brush': '🐟🪥', 'sleepy-mouse': '😴🐭', 'four-friends': '🧑‍🤝‍🧑🧑‍🤝‍🧑', 'scissor-leaf': '✂️🍃',
  'black-cat': '🐈‍⬛', 'bike-kid': '🚲🧒', 'rain-cloud': '🌧️☂️', 'detective': '🕵️🔍',
  'orange-cat': '🐱🧡', 'sand-castle': '🏰🏖️', 'elephant-bird': '🐘🐦', 'gold-trophy': '🏆✨',
};
const PRAISE = ['ถูกต้อง! เก่งมาก', 'เยี่ยมไปเลย!', 'อ่านได้คล่องมาก!', 'ใช่แล้ว!', 'สุดยอด!', 'แม่นมาก!'];
const RETRY = ['เกือบแล้ว! ลองอีกครั้งนะ', 'ไม่เป็นไร ลองใหม่ได้เลย', 'ลองฟังอีกทีแล้วเลือกใหม่นะ', 'ใกล้แล้ว! อีกนิดเดียว'];

// ---------------------------------------------------------------- state
let DATA = null;
let FLAT = [];      // [{lesson, unit, ui, li}]
let S = null;       // saved state
let CUR = null;     // current profile id
let TAB = 'path';
let RUN = null;     // running lesson / test

function newProfile(name, age, color) {
  return { name, age, mascot: null, defColor: color, xp: 0, completed: {}, testedOut: {}, stickers: [], unlocks: [], placement: null };
}
function defaults() {
  return {
    profiles: { pun: newProfile('ปุณ', 12, 'blue'), pena: newProfile('เปญ่า', 9, 'pink') },
    order: ['pun', 'pena'],
    settings: { rate: 0.85 },
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw), d = defaults();
      for (const id of d.order) s.profiles[id] = Object.assign(d.profiles[id], s.profiles[id] || {});
      s.order = d.order; s.settings = Object.assign(d.settings, s.settings || {});
      return s;
    }
  } catch (e) { /* ignore */ }
  return defaults();
}
const LAST = {};
const bodyOf = p => { const { updatedAt, ...rest } = p; return JSON.stringify(rest); };
function save() {
  // stamp each child's record when it changes, so the newest copy wins across devices
  for (const id of S.order) {
    const b = bodyOf(S.profiles[id]);
    if (LAST[id] !== undefined && LAST[id] !== b) S.profiles[id].updatedAt = Date.now();
    LAST[id] = b;
  }
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  cloudPush();
}

// ---------------------------------------------------------------- cloud sync (hosted version)
// When the app runs as a hosted page on claude.ai, each child's progress is also kept
// online (one document per child), so the iPad and the Mac see the same progress.
// Running locally there is no cloud and the app simply uses this browser's storage.
const CLOUD = { db: null, sent: {}, timer: null };
const cloudParts = () => {
  const parts = {};
  for (const id of S.order) parts[id] = S.profiles[id];
  parts.settings = S.settings;
  return parts;
};
function cloudPush() {
  if (!CLOUD.db) return;
  clearTimeout(CLOUD.timer);
  CLOUD.timer = setTimeout(async () => {
    const parts = cloudParts();
    for (const [key, val] of Object.entries(parts)) {
      const json = JSON.stringify(val);
      if (CLOUD.sent[key] === json) continue;
      try {
        await CLOUD.db.doc('progress/' + key).set(Object.assign(JSON.parse(json), { savedAt: Date.now() }));
        CLOUD.sent[key] = json;
      } catch (e) { /* offline or not allowed: browser storage still has it */ }
    }
  }, 800);
}
async function cloudConnect() {
  try {
    if (!window.claude || !window.claude.use) return;
    const db = await window.claude.use('db');
    if (!db) return;
    const keys = [...S.order, 'settings'];
    const snaps = await Promise.all(keys.map(k => db.doc('progress/' + k).get()));
    let changed = false;
    keys.forEach((k, n) => {
      const snap = snaps[n];
      if (!snap.exists) return;
      const remote = snap.data(); delete remote.savedAt;
      if (k === 'settings') { S.settings = Object.assign(S.settings, remote); }
      else {
        const local = S.profiles[k];
        // keep whichever copy was changed most recently
        if ((remote.updatedAt || 0) >= (local.updatedAt || 0)) S.profiles[k] = Object.assign(newProfile(local.name, local.age, local.defColor), remote);
        LAST[k] = bodyOf(S.profiles[k]);
      }
      CLOUD.sent[k] = JSON.stringify(k === 'settings' ? S.settings : S.profiles[k]);
      changed = true;
    });
    CLOUD.db = db;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
    cloudPush();
    if (changed && !RUN) render();
  } catch (e) { /* stay on browser storage */ }
}
const P = () => S.profiles[CUR];

// ---------------------------------------------------------------- helpers
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2400);
}
function levelInfo(xp) {
  let lvl = 1, base = 0, need = 60;
  while (xp >= base + need) { base += need; lvl++; need = 60 + (lvl - 1) * 30; }
  return { lvl, into: xp - base, need };
}
const GSEG = (window.Intl && Intl.Segmenter) ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
function firstGlyph(s) { return GSEG ? [...GSEG.segment(s)][0].segment : '⭐'; }
function teamCount() { return S.order.reduce((n, id) => n + Object.keys(S.profiles[id].completed).length, 0); }
function nextGoal(n) { return TEAM_GOALS.find(g => n < g.n) || null; }

// ---------------------------------------------------------------- speech
const TTS = { voice: null, ready: false, has: !!window.speechSynthesis };
function pickVoice() {
  if (!TTS.has) return;
  const vs = speechSynthesis.getVoices();
  const th = vs.filter(v => /^th/i.test(v.lang));
  TTS.voice = th.find(v => /kanya|premium|enhanced/i.test(v.name)) || th[0] || null;
  TTS.ready = vs.length > 0;
}
if (TTS.has) { pickVoice(); speechSynthesis.onvoiceschanged = () => { pickVoice(); if (!RUN && CUR === null) render(); }; }
function speak(text, opts = {}) {
  if (!TTS.has || !text) return Promise.resolve();
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(String(text).replace(/_{2,}/g, ' … '));
    u.lang = 'th-TH';
    if (TTS.voice) u.voice = TTS.voice;
    u.rate = (opts.slow ? 0.55 : S.settings.rate);
    u.onend = u.onerror = () => res();
    // iPad Safari only allows speech started directly from a tap, so speak right away
    // when nothing is playing; after cancel() Safari needs a short tick.
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
      setTimeout(() => speechSynthesis.speak(u), 40);
    } else {
      speechSynthesis.speak(u);
    }
  });
}
// iPad: unlock speech on the very first touch so later auto-play (e.g. listen exercises) works
function unlockSpeech() {
  document.removeEventListener('touchend', unlockSpeech, true);
  document.removeEventListener('click', unlockSpeech, true);
  if (!TTS.has) return;
  pickVoice();
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0; u.lang = 'th-TH';
  speechSynthesis.speak(u);
}
document.addEventListener('touchend', unlockSpeech, true);
document.addEventListener('click', unlockSpeech, true);

// Thai word segmentation — every word becomes tappable
const SEG = (window.Intl && Intl.Segmenter) ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function tapWords(text) {
  if (!SEG) return String(text).split(/(\s+)/).map(p => /\S/.test(p) ? `<span class="w" data-say="${esc(p)}">${esc(p)}</span>` : esc(p)).join('');
  let out = '';
  for (const s of SEG.segment(text)) {
    out += s.isWordLike ? `<span class="w" data-say="${esc(s.segment)}">${esc(s.segment)}</span>` : esc(s.segment);
  }
  return out;
}
function sayBtn(text, cls = '') { return `<button class="say ${cls}" data-say="${esc(text)}" ${cls.includes('slow') ? 'data-slow="1"' : ''} aria-label="ฟังเสียง">${cls.includes('slow') ? '🐢' : '🔊'}</button>`; }

// global: anything with data-say speaks when tapped
document.addEventListener('click', e => {
  const el = e.target.closest('[data-say]');
  if (!el || el.disabled) return;
  if (el.dataset.nosay) return;
  speak(el.dataset.say, { slow: !!el.dataset.slow });
  if (el.classList.contains('wcard')) el.classList.add('heard');
  if (el.classList.contains('w')) { el.classList.add('hi'); setTimeout(() => el.classList.remove('hi'), 700); }
});

// ---------------------------------------------------------------- mascot
function mascotHTML(m, size = 88, extra = '') {
  m = m || { animal: 'tiger', color: 'blue', acc: 'none' };
  const a = ANIMALS.find(x => x.id === m.animal) || ANIMALS[0];
  const col = COLORS.find(x => x.id === m.color) || COLORS[0];
  const acc = ACCS.find(x => x.id === m.acc);
  const bg = col.c === 'rainbow' ? '' : `--c:${col.c};`;
  return `<span class="mascot ${col.c === 'rainbow' ? 'rainbow' : ''} ${extra}" style="--s:${size}px;${bg}">
    <span class="an">${a.e}</span>${acc && acc.pos ? `<span class="acc ${acc.pos}">${acc.e}</span>` : ''}</span>`;
}
function itemLocked(p, it) {
  if (it.team && teamCount() < it.team) return `ทีมครบ ${it.team} บท`;
  if (it.level && levelInfo(p.xp).lvl < it.level) return `เลเวล ${it.level}`;
  if (it.unlock && !p.unlocks.includes(it.unlock)) return 'ผ่านบทบอส';
  return '';
}

// ---------------------------------------------------------------- lesson access
function lessonState(p, idx) {
  const L = FLAT[idx].lesson;
  if (p.completed[L.id]) return 'done';
  if (p.testedOut[L.id]) return 'skip';
  if (idx === 0) return 'cur';
  const prev = FLAT[idx - 1].lesson.id;
  return (p.completed[prev] || p.testedOut[prev]) ? 'cur' : 'locked';
}

// ================================================================ RENDER
function render() {
  RUN = null;
  const app = $('#app');
  if (CUR === null) { app.innerHTML = pickerHTML(); window.scrollTo(0, 0); return; }
  const p = P();
  if (!p.mascot) { app.innerHTML = setupHTML(); return; }
  if (p.placement === null) { app.innerHTML = placementAskHTML(); return; }
  app.innerHTML = homeHTML();
  if (TAB === 'path') {
    const cur = $('.node.cur');
    if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  }
}

// ---------------------------------------------------------------- picker
function pickerHTML() {
  const noVoice = TTS.has && TTS.ready && !TTS.voice;
  return `<div class="picker">
    <div class="brandline"><div class="logo">อ่าน<span>คล่อง</span></div>
      <button class="iconbtn" data-on="openSettings" aria-label="ตั้งค่าสำหรับผู้ปกครอง">⚙️</button></div>
    ${!TTS.has ? `<div class="banner">เบราว์เซอร์นี้อ่านออกเสียงไม่ได้ ลองเปิดด้วย Safari หรือ Chrome นะ</div>` : ''}
    ${noVoice ? `<div class="banner">เครื่องนี้ยังไม่มีเสียงภาษาไทย ผู้ปกครองเพิ่มได้ที่ การตั้งค่า › การช่วยการเข้าถึง › เนื้อหาที่พูด › เสียง › ไทย</div>` : ''}
    <div class="who">ใครจะเรียนวันนี้?</div>
    <div class="profiles">
      ${S.order.map(id => {
        const p = S.profiles[id]; const lv = levelInfo(p.xp);
        const m = p.mascot || { animal: id === 'pun' ? 'tiger' : 'fox', color: p.defColor, acc: 'none' };
        return `<button class="pcard ${id}" data-on="choose|${id}">
          ${mascotHTML(m, 104, 'bounce')}
          <div class="name">${esc(p.name)}</div>
          ${p.mascot ? `<div class="lv">เลเวล ${lv.lvl} · เรียนแล้ว ${Object.keys(p.completed).length} บท</div>` : `<div class="new">แตะเพื่อเริ่ม</div>`}
        </button>`;
      }).join('')}
    </div>
    ${teamHTML()}
    <p class="small muted" style="text-align:center;margin-top:18px">เวอร์ชัน ${APP_VERSION}</p>
  </div>`;
}
function teamHTML() {
  const n = teamCount(), g = nextGoal(n);
  const prevN = [...TEAM_GOALS].reverse().find(x => x.n <= n)?.n || 0;
  const pct = g ? ((n - prevN) / (g.n - prevN)) * 100 : 100;
  return `<div class="team">
    <div class="team-head">
      <div class="duo">${S.order.map(id => { const p = S.profiles[id]; return mascotHTML(p.mascot || { animal: id === 'pun' ? 'tiger' : 'fox', color: p.defColor }, 46); }).join('')}</div>
      <div class="t"><h3>เป้าหมายทีม</h3>
        <div class="small muted">${g ? `เรียนรวมกันอีก ${g.n - n} บท ได้ ${g.e} ${g.name} ทั้งสองคน` : 'ทีมเราปลดล็อกครบทุกรางวัลแล้ว!'}</div></div>
    </div>
    <div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div>
    <div class="small muted">ทั้งทีมเรียนจบแล้ว ${n} บท</div>
    <div class="miles">${TEAM_GOALS.map(t => `<div class="mile ${n >= t.n ? 'got' : ''}"><span class="e">${t.e}</span>${t.n} บท<br>${t.name}</div>`).join('')}</div>
  </div>`;
}
window.choose = id => { CUR = id; TAB = 'path'; render(); };

// ---------------------------------------------------------------- first-time mascot setup
let DRAFT = null;
function setupHTML() {
  const p = P();
  if (!DRAFT) DRAFT = { animal: CUR === 'pun' ? 'tiger' : 'fox', color: p.defColor, acc: 'none' };
  return `<div class="wrap">
    <div class="brandline"><button class="iconbtn" data-on="back">←</button><div></div></div>
    <h1>สวัสดี ${esc(p.name)}!</h1>
    <p class="muted">เลือกเพื่อนคู่หูที่จะเรียนไปด้วยกัน แต่งเพิ่มได้ทีหลังนะ</p>
    <div class="preview">${mascotHTML(DRAFT, 140, 'pop')}</div>
    ${customizerHTML(DRAFT, true)}
    <div style="margin-top:22px"><button class="btn block good" data-on="finishSetup">เลือกตัวนี้</button></div>
  </div>`;
}
window.finishSetup = () => { P().mascot = DRAFT; DRAFT = null; save(); render(); };

function customizerHTML(m, setup) {
  const p = P();
  const opt = (kind, it, inner) => {
    const lock = itemLocked(p, it);
    const on = m[kind] === it.id;
    return `<button class="opt ${on ? 'on' : ''} ${lock ? 'lock' : ''}" data-on="setPart|${kind}|${it.id}|${setup}" ${lock ? `data-lock="${esc(lock)}"` : ''}>
      ${inner}${lock ? `<span class="lk">🔒 ${esc(lock)}</span>` : ''}</button>`;
  };
  return `
    <div class="sec"><h3>ตัวละคร</h3><div class="grid">${ANIMALS.map(a => opt('animal', a, a.e)).join('')}</div></div>
    <div class="sec"><h3>สี</h3><div class="grid">${COLORS.map(c => opt('color', c, `<span class="swatch" style="background:${c.c === 'rainbow' ? 'linear-gradient(135deg,#ff6b6b,#ffc83d,#4cd38a,#4aa8ff,#a46bff)' : c.c}"></span>`)).join('')}</div></div>
    ${setup ? '' : `<div class="sec"><h3>ของแต่งตัว</h3><div class="grid">${ACCS.map(a => opt('acc', a, `<span style="font-size:${a.id === 'none' ? 22 : 36}px">${a.e}</span>`)).join('')}</div>
      <p class="small muted" style="margin:10px 0 0">เลเวลยิ่งสูง ยิ่งมีของให้แต่งเยอะขึ้น</p></div>`}`;
}
window.setPart = (kind, id, setup) => {
  const list = kind === 'animal' ? ANIMALS : kind === 'color' ? COLORS : ACCS;
  const it = list.find(x => x.id === id);
  const lock = itemLocked(P(), it);
  if (lock) { toast(`ยังล็อกอยู่ — ปลดล็อกเมื่อ${lock}`); return; }
  if (setup) { DRAFT[kind] = id; $('#app').innerHTML = setupHTML(); return; }
  P().mascot[kind] = id; save(); $('#app').innerHTML = homeHTML();
};

// ---------------------------------------------------------------- placement ask
function placementAskHTML() {
  const p = P();
  return `<div class="wrap">
    <div class="bubble-row" style="margin-top:30px">${mascotHTML(p.mascot, 96, 'bounce')}
      <div class="bubble">${tapWords(`${p.name} อยากเริ่มจากตรงไหนดี?`)}</div></div>
    <div class="sec">
      <h3>🚀 ทำแบบทดสอบวัดระดับ</h3>
      <p class="muted small" style="margin:0 0 14px">สำหรับคนที่อ่านคล่องแล้ว ตอบคำถามสั้นๆ ทีละหน่วย ถ้าทำได้ จะข้ามหน่วยนั้นไปได้เลย (กลับมาเล่นทีหลังได้เสมอ)</p>
      <button class="btn block" data-on="startTest">ทำแบบทดสอบ</button>
    </div>
    <div class="sec">
      <h3>🌱 เริ่มจากบทแรก</h3>
      <p class="muted small" style="margin:0 0 14px">ค่อยๆ เรียนไปทีละบท บทละประมาณ 5 นาที</p>
      <button class="btn block ghost" data-on="skipTest">เริ่มจากบทแรก</button>
    </div>
  </div>`;
}
window.skipTest = () => { P().placement = 0; save(); render(); };
window.back = () => { CUR = null; DRAFT = null; render(); };

// ---------------------------------------------------------------- home
function homeHTML() {
  const p = P(), lv = levelInfo(p.xp);
  const body = TAB === 'path' ? pathHTML() : TAB === 'me' ? meHTML() : TAB === 'stk' ? stickersHTML() : `<div style="padding-top:4px">${teamHTML()}</div>`;
  return `
  <div class="topbar"><div class="topbar-in">
    <button class="iconbtn" data-on="back" aria-label="เปลี่ยนคน">←</button>
    ${mascotHTML(p.mascot, 52)}
    <div class="info"><div class="nm">${esc(p.name)} <span class="lvbadge">เลเวล ${lv.lvl}</span></div>
      <div class="bar xp"><i style="width:${(lv.into / lv.need) * 100}%"></i></div>
      <div class="xpt">${lv.into} / ${lv.need} XP ถึงเลเวลถัดไป</div></div>
  </div></div>
  <div class="wrap">${body}</div>
  <nav class="tabs">
    ${[['path', '🗺️', 'บทเรียน'], ['me', '🎨', 'มาสคอต'], ['stk', '⭐', 'สติกเกอร์'], ['team', '🤝', 'ทีม']]
      .map(([k, e, t]) => `<button class="${TAB === k ? 'on' : ''}" data-on="setTab|${k}"><b>${e}</b>${t}</button>`).join('')}
  </nav>`;
}
window.setTab = t => { TAB = t; $('#app').innerHTML = homeHTML(); window.scrollTo(0, 0); };

function pathHTML() {
  const p = P();
  let idx = 0;
  return DATA.units.map((u, ui) => `
    <div class="unit u${ui + 1}">
      <div class="unit-head"><div class="k">หน่วยที่ ${ui + 1}</div><h2>${esc(u.title)}</h2><p>${esc(u.goal)}</p></div>
      <div class="nodes">${u.lessons.map(l => {
        const i = idx++, st = lessonState(p, i);
        const icon = st === 'done' ? firstGlyph(STICKERS[l.reward?.sticker] || '⭐')
          : st === 'skip' ? '⏭' : st === 'locked' ? '🔒' : l.isBoss ? '👑' : '▶';
        const sub = st === 'done' ? 'เรียนแล้ว · เล่นซ้ำได้' : st === 'skip' ? 'ข้ามจากแบบทดสอบ · เล่นได้' : st === 'cur' ? (l.isBoss ? 'บทบอส!' : 'เริ่มเลย') : 'ยังล็อกอยู่';
        return `<button class="node ${st} ${l.isBoss ? 'boss' : ''}" data-on="openLesson|${i}">
          <span class="dot">${icon}</span><span class="lab"><b>${esc(l.title)}</b><span>${sub}</span></span></button>`;
      }).join('')}</div>
    </div>`).join('') + `<div style="text-align:center;margin-top:26px"><button class="btn ghost" data-on="startTest">🚀 ทำแบบทดสอบวัดระดับ</button></div>`;
}
window.openLesson = i => {
  if (lessonState(P(), i) === 'locked') { toast('เรียนบทก่อนหน้าให้จบก่อนนะ แล้วบทนี้จะเปิด'); return; }
  startLesson(i);
};

function meHTML() {
  const p = P();
  return `<div class="preview">${mascotHTML(p.mascot, 150, 'bounce')}<div class="muted small">คู่หูของ ${esc(p.name)}</div></div>${customizerHTML(p.mascot, false)}`;
}
function stickersHTML() {
  const p = P(), n = teamCount();
  return `<div class="sec"><h3>สมุดสติกเกอร์ (${p.stickers.length}/${FLAT.length})</h3>
    <div class="stickers">${FLAT.map(f => {
      const id = f.lesson.reward?.sticker, has = p.stickers.includes(id);
      return `<div class="stk ${has ? 'yes' : 'no'}"><span class="e">${STICKERS[id] || '⭐'}</span>${has ? esc(f.lesson.title) : 'ยังไม่ได้'}</div>`;
    }).join('')}</div></div>
    <div class="sec"><h3>รางวัลทีม</h3><div class="stickers">${TEAM_GOALS.map(t => `<div class="stk ${n >= t.n ? 'yes' : 'no'}"><span class="e">${t.e}</span>${t.name}<br>ทีมครบ ${t.n} บท</div>`).join('')}</div></div>`;
}

// ================================================================ LESSON ENGINE
function buildSteps(lesson) {
  const steps = [{ kind: 'intro' }];
  const words = lesson.words || [];
  // warm-up from the lesson's own words (keeps each lesson ~5 minutes)
  if (words.length >= 3) {
    const used = new Set(lesson.exercises.map(e => e.answer).filter(a => typeof a === 'string'));
    const pool = shuffle(words.filter(w => !used.has(w.word) && !used.has(w.emoji)));
    const w1 = pool[0] || pick(words);
    steps.push({ kind: 'choice', type: 'listen-pick', gen: true, ex: { answer: w1.word, choices: [w1.word, ...shuffle(words.filter(w => w !== w1)).slice(0, 2).map(w => w.word)] } });
    const w2 = pool.find(w => w !== w1) || pick(words.filter(w => w !== w1));
    const emo = [...new Set(words.map(w => w.emoji))];
    if (emo.length >= 3) steps.push({ kind: 'choice', type: 'read-pick-picture', gen: true, ex: { text: w2.word, answer: w2.emoji, choices: [w2.emoji, ...shuffle(emo.filter(e => e !== w2.emoji)).slice(0, 2)] } });
  }
  for (const ex of lesson.exercises) {
    if (ex.type === 'story') {
      steps.push({ kind: 'story', ex });
      ex.questions.forEach((q, qi) => steps.push({ kind: 'choice', type: 'story-q', ex: q, story: ex, qi }));
    } else if (ex.type === 'order-words') {
      steps.push({ kind: 'order', type: ex.type, ex });
    } else {
      steps.push({ kind: 'choice', type: ex.type, ex });
    }
  }
  steps.forEach(s => { if (s.kind === 'choice') s.choices = shuffle(s.ex.choices); });
  return steps;
}

function startLesson(i) {
  const f = FLAT[i];
  RUN = { mode: 'lesson', idx: i, lesson: f.lesson, unit: f.unit, steps: buildSteps(f.lesson), i: 0, xp: 0, firstTry: 0, graded: 0 };
  showStep();
}
function quitRun() {
  modal(`<h3>ออกจากบทเรียน?</h3><p class="muted">ถ้าออกตอนนี้ บทนี้ต้องเริ่มใหม่นะ</p>
    <div class="row"><button class="btn ghost" data-on="closeModal">เรียนต่อ</button><button class="btn warm" data-on="quitNow">ออก</button></div>`);
}
window.quitRun = quitRun;

function shell(stageHTML, footHTML, footCls = '') {
  const pct = RUN.mode === 'test' ? (RUN.i / RUN.steps.length) * 100 : (RUN.i / RUN.steps.length) * 100;
  $('#app').innerHTML = `<div class="lesson">
    <div class="lbar"><button class="iconbtn" data-on="quitRun" aria-label="ออก">✕</button>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${RUN.mode === 'test' ? `<span class="small muted">หน่วย ${RUN.unitNo}</span>` : ''}</div>
    <div class="stage">${stageHTML}</div>
    <div class="foot ${footCls}" id="foot"><div class="foot-in">${footHTML}</div></div>
  </div>`;
  window.scrollTo(0, 0);
}
function setFoot(html, cls = '') {
  const f = $('#foot'); f.className = 'foot ' + cls; f.innerHTML = `<div class="foot-in">${html}</div>`;
}

function showStep() {
  const st = RUN.steps[RUN.i];
  if (!st) { return RUN.mode === 'test' ? finishTestUnit() : finishLesson(); }
  st.sel = null; st.out = st.out || new Set();
  if (st.kind === 'intro') return showIntro();
  if (st.kind === 'story') return showStory(st);
  if (st.kind === 'order') return showOrder(st);
  return showChoice(st);
}
function next() { RUN.i++; showStep(); }
window.next = next;

// ---------------------------------------------------------------- intro
function showIntro() {
  const L = RUN.lesson, p = P();
  const words = L.words || [];
  const intro = L.mascotIntro || L.title;
  shell(`
    ${L.isBoss ? '<span class="tag">👑 บทบอส</span>' : ''}
    <h2 style="font-size:24px">${esc(L.title)}</h2>
    <div class="bubble-row">${mascotHTML(p.mascot, 80, 'bounce')}
      <div class="bubble">${tapWords(intro)} ${sayBtn(intro)}</div></div>
    ${words.length ? `<p class="muted small" style="margin:0 0 10px">แตะการ์ดเพื่อฟังเสียงคำใหม่ในบทนี้</p>
      <div class="wcards">${words.map((w, k) => `<button class="wcard" data-say="${esc(w.word)}" ><span class="e">${w.emoji}</span><span class="t">${esc(w.word)}</span></button>`).join('')}</div>`
      : `<p class="muted">บทนี้อ่านเป็นประโยค แตะคำไหนก็ได้ หรือกด 🔊 เพื่อฟังทั้งประโยค</p>`}
  `, `<button class="btn block good" data-on="next">เริ่มเลย</button>`);
  setTimeout(() => speak(intro), 250);
}

// ---------------------------------------------------------------- choice exercises
function promptHTML(st) {
  const ex = st.ex;
  switch (st.type) {
    case 'listen-pick':
      return `<div class="ask">ฟังเสียง แล้วแตะคำที่ได้ยิน</div>
        <div class="bigsay">${sayBtn(ex.answer)}${sayBtn(ex.answer, 'slow')}</div>`;
    case 'read-pick-picture':
      return `<div class="ask">อ่านแล้วแตะภาพที่ตรงกัน</div>
        <div class="readcard big"><div class="txt">${tapWords(ex.text)}</div>${sayBtn(ex.text)}</div>`;
    case 'fill-blank': {
      const parts = ex.sentence.split(/_{2,}/);
      const fill = st.done ? `<span class="blank ok">${esc(ex.answer)}</span>` : `<span class="blank" id="blank">${st.sel ? esc(st.sel) : '&nbsp;'}</span>`;
      return `<div class="ask">เลือกคำมาเติมในช่องว่าง</div>
        <div class="readcard"><div class="txt">${parts.map(tapWords).join(fill)}</div>${sayBtn(st.done ? ex.sentence.replace(/_{2,}/, ex.answer) : ex.sentence)}</div>`;
    }
    case 'same-sound':
      return `<div class="ask">เลือกคำที่เสียงหรือรูปแบบเหมือนกัน</div>
        <div class="readcard"><div class="txt" style="font-size:24px">${tapWords(ex.prompt)}</div>${sayBtn(ex.prompt)}</div>`;
    case 'read-answer':
      return `<div class="ask">อ่านคำถาม แล้วเลือกคำตอบ</div>
        <div class="readcard"><div class="txt">${tapWords(ex.question)}</div>${sayBtn(ex.question)}</div>`;
    case 'story-q': {
      const open = RUN.storyOpen !== false;
      return `<span class="tag">คำถามข้อ ${st.qi + 1} จาก ${st.story.questions.length}</span>
        <button class="toggle" data-on="toggleStory">${open ? '▾ ซ่อนเรื่อง' : '▸ ดูเรื่องอีกครั้ง'}</button>
        ${open ? `<div class="story mini">${st.story.sentences.map(s => `<div class="sline">${sayBtn(s)}<div>${tapWords(s)}</div></div>`).join('')}</div>` : ''}
        <div class="readcard"><div class="txt">${tapWords(ex.question)}</div>${sayBtn(ex.question)}</div>`;
    }
  }
  return '';
}
function choicesHTML(st) {
  const pics = st.type === 'read-pick-picture';
  const silent = st.type === 'listen-pick' || pics; // don't give away listen answers
  return `<div class="choices ${pics ? 'pics' : ''}">${st.choices.map((c, k) => {
    const cls = [st.done && c === st.ex.answer ? 'ok' : '', st.done && c !== st.ex.answer ? 'dim' : '',
      !st.done && st.sel === c ? 'sel' : '', st.out.has(c) ? 'no' : ''].join(' ');
    return `<button class="ch ${cls}" ${!silent ? `data-say="${esc(c)}"` : ''} data-on="choose_|${k}">${esc(c)}</button>`;
  }).join('')}</div>`;
}
function showChoice(st) {
  shell(promptHTML(st) + `<div id="chs">${choicesHTML(st)}</div>`, checkFoot(false));
  if (st.type === 'listen-pick') setTimeout(() => speak(st.ex.answer), 300);
}
window.rerenderChoice = () => {
  const st = RUN.steps[RUN.i];
  $('.stage').innerHTML = promptHTML(st) + `<div id="chs">${choicesHTML(st)}</div>`;
};
function checkFoot(on) { return `<button class="btn block" id="checkBtn" ${on ? '' : 'disabled'} data-on="check">ตรวจคำตอบ</button>`; }
window.choose_ = k => {
  const st = RUN.steps[RUN.i];
  if (st.done || st.locked) return;
  st.sel = st.choices[k];
  $('#chs').innerHTML = choicesHTML(st);
  if (st.type === 'fill-blank') { const b = $('#blank'); if (b) b.textContent = st.sel; }
  const btn = $('#checkBtn'); if (btn) btn.disabled = false;
};
window.check = () => {
  const st = RUN.steps[RUN.i];
  if (st.kind === 'order') return checkOrder(st);
  if (!st.sel) return;
  const ok = st.sel === st.ex.answer;
  st.tries = (st.tries || 0) + 1;
  if (RUN.mode === 'test') return testAnswer(st, ok);
  if (ok) {
    st.done = true;
    grade(st);
    rerenderChoice();
    const say = st.type === 'fill-blank' ? st.ex.sentence.replace(/_{2,}/, st.ex.answer)
      : st.type === 'read-pick-picture' ? st.ex.text : st.ex.answer;
    speak(say);
    goodFoot();
  } else {
    st.out.add(st.sel); st.sel = null; st.locked = true;
    rerenderChoice();
    warmFoot(st.type === 'listen-pick' ? 'กด 🔊 ฟังอีกครั้ง แล้วเลือกใหม่' : 'แตะคำเพื่อฟังเสียง แล้วเลือกใหม่ได้เลย');
  }
};
function grade(st) {
  RUN.xp += XP_PER_STEP; RUN.graded++;
  if (st.tries === 1) RUN.firstTry++;
}
function goodFoot(extra = '') {
  setFoot(`<div class="fb"><span style="font-size:36px">🎉</span><div><div class="msg">${pick(PRAISE)}</div><div class="sub">+${XP_PER_STEP} XP ${extra}</div></div></div>
    <button class="btn block good" data-on="next">ไปต่อ</button>`, 'good');
}
function warmFoot(sub) {
  setFoot(`<div class="fb">${mascotHTML(P().mascot, 48)}<div><div class="msg">${pick(RETRY)}</div><div class="sub">${sub}</div></div></div>
    <button class="btn block warm" data-on="retry">ลองอีกครั้ง</button>`, 'warm');
}
window.retry = () => {
  const st = RUN.steps[RUN.i];
  st.locked = false;
  if (st.kind === 'order') { renderOrder(st); }
  else rerenderChoice();
  setFoot(checkFoot(false));
};

// ---------------------------------------------------------------- order words
function showOrder(st) {
  if (!st.bank) {
    let w = st.ex.words.map((t, k) => ({ t, k }));
    if (w.map(x => x.t).join('|') === st.ex.answer.join('|')) w = shuffle(w);
    st.bank = w; st.picked = [];
  }
  shell(`<div class="ask">แตะคำเรียงให้เป็นประโยค</div><div id="ord"></div>`, checkFoot(false));
  renderOrder(st);
}
function renderOrder(st) {
  const okUpto = st.okUpto || 0;
  $('#ord').innerHTML = `
    <div class="answer-row">${st.picked.map((k, n) => {
      const w = st.bank.find(x => x.k === k);
      return `<button class="chip ${st.done || n < okUpto ? 'ok' : ''}" data-say="${esc(w.t)}" data-on="unpick|${k}">${esc(w.t)}</button>`;
    }).join('')}${st.done ? sayBtn(st.ex.answer.join('')) : ''}</div>
    <div class="bank">${st.bank.map(w => `<button class="chip ${st.picked.includes(w.k) ? 'ghost' : ''}" data-say="${esc(w.t)}" data-on="pickW|${w.k}">${esc(w.t)}</button>`).join('')}</div>`;
  const btn = $('#checkBtn'); if (btn) btn.disabled = st.picked.length !== st.bank.length;
}
window.pickW = k => { const st = RUN.steps[RUN.i]; if (st.done || st.locked || st.picked.includes(k)) return; st.picked.push(k); renderOrder(st); };
window.unpick = k => { const st = RUN.steps[RUN.i]; if (st.done || st.locked) return; st.picked = st.picked.filter(x => x !== k); st.okUpto = 0; renderOrder(st); };
function checkOrder(st) {
  const got = st.picked.map(k => st.bank.find(x => x.k === k).t);
  st.tries = (st.tries || 0) + 1;
  const ok = got.join('|') === st.ex.answer.join('|');
  if (RUN.mode === 'test') return testAnswer(st, ok);
  if (ok) {
    st.done = true; grade(st); renderOrder(st); speak(st.ex.answer.join('')); goodFoot();
  } else {
    let n = 0; while (n < got.length && got[n] === st.ex.answer[n]) n++;
    st.picked = st.picked.slice(0, n); st.okUpto = n; st.locked = true;
    renderOrder(st);
    warmFoot(n > 0 ? `คำสีเขียว ${n} คำแรกถูกแล้ว เรียงต่อจากนั้นนะ` : 'ลองนึกว่า ใคร ทำอะไร แล้วเรียงใหม่');
  }
}

// ---------------------------------------------------------------- story
function showStory(st) {
  st.shown = st.shown || 1;
  const all = st.shown >= st.ex.sentences.length;
  shell(`<div class="ask">อ่านเรื่องสั้นทีละประโยค</div>
    <p class="muted small" style="margin:-8px 0 12px">แตะคำเพื่อฟังทีละคำ หรือกด 🔊 ฟังทั้งประโยค</p>
    <div class="story">${st.ex.sentences.slice(0, st.shown).map((s, k) => `<div class="sline ${k === st.shown - 1 ? 'now' : ''}" id="sl${k}">${sayBtn(s)}<div>${tapWords(s)}</div></div>`).join('')}</div>
    ${all ? `<button class="btn ghost block" data-on="readAll">🔊 ฟังทั้งเรื่อง</button>` : ''}`,
    all ? `<button class="btn block good" data-on="storyDone">ไปตอบคำถาม</button>`
        : `<button class="btn block" data-on="moreStory">อ่านประโยคต่อไป (${st.shown}/${st.ex.sentences.length})</button>`);
  const last = $(`#sl${st.shown - 1}`); if (last && st.shown > 1) last.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
window.moreStory = () => { const st = RUN.steps[RUN.i]; st.shown++; showStory(st); };
window.storyDone = () => { RUN.xp += XP_PER_STEP; RUN.storyOpen = true; next(); };
window.readAll = async () => {
  const st = RUN.steps[RUN.i];
  for (let k = 0; k < st.ex.sentences.length; k++) {
    if (!RUN || RUN.steps[RUN.i] !== st) return;
    document.querySelectorAll('.sline').forEach(el => el.classList.toggle('now', el.id === 'sl' + k));
    await speak(st.ex.sentences[k]);
  }
};

// ---------------------------------------------------------------- lesson complete
function finishLesson() {
  const p = P(), L = RUN.lesson;
  const first = !p.completed[L.id];
  const before = levelInfo(p.xp).lvl, teamBefore = teamCount();
  const bonus = first ? XP_LESSON_BONUS : XP_REPLAY_BONUS;
  const earned = RUN.xp + bonus;
  p.xp += earned;
  p.completed[L.id] = true;
  delete p.testedOut[L.id];
  let gotSticker = null, gotUnlock = null;
  const sid = L.reward?.sticker;
  if (sid && !p.stickers.includes(sid)) { p.stickers.push(sid); gotSticker = sid; }
  if (L.reward?.unlock && !p.unlocks.includes(L.reward.unlock)) { p.unlocks.push(L.reward.unlock); gotUnlock = L.reward.unlock; }
  save();
  const after = levelInfo(p.xp).lvl, teamAfter = teamCount();
  const newGoal = TEAM_GOALS.find(g => teamBefore < g.n && teamAfter >= g.n);
  const newAccs = ACCS.filter(a => a.level && a.level > before && a.level <= after);
  const g = nextGoal(teamAfter);

  $('#app').innerHTML = `<div class="done">
    ${mascotHTML(p.mascot, 130, 'pop')}
    <h1>${L.isBoss ? 'ชนะบทบอสแล้ว!' : 'จบบทแล้ว!'}</h1>
    <div class="muted">${esc(L.title)}</div>
    <div class="stats">
      <div class="stat"><b>+${earned}</b><span>XP</span></div>
      <div class="stat"><b>${RUN.graded}</b><span>ข้อที่ฝึก</span></div>
      <div class="stat"><b>${after}</b><span>เลเวล</span></div>
    </div>
    ${after > before ? `<div class="gift"><b>เลเวลอัป! ตอนนี้เลเวล ${after}</b>${newAccs.length ? `<div>ได้ของแต่งตัวใหม่: ${newAccs.map(a => a.e + ' ' + a.name).join(', ')}</div>` : ''}</div>` : ''}
    ${gotSticker ? `<div class="gift"><div class="e">${STICKERS[gotSticker] || '⭐'}</div>ได้สติกเกอร์ใหม่ เก็บไว้ในสมุดแล้ว</div>` : ''}
    ${gotUnlock ? `<div class="gift"><div class="e">👑</div>ปลดล็อกมงกุฎให้มาสคอตแล้ว! ไปใส่ได้ที่แท็บมาสคอต</div>` : ''}
    ${newGoal ? `<div class="gift"><div class="e">${newGoal.e}</div><b>เป้าหมายทีมสำเร็จ!</b><br>${esc(S.profiles.pun.name)} กับ ${esc(S.profiles.pena.name)} ได้ ${newGoal.name} ทั้งคู่</div>` : ''}
    ${first ? `<div class="team" style="width:100%;margin-top:4px;text-align:left"><div class="small"><b>เป้าหมายทีม</b> ${g ? `· อีก ${g.n - teamAfter} บท ได้ ${g.e} ${g.name}` : '· ครบทุกรางวัลแล้ว!'}</div>
      <div class="bar"><i style="width:${g ? (teamAfter / g.n) * 100 : 100}%"></i></div></div>` : ''}
    <div style="width:100%;margin-top:8px"><button class="btn block good" data-on="goPath">กลับหน้าบทเรียน</button></div>
  </div>`;
  confetti();
  speak(L.isBoss ? 'ชนะบทบอสแล้ว เก่งมาก' : `เก่งมาก ${p.name}`);
}
function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#ffc83d', '#3f8fd9', '#e8618c', '#1fa971', '#8a5ad6', '#f08a24'];
  for (let k = 0; k < 60; k++) {
    const i = document.createElement('i');
    i.style.left = Math.random() * 100 + '%'; i.style.background = pick(cols);
    i.style.animationDuration = 1.6 + Math.random() * 1.8 + 's'; i.style.animationDelay = Math.random() * .5 + 's';
    box.appendChild(i);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
}

// ================================================================ PLACEMENT TEST
// One question per lesson, unit by unit (units 1–5). 3 of 4 right → that unit is skipped.
window.startTest = () => {
  RUN = { mode: 'test', unitIx: 0, unitNo: 1, correct: 0, steps: [], i: 0, passed: [] };
  modalIntroTest();
};
function modalIntroTest() {
  const p = P();
  shell(`<div class="bubble-row" style="margin-top:20px">${mascotHTML(p.mascot, 90, 'bounce')}
      <div class="bubble">${tapWords('มาดูกันว่าอ่านได้ถึงไหนแล้ว')}</div></div>
    <div class="sec"><p style="margin:0">ทำทีละหน่วย หน่วยละ 4 ข้อ ตอบถูก 3 ข้อขึ้นไป ข้ามหน่วยนั้นได้เลย</p>
    <p class="muted small" style="margin:8px 0 0">ตอบผิดก็ไม่เป็นไรนะ แปลว่าจะได้เริ่มเรียนตรงนั้น ทุกหน่วยกลับมาเล่นได้เสมอ</p></div>`,
    `<button class="btn block" data-on="testUnit">เริ่มทดสอบ</button>`);
}
window.testUnit = () => {
  const u = DATA.units[RUN.unitIx];
  RUN.unitNo = RUN.unitIx + 1; RUN.correct = 0; RUN.i = 0;
  RUN.steps = u.lessons.map(l => {
    // it's a reading test, so prefer exercises that make the child read
    const pref = ['fill-blank', 'read-answer', 'read-pick-picture', 'same-sound', 'listen-pick', 'order-words'];
    const ex = pref.map(t => l.exercises.find(e => e.type === t)).find(Boolean) || l.exercises[0];
    if (ex.type === 'order-words') return { kind: 'order', type: ex.type, ex };
    return { kind: 'choice', type: ex.type, ex, choices: shuffle(ex.choices) };
  });
  showStep();
};
function testAnswer(st, ok) {
  st.done = true;
  if (ok) RUN.correct++;
  if (st.kind === 'order') renderOrder(st); else rerenderChoice();
  if (ok) {
    setFoot(`<div class="fb"><span style="font-size:32px">✅</span><div class="msg">ถูกต้อง!</div></div><button class="btn block good" data-on="next">ข้อต่อไป</button>`, 'good');
  } else {
    setFoot(`<div class="fb">${mascotHTML(P().mascot, 44)}<div><div class="msg" style="color:var(--ink)">ไม่เป็นไร!</div><div class="sub">คำตอบคือ “${esc(Array.isArray(st.ex.answer) ? st.ex.answer.join(' ') : st.ex.answer)}” ข้อนี้จะได้เรียนในบทเรียน</div></div></div>
      <button class="btn block" data-on="next">ข้อต่อไป</button>`);
  }
}
function finishTestUnit() {
  const p = P(), u = DATA.units[RUN.unitIx];
  const pass = RUN.correct >= 3;
  p.xp += RUN.correct * 5;
  if (pass) { u.lessons.forEach(l => { if (!p.completed[l.id]) p.testedOut[l.id] = true; }); RUN.passed.push(RUN.unitIx); }
  p.placement = RUN.passed.length; save();
  const more = pass && RUN.unitIx < 4;
  const startAt = pass ? RUN.unitIx + 2 : RUN.unitIx + 1;
  shell(`<div class="done" style="padding-top:10px">
      ${mascotHTML(p.mascot, 110, 'pop')}
      <h1>${pass ? `ผ่านหน่วยที่ ${RUN.unitNo}!` : 'เจอจุดเริ่มต้นแล้ว'}</h1>
      <div class="muted">ตอบถูก ${RUN.correct} จาก ${RUN.steps.length} ข้อ</div>
      <div class="gift">${pass
        ? (more ? `ข้าม “${esc(u.title)}” ได้เลย ลองหน่วยถัดไปไหม?` : `ข้ามได้ถึงหน่วยที่ ${RUN.unitNo} แล้ว เริ่มเรียนที่หน่วยที่ ${startAt} กันเลย`)
        : (RUN.passed.length ? `ข้ามได้ ${RUN.passed.length} หน่วย จะเริ่มเรียนที่หน่วยที่ ${startAt} “${esc(u.title)}”` : `เริ่มเรียนที่หน่วยที่ 1 ค่อยๆ ไปด้วยกันนะ`)}</div>
    </div>`,
    more ? `<div class="row" style="display:flex;gap:10px"><button class="btn ghost" style="flex:1" data-on="goPath">พอแค่นี้</button>
            <button class="btn good" style="flex:1" data-on="nextTestUnit">ทดสอบหน่วยต่อไป</button></div>`
         : `<button class="btn block good" data-on="goPath">ไปหน้าบทเรียน</button>`);
  if (pass) confetti();
}

// ================================================================ SETTINGS (for parents)
function modal(html) {
  closeModal();
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
}
window.closeModal = () => { const m = $('#modal'); if (m) m.remove(); };
function ipadHTML() {
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `<div class="qr"><b>เปิดบน iPad</b><span class="small muted">ปิดหน้านี้ แล้วเปิดแอปด้วยไฟล์ เปิดแอป.command จะมี QR code ให้สแกน</span></div>`;
  }
  if (!/^(\d+\.){3}\d+$/.test(host)) return '';           // already on a real web address
  let img = '';
  try { const q = qrcode(0, 'M'); q.addData(location.origin + '/'); q.make(); img = q.createDataURL(6, 2); } catch (e) { /* offline: no QR */ }
  return `<div class="qr"><b>เปิดบน iPad</b>
    ${img ? `<img src="${img}" alt="QR code สำหรับเปิดแอปบน iPad">` : ''}
    <span class="small muted">ใช้กล้อง iPad สแกน หรือพิมพ์ใน Safari:</span><code>${esc(location.origin)}</code>
    <span class="small muted">iPad ต้องต่อ Wi-Fi เดียวกัน และ Mac ต้องเปิดแอปค้างไว้<br>ใน Safari กดปุ่มแชร์ › "เพิ่มไปยังหน้าจอโฮม" เพื่อให้เปิดเหมือนแอป</span></div>`;
}
window.openSettings = () => {
  modal(`<h3>ตั้งค่า (สำหรับผู้ปกครอง)</h3>
    <label class="field">ความเร็วเสียงอ่าน: <b id="rv">${S.settings.rate.toFixed(2)}</b>
      <input type="range" min="0.5" max="1.2" step="0.05" value="${S.settings.rate}" data-input="setRate"></label>
    <button class="btn ghost block" data-say="สวัสดีครับ วันนี้มาอ่านหนังสือกัน">🔊 ทดลองเสียง</button>
    ${ipadHTML()}
    <div class="small muted" style="margin-top:8px">เสียงที่ใช้: ${TTS.voice ? esc(TTS.voice.name) : 'ยังไม่พบเสียงภาษาไทยในเครื่อง'}</div>
    ${S.order.map(id => `<label class="field">ชื่อโปรไฟล์<input type="text" value="${esc(S.profiles[id].name)}" data-change="setName|${id}"></label>`).join('')}
    <div class="row">${S.order.map(id => `<button class="btn ghost small" data-on="askReset|${id}">ล้างข้อมูล ${esc(S.profiles[id].name)}</button>`).join('')}</div>
    <div class="row"><button class="btn block" data-on="closeRender">เสร็จ</button></div>`);
};
window.askReset = id => {
  const n = S.profiles[id].name;
  modal(`<h3>ล้างความคืบหน้าของ ${esc(n)}?</h3><p class="muted">XP สติกเกอร์ และบทที่เรียนแล้วของ ${esc(n)} จะหายทั้งหมด ย้อนกลับไม่ได้</p>
    <div class="row"><button class="btn ghost" data-on="openSettings">ยกเลิก</button>
    <button class="btn warm" data-on="doReset|${id}">ล้างข้อมูล</button></div>`);
};

// show unexpected script errors on screen instead of failing silently
window.addEventListener('error', e => toast('เกิดข้อผิดพลาด: ' + (e.message || e)));
window.addEventListener('unhandledrejection', e => toast('เกิดข้อผิดพลาด: ' + (e.reason && e.reason.message || e.reason)));

// ================================================================ EVENTS
// Hosted pages forbid inline onclick="…", so every control carries data-on="fn|arg|arg"
// and one listener calls the matching function.
const argOf = a => a === 'true' ? true : a === 'false' ? false : (a !== '' && !isNaN(a)) ? Number(a) : a;
function dispatch(attr, e) {
  const el = e.target.closest('[' + attr + ']');
  if (!el || el.disabled) return;
  const [fn, ...args] = el.getAttribute(attr).split('|');
  const f = ACT[fn] || window[fn];
  if (typeof f === 'function') f(...args.map(argOf), el);
}
document.addEventListener('click', e => dispatch('data-on', e));
document.addEventListener('input', e => dispatch('data-input', e));
document.addEventListener('change', e => dispatch('data-change', e));
const ACT = {
  quitNow() { closeModal(); if (window.speechSynthesis) speechSynthesis.cancel(); render(); },
  toggleStory() { RUN.storyOpen = RUN.storyOpen === false; rerenderChoice(); },
  goPath() { TAB = 'path'; render(); },
  nextTestUnit() { RUN.unitIx++; testUnit(); },
  setRate(el) { S.settings.rate = +el.value; $('#rv').textContent = (+el.value).toFixed(2); save(); },
  setName(id, el) { const v = el.value.trim(); if (v) { S.profiles[id].name = v; save(); } },
  closeRender() { closeModal(); render(); },
  doReset(id) { const p = S.profiles[id]; S.profiles[id] = newProfile(p.name, p.age, p.defColor); save(); closeModal(); render(); },
};

// ================================================================ BOOT
async function boot() {
  S = load();
  for (const id of S.order) LAST[id] = bodyOf(S.profiles[id]);
  try {
    const r = await fetch('lessons.json', { cache: 'no-cache' });
    DATA = await r.json();
  } catch (e) {
    $('#app').innerHTML = `<div class="wrap"><h2>เปิดไฟล์บทเรียนไม่ได้</h2>
      <p class="muted">ให้เปิดแอปด้วยไฟล์ <b>เปิดแอป.command</b> (ดับเบิลคลิก) แทนการเปิด index.html ตรงๆ เพราะเบราว์เซอร์ไม่ยอมให้อ่าน lessons.json จากไฟล์ในเครื่อง</p></div>`;
    return;
  }
  DATA.units.forEach((u, ui) => u.lessons.forEach((l, li) => FLAT.push({ lesson: l, unit: u, ui, li })));
  render();
  cloudConnect();
}
boot();
