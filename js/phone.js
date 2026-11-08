// 악기다 iOS 앱 시제품
// 온보딩 → 팀 → 셋리스트 → 기준 음량 맞추기 → 악보 보며 연주(노래방) → 종합 점수(나만 봄) → 들어보고 올리기 → 다음 사람은 그 위에 연주 → 합주 소리 크기 조절
import { synth, clicks, scoreTake, rms } from "./engine.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

// ---------------------------------------------------------------- 아이콘 (디자인 시스템과 같은 도형)
const P = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  play: '<path d="M7 5v14l11-7z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  retry: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', solo: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>', back: '<path d="M15 5l-7 7 7 7"/>', chev: '<path d="M9 5l7 7-7 7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6v.01M4.5 12v.01M4.5 18v.01"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  won: '<path d="M4 7l3.5 11L12 8l4.5 10L20 7M3 11h18M3 14h18"/>', q: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"/>',
  vocal: '<circle cx="9" cy="9" r="5"/><path d="M12.5 12.5L20 20"/>',
  guitar: '<path d="M14 10l6-6M18 2l4 4M10.5 9.5a4 4 0 0 0-5.6.4c-1.4 1.6-.4 3.1-1.9 4.6-1.5 1.5 1 6 5.5 5.5 1.5-1.5 3-.5 4.6-1.9a4 4 0 0 0 .4-5.6z"/><circle cx="9" cy="15" r="1.2"/>',
  bass: '<path d="M15 9l6-6M10.5 9.5a4 4 0 0 0-5.6.4c-1.4 1.6-.4 3.1-1.9 4.6-1.5 1.5 1 6 5.5 5.5 1.5-1.5 3-.5 4.6-1.9a4 4 0 0 0 .4-5.6zM7 14l3 3"/>',
  drum: '<ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9M8 3l3 5M16 3l-3 5"/>',
  keys: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M8 5v9M12 5v9M16 5v9M8 14v5M12 14v5M16 14v5"/>',
  etc: '<path d="M6 12h.01M12 12h.01M18 12h.01"/>', archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
