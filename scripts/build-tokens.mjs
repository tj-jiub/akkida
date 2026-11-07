// design/tokens.json(악기다 디자인 시스템) → css/tokens.css
// 디자인 시스템을 고치면 design/tokens.json을 바꾸고 `npm run tokens`로 다시 만든다.
import { readFileSync, writeFileSync } from "node:fs";

const t = JSON.parse(readFileSync(new URL("../design/tokens.json", import.meta.url), "utf8"));
const [light, dark] = t.color.themes.map(x => x.id);
const val = (v, theme) => (typeof v === "string" ? v : v[theme] ?? v[light]);
const decl = (name, v) => `  --${name}: ${v};`;

const lightLines = [], darkLines = [], fixed = [];
for (const c of t.color.tokens) { lightLines.push(decl(c.name, val(c.value, light))); darkLines.push(decl(c.name, val(c.value, dark))); }
for (const s of t.shadow?.tokens ?? []) { lightLines.push(decl(s.name, val(s.value, light))); darkLines.push(decl(s.name, val(s.value, dark))); }
for (const fam of ["spacing", "radius", "size"]) for (const x of t[fam]?.tokens ?? []) fixed.push(decl(x.name, x.value));
for (const [k, v] of Object.entries(t.type.families)) fixed.push(decl("font-" + k, v));

const css = `/* 악기다 디자인 시스템 토큰 — design/tokens.json에서 생성 (scripts/build-tokens.mjs). 직접 고치지 말 것 */
:root {
${lightLines.join("\n")}
${fixed.join("\n")}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${darkLines.map(l => "  " + l).join("\n")}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${darkLines.join("\n")}
  color-scheme: dark;
}
`;
writeFileSync(new URL("../css/tokens.css", import.meta.url), css);
console.log(`tokens.css: 색 ${t.color.tokens.length}개, 고정값 ${fixed.length}개`);
