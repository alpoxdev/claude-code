const { createHash } = require('node:crypto');

const SUPPORTED = new Set(['.html', '.jsx', '.tsx', '.vue', '.svelte', '.css', '.scss', '.less']);
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt', '.svelte-kit']);

function lineAt(text, offset) { return text.slice(0, offset).split('\n').length; }
function excerpt(value) { return value.replace(/\s+/g, ' ').trim().slice(0, 180); }
function fingerprint(finding) {
  return createHash('sha256').update([finding.id, finding.location.file, finding.location.line, finding.evidence].join('\0')).digest('hex');
}
function sortFindings(findings) {
  return findings.sort((left, right) => left.location.file.localeCompare(right.location.file)
    || left.location.line - right.location.line || left.id.localeCompare(right.id));
}
function summarize(findings) {
  const summary = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const finding of findings) summary[finding.severity] += 1;
  return summary;
}
module.exports = { SUPPORTED, IGNORED_DIRS, lineAt, excerpt, fingerprint, sortFindings, summarize };
