// Run with node tests/test_view_layout.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../plugins/ticket-view'), 'utf8');
const code = source.slice(source.indexOf('function improveNodeOrder('), source.indexOf('function layout()'));
const improveNodeOrder = vm.runInNewContext(code + '\nimproveNodeOrder');

function arrange(columns, edges, band = () => 0) {
  const levels = new Map(columns.flatMap((ids, column) => ids.map(id => [id, column])));
  const links = edges.map(([from, to]) => ({ from, to, start: levels.get(from), end: levels.get(to) }));
  return improveNodeOrder(columns.map(ids => [...ids]), links, levels, band);
}

// A source that points into a lower band should sit below a source that
// points to the upper row, as in the reported wrapped graph.
assert.deepEqual([...arrange(
  [['provision', 'deploy'], ['verify'], ['access'], ['handoff']],
  [['provision', 'access'], ['deploy', 'verify'], ['verify', 'access'], ['access', 'handoff']],
  column => column < 2 ? 0 : 1,
)[0]], ['deploy', 'provision']);

// Already uncrossed orders remain stable, including ties.
assert.deepEqual([...arrange([['a', 'b'], ['x', 'y']], [['a', 'x'], ['b', 'y']])[0]], ['a', 'b']);
assert.deepEqual([...arrange([['a', 'b'], ['x']], [['a', 'x'], ['b', 'x']])[0]], ['a', 'b']);

// Several swaps may be needed, and either column may move to remove crossings.
const ordered = arrange([['a', 'b', 'c'], ['x', 'y', 'z']], [['a', 'z'], ['b', 'y'], ['c', 'x']]);
const position = id => ordered.flatMap(ids => ids).indexOf(id);
for (const [a, b] of [[['a', 'z'], ['b', 'y']], [['a', 'z'], ['c', 'x']], [['b', 'y'], ['c', 'x']]]) {
  assert.ok((position(a[0]) - position(b[0])) * (position(a[1]) - position(b[1])) > 0);
}
console.log('ticket view layout: ok');
