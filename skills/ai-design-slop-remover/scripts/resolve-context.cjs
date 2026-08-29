const { readFile, readdir, stat } = require('node:fs/promises');
const { dirname, extname, join, resolve, relative } = require('node:path');

async function maybeRead(path) {
  try { return await readFile(path, 'utf8'); } catch { return ''; }
}
async function resolveContext(target) {
  const targetInfo = await stat(target);
  const scope = targetInfo.isDirectory() ? target : dirname(target);
  const inputs = [];
  let current = scope;
  const cwd = resolve(process.cwd());
  while (current === cwd || relative(cwd, current) && !relative(cwd, current).startsWith('..')) {
    inputs.push(await maybeRead(join(current, 'DESIGN.md')), await maybeRead(join(current, 'PRODUCT.md')));
    if (current === cwd) break;
    current = dirname(current);
  }
  if (targetInfo.isDirectory()) {
    for (const entry of await readdir(target, { withFileTypes: true })) {
      if (entry.isFile() && ['.css', '.scss', '.less'].includes(extname(entry.name).toLowerCase())) inputs.push(await maybeRead(join(target, entry.name)));
    }
  } else if (['.css', '.scss', '.less'].includes(extname(target).toLowerCase())) inputs.push(await maybeRead(target));
  const text = inputs.join('\n').toLowerCase();
  return {
    brandGradient: /(?:approved|brand|keep|required)[\s\S]{0,140}(?:purple|violet)[\s\S]{0,140}(?:blue|gradient)|(?:purple|violet)[\s\S]{0,140}(?:blue|gradient)[\s\S]{0,140}(?:approved|brand|keep|required)/.test(text),
    pricingComparison: /\b(?:pricing|comparison|plan|tier)\b/.test(text),
    realState: /\b(?:recording|live|sync|unread|online)\b/.test(text),
    reducedMotion: /prefers-reduced-motion|motion-reduce:/.test(text),
  };
}
module.exports = { resolveContext };
