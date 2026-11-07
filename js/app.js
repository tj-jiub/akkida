import { synth, analyze, mix, FLAG_MS } from "./engine.js";

const $ = s => document.querySelector(s);
const state = { ctx: null, guide: null, part: null, sample: false, result: null, src: null, memos: loadMemos() };

function ctx() {
  if (!state.ctx) state.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (state.ctx.state === "suspended") state.ctx.resume();
  return state.ctx;
}
const bpm = () => Math.min(240, Math.max(40, Number($("#bpm").value) || 100));

function setState(el, text, kind = "") {
  const n = $(el);
  n.className = "state " + kind;
  n.innerHTML = kind === "done" ? '<svg class="ak-ic ic s16"><use href="#i-check"/></svg>' : "";
  n.append(text);
}
function refresh() {
  $("#rec").disabled = !state.guide;
  $("#run").disabled = !(state.guide && state.part);
}

async function decodeFile(file) {
  const buf = await ctx().decodeAudioData(await file.arrayBuffer());
  const n = buf.length, out = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / buf.numberOfChannels;
  }
  return out;
}
const sec = x => (x.length / ctx().sampleRate).toFixed(1) + "초";

// ---------------------------------------------------------------- 1. 기준 트랙
$("#load-sample").addEventListener("click", () => {
  const sr = ctx().sampleRate;
  $("#bpm").value = 100;
  const s = synth({ sr, bpm: 100, latencyMs: 180 });
  state.guide = s.guide; state.part = s.part; state.sample = true;
  setState("#guide-state", `예시 기준 트랙 · 100BPM 16마디 (${sec(s.guide)})`, "done");
  setState("#part-state", "예시 기타 파트 · 녹음 지연 180ms, 9~12마디 점점 밀림", "done");
  refresh();
  run();
});

$("#guide-file").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  setState("#guide-state", "불러오는 중…", "busy");
  try { state.guide = await decodeFile(f); state.sample = false; setState("#guide-state", `${f.name} (${sec(state.guide)})`, "done"); }
  catch { setState("#guide-state", "이 파일은 읽을 수 없어요. mp3·wav·m4a 파일을 올려 주세요."); }
  refresh();
});

// ---------------------------------------------------------------- 2. 내 파트
$("#part-file").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  setState("#part-state", "불러오는 중…", "busy");
  try { state.part = await decodeFile(f); state.sample = false; setState("#part-state", `${f.name} (${sec(state.part)})`, "done"); }
  catch { setState("#part-state", "이 파일은 읽을 수 없어요. mp3·wav·m4a 파일을 올려 주세요."); }
  refresh();
});

let recorder = null;
$("#rec").addEventListener("click", async () => {
  const btn = $("#rec");
  if (recorder) { recorder.stop(); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch {
    setState("#part-state", "마이크를 쓸 수 없어요. 브라우저 주소창의 마이크 권한을 허용하거나 파일을 올려 주세요.");
    return;
  }
  const c = ctx(), chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
  recorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    stopPlayback();
    btn.querySelector("span").textContent = "들으며 녹음";
    btn.querySelector("use").setAttribute("href", "#i-mic");
    recorder = null;
    setState("#part-state", "녹음 정리 중…", "busy");
    try {
      const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
      state.part = await decodeFile(blob); state.sample = false;
      setState("#part-state", `방금 녹음한 파트 (${sec(state.part)})`, "done");
    } catch { setState("#part-state", "녹음을 읽지 못했어요. 다시 녹음하거나 파일을 올려 주세요."); }
    refresh();
  };
  recorder.onstart = () => {
    playBuffer(state.guide, () => recorder && recorder.state === "recording" && recorder.stop());
  };
  recorder.start();
  btn.querySelector("span").textContent = "녹음 멈추기";
  btn.querySelector("use").setAttribute("href", "#i-stop");
  setState("#part-state", "녹음 중 · 기준 트랙이 끝나면 자동으로 멈춰요", "busy");
});

// ---------------------------------------------------------------- 재생
function stopPlayback() {
  if (state.src) { try { state.src.onended = null; state.src.stop(); } catch {} state.src = null; }
  document.querySelectorAll("[data-play]").forEach(b => b.setAttribute("aria-pressed", "false"));
}
function playBuffer(data, onEnd) {
  stopPlayback();
  const c = ctx(), b = c.createBuffer(1, data.length, c.sampleRate);
  b.copyToChannel(data, 0);
  const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination);
  s.onended = () => { state.src = null; document.querySelectorAll("[data-play]").forEach(x => x.setAttribute("aria-pressed", "false")); onEnd && onEnd(); };
  s.start(); state.src = s;
}

