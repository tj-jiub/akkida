// 악기다 합주 엔진: 지연 추정 → 정렬 → 음량 맞춤 → 비트별 박자 오차 분석
// 브라우저와 node 양쪽에서 쓰는 순수 함수 모음 (외부 라이브러리 없음)

export const HOP = 128;
export const FLAG_MS = 30; // 마디 평균 오차가 이 값을 넘으면 밀림/당김으로 표시

// ---------------------------------------------------------------- 테스트 음원
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function addPluck(buf, sr, start, freq, dur, decay, gain) {
  const s = Math.round(start * sr), n = Math.round(dur * sr);
  for (let i = 0; i < n && s + i < buf.length; i++) {
    if (s + i < 0) continue;
    const t = i / sr;
    let env = Math.exp(-decay * t) * Math.min(1, t / 0.004) * Math.min(1, (dur - t) / 0.03);
    buf[s + i] += gain * env * (Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(4 * Math.PI * freq * t));
  }
}

/** 기준 트랙(클릭+베이스)과 기타 파트(기기 지연 + 9~12마디 밀림 + 13마디~ 살짝 당김) */
export function synth({ sr = 44100, bpm = 100, bars = 16, latencyMs = 180, seed = 7, drift = true, freqMul = 4, roots = [55, 55, 73.42, 65.41] } = {}) {
  const r = rng(seed), beat = 60 / bpm, nBeats = bars * 4;
  const len = Math.ceil((nBeats + 4) * beat * sr);
  const guide = new Float32Array(len), part = new Float32Array(len);
  const truth = [];
  for (let i = 0; i < nBeats; i++) {
    const t = i * beat, bar = Math.floor(i / 4);
    addPluck(guide, sr, t, i % 4 === 0 ? 1500 : 1000, 0.03, 80, 0.5);
    addPluck(guide, sr, t, roots[bar % 4], beat * 0.9, 3, 0.6);
    let dev = gauss(r) * 8;
    if (drift && bar >= 8 && bar <= 11) dev += 20 + 50 * ((i - 32) / 15);
    else if (drift && bar >= 12) dev -= 25;
    truth.push(dev);
    addPluck(part, sr, t + (latencyMs + dev) / 1000, roots[bar % 4] * freqMul, beat * 0.7, 5, 0.25);
  }
  for (let i = 0; i < len; i++) part[i] += gauss(r) * 0.004;
  normalizePeak(guide, 0.9);
  return { guide, part, sr, bpm, latencyMs, truth };
}

// ---------------------------------------------------------------- 신호 처리
export function normalizePeak(x, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  return x;
}
export function rms(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
}

/** 음 시작 강도 곡선: 고역 강조 후 프레임 에너지(log)의 양의 변화량 */
export function onsetEnvelope(x, hop = HOP, win = 1024) {
  // 고역 강조 신호의 제곱을 누적합으로 만들어 겹치는 창(win) 에너지를 빠르게 계산
  const cs = new Float64Array(x.length + 1);
  let prev = 0;
  for (let i = 0; i < x.length; i++) { const d = x[i] - 0.97 * prev; prev = x[i]; cs[i + 1] = cs[i] + d * d; }
  const n = Math.floor(x.length / hop), e = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    const c = f * hop, a = Math.max(0, c - win / 2), b = Math.min(x.length, c + win / 2);
    e[f] = Math.log1p(1000 * (cs[b] - cs[a]) / (b - a));
  }
  const env = new Float32Array(n);
  for (let f = 1; f < n; f++) env[f] = Math.max(0, e[f] - e[f - 1]);
  return env;
}
function standardize(a) {
  let m = 0; for (const v of a) m += v; m /= a.length;
  let s = 0; for (const v of a) s += (v - m) ** 2; s = Math.sqrt(s / a.length) || 1;
  return a.map(v => (v - m) / s);
}

/** 파트가 기준보다 몇 ms 늦게 녹음됐는지. 박이 반복돼 한 박 주기로 같은 점수가 나오므로 0~반 박만 탐색 */
export function estimateOffsetMs(guide, part, sr, bpm, maxMs = 400) {
  const a = standardize(onsetEnvelope(guide)), b = standardize(onsetEnvelope(part));
  const lim = Math.min(maxMs, (60 / bpm) * 1000 * 0.5);
  const maxLag = Math.floor((lim / 1000) * sr / HOP);
  const n = Math.min(a.length, b.length);
  let best = -Infinity, arg = 0;
  for (let l = 0; l <= maxLag; l++) {
    let s = 0;
    for (let i = 0; i + l < n; i++) s += a[i] * b[i + l];
    if (s > best) { best = s; arg = l; }
  }
  return (arg * HOP / sr) * 1000;
}

