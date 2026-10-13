// Run with node tests/test_view_initiatives.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../plugins/ticket-view'), 'utf8');
const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));
const context = vm.createContext({ URLSearchParams });
vm.runInContext(slice('function normalizePath(', 'function linkElement(') + slice('const SHOW_KEYS =', 'const humanize ='), context);
const run = code => JSON.parse(vm.runInContext('JSON.stringify(' + code + ')', context));

// Links resolve against the folder of the document that holds them, and a
// link that climbs out of the project is not followed.
assert.deepEqual(run("resolveDocLink('docs/intent/a', 'shape-brief.md#first-proof')"), { path: 'docs/intent/a/shape-brief.md', fragment: 'first-proof' });
assert.deepEqual(run("resolveDocLink('docs/intent/a', '../../ui-defaults.md')"), { path: 'docs/ui-defaults.md', fragment: '' });
assert.deepEqual(run("resolveDocLink('docs/intent/a', './raw/My%20notes.md')"), { path: 'docs/intent/a/raw/My notes.md', fragment: '' });
assert.equal(run("resolveDocLink('docs', '../../outside.md')"), null);
assert.equal(run("resolveDocLink('docs', 'https://example.com/a.md')"), null);

// Pipes inside code or after a backslash stay in their cell.
assert.deepEqual(run("splitTableRow('| a | \\x60x | y\\x60 | b \\\\| c |')"), ['a', '\x60x | y\x60', 'b | c']);
assert.deepEqual(run("splitTableRow('left | right')"), ['left', 'right']);

// Repeated headings get distinct link targets.
assert.deepEqual(run("(() => { const used = new Map(); return ['First proof', 'First proof', 'C++ & more'].map(text => headingSlug(text, used)); })()"), ['doc-first-proof', 'doc-first-proof-1', 'doc-c-more']);

// The URL fragment restores the tab, initiative, document and list filters.
const states = [
  { tab: 'tickets', choice: null, doc: '', show: '', sort: '', query: '' },
  { tab: 'initiatives', choice: null, doc: '', show: 'all', sort: 'title', query: 'chart grid' },
  { tab: 'initiatives', choice: 'docs/intent/a', doc: 'docs/intent/a/shape-brief.md', show: '', sort: '', query: '' },
  { tab: 'initiatives', choice: 'docs/intent/a', doc: 'docs/ui-defaults.md', show: 'active', sort: '', query: '' },
  { tab: 'initiatives', choice: 'docs/intent/a', doc: 'map', show: 'completed', sort: 'phase', query: '' },
  { tab: 'board', choice: null, doc: '', show: '', sort: 'status', query: 'grid' },
  { tab: 'tickets', choice: '', doc: 'intent-brief.md', show: '', sort: '', query: '' },
];
for (const state of states) {
  const hash = run('formatViewState(' + JSON.stringify(state) + ')');
  assert.deepEqual(run('parseViewState(' + JSON.stringify(hash) + ')'), state, hash);
}
const blank = { tab: 'tickets', choice: null, doc: '', show: '', sort: '', query: '' };
assert.equal(run('formatViewState(' + JSON.stringify(blank) + ')'), '');
assert.equal(run('formatViewState(' + JSON.stringify({ ...blank, tab: 'initiatives', choice: 'docs/intent/a', doc: 'docs/intent/a/shape-brief.md' }) + ')'), '#view=initiatives&i=docs/intent/a&d=shape-brief.md');
assert.equal(run('formatViewState(' + JSON.stringify({ ...blank, tab: 'initiatives', choice: 'docs/intent/a', doc: 'docs/ui-defaults.md' }) + ')'), '#view=initiatives&i=docs/intent/a&d=/docs/ui-defaults.md');
// Unknown filters and sorts fall back to the defaults.
assert.deepEqual(run("parseViewState('#view=board&show=started&sort=size')"), { ...blank, tab: 'board' });

// Search highlights every match, merging ranges that touch or overlap.
assert.deepEqual(run("matchRanges('Chart grid charting', ['chart', 'art g'])"), [[0, 7], [11, 16]]);
assert.deepEqual(run("matchRanges('Facet controls', ['zzz'])"), []);
console.log('ticket view initiatives: ok');
