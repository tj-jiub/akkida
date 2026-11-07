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
