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

// The shape of the graph follows the viewport: unattached tickets form a pool
// grid instead of one tall column, and dependency columns wrap into bands.
const shapeCode = source.slice(source.indexOf('const NODE_W ='), source.indexOf('const statusLabel ='));
const shapeFor = (width, height) => vm.runInNewContext(shapeCode + '\nchooseShape', { viewport: { clientWidth: width, clientHeight: height } });
const wide = shapeFor(1990, 1000), tall = shapeFor(700, 1400);
// The reported graph: nine unattached tickets beside two columns of two.
assert.deepEqual({ ...wide([2, 2], 9) }, { bands: 1, poolColumns: 2 });
// Only unattached tickets: a grid close to the viewport's shape.
assert.deepEqual({ ...wide([0], 24) }, { bands: 1, poolColumns: 5 });
assert.deepEqual({ ...tall([0], 24) }, { bands: 1, poolColumns: 2 });
// No pool leaves band wrapping as it was.
assert.deepEqual({ ...wide([2, 2], 0) }, { bands: 1, poolColumns: 0 });
assert.equal(wide(new Array(24).fill(1), 0).bands, 4);
// A pool beside a long chain still wraps the chain.
assert.ok(wide(new Array(24).fill(1), 6).bands > 1);
// A hidden viewport has no shape to match.
assert.deepEqual({ ...shapeFor(0, 0)([1, 1], 9) }, { bands: 1, poolColumns: 3 });
console.log('ticket view layout: ok');
