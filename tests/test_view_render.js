// Run with node tests/test_view_render.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../plugins/ticket-view'), 'utf8');
const drawSource = source.slice(source.indexOf('  function draw(pts,'), source.indexOf('  const bundleWidth ='));
const paths = [];
const document = { createElementNS: () => ({
  attributes: {}, dataset: {}, style: { setProperty() {} },
  setAttribute(name, value) { this.attributes[name] = value; },
}) };
const edges = { append(element) { paths.push(element); } };
const draw = vm.runInNewContext(drawSource + '\ndraw', { document, edges });

draw([[0, 10], [20, 10], [20, 30]], 'source', 'target', 0, true);
assert.equal(paths.length, 1);
assert.equal(paths[0].attributes.d, 'M 0 10 H 20 V 30');
assert.equal(paths[0].attributes['marker-end'], 'url(#arrow)');
assert.equal(paths[0].dataset.from, 'source');
assert.equal(paths[0].dataset.to, 'target');
console.log('ticket view rendering: ok');