export function shift(x, ms, sr) {
  const k = Math.round((ms / 1000) * sr), out = new Float32Array(x.length);
  if (k >= 0) out.set(x.subarray(k)); else out.set(x.subarray(0, x.length + k), -k);
  return out;
}

/** 음 시작 시각(초): 이동 평균 + 표준편차 기준을 넘는 국소 최대, 최소 간격 80ms */
export function detectOnsets(x, sr, rel = 0.15) {
  const env = onsetEnvelope(x), n = env.length, w = Math.round(0.4 * sr / HOP);
  let max = 0; for (const v of env) max = Math.max(max, v);
  const out = [], minGap = Math.round(0.08 * sr / HOP);
  let last = -1e9;
  for (let f = 1; f < n - 1; f++) {
    if (env[f] < env[f - 1] || env[f] <= env[f + 1]) continue;
    let lm = 0, c = 0;
    for (let k = Math.max(0, f - w); k < Math.min(n, f + w); k++) { lm += env[k]; c++; }
    lm /= c;
    if (env[f] > lm + 0.1 * max && env[f] > rel * max) {
      if (f - last >= minGap) { out.push((f * HOP) / sr); last = f; }
      else if (env[f] > env[last]) { out[out.length - 1] = (f * HOP) / sr; last = f; }
    }
  }
  return out;
}

/** 기준 vs 파트 분석 결과 */
export function analyze(guide, part, sr, bpm) {
  const offsetMs = estimateOffsetMs(guide, part, sr, bpm);
  const aligned = shift(part, offsetMs, sr);
  const beat = 60 / bpm;
  const g = detectOnsets(guide, sr), p = detectOnsets(aligned, sr);
  const dev = [];
  for (const t of g) {
    let best = null;
    for (const q of p) if (Math.abs(q - t) < beat * 0.4 && (best === null || Math.abs(q - t) < Math.abs(best - t))) best = q;
    if (best !== null) dev.push({ t, ms: (best - t) * 1000 });
  }
  const t0 = g.length ? g[0] : 0;
  const bars = new Map();
  for (const d of dev) {
    d.bar = Math.floor((d.t - t0 + beat * 0.25) / (beat * 4)) + 1;
    if (!bars.has(d.bar)) bars.set(d.bar, []);
    bars.get(d.bar).push(d);
  }
  const perBar = [...bars.entries()].sort((a, b) => a[0] - b[0]).map(([bar, ds]) => ({
    bar, start: ds[0].t, mean: ds.reduce((s, d) => s + d.ms, 0) / ds.length, n: ds.length,
  }));
  const issues = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const mean = cur.reduce((s, b) => s + b.mean, 0) / cur.length;
    issues.push({ from: cur[0].bar, to: cur[cur.length - 1].bar, start: cur[0].start, mean, late: mean > 0 });
    cur = [];
  };
  for (const b of perBar) {
    const flag = Math.abs(b.mean) > FLAG_MS;
    if (flag && (!cur.length || Math.sign(b.mean) === Math.sign(cur[cur.length - 1].mean))) cur.push(b);
    else { flush(); if (flag) cur.push(b); }
  }
  flush();
  return { offsetMs, aligned, dev, perBar, issues, bpm, beat, t0 };
}

/** 두 트랙을 같은 RMS로 맞춰 섞기 */
export function mix(tracks, targetDb = -20) {
  const n = Math.max(...tracks.map(t => t.length)), out = new Float32Array(n);
  const tgt = 10 ** (targetDb / 20);
  for (const t of tracks) {
    const g = tgt / (rms(t) || 1);
    for (let i = 0; i < t.length; i++) out[i] += t[i] * g;
  }
  return normalizePeak(out, 0.9);
}