const ic = (n, s = 24, cls = "ic") => `<svg class="${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
const INST = { vocal: "보컬", guitar: "기타", bass: "베이스", drum: "드럼", keys: "건반", etc: "그 밖의 악기" };
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };

// ---------------------------------------------------------------- 상태 (이 기기에 저장)
const KEY = "akkida-app-v2";
let S = load();
function blank() { return { onboarded: false, a: {}, team: null, songs: [], scores: {}, mix: {}, teamMix: {} }; }
function load() { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return blank(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
const myInst = () => (S.a.instrument && S.a.instrument[0]) || "bass";

// 내가 올린 녹음은 IndexedDB(이 기기)에 보관
const idb = (() => {
  let dbp = null;
  const open = () => dbp ||= new Promise((res, rej) => { const r = indexedDB.open("akkida", 1); r.onupgradeneeded = () => r.result.createObjectStore("takes"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction("takes", mode); const q = fn(t.objectStore("takes")); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return {
    get: k => tx("readonly", s => s.get(k)).catch(() => null),
    put: (k, v) => tx("readwrite", s => s.put(v, k)).catch(() => null),
    clear: () => tx("readwrite", s => s.clear()).catch(() => null),
  };
})();

// ---------------------------------------------------------------- 곡 (지어낸 예시 곡과 악보)
const ROOT_HZ = { C: 65.41, D: 73.42, E: 82.41, F: 87.31, G: 98.0, A: 110.0, B: 123.47 };
const TEMPLATES = [
  { title: "새벽 합주", bpm: 92, chords: ["G", "D", "Em", "C", "G", "D", "C", "C", "Em", "C", "G", "D", "Em", "C", "G", "D"],
    lyrics: ["새벽 두 시 합주실 앞에서", "각자 다른 시간에 켠 마이크", "불 꺼진 연습실에 남은 소리", "내일은 같이 맞춰 보자"] },
  { title: "여름 끝 무렵", bpm: 100, chords: ["C", "G", "Am", "F", "C", "G", "F", "F", "Am", "F", "C", "G", "Am", "F", "C", "G"],
    lyrics: ["운동장 끝 벤치에 앉아", "낡은 기타 줄을 고르던", "그 여름이 아직 남아서", "오늘도 한 곡 더 불러"] },
  { title: "마지막 곡", bpm: 116, chords: ["Em", "C", "G", "D", "Em", "C", "G", "D", "C", "D", "Em", "Em", "C", "D", "G", "G"],
    lyrics: ["조명이 꺼지기 전에", "한 번만 더 크게 울려", "박수 소리 사이로", "우리 이름을 남겨"] },
];

function seedTeam(name, showDate) {
  const mine = myInst();
  const pool = [["drum", "민준"], ["guitar", "서연"], ["bass", "하늘"], ["vocal", "지호"], ["keys", "유나"]].filter(x => x[0] !== mine);
  const solo = S.a.band === "seek" || S.a.band === "solo";
  const mk = (t, uploaded) => ({
    id: "s" + Math.random().toString(36).slice(2, 8), title: t.title, bpm: t.bpm, chords: t.chords, lyrics: t.lyrics,
    parts: [
      ...(solo ? [] : pool.slice(0, 3).map(([inst, who], i) => ({ inst, who, status: i < uploaded ? "done" : "empty", order: i < uploaded ? i + 1 : 0 }))),
      { inst: mine, who: "나", mine: true, status: "empty", order: 0 },
    ],
  });
  S.team = solo ? { name: name || "내 연습", solo: true, showDate: "", leader: true } : { name, showDate, leader: true, members: ["나", ...pool.slice(0, 3).map(p => p[1])] };
  S.songs = [mk(TEMPLATES[0], 2), mk(TEMPLATES[1], 1), mk(TEMPLATES[2], 0)];
  S.scores = {}; S.mix = {}; S.teamMix = {};
  save();
}
const findSong = id => S.songs.find(s => s.id === id);
const uploaded = s => s.parts.filter(p => p.status === "done").sort((a, b) => a.order - b.order);

// ---------------------------------------------------------------- 오디오
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
const sr = () => ac().sampleRate;
const BARS = 16;
const cache = {};
const norm = (x, db = -20) => { const g = 10 ** (db / 20) / (rms(x) || 1); const o = new Float32Array(x.length); for (let i = 0; i < x.length; i++) o[i] = x[i] * g; return o; };
const metro = song => cache["m" + song.id + sr()] ||= clicks({ sr: sr(), bpm: song.bpm, bars: BARS });
function drums(song) {
  const rate = sr(), beat = 60 / song.bpm, len = metro(song).length, out = new Float32Array(len);
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < BARS * 4; i++) {
    const s = Math.round(i * beat * rate), kick = i % 2 === 0;
    for (let j = 0; j < rate * 0.18 && s + j < len; j++) {
      const t = j / rate;
      out[s + j] += kick ? Math.sin(2 * Math.PI * (55 + 60 * Math.exp(-t * 30)) * t) * Math.exp(-t * 18) * 0.9 : rnd() * Math.exp(-t * 25) * 0.5;
    }
  }
  return out;
}
async function partAudio(song, part) {
  if (part.mine) return part.status === "done" ? (cache["t" + song.id] ||= await idb.get("take:" + song.id)) : null;
  return cache["p" + song.id + part.inst + sr()] ||= norm(part.inst === "drum" ? drums(song)
    : synth({ sr: sr(), bpm: song.bpm, bars: BARS, latencyMs: 0, drift: false, seed: 3 + part.inst.length, freqMul: { guitar: 4, bass: 2, vocal: 6, keys: 3, etc: 3 }[part.inst] || 4,
      roots: song.chords.map(c => ROOT_HZ[c[0]] / 2) }).part);
}

// 여러 트랙을 같은 시각에 재생, 트랙별 음량을 실시간으로 바꿀 수 있음
let player = null;
function stopAll() { if (player) { player.stop(); player = null; } }
function playTracks(tracks, onEnd) {
  stopAll();
  const c = ac(), at = c.currentTime + 0.05, nodes = {};
  let longest = 0;
  for (const t of tracks) {
    if (!t.data) continue;
    const b = c.createBuffer(1, t.data.length, sr()); b.copyToChannel(t.data, 0);
    const s = c.createBufferSource(); s.buffer = b;
    const g = c.createGain(); g.gain.value = t.gain ?? 1;
    s.connect(g).connect(c.destination); s.start(at);
    nodes[t.id] = { s, g };
    longest = Math.max(longest, t.data.length / sr());
  }
  let done = false;
  const timer = setTimeout(() => { if (!done) { done = true; player = null; onEnd && onEnd(); } }, longest * 1000 + 120);
  player = {
    startAt: at, dur: longest,
    setGain(id, v) { if (nodes[id]) nodes[id].g.gain.setTargetAtTime(v, c.currentTime, 0.03); },
    stop() { done = true; clearTimeout(timer); Object.values(nodes).forEach(n => { try { n.s.stop(); } catch {} }); },
  };
  return player;
}
// 믹서 값(0~100, 기준 68) → 음량 배수. 100이면 +12dB, 36이면 −12dB, 0이면 끔
const REF = 68;
const gainOf = v => (v <= 0 ? 0 : 10 ** (((v - REF) / 32) * 12 / 20));
const mixOf = song => Object.assign({}, S.teamMix[song.id] || {}, S.mix[song.id] || {});

// ---------------------------------------------------------------- 악보 그리기
const L = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const dia = p => parseInt(p.slice(-1), 10) * 7 + L[p[0]];
const nm = d => "CDEFGAB"[((d % 7) + 7) % 7] + Math.floor(d / 7);
function tones(ch) { // 근음·3음·5음 중 F#이 없는 것만 (예시 악보는 임시표 없이)
  const r = dia(ch[0] + "0"), minor = ch.includes("m");
  const third = r + 2, fifth = r + 4;
  const ok3 = !(ch[0] === "D" && !minor) && !(ch[0] === "B");
  return ok3 ? [r, third, fifth] : [r, fifth];
}
function inRange(d, lo, hi) { while (d < lo) d += 7; while (d > hi) d -= 7; return d; }
function notesFor(song, inst) {
  // 마디마다 [{p:[음들], d:"q"|"h", ly?}] — 지어낸 예시 편곡
  const lyr = song.lyrics.map(l => [...l.replace(/\s/g, "")]);
  return song.chords.map((ch, bi) => {
    const t = tones(ch);
    if (inst === "bass") { const r = inRange(t[0], dia("G2"), dia("F3")), f = inRange(t[t.length - 1], dia("G2"), dia("F3"));
      return [[r], [r], [f], [r]].map(p => ({ p: p.map(nm), d: "q" })); }
    if (inst === "drum") return [0, 1, 2, 3].map(i => ({ p: [i % 2 ? "C5" : "F4"], d: "q", x: true }));
    if (inst === "vocal") {
      const line = lyr[Math.floor(bi / 4) % lyr.length], k = (bi % 4) * 4;
      const seq = [0, 1, 2, 1].map(i => inRange(t[i % t.length] + 7, dia("G4"), dia("D5")));
      return seq.map((d, i) => ({ p: [nm(d)], d: "q", ly: line[k + i] || "" }));
    }
    const r = inRange(t[0], dia("C4"), dia("B4")); // 기타·건반: 근음+5음+옥타브
    const chord = [r, r + 4, r + 7].map(nm);
    return [{ p: chord, d: "h" }, { p: chord, d: "h" }];
  });
}
function staffSVG(measures, clef, startBar, { cur = -1, beat = 0, next = false, lyrics = false } = {}) {
  const W = 264, gap = 8, top = 16, x0 = 28, mw = (W - x0 - 4) / 4, H = lyrics ? 86 : 70;
  const base = clef === "bass" ? dia("G2") : dia("E4"), bottomY = top + gap * 4;
  let s = `<svg class="staff${next ? " next" : ""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${startBar}~${startBar + 3}마디 악보">`;
  if (cur >= 0) s += `<rect class="hi" x="${x0 + cur * mw}" y="${top - 7}" width="${mw}" height="${gap * 4 + 14}" rx="4"/>`;
  for (let i = 0; i < 5; i++) s += `<line class="ln" x1="2" x2="${W - 2}" y1="${top + i * gap}" y2="${top + i * gap}"/>`;
  for (let m = 0; m <= 4; m++) s += `<line class="bl" x1="${x0 + m * mw}" x2="${x0 + m * mw}" y1="${top}" y2="${bottomY}"/>`;
  s += clef === "bass"
    ? `<path class="clef" d="M8 ${top + 6}c4-6 14-5 14 3c0 7-6 12-13 16"/><circle class="dot" cx="24" cy="${top + 4}" r="1.4"/><circle class="dot" cx="24" cy="${top + 12}" r="1.4"/>`
    : `<path class="clef" d="M14 ${top + 40}c-4 0-5-6 0-6s3 6 0-2l-2-40c0-6 7-6 5 0c-1 6-9 10-9 20c0 6 4 9 8 9s6-4 5-8c-1-5-8-5-9 0"/>`;
  measures.forEach((ms, mi) => {
    s += `<text class="no" x="${x0 + mi * mw + 2}" y="${top - 4}">${startBar + mi}</text>`;
    let t = 0;
    for (const n of ms) {
      const x = x0 + mi * mw + 10 + (t / 4) * (mw - 16), ds = n.p.map(dia), hi = Math.max(...ds), lo = Math.min(...ds);
      const y = d => bottomY - (d - base) * gap / 2;
      for (const d of ds) {
        for (let l = base - 2; l >= d; l -= 2) s += `<line class="ln" x1="${x - 6}" x2="${x + 6}" y1="${y(l)}" y2="${y(l)}"/>`;
        for (let l = base + 10; l <= d; l += 2) s += `<line class="ln" x1="${x - 6}" x2="${x + 6}" y1="${y(l)}" y2="${y(l)}"/>`;
        s += n.x ? `<path class="st" d="M${x - 3.5} ${y(d) - 3.5}l7 7M${x + 3.5} ${y(d) - 3.5}l-7 7"/>`
          : `<ellipse class="hd${n.d === "h" ? " open" : ""}" cx="${x}" cy="${y(d)}" rx="4.2" ry="3" transform="rotate(-20 ${x} ${y(d)})"/>`;
      }
      const up = (hi + lo) / 2 < base + 4;
      s += `<line class="st" x1="${up ? x + 3.8 : x - 3.8}" x2="${up ? x + 3.8 : x - 3.8}" y1="${up ? y(lo) : y(hi)}" y2="${up ? y(hi) - 22 : y(lo) + 22}"/>`;
      if (lyrics && n.ly) s += `<text class="ly" x="${x}" y="${H - 6}" text-anchor="middle">${esc(n.ly)}</text>`;
      t += n.d === "h" ? 2 : 1;
    }
  });
  if (cur >= 0) { const px = x0 + cur * mw + 4 + (beat / 4) * (mw - 8); s += `<line class="ph" x1="${px}" x2="${px}" y1="${top - 7}" y2="${bottomY + 7}"/>`; }
  return s + "</svg>";
}

// ---------------------------------------------------------------- 화면 쌓기
const vp = $("#vp"), tabbar = $("#tabbar");
let stack = [];
function build(def) { const el = document.createElement("section"); el.className = "scr"; draw(el, def); return el; }
function draw(el, def) {
  const v = def.view();
  el.innerHTML = (v.nav ?? navbar(def, v)) + `<div class="body${v.tight ? " tight" : ""}">${v.body}</div>` + (v.foot ? `<div class="foot">${v.foot}</div>` : "");
  const back = $("[data-back]", el); if (back) back.onclick = () => pop();
  def.mount && def.mount(el);
}
function navbar(def, v) {
  if (v.noNav) return "";
  return `<div class="navbar"><button class="icon-btn" type="button" data-back aria-label="뒤로" ${stack.length && def.back !== false ? "" : "disabled"}>${ic("back")}</button>
    <div class="ttl">${esc(v.title || "")}</div>${v.right || '<span style="width:44px"></span>'}</div>`;
}
function push(def, how = "slide") {
  const prev = stack[stack.length - 1], el = build(def);
  el.classList.add(how === "fade" ? "fade" : "in-r"); vp.append(el); el.getBoundingClientRect();
  requestAnimationFrame(() => el.classList.remove("in-r", "fade"));
  if (prev) { prev.el.classList.add("behind"); prev.el.inert = true; prev.def.leave && prev.def.leave(); }
  stack.push({ def, el }); syncTab(); focusTop();
}
function pop(n = 1) {
  if (stack.length < 2) return;
  for (let i = 0; i < n && stack.length > 1; i++) {
    const cur = stack.pop();
    cur.def.leave && cur.def.leave(); cur.el.inert = true;
    cur.el.classList.add("out-r"); setTimeout(() => cur.el.remove(), 460);
  }
  const prev = stack[stack.length - 1];
  draw(prev.el, prev.def); prev.el.classList.remove("behind"); prev.el.inert = false;
  syncTab();
}
function replace(def) {
  const cur = stack.pop();
  if (cur) { cur.def.leave && cur.def.leave(); cur.el.inert = true; cur.el.classList.add("fade"); setTimeout(() => cur.el.remove(), 460); }
  const el = build(def); el.classList.add("in-r"); vp.append(el); el.getBoundingClientRect();
  requestAnimationFrame(() => el.classList.remove("in-r"));
  stack.push({ def, el }); syncTab(); focusTop();
}
function setRoot(def) {
  stack.forEach(s => { s.def.leave && s.def.leave(); s.el.inert = true; s.el.classList.add("fade"); setTimeout(() => s.el.remove(), 460); });
  stack = []; push(def, "fade");
}
function syncTab() {
  const t = stack[stack.length - 1], tab = t && t.def.tab;
  tabbar.hidden = !tab;
  $$(".tab", tabbar).forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
}
function focusTop() { const t = stack[stack.length - 1]; const h = t && $("h1", t.el); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
tabbar.addEventListener("click", e => {
  const b = e.target.closest(".tab"); if (!b) return;
  stopAll();
  setRoot({ home: Home, record: Records, me: Me }[b.dataset.tab]());
});
function toast(msg) {
  $(".toast", $("#phone"))?.remove();
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  $("#phone").append(t); setTimeout(() => t.remove(), 2600);
}
function sheet(html, mount) {
  const ph = $("#phone");
  const dim = document.createElement("div"); dim.className = "dim";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
  sh.innerHTML = `<div class="grab"></div>` + html;
  ph.append(dim, sh); dim.getBoundingClientRect();
  requestAnimationFrame(() => { dim.classList.add("on"); sh.classList.add("on"); });
  const close = () => { stopAll(); dim.classList.remove("on"); sh.classList.remove("on"); setTimeout(() => { dim.remove(); sh.remove(); }, 460); };
  dim.onclick = close;
  mount && mount(sh, close);
  setTimeout(() => ($("textarea,input", sh) || $("button", sh))?.focus(), 300);
  return close;
}
function dday(v) {
  if (!v) return "";
  const d = new Date(v + "T00:00:00"), t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.round((d - t) / 86400000);
  return isNaN(n) ? "" : n > 0 ? "D-" + n : n === 0 ? "D-day" : "지난 공연";
}
const badge = (tone, text) => `<span class="ak-badge ak-badge-${tone}">${tone === "ok" ? ic("check", 16, "ak-ic") : ""}${esc(text)}</span>`;

// ---------------------------------------------------------------- 온보딩
const STEPS = [
  { id: "instrument", multi: true, grid: true, q: "어떤 악기를 연주하세요?", hint: "여러 개를 골라도 돼요. 처음 고른 악기가 내 파트가 돼요.",
    opts: [["vocal", "보컬"], ["guitar", "기타"], ["bass", "베이스"], ["drum", "드럼"], ["keys", "건반"], ["etc", "그 밖의 악기"]].map(o => [...o, o[0]]) },
  { id: "career", skip: true, q: "연주한 지 얼마나 됐나요?", hint: "점수 코멘트의 말투를 맞춰 드려요.",
    opts: [["lt1", "1년이 안 됐어요"], ["1to3", "1~3년"], ["3to5", "3~5년"], ["gt5", "5년 넘었어요"]] },
  { id: "band", q: "지금 밴드에서 활동하고 있나요?",
    opts: [["club", "네, 동아리 밴드예요", "users", "정기공연을 준비하는 학교·연합 동아리"], ["crew", "네, 직장인·친구 밴드예요", "users", "합주실을 빌려 모이는 팀"],
      ["seek", "아니요, 팀을 찾고 있어요", "search", "빈 파트를 구하는 곳에 들어가고 싶어요"], ["solo", "혼자 연습하고 있어요", "solo", "팀 없이 개인 연습부터"]] },
  { id: "show", date: true, when: () => S.a.band === "club" || S.a.band === "crew", q: "준비하는 공연이 있나요?", hint: "날짜를 알려주시면 셋리스트를 D-day에 맞춰 보여드려요.",
    opts: [["yes", "네, 날짜가 정해졌어요", "calendar"], ["no", "아직 없어요"]] },
  { id: "pain", skip: true, q: "합주할 때 가장 아쉬운 건 뭔가요?", hint: "하나만 골라 주세요.",
    opts: [["time", "멤버끼리 시간 맞추기가 어려워요", "clock"], ["cost", "합주실 비용과 시간이 아까워요", "won"], ["who", "누가 어디서 틀렸는지 모르겠어요", "q"], ["songs", "연습할 곡이 많아 정리가 안 돼요", "list"]] },
  { id: "mic", perm: "mic", icon: "mic", q: "녹음하려면 마이크가 필요해요",
    bullets: ["악보를 보며 내 파트만 녹음해요", "점수는 나만 보고, 마음에 들 때만 팀에 올려요", "영상은 찍지 않아요. 소리만 녹음해요"], cta: "마이크 허용하기" },
  { id: "push", perm: "push", icon: "bell", q: "새 파트가 올라오면 알려드릴까요?",
    bullets: ["팀원이 연주를 올리면 바로 그 위에 연주할 수 있어요", "내 차례인 곡을 알려드려요", "광고 알림은 보내지 않아요"], cta: "알림 받기" },
];
const visibleSteps = () => STEPS.filter(s => !s.when || s.when());
function Onb(i) {
  const s = STEPS[i];
  const ok = () => { const v = S.a[s.id]; if (s.multi) return (v || []).length > 0; if (s.date && v === "yes") return !!S.a.showDate && dday(S.a.showDate).startsWith("D"); return !!v; };
  return {
    view() {
      const vis = visibleSteps(), pct = Math.round(vis.indexOf(s) / vis.length * 100);
      const nav = `<div class="navbar"><button class="icon-btn" type="button" data-back aria-label="이전 질문" ${i ? "" : "disabled"}>${ic("back")}</button>
        <div class="progress-wrap"><div class="ak-progress" role="progressbar" aria-label="진행" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>
        ${s.skip ? '<button class="text-btn sub" type="button" data-skip>건너뛰기</button>' : '<span style="width:44px"></span>'}</div>`;
      if (s.perm) return { nav, body: `<div class="hero-ic">${ic(s.icon, 44)}</div><h1 class="q">${s.q}</h1><ul class="bullets">${s.bullets.map(b => `<li>${b}</li>`).join("")}</ul>`,
        foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-allow>${s.cta}</button><button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-later>나중에 할게요</button>` };
      const val = S.a[s.id];
      const opts = s.opts.map(o => {
        const on = s.multi ? (val || []).includes(o[0]) : val === o[0];
        return `<button class="ak-opt ak-opt-${s.grid ? "tile" : "row"}" type="button" data-k="${o[0]}" aria-pressed="${on}">${o[2] ? ic(o[2], 28, "ak-ic ak-opt-ic") : ""}<span class="ak-opt-txt">${o[1]}${o[3] ? `<small>${o[3]}</small>` : ""}</span><span class="ak-opt-ck">${ic("check", 16, "ak-ic")}</span></button>`;
      }).join("");
      const date = s.date ? `<div class="field" ${S.a.show === "yes" ? "" : "hidden"} data-datebox><label for="show-date">공연 날짜</label><input id="show-date" type="date" value="${esc(S.a.showDate || "")}"><div class="dday" data-dday>${dday(S.a.showDate)}</div></div>` : "";
      return { nav, body: `<h1 class="q">${s.q}</h1>${s.hint ? `<p class="hint">${s.hint}</p>` : ""}<div class="opts${s.grid ? " grid" : ""}">${opts}</div>${date}`,
        foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-next ${ok() ? "" : "disabled"}>다음</button>` };
    },
    mount(el) {
      const next = () => go(i), sync = () => { const n = $("[data-next]", el); if (n) n.disabled = !ok(); };
      $("[data-skip]", el)?.addEventListener("click", next);
      $("[data-next]", el)?.addEventListener("click", next);
      $("[data-later]", el)?.addEventListener("click", () => { S.a[s.id] = "나중에"; save(); next(); });
      $("[data-allow]", el)?.addEventListener("click", async () => { S.a[s.id] = await ask(s.perm); save(); next(); });
      $$(".ak-opt", el).forEach(b => b.addEventListener("click", () => {
        const k = b.dataset.k;
        if (s.multi) {
          const arr = S.a[s.id] = S.a[s.id] || []; const at = arr.indexOf(k); at >= 0 ? arr.splice(at, 1) : arr.push(k);
          b.setAttribute("aria-pressed", String(at < 0)); save(); sync(); return;
        }
        S.a[s.id] = k; $$(".ak-opt", el).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        if (s.date) { $("[data-datebox]", el).hidden = k !== "yes"; if (k === "yes") { $("#show-date", el).focus(); save(); sync(); return; } delete S.a.showDate; }
        save(); sync(); setTimeout(next, 450);
      }));
      const inp = $("#show-date", el);
      inp?.addEventListener("input", () => { S.a.showDate = inp.value; $("[data-dday]", el).textContent = dday(inp.value); save(); sync(); });
    },
  };
}
async function ask(kind) {
  try {
    if (kind === "mic") { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); st.getTracks().forEach(t => t.stop()); return "허용"; }
    if (kind === "push" && "Notification" in window) { const r = await Notification.requestPermission(); return r === "granted" ? "허용" : "거부"; }
  } catch { return "거부"; }
  return "나중에";
}
function go(i) {
  let n = i + 1;
  while (n < STEPS.length && STEPS[n].when && !STEPS[n].when()) n++;
  push(n < STEPS.length ? Onb(n) : Done());
}
function Done() {
  return {
    view() {
      const a = S.a, team = a.band === "club" || a.band === "crew";
      const rows = [["악기", (a.instrument || []).map(k => INST[k]).join(", ")], ["내 파트", INST[myInst()]],
        ["활동", { club: "동아리 밴드", crew: "직장인·친구 밴드", seek: "팀 찾는 중", solo: "혼자 연습" }[a.band] || "-"]];
      if (a.showDate) rows.push(["공연", dday(a.showDate)]);
      return {
        body: `<div class="hero-ic">${ic("check", 44)}</div><h1 class="q">준비가 끝났어요</h1>
          <p class="hint">${team ? "팀을 만들고 카톡으로 멤버를 초대해요." : "내 연습 공간에서 악보를 보며 연주해 봐요."}</p>
          <div class="card">${rows.map(r => `<div class="row" style="cursor:default"><span class="main">${r[0]}</span><b>${esc(r[1])}</b></div>`).join("")}</div>`,
        foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-go>${team ? "팀 만들기" : "연습 시작하기"}</button>`,
      };
    },
    mount(el) {
      $("[data-go]", el).onclick = () => {
        if (S.a.band === "club" || S.a.band === "crew") push(TeamNew());
        else { seedTeam("내 연습", ""); S.onboarded = true; save(); setRoot(Home()); }
      };
    },
  };
}
function TeamNew() {
  const def = S.a.band === "club" ? "정기공연 준비팀" : "우리 밴드";
  return {
    view: () => ({ title: "팀 만들기", body: `<h1 class="q">팀 이름을 정해 주세요</h1><p class="hint">멤버에게 보낼 초대 링크에 이 이름이 보여요.</p>
      <div class="field"><label for="team-name">팀 이름</label><input id="team-name" maxlength="20" value="${esc(def)}"></div>
      <div class="field"><label for="team-date">공연 날짜</label><input id="team-date" type="date" value="${esc(S.a.showDate || "")}"><div class="dday" data-dday>${dday(S.a.showDate)}</div></div>`,
      foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-make>팀 만들기</button>` }),
    mount(el) {
      const name = $("#team-name", el), date = $("#team-date", el), btn = $("[data-make]", el);
      const sync = () => { btn.disabled = !name.value.trim(); $("[data-dday]", el).textContent = dday(date.value); };
      name.oninput = sync; date.oninput = sync;
      btn.onclick = () => { seedTeam(name.value.trim(), date.value); S.onboarded = true; save(); setRoot(Home()); setTimeout(() => toast("팀을 만들었어요. 멤버를 초대해 보세요"), 500); };
    },
  };
}

// ---------------------------------------------------------------- 홈(합주 탭)
function songState(s) {
  const up = uploaded(s).length, total = s.parts.length, mine = s.parts.find(p => p.mine);
  if (up === total) return { pct: 100, b: ["ok", "모두 올림"] };
  if (mine.status !== "done") return { pct: Math.round(up / total * 100), b: ["neutral", "내 차례"] };
  return { pct: Math.round(up / total * 100), b: ["empty", `${total - up}파트 남음`] };
}
function Home() {
  return {
    tab: "home",
    view() {
      const t = S.team, d = dday(t.showDate), ready = S.songs.filter(s => songState(s).pct === 100).length;
      const songs = S.songs.map(s => { const st = songState(s);
        return `<button class="song" type="button" data-song="${s.id}"><span class="top"><b>${esc(s.title)}</b>${badge(...st.b)}</span>
          <span class="meter"><i style="width:${st.pct}%"></i></span><span class="cap num">${s.bpm}BPM · ${s.parts.length}파트 중 ${uploaded(s).length}파트 올림</span></button>`; }).join("");
      return {
        noNav: true,
        body: `<div class="navbar" style="padding:0;margin:0 -8px"><span style="flex:1"></span>${t.solo ? "" : `<button class="icon-btn" type="button" data-invite aria-label="멤버 초대">${ic("link")}</button>`}</div>
          <h1 class="large">${t.solo ? "내 연습" : "합주"}</h1>
          ${t.solo ? "" : `<div class="team"><b>${esc(t.name)}</b><span class="num">${d ? `공연 ${d} · ` : ""}${S.songs.length}곡 중 ${ready}곡 완성 · 멤버 ${t.members.length}명</span></div>`}
          ${S.a.band === "seek" ? `<button class="ak-door" type="button" data-door="빈 파트 모집">${ic("search", 24, "ak-ic")}<span><strong>빈 파트 구하는 팀 찾기</strong><small>열리면 바로 알려드릴게요</small></span></button>` : ""}
          <p class="sec">셋리스트</p>${songs}`,
      };
    },
    mount(el) {
      $$("[data-song]", el).forEach(b => b.onclick = () => push(Song(b.dataset.song)));
      $("[data-invite]", el)?.addEventListener("click", invite);
      $$("[data-door]", el).forEach(b => b.onclick = () => toast(`${b.dataset.door} 기능은 준비 중이에요. 열리면 알려드릴게요`));
    },
  };
}
function invite() {
  const link = "akkida-web.vercel.app/j/" + (S.team.name.length * 7919).toString(36) + "x";
  sheet(`<h2>멤버 초대</h2><p class="hint">이 링크를 카톡 단톡방에 보내면 멤버가 같은 셋리스트로 들어와요.</p>
    <div class="linkbox"><span>${link}</span><button class="ak-btn ak-btn-secondary ak-btn-sm" type="button" data-copy>복사</button></div>
    <button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-share>카카오톡으로 보내기</button>`, (sh, close) => {
    $("[data-copy]", sh).onclick = async () => { try { await navigator.clipboard.writeText("https://" + link); toast("링크를 복사했어요"); } catch { toast("길게 눌러 링크를 복사해 주세요"); } };
    $("[data-share]", sh).onclick = async () => {
      try { if (navigator.share) { await navigator.share({ title: S.team.name, text: `${S.team.name} 합주 초대`, url: "https://" + link }); close(); return; } } catch {}
      try { await navigator.clipboard.writeText("https://" + link); } catch {}
      close(); toast("링크를 복사했어요. 단톡방에 붙여넣어 주세요");
    };
  });
}

// ---------------------------------------------------------------- 곡
function Song(id) {
  return {
    tab: "home",
    view() {
      const s = findSong(id), mine = s.parts.find(p => p.mine), sc = S.scores[id];
      const rows = s.parts.slice().sort((a, b) => (a.order || 9) - (b.order || 9)).map(p => {
        const b = p.status === "done" ? ["ok", "올림"] : p.mine ? ["neutral", "내 차례"] : ["empty", "비어 있음"];
        const sub = p.status === "done" ? `${p.mine ? "나" : esc(p.who)} · ${p.order}번째로 올림` : p.mine ? "나" : esc(p.who);
        return `<div class="row" style="cursor:default">${ic(p.inst, 24)}<span class="main">${INST[p.inst]}<small>${sub}</small></span>${badge(...b)}</div>`;
      }).join("");
      return {
        title: s.title,
        body: `<h1 class="q" style="margin-top:0">${esc(s.title)}</h1><p class="hint num">자작곡 · ${s.bpm}BPM · ${BARS}마디 · 파트별 악보</p>
          <div class="card">${rows}</div>
          ${sc ? `<p class="cap">${ic("lock", 16)} 내 최고 점수 ${sc.best}점 · ${sc.tries}번 도전 (나만 봐요)</p>` : ""}
          ${uploaded(s).length ? `<button class="ak-btn ak-btn-tertiary ak-btn-block" type="button" data-mix>${ic("sliders", 20, "ak-ic")}합주 듣기 · 소리 크기 조절</button>` : ""}`,
        foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-play>${ic("mic", 20, "ak-ic")}${uploaded(s).filter(p => !p.mine).length ? "이 위에 연주하기" : "메트로놈 들으며 연주하기"}</button>
          ${mine.status === "done" ? '<p class="cap" style="text-align:center">다시 연주해서 더 좋은 연주로 바꿀 수 있어요</p>' : ""}`,
      };
    },
    mount(el) {
      $("[data-play]", el).onclick = () => push(Level(id));
      $("[data-mix]", el)?.addEventListener("click", () => push(Mixer(id)));
    },
  };
}

