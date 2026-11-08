// 악기다 iOS 앱 시제품: 온보딩 → 팀 → 셋리스트 → 녹음 → 분석 → 마디 메모 → 구간 연습
import { synth, analyze, mix, FLAG_MS } from "./engine.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------- 아이콘 (디자인 시스템과 같은 도형)
const P = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  play: '<path d="M7 5v14l11-7z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>', pen: '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',
  sync: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
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
};
const ic = (n, s = 24, cls = "ic") => `<svg class="${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
const INST = { vocal: "보컬", guitar: "기타", bass: "베이스", drum: "드럼", keys: "건반", etc: "그 밖의 악기" };
const FREQ = { guitar: 4, bass: 2, vocal: 3, keys: 3, drum: 6, etc: 3 }; // 예시 음원 음높이(기준 트랙 베이스음의 배수)

// ---------------------------------------------------------------- 상태 (이 기기에 저장)
const KEY = "akkida-app-v1";
let S = load();
function blank() { return { onboarded: false, a: {}, team: null, songs: [], memos: {}, results: {} }; }
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || blank(); } catch { return blank(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

const mem = { rec: {}, aligned: {}, raw: {} }; // 녹음 원본·정렬본은 메모리에만

// ---------------------------------------------------------------- 오디오
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
const sr = () => ac().sampleRate;
const gcache = {};
function guide(song) {
  const k = song.id + ":" + sr();
  return gcache[k] ||= synth({ sr: sr(), bpm: song.bpm, seed: 1, drift: false, latencyMs: 0 }).guide;
}
function partAudio(song, part) {
  if (part.mine) return mem.rec[song.id] || null;
  const k = song.id + part.inst + ":" + sr();
  return mem.raw[k] ||= synth({ sr: sr(), bpm: song.bpm, seed: part.seed, drift: part.drift, latencyMs: part.lat, freqMul: FREQ[part.inst] || 4 }).part;
}
let src = null;
function stopAudio() { if (src) { try { src.onended = null; src.stop(); } catch {} src = null; } }
function play(data, { loop, from = 0, to = 0, rate = 1, onEnd } = {}) {
  stopAudio();
  const c = ac(), b = c.createBuffer(1, data.length, sr());
  b.copyToChannel(data, 0);
  const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; s.connect(c.destination);
  if (loop) { s.loop = true; s.loopStart = from; s.loopEnd = to; }
  s.onended = () => { if (src === s) src = null; onEnd && onEnd(); };
  s.start(0, from); src = s;
  return { startAt: c.currentTime, dur: data.length / sr() };
}

// ---------------------------------------------------------------- 분석 결과
const rkey = (song, part) => song.id + ":" + part.inst;
function result(song, part) { return S.results[rkey(song, part)]; }
function runAnalysis(song, part) {
  const g = guide(song), p = partAudio(song, part);
  if (!p) return null;
  const n = Math.max(g.length, p.length), pad = x => { if (x.length === n) return x; const o = new Float32Array(n); o.set(x.subarray(0, n)); return o; };
  const r = analyze(pad(g), pad(p), sr(), song.bpm);
  mem.aligned[rkey(song, part)] = r.aligned;
  const out = {
    offsetMs: Math.round(r.offsetMs), beats: r.dev.length,
    issues: r.issues.map(i => ({ from: i.from, to: i.to, mean: Math.round(i.mean), start: +i.start.toFixed(1), late: i.late })),
    perBar: r.perBar.map(b => ({ bar: b.bar, mean: Math.round(b.mean) })),
    dev: r.dev.map(d => [+d.t.toFixed(2), Math.round(d.ms)]),
  };
  S.results[rkey(song, part)] = out; save();
  return out;
}
let bgBusy = false;
function analyzeInBackground() {
  if (bgBusy) return;
  for (const song of S.songs) for (const part of song.parts) {
    if (part.status === "done" && !part.mine && !result(song, part)) {
      bgBusy = true;
      setTimeout(() => { runAnalysis(song, part); bgBusy = false; refreshTop(); analyzeInBackground(); }, 60);
      return;
    }
  }
}

// ---------------------------------------------------------------- 곡 상태
function songState(song) {
  let ready = 0, lateTxt = null, empty = 0;
  for (const p of song.parts) {
    if (p.status !== "done") { empty++; continue; }
    const r = result(song, p);
    const late = r && r.issues.find(i => i.late);
    if (late && !lateTxt) lateTxt = `${INST[p.inst]} ${late.from === late.to ? late.from : late.from + "~" + late.to}마디`;
    if (r && !r.issues.length) ready++;
  }
  const pct = Math.round(ready / song.parts.length * 100);
  const badge = pct === 100 ? ["ok", "준비됨"] : lateTxt ? ["late", lateTxt] : empty ? ["empty", `${empty}파트 비어 있음`] : ["neutral", "분석 중"];
  return { pct, badge };
}
const badge = ([tone, text]) => `<span class="ak-badge ak-badge-${tone}">${tone === "ok" ? ic("check", 16, "ak-ic") : tone === "late" ? ic("warn", 16, "ak-ic") : ""}${esc(text)}</span>`;
function dday(v) {
  if (!v) return "";
  const d = new Date(v + "T00:00:00"), t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.round((d - t) / 86400000);
  return isNaN(n) ? "" : n > 0 ? "D-" + n : n === 0 ? "D-day" : "지난 공연";
}
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 ? a : b); };
const myInst = () => (S.a.instrument && S.a.instrument[0]) || "bass";

function seedTeam(name, showDate) {
  const mine = myInst();
  const pool = [["guitar", "서연"], ["bass", "하늘"], ["vocal", "지호"], ["keys", "유나"]].filter(x => x[0] !== mine);
  const solo = S.a.band === "seek" || S.a.band === "solo";
  const mk = (title, bpm, others) => ({ id: "s" + Math.random().toString(36).slice(2, 8), title, bpm,
    parts: [{ inst: mine, who: "나", mine: true, status: "empty" }, ...others] });
  if (solo) {
    S.team = { name: name || "내 연습", solo: true, showDate: showDate || "" };
    S.songs = [mk("Don't Look Back in Anger", 100, []), mk("오늘같은 밤이면", 88, [])];
  } else {
    S.team = { name, showDate, members: ["나", "민준", pool[0][1], pool[1][1]] };
    S.songs = [
      mk("Don't Look Back in Anger", 100, [{ inst: pool[0][0], who: pool[0][1], status: "done", seed: 7, drift: true, lat: 180 }, { inst: pool[1][0], who: pool[1][1], status: "empty" }]),
      mk("주저하는 연인들을 위해", 92, [{ inst: pool[0][0], who: pool[0][1], status: "done", seed: 3, drift: false, lat: 120 }, { inst: pool[1][0], who: pool[1][1], status: "done", seed: 5, drift: false, lat: 90 }]),
      mk("Seven Nation Army", 124, [{ inst: pool[0][0], who: pool[0][1], status: "empty" }, { inst: pool[1][0], who: pool[1][1], status: "empty" }]),
    ];
  }
  S.memos = {}; S.results = {}; save();
}

// ---------------------------------------------------------------- 화면 쌓기
const vp = $("#vp"), tabbar = $("#tabbar");
let stack = [];
function build(def) {
  const el = document.createElement("section");
  el.className = "scr";
  draw(el, def);
  return el;
}
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
  const prev = stack[stack.length - 1];
  const el = build(def);
  el.classList.add(how === "fade" ? "fade" : "in-r");
  vp.append(el);
  el.getBoundingClientRect();
  requestAnimationFrame(() => el.classList.remove("in-r", "fade"));
  if (prev) { prev.el.classList.add("behind"); prev.el.inert = true; prev.def.leave && prev.def.leave(); }
  stack.push({ def, el });
  syncTab(); focusTop();
}
function pop() {
  if (stack.length < 2) return;
  const cur = stack.pop(), prev = stack[stack.length - 1];
  cur.def.leave && cur.def.leave();
  cur.el.classList.add("out-r"); setTimeout(() => cur.el.remove(), 460);
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
  stack = [];
  push(def, "fade");
}
function refreshTop() { const t = stack[stack.length - 1]; if (t && t.def.live) draw(t.el, t.def); }
function syncTab() {
  const t = stack[stack.length - 1], tab = t && t.def.tab;
  tabbar.hidden = !tab;
  $$(".tab", tabbar).forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
}
function focusTop() { const t = stack[stack.length - 1]; const h = t && $("h1", t.el); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
tabbar.addEventListener("click", e => {
  const b = e.target.closest(".tab"); if (!b) return;
  stopAudio();
  setRoot({ home: Home, practice: Practice, me: Me }[b.dataset.tab]());
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
  const close = () => { dim.classList.remove("on"); sh.classList.remove("on"); setTimeout(() => { dim.remove(); sh.remove(); }, 460); };
  dim.onclick = close;
  mount && mount(sh, close);
  setTimeout(() => ($("textarea,input", sh) || $("button", sh))?.focus(), 300);
  return close;
}

// ---------------------------------------------------------------- 온보딩
const STEPS = [
  { id: "instrument", multi: true, grid: true, q: "어떤 악기를 연주하세요?", hint: "여러 개를 골라도 돼요. 처음 고른 악기가 내 파트가 돼요.",
    opts: [["vocal", "보컬"], ["guitar", "기타"], ["bass", "베이스"], ["drum", "드럼"], ["keys", "건반"], ["etc", "그 밖의 악기"]].map(o => [...o, o[0]]) },
  { id: "career", skip: true, q: "연주한 지 얼마나 됐나요?", hint: "분석 결과를 설명하는 말투를 맞춰 드려요.",
    opts: [["lt1", "1년이 안 됐어요"], ["1to3", "1~3년"], ["3to5", "3~5년"], ["gt5", "5년 넘었어요"]] },
  { id: "band", q: "지금 밴드에서 활동하고 있나요?",
    opts: [["club", "네, 동아리 밴드예요", "users", "정기공연을 준비하는 학교·연합 동아리"], ["crew", "네, 직장인·친구 밴드예요", "users", "합주실을 빌려 모이는 팀"],
      ["seek", "아니요, 팀을 찾고 있어요", "search", "빈 파트를 구하는 곳에 들어가고 싶어요"], ["solo", "혼자 연습하고 있어요", "solo", "팀 없이 개인 연습부터"]] },
  { id: "show", date: true, when: () => S.a.band === "club" || S.a.band === "crew", q: "준비하는 공연이 있나요?", hint: "날짜를 알려주시면 곡별 준비 상태를 D-day에 맞춰 보여드려요.",
    opts: [["yes", "네, 날짜가 정해졌어요", "calendar"], ["no", "아직 없어요"]] },
  { id: "pain", skip: true, q: "합주할 때 가장 아쉬운 건 뭔가요?", hint: "하나만 골라 주세요.",
    opts: [["time", "멤버끼리 시간 맞추기가 어려워요", "clock"], ["cost", "합주실 비용과 시간이 아까워요", "won"], ["who", "누가 어디서 틀렸는지 모르겠어요", "q"], ["songs", "연습할 곡이 많아 정리가 안 돼요", "list"]] },
  { id: "mic", perm: "mic", icon: "mic", q: "녹음하려면 마이크가 필요해요",
    bullets: ["기준 트랙을 이어폰으로 들으며 내 파트만 녹음해요", "녹음은 팀에게만 보여요", "영상은 찍지 않아요. 소리만 녹음해요"], cta: "마이크 허용하기" },
  { id: "push", perm: "push", icon: "bell", q: "새 파트가 올라오면 알려드릴까요?",
    bullets: ["팀원이 녹음을 올리면 바로 합주를 들을 수 있어요", "밀린 마디에 메모가 달리면 알려드려요", "광고 알림은 보내지 않아요"], cta: "알림 받기" },
];
const visibleSteps = () => STEPS.filter(s => !s.when || s.when());
function Onb(i) {
  const s = STEPS[i];
  return {
    view() {
      const vis = visibleSteps(), pos = vis.indexOf(s), pct = Math.round(pos / vis.length * 100);
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
      const next = () => go(i);
      $("[data-skip]", el)?.addEventListener("click", next);
      $("[data-next]", el)?.addEventListener("click", next);
      $("[data-later]", el)?.addEventListener("click", () => { S.a[s.id] = "나중에"; save(); next(); });
      $("[data-allow]", el)?.addEventListener("click", async () => {
        S.a[s.id] = await ask(s.perm); save(); next();
      });
      $$(".ak-opt", el).forEach(b => b.addEventListener("click", () => {
        const k = b.dataset.k;
        if (s.multi) {
          const arr = S.a[s.id] = S.a[s.id] || [];
          const at = arr.indexOf(k); at >= 0 ? arr.splice(at, 1) : arr.push(k);
          b.setAttribute("aria-pressed", String(at < 0));
        } else {
          S.a[s.id] = k;
          $$(".ak-opt", el).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
          if (s.date) { $("[data-datebox]", el).hidden = k !== "yes"; if (k === "yes") { $("#show-date", el).focus(); save(); syncBtn(); return; } delete S.a.showDate; }
          save(); syncBtn(); setTimeout(next, 450); return;
        }
        save(); syncBtn();
      }));
      const inp = $("#show-date", el);
      inp?.addEventListener("input", () => { S.a.showDate = inp.value; $("[data-dday]", el).textContent = dday(inp.value); save(); syncBtn(); });
      function syncBtn() { const n = $("[data-next]", el); if (n) n.disabled = !ok(); }
    },
  };
  function ok() {
    const v = S.a[s.id];
    if (s.multi) return (v || []).length > 0;
    if (s.date && v === "yes") return !!S.a.showDate && dday(S.a.showDate).startsWith("D");
    return !!v;
  }
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
  if (n < STEPS.length) push(Onb(n)); else push(Done());
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
          <p class="hint">${team ? "팀을 만들고 카톡으로 멤버를 초대해요." : "내 연습 공간에서 기준 트랙 위에 녹음해 봐요."}</p>
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
function Home() {
  return {
    tab: "home", live: true,
    view() {
      const t = S.team, d = dday(t.showDate);
      const songs = S.songs.map(s => {
        const st = songState(s);
        return `<button class="song" type="button" data-song="${s.id}"><span class="top"><b>${esc(s.title)}</b>${badge(st.badge)}</span>
          <span class="meter"><i style="width:${st.pct}%"></i></span><span class="cap num">${s.bpm}BPM · 파트 ${s.parts.filter(p => p.status === "done").length}/${s.parts.length} 녹음 · 준비도 ${st.pct}%</span></button>`;
      }).join("");
      const ready = S.songs.filter(s => songState(s).pct === 100).length;
      return {
        noNav: true,
        body: `<div class="navbar" style="padding:0;margin:0 -8px"><span style="flex:1"></span><button class="icon-btn" type="button" data-invite aria-label="멤버 초대">${ic("link")}</button></div>
          <h1 class="large">${t.solo ? "내 연습" : "합주"}</h1>
          ${t.solo ? "" : `<div class="team"><b>${esc(t.name)}</b><span class="num">${d ? `공연 ${d} · ` : ""}${S.songs.length}곡 중 ${ready}곡 준비됨 · 멤버 ${t.members.length}명</span></div>`}
          ${S.a.band === "seek" ? `<button class="ak-door" type="button" data-door="빈 파트 모집">${ic("search", 24, "ak-ic")}<span><strong>빈 파트 구하는 팀 찾기</strong><small>열리면 바로 알려드릴게요</small></span></button>` : ""}
          <p class="sec">셋리스트</p>${songs}
          <button class="ak-btn ak-btn-tertiary ak-btn-block" type="button" data-add>${ic("plus", 20, "ak-ic")}곡 추가</button>
          ${t.solo ? "" : `<button class="ak-door" type="button" data-door="지난 학기 공연">${ic("archive", 24, "ak-ic")}<span><strong>지난 학기 공연 불러오기</strong><small>동아리 기록 · 곧 나와요</small></span></button>`}`,
      };
    },
    mount(el) {
      $$("[data-song]", el).forEach(b => b.onclick = () => push(Song(b.dataset.song)));
      $("[data-invite]", el).onclick = invite;
      $("[data-add]", el).onclick = addSong;
      $$("[data-door]", el).forEach(b => b.onclick = () => toast(`${b.dataset.door} 기능은 준비 중이에요. 열리면 알려드릴게요`));
      analyzeInBackground();
    },
  };
}
function invite() {
  const link = "akkida-web.vercel.app/j/" + (S.team.name.length * 7919).toString(36) + "x";
  sheet(`<h2>멤버 초대</h2><p class="hint">이 링크를 카톡 단톡방에 보내면, 앱이 없는 멤버도 웹에서 바로 녹음할 수 있어요.</p>
    <div class="linkbox"><span>${link}</span><button class="ak-btn ak-btn-secondary ak-btn-sm" type="button" data-copy>복사</button></div>
    <button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-share>카카오톡으로 보내기</button>`, (sh, close) => {
    $("[data-copy]", sh).onclick = async () => { try { await navigator.clipboard.writeText("https://" + link); toast("링크를 복사했어요"); } catch { toast("길게 눌러 링크를 복사해 주세요"); } };
    $("[data-share]", sh).onclick = async () => {
      try { if (navigator.share) { await navigator.share({ title: S.team.name, text: `${S.team.name} 합주 녹음 링크`, url: "https://" + link }); close(); return; } } catch {}
      try { await navigator.clipboard.writeText("https://" + link); } catch {}
      close(); toast("링크를 복사했어요. 단톡방에 붙여넣어 주세요");
    };
  });
}
function addSong() {
  sheet(`<h2>곡 추가</h2><div class="field"><label for="song-t">곡 제목</label><input id="song-t" maxlength="40" placeholder="예: Seven Nation Army"></div>
    <div class="field"><label for="song-b">템포(BPM)</label><input id="song-b" type="number" min="60" max="200" value="100" inputmode="numeric"></div>
    <button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-ok disabled>추가하기</button>`, (sh, close) => {
    const t = $("#song-t", sh), b = $("#song-b", sh), ok = $("[data-ok]", sh);
    t.oninput = () => ok.disabled = !t.value.trim();
    ok.onclick = () => {
      const tmpl = S.songs[0];
      S.songs.push({ id: "s" + Math.random().toString(36).slice(2, 8), title: t.value.trim(), bpm: Math.min(200, Math.max(60, +b.value || 100)),
        parts: tmpl.parts.map(p => ({ inst: p.inst, who: p.who, mine: !!p.mine, status: "empty" })) });
      save(); close(); refreshTop(); toast("셋리스트에 추가했어요");
    };
  });
}

// ---------------------------------------------------------------- 곡
const findSong = id => S.songs.find(s => s.id === id);
function Song(id) {
  return {
    tab: "home", live: true,
    view() {
      const s = findSong(id), st = songState(s), mine = s.parts.find(p => p.mine);
      const rows = s.parts.map(p => {
        const r = result(s, p), late = r && r.issues.find(i => i.late);
        const b = p.status !== "done" ? ["empty", "비어 있음"] : !r ? ["neutral", "분석 중"] : late ? ["late", `${late.from}~${late.to}마디`] : r.issues.length ? ["neutral", "살짝 빠름"] : ["ok", "맞음"];
        return `<button class="row" type="button" data-part="${p.inst}" ${p.status === "done" && r ? "" : p.mine ? "" : "disabled"}>${ic(p.inst, 24)}
          <span class="main">${INST[p.inst]}<small>${esc(p.who)}${p.mine ? " · 내 파트" : ""}</small></span>${badge(b)}${p.status === "done" && r ? `<span class="chev">${ic("chev", 20)}</span>` : ""}</button>`;
      }).join("");
      return {
        title: s.title,
        body: `<h1 class="q" style="margin-top:0">${esc(s.title)}</h1><p class="hint num">${s.bpm}BPM · 16마디 · 준비도 ${st.pct}%</p>
          <div class="card"><button class="row" type="button" data-guide>${ic("play", 24)}<span class="main">기준 트랙 듣기<small>메트로놈 + 드럼 · ${S.team.solo ? "기본 제공" : "민준"}</small></span></button></div>
          <p class="sec">파트</p><div class="card">${rows}</div>`,
        foot: `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-rec>${ic("mic", 20, "ak-ic")}${mine.status === "done" ? "내 파트 다시 녹음하기" : "내 파트 녹음하기"}</button>
          ${s.parts.some(p => p.status === "done") ? `<button class="ak-btn ak-btn-secondary ak-btn-block" type="button" data-mix>${ic("play", 20, "ak-ic")}지금까지 합주 듣기</button>` : ""}`,
      };
    },
    mount(el) {
      const s = findSong(id);
      $("[data-guide]", el).onclick = e => toggle(e.currentTarget, () => guide(s));
      $("[data-rec]", el).onclick = () => push(Record(id));
      $("[data-mix]", el)?.addEventListener("click", e => toggle(e.currentTarget, () => {
        const tracks = [guide(s)];
        for (const p of s.parts) if (p.status === "done") { const a = mem.aligned[rkey(s, p)] || (runAnalysis(s, p), mem.aligned[rkey(s, p)]); if (a) tracks.push(a); }
        return mix(tracks);
      }));
      $$("[data-part]", el).forEach(b => b.onclick = () => {
        const p = s.parts.find(x => x.inst === b.dataset.part);
        if (p.status === "done" && result(s, p)) push(Analysis(id, p.inst)); else if (p.mine) push(Record(id));
      });
      analyzeInBackground();
    },
    leave: stopAudio,
  };
}
function toggle(btn, getData) {
  if (btn.dataset.playing) { stopAudio(); btn.dataset.playing = ""; btn.querySelector("svg").innerHTML = P.play; return; }
  $$("[data-playing]").forEach(b => { b.dataset.playing = ""; b.querySelector("svg").innerHTML = P.play; });
  play(getData(), { onEnd: () => { btn.dataset.playing = ""; btn.querySelector("svg").innerHTML = P.play; } });
  btn.dataset.playing = "1"; btn.querySelector("svg").innerHTML = P.stop;
}

// ---------------------------------------------------------------- 녹음
function Record(id) {
  let rec = null, raf = 0, timers = [], stream = null;
  return {
    view() {
      const s = findSong(id), mine = s.parts.find(p => p.mine);
      return {
        title: `${INST[mine.inst]} 녹음`,
        body: `<div class="rec-stage"><p class="hint" data-msg>이어폰을 꽂고, 기준 트랙에 맞춰 연주하세요</p>
          <div class="count num" data-count></div>
          <div class="wave" data-wave>${Array.from({ length: 48 }, (_, i) => `<i style="height:${i % 4 === 0 ? 90 : 30 + (i * 37) % 40}%"></i>`).join("")}</div>
          <div class="timer num" data-timer>0:00 / ${fmt(guide(s).length / sr())}</div>
          <button class="rec-btn" type="button" data-rec aria-label="녹음 시작"><span></span></button></div>`,
        foot: `<label class="ak-btn ak-btn-tertiary ak-btn-block" for="rec-file">${ic("upload", 20, "ak-ic")}녹음 파일 가져오기</label><input id="rec-file" type="file" accept="audio/*,video/*" hidden>
          <button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-sample>예시 연주로 해보기</button>`,
      };
    },
    mount(el) {
      const s = findSong(id), g = guide(s), dur = g.length / sr();
      const btn = $("[data-rec]", el), cnt = $("[data-count]", el), msg = $("[data-msg]", el), timer = $("[data-timer]", el), bars = $$("[data-wave] i", el);
      const done = async data => { cleanup(); mem.rec[s.id] = data; finish(id); };
      btn.onclick = async () => {
        if (rec) { rec.stop(); return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
        catch { msg.textContent = "마이크를 쓸 수 없어요. 설정에서 마이크를 허용하거나 녹음 파일을 가져와 주세요."; return; }
        btn.disabled = true;
        for (let k = 3; k > 0; k--) { cnt.textContent = k; await wait(1000); }
        cnt.textContent = ""; btn.disabled = false; btn.classList.add("on"); btn.setAttribute("aria-label", "녹음 멈추기");
        msg.textContent = "녹음 중이에요. 곡이 끝나면 자동으로 멈춰요";
        const chunks = [];
        rec = new MediaRecorder(stream);
        rec.ondataavailable = e => e.data.size && chunks.push(e.data);
        rec.onstop = async () => {
          stopAudio(); cancelAnimationFrame(raf); stream.getTracks().forEach(t => t.stop());
          msg.textContent = "녹음을 정리하고 있어요";
          try { const buf = await ac().decodeAudioData(await new Blob(chunks).arrayBuffer()); done(mono(buf)); }
          catch { msg.textContent = "녹음을 읽지 못했어요. 다시 녹음해 주세요."; rec = null; btn.classList.remove("on"); }
        };
        rec.onstart = () => {
          const pb = play(g, { onEnd: () => rec && rec.state === "recording" && rec.stop() });
          const tick = () => {
            const t = Math.min(dur, ac().currentTime - pb.startAt);
            timer.textContent = `${fmt(t)} / ${fmt(dur)}`;
            const on = Math.floor(t / dur * bars.length); bars.forEach((b, i) => b.classList.toggle("on", i <= on));
            raf = requestAnimationFrame(tick);
          };
          tick();
        };
        rec.start();
      };
      $("#rec-file", el).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        msg.textContent = "파일을 읽고 있어요";
        try { done(mono(await ac().decodeAudioData(await f.arrayBuffer()))); } catch { msg.textContent = "이 파일은 읽을 수 없어요. mp3·m4a·wav 파일을 골라 주세요."; }
      };
      $("[data-sample]", el).onclick = () => done(synth({ sr: sr(), bpm: s.bpm, seed: 11, drift: true, latencyMs: 150, freqMul: 4 }).part);
      function cleanup() { timers.forEach(clearTimeout); cancelAnimationFrame(raf); stopAudio(); }
    },
    leave() { cancelAnimationFrame(raf); stopAudio(); try { rec && rec.state === "recording" && (rec.onstop = null, rec.stop()); } catch {} stream && stream.getTracks().forEach(t => t.stop()); },
  };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
function mono(buf) { const out = new Float32Array(buf.length); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels; } return out; }
function finish(id) {
  replace({ view: () => ({ title: "분석", body: `<div class="rec-stage"><div class="spin" role="img" aria-label="분석 중"></div><h1 class="q" style="text-align:center">기준 트랙에 맞추고 있어요</h1><p class="hint">녹음 지연을 찾고 박마다 어긋남을 재요</p></div>` }), back: false });
  setTimeout(() => {
    const s = findSong(id), mine = s.parts.find(p => p.mine);
    mine.status = "done"; mine.who = "나";
    runAnalysis(s, mine); save();
    replace(Analysis(id, mine.inst));
  }, 500);
}

// ---------------------------------------------------------------- 분석
function Analysis(id, inst) {
  return {
    tab: "home", live: true,
    view() {
      const s = findSong(id), p = s.parts.find(x => x.inst === inst), r = result(s, p), memos = S.memos[id] || {};
      const late = r.issues.filter(i => i.late), early = r.issues.filter(i => !i.late);
      const span = i => i.from === i.to ? `${i.from}마디` : `${i.from}~${i.to}마디`;
      const alerts = [
        ...late.map(i => `<div class="ak-alert ak-alert-late" role="alert">${ic("warn", 20, "ak-ic")}<div><strong>${span(i)} 평균 +${i.mean}ms 늦음</strong>${i.start}초부터 기준 트랙보다 늦게 들어와요</div></div>`),
        ...early.map(i => `<div class="ak-alert ak-alert-early">${ic("info", 20, "ak-ic")}<div><strong>${span(i)} 평균 ${i.mean}ms 빠름</strong>${i.start}초부터 앞서 나가요</div></div>`),
      ];
      if (!alerts.length) alerts.push(`<div class="ak-alert ak-alert-ok">${ic("check", 20, "ak-ic")}<div><strong>모든 마디가 ±${FLAG_MS}ms 안이에요</strong>귀로 거의 느끼지 못하는 차이예요</div></div>`);
      const cells = r.perBar.map(b => { const st = b.mean > FLAG_MS ? "late" : b.mean < -FLAG_MS ? "early" : "ok";
        return `<button type="button" class="ak-bar ak-bar-${st}${memos[b.bar] ? " ak-bar-memo" : ""}" data-bar="${b.bar}" aria-label="${b.bar}마디 평균 ${b.mean}ms${memos[b.bar] ? ", 메모 있음" : ""}"><span>${b.bar}</span><small>${b.mean > 0 ? "+" : ""}${b.mean}</small></button>`; }).join("");
      const memoList = Object.keys(memos).sort((a, b) => a - b).map(b => `<div class="row" style="cursor:default">${ic("pen", 20)}<span class="main">${b}마디<small>${esc(memos[b])}</small></span></div>`).join("");
      return {
        title: `${INST[inst]} · ${p.mine ? "내 파트" : esc(p.who)}`,
        body: `<h1 class="q" style="margin-top:0">${late.length ? `${josa(INST[inst], "이", "가")} ${span(late[0])}에서 밀렸어요` : early.length ? `${josa(INST[inst], "이", "가")} ${span(early[0])}에서 앞서요` : "박자가 잘 맞아요"}</h1>
          <div class="kpis num"><div class="kpi"><span>지연 보정</span><b>${r.offsetMs}ms</b></div><div class="kpi"><span>비교한 박</span><b>${r.beats}개</b></div><div class="kpi"><span>고칠 구간</span><b>${r.issues.length}곳</b></div></div>
          ${alerts.join("")}
          <div class="btn-row" style="display:flex;gap:8px"><button class="ak-btn ak-btn-tertiary ak-btn-sm" type="button" data-before>${ic("play", 16, "ak-ic")}맞추기 전</button><button class="ak-btn ak-btn-primary ak-btn-sm" type="button" data-after>${ic("play", 16, "ak-ic")}맞춘 합주</button></div>
          <p class="sec">마디별 평균 어긋남 (ms) · 누르면 메모</p><div class="bars">${cells}</div>
          <canvas data-chart role="img" aria-label="박마다 어긋남 그래프"></canvas><p class="cap">회색 띠는 ±${FLAG_MS}ms, 위쪽이 늦음</p>
          ${memoList ? `<p class="sec">팀 메모</p><div class="card">${memoList}</div>` : ""}`,
        foot: late.length || early.length ? `<button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-practice>${ic("sync", 20, "ak-ic")}${span((late[0] || early[0]))} 연습하기</button>` : "",
      };
    },
    mount(el) {
      const s = findSong(id), p = s.parts.find(x => x.inst === inst), r = result(s, p);
      drawChart($("[data-chart]", el), r);
      const playMix = (btn, aligned) => toggle(btn, () => {
        const a = aligned ? (mem.aligned[rkey(s, p)] || (runAnalysis(s, p), mem.aligned[rkey(s, p)])) : partAudio(s, p);
        return a ? mix([guide(s), a]) : guide(s);
      });
      $("[data-before]", el).onclick = e => { if (!partAudio(s, p)) return toast("녹음 원본은 녹음한 기기에서만 들을 수 있어요"); playMix(e.currentTarget, false); };
      $("[data-after]", el).onclick = e => { if (!partAudio(s, p)) return toast("녹음 원본은 녹음한 기기에서만 들을 수 있어요"); playMix(e.currentTarget, true); };
      $$("[data-bar]", el).forEach(b => b.onclick = () => memo(id, +b.dataset.bar));
      $("[data-practice]", el)?.addEventListener("click", () => { const i = r.issues.find(x => x.late) || r.issues[0]; push(Practice1(id, i.from, i.to)); });
    },
    leave: stopAudio,
  };
}
function memo(id, bar) {
  const cur = (S.memos[id] || {})[bar] || "";
  sheet(`<h2>${bar}마디 메모</h2><p class="hint">팀원 모두에게 보여요</p><label class="sr-only" for="memo-t">${bar}마디 메모</label>
    <textarea id="memo-t" maxlength="120" placeholder="예: 브레이크 끝나고 들어올 때 늦어요">${esc(cur)}</textarea>
    <button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-save>${cur ? "메모 고치기" : "메모 남기기"}</button>
    ${cur ? '<button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-del>메모 지우기</button>' : ""}`, (sh, close) => {
    $("[data-save]", sh).onclick = () => {
      const t = $("#memo-t", sh).value.trim();
      S.memos[id] = S.memos[id] || {};
      if (t) S.memos[id][bar] = t; else delete S.memos[id][bar];
      save(); close(); refreshTop(); toast(t ? "메모를 남겼어요" : "메모를 지웠어요");
    };
    $("[data-del]", sh)?.addEventListener("click", () => { delete S.memos[id][bar]; save(); close(); refreshTop(); toast("메모를 지웠어요"); });
  });
}
function drawChart(cv, r) {
  if (!cv) return;
  const css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const L = 32, B = 18, maxA = Math.max(60, ...r.dev.map(d => Math.abs(d[1]))) * 1.1, tMax = Math.max(1, ...r.dev.map(d => d[0]));
  const x = t => L + t / tMax * (W - L - 4), y = ms => 4 + (1 - (ms + maxA) / (2 * maxA)) * (H - 4 - B);
  g.fillStyle = v("--surface-2"); g.fillRect(L, y(FLAG_MS), W - L - 4, y(-FLAG_MS) - y(FLAG_MS));
  g.strokeStyle = v("--line"); g.beginPath(); g.moveTo(L, y(0)); g.lineTo(W - 4, y(0)); g.stroke();
  g.fillStyle = v("--text-sub"); g.font = "11px " + v("--font-sans"); g.textAlign = "right"; g.textBaseline = "middle";
  [-60, -30, 0, 30, 60].forEach(m => Math.abs(m) <= maxA && g.fillText((m > 0 ? "+" : "") + m, L - 4, y(m)));
  g.textAlign = "center"; g.textBaseline = "top";
  for (let s = 0; s <= tMax; s += 10) g.fillText(s + "초", x(s), H - B + 4);
  for (const [t, ms] of r.dev) { g.fillStyle = ms > FLAG_MS ? v("--late-mark") : ms < -FLAG_MS ? v("--action") : v("--text-sub"); g.beginPath(); g.arc(x(t), y(ms), 3, 0, 7); g.fill(); }
}

// ---------------------------------------------------------------- 연습 탭
function practiceItems() {
  const out = [];
  for (const s of S.songs) for (const p of s.parts) {
    if (!p.mine) continue;
    const r = result(s, p);
    if (r) for (const i of r.issues) out.push({ s, i });
  }
  return out;
}
function Practice() {
  return {
    tab: "practice", live: true,
    view() {
      const items = practiceItems();
      const list = items.map(({ s, i }, k) => `<button class="row" type="button" data-k="${k}">${ic(i.late ? "warn" : "info", 24)}<span class="main">${esc(s.title)}<small class="num">${i.from === i.to ? i.from : i.from + "~" + i.to}마디 · 평균 ${i.mean > 0 ? "+" : ""}${i.mean}ms ${i.late ? "늦음" : "빠름"}</small></span><span class="chev">${ic("chev", 20)}</span></button>`).join("");
      const memoCount = Object.values(S.memos).reduce((n, m) => n + Object.keys(m).length, 0);
      return {
        noNav: true,
        body: `<div style="height:48px"></div><h1 class="large">연습</h1>
          <p class="hint">합주 분석에서 밀린 내 구간이 여기에 모여요. 느린 템포로 반복한 뒤 다시 녹음하세요.</p>
          ${list ? `<div class="card">${list}</div>` : `<div class="card"><div class="row" style="cursor:default">${ic("check", 24)}<span class="main">지금은 연습할 구간이 없어요<small>곡에서 내 파트를 녹음하면 분석 결과가 쌓여요</small></span></div></div>
          <button class="ak-btn ak-btn-secondary ak-btn-block" type="button" data-home>셋리스트로 가기</button>`}
          ${memoCount ? `<p class="hint">팀 메모 ${memoCount}개가 분석 화면에 달려 있어요.</p>` : ""}`,
      };
    },
    mount(el) {
      const items = practiceItems();
      $$("[data-k]", el).forEach(b => b.onclick = () => { const { s, i } = items[+b.dataset.k]; push(Practice1(s.id, i.from, i.to)); });
      $("[data-home]", el)?.addEventListener("click", () => setRoot(Home()));
    },
  };
}
function Practice1(id, from, to) {
  let rate = 0.8, loops = 0, timer = 0;
  return {
    tab: "practice",
    view() {
      const s = findSong(id), memos = S.memos[id] || {};
      const notes = Object.keys(memos).filter(b => b >= from && b <= to).map(b => `<div class="row" style="cursor:default">${ic("pen", 20)}<span class="main">${b}마디<small>${esc(memos[b])}</small></span></div>`).join("");
      return {
        title: "구간 연습",
        body: `<h1 class="q" style="margin-top:0">${from === to ? from : from + "~" + to}마디를 느리게 반복해요</h1><p class="hint">${esc(s.title)} · 기준 트랙의 이 구간만 계속 돌아요</p>
          <p class="sec">템포</p><div class="chips" role="group" aria-label="템포">${[70, 80, 90, 100].map(t => `<button class="chip num" type="button" data-rate="${t}" aria-pressed="${Math.round(rate * 100) === t}">${t}%</button>`).join("")}</div>
          <div class="kpis num"><div class="kpi"><span>지금 템포</span><b data-bpm>${Math.round(s.bpm * rate)}</b></div><div class="kpi"><span>반복</span><b data-loops>${loops}회</b></div><div class="kpi"><span>구간 길이</span><b>${to - from + 1}마디</b></div></div>
          <button class="ak-btn ak-btn-primary ak-btn-block" type="button" data-loop>${ic("play", 20, "ak-ic")}<span>반복 재생</span></button>
          ${notes ? `<p class="sec">이 구간 메모</p><div class="card">${notes}</div>` : ""}`,
        foot: `<button class="ak-btn ak-btn-secondary ak-btn-lg ak-btn-block" type="button" data-rerec>${ic("mic", 20, "ak-ic")}100% 템포로 다시 녹음하기</button>`,
      };
    },
    mount(el) {
      const s = findSong(id), barDur = 4 * 60 / s.bpm, a = (from - 1) * barDur, b = to * barDur;
      const btn = $("[data-loop]", el);
      const start = () => {
        play(guide(s), { loop: true, from: a, to: b, rate });
        clearInterval(timer);
        timer = setInterval(() => { loops++; const n = $("[data-loops]", el); if (n) n.textContent = loops + "회"; }, (b - a) / rate * 1000);
        btn.querySelector("span").textContent = "멈추기"; btn.querySelector("svg").innerHTML = P.stop; btn.dataset.on = "1";
      };
      const stop = () => { stopAudio(); clearInterval(timer); btn.querySelector("span").textContent = "반복 재생"; btn.querySelector("svg").innerHTML = P.play; btn.dataset.on = ""; };
      btn.onclick = () => btn.dataset.on ? stop() : start();
      $$("[data-rate]", el).forEach(c => c.onclick = () => {
        rate = +c.dataset.rate / 100;
        $$("[data-rate]", el).forEach(x => x.setAttribute("aria-pressed", String(x === c)));
        $("[data-bpm]", el).textContent = Math.round(s.bpm * rate);
        if (btn.dataset.on) start();
      });
      $("[data-rerec]", el).onclick = () => { stop(); push(Record(id)); };
    },
    leave() { stopAudio(); clearInterval(timer); },
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
          <p class="sec">앱</p><div class="card"><button class="row" type="button" data-reset>${ic("sync", 24)}<span class="main">처음부터 다시 시작하기<small>답변, 팀, 녹음, 메모를 이 기기에서 지워요</small></span></button></div>`,
      };
    },
    mount(el) {
      $("[data-reset]", el).onclick = () => sheet(`<h2>처음부터 다시 시작할까요?</h2><p class="hint">이 기기에 저장된 답변, 팀, 녹음, 메모가 모두 지워져요.</p>
        <button class="ak-btn ak-btn-primary ak-btn-lg ak-btn-block" type="button" data-yes>지우고 다시 시작하기</button><button class="ak-btn ak-btn-ghost ak-btn-block" type="button" data-no>그대로 두기</button>`, (sh, close) => {
        $("[data-no]", sh).onclick = close;
        $("[data-yes]", sh).onclick = () => { S = blank(); save(); mem.rec = {}; mem.aligned = {}; mem.raw = {}; close(); setRoot(Onb(0)); };
      });
    },
  };
}

// ---------------------------------------------------------------- 시작
function clock() { const d = new Date(); $("#clock").textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; }
clock(); setInterval(clock, 30000);
document.addEventListener("pointerdown", () => ac(), { once: true });
document.addEventListener("keydown", e => { if (e.key === "Escape") $(".dim")?.click(); });
setRoot(S.onboarded && S.team ? Home() : Onb(0));
