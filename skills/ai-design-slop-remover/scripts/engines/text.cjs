const { lineAt, excerpt } = require('../rules/shared.cjs');

function scanText(file, text, root, rules, engine = 'text') {
  const findings = [];
  for (const rule of rules.filter((entry) => entry.matcher)) {
    rule.matcher.lastIndex = 0;
    for (const match of text.matchAll(rule.matcher)) findings.push({ rule, engine, location: { file, line: lineAt(text, match.index ?? 0) }, match: excerpt(match[0]) });
  }
  return findings;
}
module.exports = { scanText };
