const { serialize } = require('./money');

const escape = (v) => {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * @param {object[]} rows
 * @param {{key:string,label:string}[]} columns
 */
const toCsv = (rows, columns) => {
  const data = serialize(rows);
  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = data.map((r) => columns.map((c) => escape(typeof c.key === 'function' ? c.key(r) : r[c.key])).join(','));
  return [header, ...lines].join('\r\n');
};

const sendCsv = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Byte-order mark so Excel opens UTF-8 (₹, Indian scripts) correctly
  res.send(`\uFEFF${csv}`);
};

module.exports = { toCsv, sendCsv };