// ---------------------------------------------------------------- 3. 분석
$("#run").addEventListener("click", run);
function run() {
  if (!state.guide || !state.part) return;
  const btn = $("#run");
  btn.disabled = true; btn.lastChild.textContent = "맞추는 중…";
  setTimeout(() => {
    const n = Math.max(state.guide.length, state.part.length);
    const pad = x => { if (x.length === n) return x; const o = new Float32Array(n); o.set(x); return o; };
    const g = pad(state.guide), p = pad(state.part);
    const r = analyze(g, p, ctx().sampleRate, bpm());
    r.before = mix([g, p]); r.after = mix([g, r.aligned]);
    state.result = r;
    render(r);
    btn.disabled = false; btn.lastChild.textContent = "맞추고 분석하기";
  }, 30);
}

function render(r) {
  const late = r.issues.filter(i => i.late), early = r.issues.filter(i => !i.late);
  const box = $("#result");
  box.innerHTML = "";
  const card = (title, html) => { const c = document.createElement("div"); c.className = "card"; c.innerHTML = (title ? `<h3>${title}</h3>` : "") + html; box.append(c); return c; };

  card("", `
    <div class="kpis num">
      <div class="kpi"><span>녹음 지연 자동 보정</span><b>${r.offsetMs.toFixed(0)}ms</b></div>
      <div class="kpi"><span>비교한 박</span><b>${r.dev.length}개</b></div>
      <div class="kpi"><span>밀리거나 당긴 구간</span><b>${r.issues.length}곳</b></div>
    </div>
    ${state.sample ? '<p class="state"><svg class="ak-ic ic s16"><use href="#i-info"/></svg>예시 음원에는 녹음 지연 180ms와 9~12마디 밀림을 일부러 넣었어요.</p>' : ""}
    <div class="compare">
      <button class="ak-btn ak-btn-tertiary ak-btn-sm" type="button" data-play="before" aria-pressed="false"><svg class="ak-ic ic s16"><use href="#i-play"/></svg>맞추기 전 듣기</button>
      <button class="ak-btn ak-btn-primary ak-btn-sm" type="button" data-play="after" aria-pressed="false"><svg class="ak-ic ic s16"><use href="#i-play"/></svg>맞춘 합주 듣기</button>
      <button class="ak-btn ak-btn-secondary ak-btn-sm" type="button" id="stop"><svg class="ak-ic ic s16"><use href="#i-stop"/></svg>멈추기</button>
    </div>`);

  const alerts = [];
  for (const i of late) alerts.push(`<div class="ak-alert ak-alert-late"><svg class="ak-ic ic s20"><use href="#i-warn"/></svg><span><strong>${span(i)} 평균 +${i.mean.toFixed(0)}ms 늦음</strong>${i.start.toFixed(1)}초부터 기준 트랙보다 늦게 들어와요</span></div>`);
  for (const i of early) alerts.push(`<div class="ak-alert ak-alert-early"><svg class="ak-ic ic s20"><use href="#i-info"/></svg><span><strong>${span(i)} 평균 ${i.mean.toFixed(0)}ms 빠름</strong>${i.start.toFixed(1)}초부터 기준 트랙보다 앞서 나가요</span></div>`);
  if (!alerts.length) alerts.push(`<div class="ak-alert ak-alert-ok"><svg class="ak-ic ic s20"><use href="#i-check"/></svg><span><strong>모든 마디가 ±${FLAG_MS}ms 안이에요</strong>귀로 거의 느끼지 못하는 차이예요</span></div>`);
  card("이 파트의 박자", alerts.join(""));

  const grid = card("마디별 평균 어긋남", `
    <div class="legend"><span><i style="background:var(--late-mark)"></i>${FLAG_MS}ms 넘게 늦음</span><span><i style="background:var(--early)"></i>${FLAG_MS}ms 넘게 빠름</span><span><i style="background:var(--action);border-radius:50%"></i>메모 있음</span></div>
    <div class="bars" id="bars"></div>
    <p class="state">마디를 누르면 메모를 남길 수 있어요.</p>
    <div class="memo-box" id="memo-box" hidden>
      <label for="memo-text"><b id="memo-label"></b></label>
      <textarea id="memo-text" placeholder="예: 브레이크 끝나고 들어올 때 늦어요"></textarea>
      <div class="btn-row"><button class="ak-btn ak-btn-primary ak-btn-sm" id="memo-save" type="button"><svg class="ak-ic ic s16"><use href="#i-pen"/></svg>메모 저장</button></div>
    </div>
    <ul class="memo-list" id="memo-list"></ul>`);
  const bars = grid.querySelector("#bars");
  for (const b of r.perBar) {
    const el = document.createElement("button");
    el.type = "button"; el.className = "ak-bar";
    if (b.mean > FLAG_MS) el.classList.add("ak-bar-late"); else if (b.mean < -FLAG_MS) el.classList.add("ak-bar-early");
    if (state.memos[b.bar]) el.classList.add("ak-bar-memo");
    el.dataset.bar = b.bar; el.setAttribute("aria-pressed", "false");
    el.setAttribute("aria-label", `${b.bar}마디 평균 ${b.mean.toFixed(0)}ms`);
    el.innerHTML = `<span>${b.bar}</span><small>${b.mean > 0 ? "+" : ""}${b.mean.toFixed(0)}</small>`;
    el.addEventListener("click", () => selectBar(b.bar));
    bars.append(el);
  }
  renderMemos();

  const chart = card("박마다 어긋남", `<canvas id="chart" role="img" aria-label="박마다 기준 트랙 대비 어긋남(ms) 그래프"></canvas><p class="state">회색 띠는 ±${FLAG_MS}ms, 위쪽이 늦음입니다.</p>`);
  drawChart(chart.querySelector("canvas"), r);

  box.querySelectorAll("[data-play]").forEach(b => b.addEventListener("click", () => {
    playBuffer(b.dataset.play === "before" ? r.before : r.after);
    b.setAttribute("aria-pressed", "true");
  }));
  box.querySelector("#stop").addEventListener("click", stopPlayback);
}
const span = i => i.from === i.to ? `${i.from}마디` : `${i.from}~${i.to}마디`;

