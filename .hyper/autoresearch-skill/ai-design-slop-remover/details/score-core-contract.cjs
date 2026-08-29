#!/usr/bin/env node
const { readFile } = require('node:fs/promises');
const process = require('node:process');

function parseArgs(argv) {
  let english = 'skills/ai-design-slop-remover/SKILL.md';
  let korean = 'skills/ai-design-slop-remover/SKILL.ko.md';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--english') english = argv[++index];
    else if (argv[index] === '--korean') korean = argv[++index];
    else if (argv[index] === '--help' || argv[index] === '-h') return { help: true };
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return { help: false, english, korean };
}
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('Usage: node score-core-contract.cjs [--english <SKILL.md>] [--korean <SKILL.ko.md>]'); return; }
    const [english, korean] = await Promise.all([readFile(args.english, 'utf8'), readFile(args.korean, 'utf8')]);
    const evals = [
      ['E1', 'Trigger 경계', /<activation_examples>[\s\S]*Positive:[\s\S]*Negative:[\s\S]*Boundary:/i.test(english)],
      ['E2', 'Core 실행 준비', /Select `audit`[\s\S]*Run static detection:[\s\S]*In `clean`[\s\S]*Re-run the detector/i.test(english)],
      ['E3', '변경 검증 경로', /run-detector-evals\.cjs --json/.test(english) && /run-contract-evals\.cjs --json/.test(english) && /validate-skills-corpus\.mjs[\s\\]+--root skills --only ai-design-slop-remover --json/.test(english)],
      ['E4', '증거·안전 경계', english.includes('AI-authorship claim') && english.includes('static_only') && english.includes('Do not create/write `.ai-slop-remover.json`') && english.includes('dependency installation')],
      ['E5', '이중 언어·지원 파일 연결', (english.match(/^@/gm) ?? []).length === (korean.match(/^@/gm) ?? []).length && english.includes('<resource_navigation>') && korean.includes('<resource_navigation>')],
    ].map(([id, name, pass]) => ({ id, name_ko: name, pass }));
    const score = evals.filter((entry) => entry.pass).length;
    console.log(JSON.stringify({ score, max_score: evals.length, pass_rate: (score / evals.length) * 100, evals }, null, 2));
    if (score < 0 || score > evals.length) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; }
}
main();
