const { scanText } = require('./text.cjs');
function scanMarkup(file, text, root, rules) { return scanText(file, text, root, rules, 'markup'); }
module.exports = { scanMarkup };