// ---------------------------------------------------------------- 그래프
function drawChart(cv, r) {
  const css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
  const pad = { l: 44, r: 8, t: 8, b: 24 };
  const maxAbs = Math.max(60, ...r.dev.map(d => Math.abs(d.ms))) * 1.1;
  const tMax = Math.max(...r.dev.map(d => d.t), 1);
  const x = t => pad.l + (t / tMax) * (W - pad.l - pad.r), y = ms => pad.t + (1 - (ms + maxAbs) / (2 * maxAbs)) * (H - pad.t - pad.b);
  g.fillStyle = v("--surface-2"); g.fillRect(pad.l, y(FLAG_MS), W - pad.l - pad.r, y(-FLAG_MS) - y(FLAG_MS));
  g.strokeStyle = v("--line"); g.lineWidth = 1; g.beginPath(); g.moveTo(pad.l, y(0)); g.lineTo(W - pad.r, y(0)); g.stroke();
  g.fillStyle = v("--text-sub"); g.font = "12px " + v("--font"); g.textAlign = "right"; g.textBaseline = "middle";
  const step = maxAbs > 120 ? 50 : 30;
  for (let m = -Math.floor(maxAbs / step) * step; m <= maxAbs; m += step) g.fillText((m > 0 ? "+" : "") + m, pad.l - 6, y(m));
  g.textAlign = "center"; g.textBaseline = "top";
  for (let s = 0; s <= tMax; s += tMax > 60 ? 20 : 5) g.fillText(s + "초", x(s), H - pad.b + 6);
  for (const d of r.dev) {
    g.fillStyle = d.ms > FLAG_MS ? v("--late-mark") : d.ms < -FLAG_MS ? v("--early") : v("--text-sub");
    g.beginPath(); g.arc(x(d.t), y(d.ms), 3.5, 0, Math.PI * 2); g.fill();
  }
}
let rt;
window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => state.result && drawChart($("#chart"), state.result), 150); });
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => state.result && drawChart($("#chart"), state.result));

// ---------------------------------------------------------------- 메모 (이 브라우저에만 저장)
function loadMemos() { try { return JSON.parse(localStorage.getItem("akkida-memos") || "{}"); } catch { return {}; } }
function saveMemos() { try { localStorage.setItem("akkida-memos", JSON.stringify(state.memos)); } catch {} }
let selected = null;
function selectBar(bar) {
  selected = bar;
  document.querySelectorAll(".ak-bar").forEach(c => c.setAttribute("aria-pressed", String(Number(c.dataset.bar) === bar)));
  const box = $("#memo-box"); box.hidden = false;
  $("#memo-label").textContent = `${bar}마디 메모`;
  $("#memo-text").value = state.memos[bar] || "";
  $("#memo-text").focus();
  $("#memo-save").onclick = () => {
    const t = $("#memo-text").value.trim();
    if (t) state.memos[bar] = t; else delete state.memos[bar];
    saveMemos();
    document.querySelector(`.ak-bar[data-bar="${bar}"]`)?.classList.toggle("ak-bar-memo", !!t);
    renderMemos(); toast(t ? `${bar}마디 메모를 저장했어요` : `${bar}마디 메모를 지웠어요`);
  };
}
function renderMemos() {
  const ul = $("#memo-list"); if (!ul) return;
  ul.innerHTML = "";
  Object.keys(state.memos).map(Number).sort((a, b) => a - b).forEach(b => {
    const li = document.createElement("li"); li.textContent = `${b}마디 · ${state.memos[b]}`; ul.append(li);
  });
}

// ---------------------------------------------------------------- 가짜 문
function toast(msg) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}
document.querySelectorAll("[data-door]").forEach(b => b.addEventListener("click", () => {
  let n = 0; try { n = Number(localStorage.getItem("door-" + b.dataset.door) || 0) + 1; localStorage.setItem("door-" + b.dataset.door, n); } catch {}
  toast(`${b.dataset.door} 기능은 준비 중이에요. 눌러주신 기록으로 우선순위를 정해요.`);
}));
