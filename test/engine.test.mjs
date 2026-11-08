// node test/engine.test.mjs — 정답을 아는 테스트 음원으로 엔진 정확도 확인
import { synth, analyze } from "../js/engine.js";
import assert from "node:assert/strict";

let fails = 0;
for (const [lat, seed] of [[180, 7], [60, 3], [250, 11], [120, 21]]) {
  const s = synth({ latencyMs: lat, seed });
  const r = analyze(s.guide, s.part, s.sr, s.bpm);
  const beat = 60 / s.bpm, resid = r.offsetMs - lat;
  const errs = r.dev.map(d => {
    const i = Math.round(d.t / beat);
    return i < s.truth.length ? Math.abs(d.ms - (s.truth[i] - resid)) : null;
  }).filter(e => e !== null);
  const mae = errs.reduce((a, b) => a + b, 0) / errs.length;
  const issue = r.issues.find(x => x.late);
  console.log(`지연 ${lat}ms → 추정 ${r.offsetMs.toFixed(1)}ms | 비트 ${errs.length}/64, 평균 오차 ${mae.toFixed(1)}ms | 밀림 ${issue ? `${issue.from}~${issue.to}마디 +${issue.mean.toFixed(0)}ms` : "없음"}`);
  try {
    assert.ok(Math.abs(resid) < 15, "지연 추정 오차 15ms 이내");
    assert.ok(errs.length >= 60, "비트 60개 이상 검출");
    assert.ok(mae < 8, "비트 오차 평균 8ms 미만");
    assert.ok(issue && issue.from >= 9 && issue.to <= 12, "9~12마디 안에서 밀림 검출");
  } catch (e) { fails++; console.log("  실패:", e.message); }
}
if (fails) { console.log(`${fails}건 실패`); process.exit(1); } else console.log("전부 통과");

// ---------------------------------------------------------------- 종합 점수
import { clicks, scoreTake } from "../js/engine.js";
{
  const sr = 44100, bpm = 100, c = clicks({ sr, bpm });
  const good = synth({ sr, bpm, seed: 3, drift: false, latencyMs: 150 }).part;
  const drifty = synth({ sr, bpm, seed: 7, drift: true, latencyMs: 150 }).part;
  const sloppy = synth({ sr, bpm, seed: 9, drift: false, latencyMs: 150 }).part; // 아래에서 무작위로 흔듦
  const rough = new Float32Array(sloppy.length); { let s = 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; const beat = 60 / bpm;
    for (let i = 0; i < 64; i++) { const t = i * beat + 0.15 + (r() - 0.5) * 0.18; const k = Math.round(t * sr); for (let j = 0; j < 2000 && k + j < rough.length; j++) rough[k + j] += Math.exp(-j / 300) * Math.sin(j * 0.15) * 0.3; } }
  const sg = scoreTake(c, good, sr, bpm), sd = scoreTake(c, drifty, sr, bpm), sr2 = scoreTake(c, rough, sr, bpm);
  const half = good.slice(0, Math.floor(good.length / 3)); const sh = scoreTake(c, half, sr, bpm);
  console.log(`점수: 고른 연주 ${sg.score} (${sg.comment}) | 9~12마디 밀림 ${sd.score} (${sd.comment}) | 들쭉날쭉 ${sr2.score} | 1/3만 ${sh.score} (${sh.comment})`);
  try {
    assert.ok(sg.score >= 85, "고른 연주 85점 이상");
    assert.ok(sd.score < sg.score && /9~12마디|13~16마디/.test(sd.comment), "밀린 연주는 낮고 구간을 짚음");
    assert.ok(sr2.score < sd.score, "들쭉날쭉한 연주가 가장 낮음");
    assert.ok(sh.score < 50, "일부만 친 연주는 50점 미만");
  } catch (e) { console.log("  실패:", e.message); process.exit(1); }
}