// ---------------------------------------------------------------- 기준 음량 맞추기
let mic = null; // 기준 음량 화면에서 연 마이크를 연주 화면까지 그대로 씀
function closeMic() { if (mic) { mic.getTracks().forEach(t => t.stop()); mic = null; } }
function Level(id) {
  let raf = 0, src = null;
  return {
    view: () => ({
      title: "소리 맞추기",
      body: `<h1 class="q" style="margin-top:0">평소처럼 세게 쳐 보세요</h1>
        <p class="hint">막대가 초록 칸에 들어오면 다른 멤버와 같은 크기로 녹음돼요. 이어폰을 꽂아 주세요.</p>
        <div class="meter-wrap"><div class="lvmeter" role="meter" aria-label="입력 음량" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="clip"></div><div class="zone"></div><div class="lvl" data-lvl></div></div>
          <div class="scale" aria-hidden="true"><span>너무 커요</span><span class="z">기준 음량</span><span>작아요</span></div></div>
        <div class="lvl-msg" data-msg>마이크를 켜는 중이에요</div>`,
      foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-go disabled>악보 보며 시작하기</button>
        <label class="ak-btn ak-btn-tertiary ak-btn-block" for="take-file">${ic("upload", 20, "ak-ic")}녹음 파일 가져오기</label><input id="take-file" type="file" accept="audio/*,video/*" hidden>
        <button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-sample>예시 연주로 해보기</button>`,
    }),
    async mount(el) {
      const s = findSong(id), msg = $("[data-msg]", el), lvl = $("[data-lvl]", el), meter = $(".lvmeter", el), goBtn = $("[data-go]", el);
      $("[data-sample]", el).onclick = () => {
        const take = synth({ sr: sr(), bpm: s.bpm, bars: BARS, seed: 11, drift: true, latencyMs: 150, freqMul: 4, roots: s.chords.map(c => ROOT_HZ[c[0]] / 2) }).part;
        finishTake(id, take, true);
      };
      $("#take-file", el).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        msg.textContent = "파일을 읽고 있어요";
        try { finishTake(id, mono(await ac().decodeAudioData(await f.arrayBuffer())), true); } catch { msg.textContent = "이 파일은 읽을 수 없어요. mp3·m4a·wav 파일을 골라 주세요."; }
      };
      goBtn.onclick = () => { cancelAnimationFrame(raf); replace(Karaoke(id)); };
      try {
        mic = mic || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch { msg.textContent = "마이크를 쓸 수 없어요. 설정에서 마이크를 허용하거나, 녹음 파일을 가져와 주세요."; return; }
      goBtn.disabled = false;
      const c = ac(); src = c.createMediaStreamSource(mic); const an = c.createAnalyser(); an.fftSize = 2048; src.connect(an);
      const buf = new Float32Array(an.fftSize); let shown = 0;
      const tick = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0, peak = 0; for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); }
        const db = 20 * Math.log10(Math.sqrt(sum / buf.length) + 1e-9), v = Math.max(0, Math.min(100, (db + 60) / 60 * 100));
        shown = Math.max(v, shown - 1.5);
        lvl.style.height = shown + "%"; meter.setAttribute("aria-valuenow", Math.round(shown));
        msg.className = "lvl-msg";
        if (peak > 0.98) { msg.textContent = "너무 커요. 폰을 앰프에서 조금 떨어뜨려 주세요"; msg.classList.add("bad"); }
        else if (shown >= 50 && shown <= 77) { msg.innerHTML = ic("check", 20) + "<span>좋아요, 이 크기로 녹음할게요</span>"; msg.classList.add("good"); }
        else if (shown > 77) msg.textContent = "조금 커요. 살짝 약하게 쳐 보세요";
        else msg.textContent = shown < 15 ? "소리가 들리지 않아요. 연주해 보세요" : "작아요. 폰을 악기나 앰프 쪽으로 가까이 두세요";
        raf = requestAnimationFrame(tick);
      };
      tick();
    },
    leave() { cancelAnimationFrame(raf); try { src && src.disconnect(); } catch {} },
  };
}
function mono(buf) { const out = new Float32Array(buf.length); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels; } return out; }

// ---------------------------------------------------------------- 악보 보며 연주 (노래방)
function Karaoke(id) {
  let raf = 0, rec = null, cancelled = false;
  const s = findSong(id), mine = s.parts.find(p => p.mine), others = uploaded(s).filter(p => !p.mine);
  const on = { metro: !others.length }; others.forEach(p => on[p.inst] = true);
  const tries = (S.scores[id]?.tries || 0) + 1;
  return {
    view() {
      const chips = [`<button class="chip" type="button" data-src="metro" aria-pressed="${on.metro}">메트로놈</button>`,
        ...others.map(p => `<button class="chip" type="button" data-src="${p.inst}" aria-pressed="true">${INST[p.inst]} ${esc(p.who)}</button>`)].join("");
      return {
        title: `${INST[mine.inst]} · ${tries}번째 도전`,
        body: `<div class="chips" role="group" aria-label="들을 소리">${chips}</div>
          <div class="kstage" data-stage></div>
          <div class="count num" data-count aria-live="polite"></div>
          <div class="ak-progress"><i data-prog style="width:0%"></i></div>
          <div class="time num"><span data-t>0:00</span><span>${fmt(BARS * 4 * 60 / s.bpm)}</span></div>`,
        foot: `<button class="ak-btn ak-btn-tertiary ak-btn-block" type="button" data-stop>그만하기</button>`,
      };
    },
    async mount(el) {
      const stage = $("[data-stage]", el), cnt = $("[data-count]", el), prog = $("[data-prog]", el), tEl = $("[data-t]", el);
      const notes = notesFor(s, mine.inst), clef = mine.inst === "bass" ? "bass" : "treble", lyr = mine.inst === "vocal";
      const barDur = 4 * 60 / s.bpm, songDur = BARS * barDur;
      let lastKey = "";
      const render = (bar, beat) => {
        const line = Math.floor(bar / 4), key = line + ":" + (bar % 4) + ":" + beat;
        if (key === lastKey) return; lastKey = key;
        const cur = notes.slice(line * 4, line * 4 + 4), nx = notes.slice(line * 4 + 4, line * 4 + 8);
        stage.innerHTML = staffSVG(cur, clef, line * 4 + 1, { cur: bar % 4, beat, lyrics: lyr }) + (nx.length ? staffSVG(nx, clef, line * 4 + 5, { next: true, lyrics: lyr }) : "");
      };
      render(0, 0);
      $$("[data-src]", el).forEach(b => b.onclick = () => {
        const k = b.dataset.src; on[k] = !on[k]; b.setAttribute("aria-pressed", String(on[k]));
        player && player.setGain(k, on[k] ? (k === "metro" ? 0.8 : gainOf(mixOf(s)[k] ?? REF)) : 0);
      });
      $("[data-stop]", el).onclick = () => { cancelled = true; try { rec && rec.state === "recording" && rec.stop(); } catch {} stopAll(); pop(); };
      // 반주 준비
      const tracks = [{ id: "metro", data: metro(s), gain: on.metro ? 0.8 : 0 }];
      for (const p of others) tracks.push({ id: p.inst, data: await partAudio(s, p), gain: gainOf(mixOf(s)[p.inst] ?? REF) });
      if (!mic) { try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); } catch { toast("마이크를 쓸 수 없어요"); pop(); return; } }
      for (let k = 3; k > 0 && !cancelled; k--) { cnt.textContent = k; await wait(800); }
      if (cancelled) return;
      cnt.textContent = "";
      const chunks = [];
      rec = new MediaRecorder(mic);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        cancelAnimationFrame(raf); stopAll();
        if (cancelled) return;
        cnt.textContent = "점수를 매기고 있어요";
        try { finishTake(id, mono(await ac().decodeAudioData(await new Blob(chunks, { type: rec.mimeType }).arrayBuffer())), false); }
        catch (e) { console.warn("[akkida] 녹음 읽기 실패", e, chunks.length); toast("녹음을 읽지 못했어요. 다시 해 주세요"); pop(); }
      };
      rec.onstart = () => {
        const pl = playTracks(tracks, () => rec && rec.state === "recording" && rec.stop());
        const tick = () => {
          const t = Math.max(0, ac().currentTime - pl.startAt);
          const bar = Math.min(BARS - 1, Math.floor(t / barDur)), beat = Math.min(3, Math.floor((t % barDur) / (barDur / 4)));
          render(bar, beat);
          prog.style.width = Math.min(100, t / songDur * 100) + "%"; tEl.textContent = fmt(Math.min(t, songDur));
          raf = requestAnimationFrame(tick);
        };
        tick();
      };
      rec.start();
    },
    leave() { cancelled = true; cancelAnimationFrame(raf); stopAll(); try { rec && rec.state === "recording" && rec.stop(); } catch {} },
  };
}

// ---------------------------------------------------------------- 점수 (나만 봄)
let lastTake = null;
function finishTake(id, take, fromOutside) {
  const s = findSong(id);
  replace({ back: false, view: () => ({ title: "점수", body: `<div class="rec-stage"><div class="spin" role="img" aria-label="점수 매기는 중"></div><h1 class="q" style="text-align:center">점수를 매기고 있어요</h1><p class="hint">박과 템포를 메트로놈 기준으로 확인해요</p></div>` }) });
  setTimeout(() => {
    const r = scoreTake(metro(s), take, sr(), s.bpm, BARS);
    const sc = S.scores[id] = S.scores[id] || { best: 0, tries: 0, last: 0 };
    const prevBest = sc.best; sc.tries++; sc.last = r.score; sc.best = Math.max(sc.best, r.score); save();
    lastTake = { id, data: norm(r.aligned), score: r.score };
    closeMic();
    replace(Score(id, r, prevBest));
  }, 400);
}
function Score(id, r, prevBest) {
  return {
    back: false,
    view() {
      const sc = S.scores[id], diff = prevBest ? r.score - prevBest : 0;
      return {
        title: `${INST[myInst()]} · ${sc.tries}번째 도전`,
        body: `<div class="score"><h1 class="sr-only">점수</h1><div class="big num" data-score aria-live="polite">${r.score}<small>점</small></div>
          <p class="say">${esc(r.comment)}</p>
          <span class="cap">오늘 최고 ${sc.best}점${prevBest ? ` · 지난 최고보다 ${diff >= 0 ? "+" : ""}${diff}점` : ""}</span>
          <span class="cap">${ic("lock", 16)} 점수는 나만 봐요</span></div>
          ${r.details.length ? `<details class="more"><summary>어디서 깎였나요?</summary><ul>${r.details.map(d => `<li>${esc(d)}</li>`).join("")}</ul></details>` : ""}`,
        foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-up>${ic("upload", 20, "ak-ic")}들어보고 올리기</button>
          <button class="ak-btn ak-btn-secondary ak-btn-block" type="button" data-retry>${ic("retry", 20, "ak-ic")}다시 하기</button>
          <button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-close>올리지 않고 나가기</button>`,
      };
    },
    mount(el) {
      const big = $("[data-score]", el);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) { let n = 0; const it = setInterval(() => { n = Math.min(r.score, n + 3); big.innerHTML = n + "<small>점</small>"; if (n >= r.score) clearInterval(it); }, 25); }
      $("[data-retry]", el).onclick = () => replace(Level(id));
      $("[data-close]", el).onclick = () => pop();
      $("[data-up]", el).onclick = () => uploadSheet(id);
    },
  };
}
function uploadSheet(id) {
  const s = findSong(id), mine = s.parts.find(p => p.mine);
  sheet(`<h2>이 연주를 팀에 올릴까요?</h2>
    <button class="row card" type="button" data-p="mine">${ic("play", 20)}<span class="main">내 ${INST[mine.inst]}만 듣기</span></button>
    <button class="row card" type="button" data-p="mix">${ic("play", 20)}<span class="main">합주로 듣기</span></button>
    <p class="hint">팀원에게는 ‘올림’만 보이고 점수는 보이지 않아요. 올린 뒤에도 더 좋은 연주로 바꿀 수 있어요.</p>
    <button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-ok>${ic("upload", 20, "ak-ic")}올리기</button>
    <button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-more>한 번 더 해볼게요</button>`, (sh, close) => {
    const setIcon = (b, playing) => { $$("[data-p] svg", sh).forEach(x => x.innerHTML = P.play); if (playing) b.querySelector("svg").innerHTML = P.stop; };
    $$("[data-p]", sh).forEach(b => b.onclick = async () => {
      if (b.dataset.on) { stopAll(); b.dataset.on = ""; setIcon(b, false); return; }
      $$("[data-p]", sh).forEach(x => x.dataset.on = ""); b.dataset.on = "1"; setIcon(b, true);
      const tracks = [{ id: "me", data: lastTake.data, gain: 1 }];
      if (b.dataset.p === "mix") for (const p of uploaded(s).filter(p => !p.mine)) tracks.push({ id: p.inst, data: await partAudio(s, p), gain: gainOf(mixOf(s)[p.inst] ?? REF) });
      playTracks(tracks, () => { b.dataset.on = ""; setIcon(b, false); });
    });
    $("[data-more]", sh).onclick = () => { close(); setTimeout(() => replace(Level(id)), 200); };
    $("[data-ok]", sh).onclick = async () => {
      await idb.put("take:" + id, lastTake.data);
      cache["t" + id] = lastTake.data;
      if (mine.status !== "done") { mine.order = uploaded(s).length + 1; mine.status = "done"; }
      save(); close();
      setTimeout(() => { pop(); toast("올렸어요. 팀원 화면에 ‘올림’으로 보여요"); }, 250);
    };
  });
}

