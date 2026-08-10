#!/usr/bin/env node
const { readFile } = require('node:fs/promises');
const process = require('node:process');

const KOREAN_SECTIONS = [
  '# AI Design Slop 정리 결과',
  '## 처리 요약',
  '## Brief inference',
  '## 발견 사항',
  '## 적용한 변경',
  '## 검증',
  '## 남은 위험',
];
const ENGLISH_SECTIONS = [
  '# AI Design Slop Cleanup Result',
  '## Processing summary',
  '## Brief inference',
  '## Findings',
  '## Applied changes',
  '## Verification',
  '## Residual risk',
];

/** @param {string[]} argv */
function parseArgs(argv) {
  if (argv.length === 0) return { selfTest: true, json: true };
  let report;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--report') {
      report = argv[++index];
      if (!report || report.startsWith('--')) throw new Error('--report requires a path');
    } else if (argv[index] === '--json') json = true;
    else if (argv[index] === '--help' || argv[index] === '-h') return { help: true };
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!report) throw new Error('--report is required');
  return { report, json, selfTest: false };
}

/** @param {string} text @param {string} heading @param {string[]} allHeadings */
function sectionBody(text, heading, allHeadings) {
  const start = text.indexOf(heading);
  if (start === -1) return null;
  const bodyStart = start + heading.length;
  let end = text.length;
  for (const candidate of allHeadings) {
    const position = text.indexOf(candidate, bodyStart);
    if (position !== -1 && position < end) end = position;
  }
  return text.slice(bodyStart, end).trim();
}

/** @param {string} text */
function validate(text) {
  const sections = text.includes(KOREAN_SECTIONS[0]) ? KOREAN_SECTIONS : ENGLISH_SECTIONS;
  const errors = [];
  for (const [index, heading] of sections.entries()) {
    const body = sectionBody(text, heading, sections);
    if (body === null) errors.push({ code: 'SECTION_MISSING', heading });
    else if (index > 0 && !body) errors.push({ code: 'SECTION_EMPTY', heading });
  }
  const passMatch = /(?:최종 상태|Final status):\s*`?(pass|review_required|blocked)`?/i.exec(text);
  if (!passMatch) errors.push({ code: 'STATUS_MISSING', message: 'Final status must be pass, review_required, or blocked.' });
  if (/렌더링 검증:\s*`?(?:정적 검사만|불가)|Render verification:\s*`?(?:static_only|unavailable)/i.test(text) && /(?:visual|시각)[^\n]*(?:pass|통과)/i.test(text)) {
    errors.push({ code: 'VISUAL_CLAIM_CONFLICT', message: 'A visual pass conflicts with unavailable/static-only rendering.' });
  }
  return { ok: errors.length === 0, errors };
}

function selfTest() {
  const valid = `${KOREAN_SECTIONS[0]}\n\n${KOREAN_SECTIONS[1]}\n- 최종 상태: pass\n${KOREAN_SECTIONS[2]}\n- 확인됨\n${KOREAN_SECTIONS[3]}\n- 없음\n${KOREAN_SECTIONS[4]}\n- 없음\n${KOREAN_SECTIONS[5]}\n- detector: pass\n${KOREAN_SECTIONS[6]}\n- 없음\n`;
  const validResult = validate(valid);
  const invalidResult = validate('# AI Design Slop 정리 결과\n\n## 처리 요약\n');
  return {
    ok: validResult.ok && !invalidResult.ok,
    cases: [
      { id: 'valid-korean-report', expected: true, actual: validResult.ok },
      { id: 'missing-sections-rejected', expected: false, actual: invalidResult.ok },
    ],
  };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log('Usage: node validate-report.cjs --report <report.md> [--json]\n       node validate-report.cjs  # run self-tests');
      return;
    }
    if (args.selfTest) {
      const result = selfTest();
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
      return;
    }
    if (!args.report) throw new Error('--report is required');
    const result = validate(await readFile(args.report, 'utf8'));
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log('Report is valid.');
    else for (const error of result.errors) console.error(`${error.code}: ${error.heading ?? error.message}`);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 2;
  }
}

main();
