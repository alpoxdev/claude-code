const { scanText } = require('./text.cjs');
function scanCss(file, text, root, rules) { return scanText(file, text, root, rules, 'css'); }
module.exports = { scanCss };