// ---------------------------------------------------------------- 메트로놈 + 종합 점수 (노래방 방식)
/** 메트로놈 소리만 있는 트랙. 첫 박이 0초 */
export function clicks({ sr = 44100, bpm = 100, bars = 16 } = {}) {
  const beat = 60 / bpm, len = Math.ceil((bars * 4 + 4) * beat * sr), out = new Float32Array(len);
  for (let i = 0; i < bars * 4; i++) addPluck(out, sr, i * beat, i % 4 === 0 ? 1500 : 1000, 0.03, 80, 0.6);
  return out;
}

/**
 * 한 테이크의 종합 점수(0~100)와 한 줄 코멘트.
 * - 박 정확도 70%: 친 음마다 가장 가까운 8분음표 칸과의 거리(±40ms 만점, 120ms 넘으면 0)
 * - 고르기 30%: 그 거리가 들쭉날쭉하지 않은지
 * - 끝까지 쳤는지: 곡 길이에 비해 친 음이 너무 적으면 비율만큼 깎음
 * 기준은 메트로놈 트랙(clickTrack)이며, 녹음 지연은 자동으로 보정한다.
 */
export function scoreTake(clickTrack, take, sr, bpm, bars = 16) {
  const n = Math.max(clickTrack.length, take.length);
  const pad = x => { if (x.length === n) return x; const o = new Float32Array(n); o.set(x.subarray(0, n)); return o; };
  const g = pad(clickTrack), p = pad(take);
  const offsetMs = estimateOffsetMs(g, p, sr, bpm);
  const aligned = shift(p, offsetMs, sr);
  const beat = 60 / bpm, grid = beat / 2, end = bars * 4 * beat;
  const raw = detectOnsets(aligned, sr, 0.4).filter(t => t < end + beat / 2);
  const on = []; for (const t of raw) if (!on.length || t - on[on.length - 1] >= 0.14) on.push(t); // 한 음이 두 번 잡힌 것 합치기
  const errs = on.map(t => ({ t, ms: (t - Math.round(t / grid) * grid) * 1000 }));
  if (errs.length < 4) return { score: 0, comment: "연주 소리가 거의 들리지 않았어요", details: [], offsetMs, aligned };
  const pts = errs.map(e => { const a = Math.abs(e.ms); return a <= 40 ? 1 : a >= 120 ? 0 : 1 - (a - 40) / 80; });
  const acc = pts.reduce((s, x) => s + x, 0) / pts.length;
  const mean = errs.reduce((s, e) => s + e.ms, 0) / errs.length;
  const sd = Math.sqrt(errs.reduce((s, e) => s + (e.ms - mean) ** 2, 0) / errs.length);
  const even = Math.min(1, Math.max(0, 1 - (sd - 15) / 60));
  const cover = Math.min(1, errs.length / (bars * 4 * 0.6));
  const score = Math.round(100 * (0.7 * acc + 0.3 * even) * cover ** 1.5);
  // 4마디씩 묶어 가장 흔들린 구간 찾기
  const chunks = [];
  for (let c = 0; c < bars / 4; c++) {
    const es = errs.filter(e => e.t >= c * 4 * 4 * beat - grid && e.t < (c + 1) * 4 * 4 * beat - grid);
    if (!es.length) continue;
    chunks.push({ from: c * 4 + 1, to: c * 4 + 4, mean: es.reduce((s, e) => s + e.ms, 0) / es.length });
  }
  const worst = chunks.slice().sort((a, b) => Math.abs(b.mean) - Math.abs(a.mean))[0];
  const dir = m => (m > 0 ? "늦어졌어요" : "급해졌어요");
  let comment, details = [];
  if (cover < 0.6) comment = "곡의 일부만 연주됐어요. 끝까지 쳐 보세요";
  else if (worst && Math.abs(worst.mean) > 22) {
    comment = `${worst.from}~${worst.to}마디에서 살짝 ${dir(worst.mean)}`;
    details = [`${worst.from}~${worst.to}마디가 기준 박자보다 ${worst.mean > 0 ? "뒤로" : "앞으로"} ${Math.round(Math.abs(worst.mean))}ms쯤 밀렸어요`,
      chunks.filter(c => c !== worst && Math.abs(c.mean) <= 22).length === chunks.length - 1 ? "나머지 구간은 고르게 유지했어요" : "다른 구간도 조금씩 흔들렸어요"];
  } else comment = score >= 85 ? "처음부터 끝까지 고르게 쳤어요" : "전체적으로 박이 조금씩 흔들렸어요";
  return { score, comment, details, offsetMs, aligned };
}
