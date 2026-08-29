#!/usr/bin/env node
const { readFile } = require('node:fs/promises');
const process = require('node:process');

const KOREAN_SECTIONS = ['# AI Design Slop 정리 결과', '## 처리 요약', '## Brief inference', '## 발견 사항', '## 적용한 변경', '## 검증', '## 남은 위험'];
const ENGLISH_SECTIONS = ['# AI Design Slop Cleanup Result', '## Processing summary', '## Brief inference', '## Findings', '## Applied changes', '## Verification', '## Residual risk'];

function parseArgs(argv) {
  if (argv.length === 0) return { selfTest: true, json: true };
  let report; let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--report') { report = argv[++index]; if (!report || report.startsWith('--')) throw new Error('--report requires a path'); }
    else if (argv[index] === '--json') json = true;
    else if (argv[index] === '--help' || argv[index] === '-h') return { help: true };
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!report) throw new Error('--report is required');
  return { report, json, selfTest: false };
}
function sectionBody(text, heading, allHeadings) {
  const start = text.indexOf(heading); if (start === -1) return null;
  const bodyStart = start + heading.length; let end = text.length;
  for (const candidate of allHeadings) { const position = text.indexOf(candidate, bodyStart); if (position !== -1 && position < end) end = position; }
  return text.slice(bodyStart, end).trim();
}
function matchField(text, labels) { return new RegExp(`(?:${labels.join('|')})\\s*:\\s*([^\\n]+)`, 'i').exec(text)?.[1]?.trim(); }
function validate(text) {
  const sections = text.includes(KOREAN_SECTIONS[0]) ? KOREAN_SECTIONS : ENGLISH_SECTIONS; const errors = [];
  for (const [index, heading] of sections.entries()) { const body = sectionBody(text, heading, sections); if (body === null) errors.push({ code: 'SECTION_MISSING', heading }); else if (index > 0 && !body) errors.push({ code: 'SECTION_EMPTY', heading }); }
  const status = matchField(text, ['최종 상태', 'Final status']);
  if (!['pass', 'review_required', 'blocked'].includes(status)) errors.push({ code: 'STATUS_MISSING', message: 'Final status must be pass, review_required, or blocked.' });
  const detector = matchField(text, ['Detector']);
  const engines = matchField(text, ['실행한 engine', 'Engines run']);
  const risk = matchField(text, ['Generic-output risk']);
  const rendered = matchField(text, ['렌더링 검증', 'Render verification']);
  const baseline = matchField(text, ['Baseline delta']);
  if (!detector) errors.push({ code: 'DETECTOR_MISSING', message: 'Processing summary must state detector status.' });
  if (!engines) errors.push({ code: 'ENGINES_MISSING', message: 'Processing summary must state engines run.' });
  if (!['low', 'medium', 'high', 'unassessed'].includes(risk)) errors.push({ code: 'GENERIC_RISK_MISSING', message: 'Generic-output risk must be low, medium, high, or unassessed.' });
  if (!['complete', 'static_only', 'unavailable'].includes(rendered)) errors.push({ code: 'RENDER_STATUS_MISSING', message: 'Render verification must be complete, static_only, or unavailable.' });
  if (!baseline) errors.push({ code: 'BASELINE_MISSING', message: 'Processing summary must state baseline delta.' });
  if ((rendered === 'static_only' || rendered === 'unavailable') && /(?:visual|시각|accessibility|접근성)[^\n]*(?:pass|통과)/i.test(text)) errors.push({ code: 'RENDER_CLAIM_CONFLICT', message: 'Unavailable/static-only rendering conflicts with a visual or accessibility pass.' });
  if (/AI[- ]?(?:authorship|작성|저작)[^\n]*(?:confirmed|확정|pass|통과)/i.test(text)) errors.push({ code: 'AUTHORSHIP_CLAIM', message: 'Reports must not claim AI authorship.' });
  if (/(?:Candidate 또는 persisted waiver|Candidate or persisted waivers)\s*:\s*(?!`?(?:없음|none))/i.test(text) && !/reason|사유/i.test(text)) errors.push({ code: 'WAIVER_REASON_MISSING', message: 'A reported waiver needs a reason.' });
  return { ok: errors.length === 0, errors };
}
function validReport(rendered = 'static_only') {
  return `${KOREAN_SECTIONS[0]}\n\n${KOREAN_SECTIONS[1]}\n- Detector: v2\n- 실행한 engine: text | context\n- Baseline delta: 미사용\n- Generic-output risk: low\n- 렌더링 검증: ${rendered}\n- 최종 상태: pass\n${KOREAN_SECTIONS[2]}\n- 확인됨\n${KOREAN_SECTIONS[3]}\n- 없음\n${KOREAN_SECTIONS[4]}\n- 없음\n${KOREAN_SECTIONS[5]}\n- Detector/baseline: pass\n${KOREAN_SECTIONS[6]}\n- 없음\n`;
}
function selfTest() {
  const valid = validate(validReport());
  const conflict = validate(`${validReport()}\n시각 pass\n`);
  const invalid = validate('# AI Design Slop 정리 결과\n\n## 처리 요약\n');
  return { ok: valid.ok && !conflict.ok && !invalid.ok, cases: [{ id: 'valid-v2-korean-report', expected: true, actual: valid.ok }, { id: 'static-only-claim-rejected', expected: false, actual: conflict.ok }, { id: 'missing-sections-rejected', expected: false, actual: invalid.ok }] };
}
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('Usage: node validate-report.cjs --report <report.md> [--json]\n       node validate-report.cjs  # run self-tests'); return; }
    const result = args.selfTest ? selfTest() : validate(await readFile(args.report, 'utf8'));
    if (args.json || args.selfTest) console.log(JSON.stringify(result, null, 2)); else if (result.ok) console.log('Report is valid.'); else for (const error of result.errors) console.error(`${error.code}: ${error.heading ?? error.message}`);
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; }
}
main();