// ---------------------------------------------------------------- 합주 듣기 · 소리 크기 조절
function Mixer(id) {
  let playing = false;
  return {
    tab: "home",
    view() {
      const s = findSong(id), m = mixOf(s);
      const rows = uploaded(s).map(p => { const v = m[p.inst] ?? REF;
        return `<div class="mrow"><label for="mx-${p.inst}">${INST[p.inst]}<small>${p.mine ? "나" : esc(p.who)}</small></label>
          <span class="mtrack"><input type="range" id="mx-${p.inst}" min="0" max="100" value="${v}" data-inst="${p.inst}"><span class="ref" aria-hidden="true"><i style="left:${REF}%"></i></span></span>
          <output for="mx-${p.inst}" data-out="${p.inst}">${v}</output></div>`; }).join("");
      return {
        title: "합주 듣기",
        body: `<h1 class="q" style="margin-top:0">파트별 소리 크기</h1>
          <p class="hint">초록 선이 기준 음량이에요. 베이스가 너무 크면 줄여 보세요. 들으면서 바로 바뀌어요.</p>
          <div class="mix">${rows}</div>
          <button class="ak-btn ak-btn-secondary ak-btn-block" type="button" data-auto>모두 기준 음량으로</button>
          <p class="cap">조절한 크기는 내가 듣는 소리에만 적용돼요.${S.team.leader && !S.team.solo ? " 팀장은 팀 기본 소리로 저장할 수 있어요." : ""}</p>`,
        foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-play>${ic("play", 20, "ak-ic")}<span>합주 재생</span></button>
          ${S.team.leader && !S.team.solo ? '<button class="ak-btn ak-btn-tertiary ak-btn-block" type="button" data-team>팀 기본 소리로 저장</button>' : ""}`,
      };
    },
    mount(el) {
      const s = findSong(id), btn = $("[data-play]", el);
      const setBtn = on => { playing = on; btn.querySelector("svg").innerHTML = on ? P.stop : P.play; btn.querySelector("span").textContent = on ? "멈추기" : "합주 재생"; };
      $$("input[type=range]", el).forEach(r => r.oninput = () => {
        const k = r.dataset.inst, v = +r.value;
        S.mix[id] = S.mix[id] || {}; S.mix[id][k] = v; save();
        $(`[data-out="${k}"]`, el).textContent = v;
        player && player.setGain(k, gainOf(v));
      });
      $("[data-auto]", el).onclick = () => { $$("input[type=range]", el).forEach(r => { r.value = REF; r.oninput(); }); toast("모두 기준 음량으로 맞췄어요"); };
      $("[data-team]", el)?.addEventListener("click", () => { S.teamMix[id] = Object.assign({}, mixOf(s)); save(); toast("팀 기본 소리로 저장했어요"); });
      btn.onclick = async () => {
        if (playing) { stopAll(); setBtn(false); return; }
        setBtn(true);
        const m = mixOf(s), tracks = [];
        for (const p of uploaded(s)) tracks.push({ id: p.inst, data: await partAudio(s, p), gain: gainOf(m[p.inst] ?? REF) });
        if (tracks.some(t => !t.data)) toast("내 연주는 올린 기기에서만 들을 수 있어요");
        playTracks(tracks, () => setBtn(false));
      };
    },
    leave: stopAll,
  };
}

// ---------------------------------------------------------------- 기록 탭 (나만 봄)
function Records() {
  return {
    tab: "record",
    view() {
      const rows = S.songs.map(s => { const sc = S.scores[s.id], mine = s.parts.find(p => p.mine);
        return `<button class="row" type="button" data-song="${s.id}">${ic(mine.status === "done" ? "check" : "mic", 24)}<span class="main">${esc(s.title)}<small class="num">${sc ? `최고 ${sc.best}점 · ${sc.tries}번 도전` : "아직 연주 안 함"}${mine.status === "done" ? " · 올림" : ""}</small></span><span class="chev">${ic("chev", 20)}</span></button>`; }).join("");
      return {
        noNav: true,
        body: `<div style="height:48px"></div><h1 class="large">내 기록</h1>
          <p class="hint">${ic("lock", 16)} 점수는 나만 봐요. 곡을 눌러 다시 도전하세요.</p>
          <div class="card">${rows}</div>`,
      };
    },
    mount(el) { $$("[data-song]", el).forEach(b => b.onclick = () => push(Song(b.dataset.song))); },
  };
}

// ---------------------------------------------------------------- 내 정보 탭
function Me() {
  return {
    tab: "me",
    view() {
      const a = S.a;
      const rows = [["악기", (a.instrument || []).map(k => INST[k]).join(", ") || "-"], ["연주 경력", { lt1: "1년 미만", "1to3": "1~3년", "3to5": "3~5년", gt5: "5년 이상" }[a.career] || "-"],
        ["활동", { club: "동아리 밴드", crew: "직장인·친구 밴드", seek: "팀 찾는 중", solo: "혼자 연습" }[a.band] || "-"], ["팀", S.team ? S.team.name : "-"],
        ["공연", S.team && S.team.showDate ? `${S.team.showDate} (${dday(S.team.showDate)})` : "-"],
        ["가장 아쉬운 점", { time: "시간 맞추기", cost: "합주실 비용", who: "누가 틀렸는지 모름", songs: "곡 정리" }[a.pain] || "-"],
        ["마이크", a.mic || "-"], ["알림", a.push || "-"]];
      return {
        noNav: true,
        body: `<div style="height:48px"></div><h1 class="large">내 정보</h1>
          <div class="card">${rows.map(r => `<div class="row" style="cursor:default"><span class="main">${r[0]}</span><span class="num">${esc(r[1])}</span></div>`).join("")}</div>
          <p class="sec">앱</p><div class="card"><button class="row" type="button" data-reset>${ic("retry", 24)}<span class="main">처음부터 다시 시작하기<small>답변, 팀, 녹음, 점수를 이 기기에서 지워요</small></span></button></div>`,
      };
    },
    mount(el) {
      $("[data-reset]", el).onclick = () => sheet(`<h2>처음부터 다시 시작할까요?</h2><p class="hint">이 기기에 저장된 답변, 팀, 녹음, 점수가 모두 지워져요.</p>
        <button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-yes>지우고 다시 시작하기</button><button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-no>그대로 두기</button>`, (sh, close) => {
        $("[data-no]", sh).onclick = close;
        $("[data-yes]", sh).onclick = async () => { S = blank(); save(); await idb.clear(); for (const k in cache) delete cache[k]; close(); setRoot(Onb(0)); };
      });
    },
  };
}

// ---------------------------------------------------------------- 시작
function clock() { const d = new Date(); $("#clock").textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; }
clock(); setInterval(clock, 30000);
document.addEventListener("pointerdown", () => ac(), { once: true });
document.addEventListener("keydown", e => { if (e.key === "Escape") $(".dim")?.click(); });
try { localStorage.removeItem("akkida-app-v1"); } catch {}
setRoot(S.onboarded && S.team ? Home() : Onb(0));
