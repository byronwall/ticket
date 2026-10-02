// Run with node tests/test_view_status.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../plugins/ticket-view'), 'utf8');
const statusCode = source.slice(source.indexOf('const statuses ='), source.indexOf('const ticketMenu ='));
const filterCode = source.slice(source.indexOf('function availableTickets()'), source.indexOf('function visibleTickets()'));
const context = vm.createContext({
  tickets: [
    { id: 'open', type: 'task', status: 'open', parent: '' },
    { id: 'closed', type: 'task', status: 'closed', parent: '' },
    { id: 'done', type: 'task', status: 'done', parent: '' },
    { id: 'closed-epic', type: 'epic', status: 'closed', parent: '' },
    { id: 'done-epic', type: 'epic', status: 'done', parent: '' },
    { id: 'closed-child', type: 'task', status: 'open', parent: 'closed-epic' },
    { id: 'done-child', type: 'task', status: 'open', parent: 'done-epic' },
  ],
  showClosed: false,
  showClosedEpics: false,
});
vm.runInContext(statusCode + '\n' + filterCode + '\nfunction byId() { return new Map(tickets.map(t => [t.id, t])); }', context);
const visible = () => [...vm.runInContext('availableTickets().map(t => t.id)', context)];

assert.equal(vm.runInContext("statuses.includes('done')", context), false);
assert.deepEqual(visible(), ['open']);
context.showClosed = true;
assert.deepEqual(visible(), ['open', 'closed', 'done']);
context.showClosedEpics = true;
assert.deepEqual(visible(), ['open', 'closed', 'done', 'closed-child', 'done-child']);

// The assignee filter narrows the visible tickets, and one prompt lists them
// with dependencies first.
const promptCode = source.slice(source.indexOf('function visibleTickets()'), source.indexOf('const nodeId ='));
const batch = vm.createContext({
  tickets: [
    { id: 't-b', type: 'task', status: 'open', parent: '', title: 'Second', deps: ['t-c', 't-x'], metadata: { assignee: 'Opus' } },
    { id: 't-c', type: 'task', status: 'open', parent: '', title: 'First', deps: [], metadata: { assignee: 'Opus' } },
    { id: 't-x', type: 'task', status: 'open', parent: '', title: 'Other', deps: [], metadata: { assignee: 'Sol' } },
    { id: 't-u', type: 'task', status: 'open', parent: '', title: 'Nobody', deps: [], metadata: {} },
  ],
  showClosed: false, showClosedEpics: false, epicFilter: null, assigneeFilter: null,
});
vm.runInContext(statusCode + "\nconst assignee = ticket => ticket.metadata.assignee || '';\n" + filterCode + promptCode + '\nfunction byId() { return new Map(tickets.map(t => [t.id, t])); }', batch);
const shown = () => [...vm.runInContext('visibleTickets().map(t => t.id)', batch)];
assert.deepEqual(shown(), ['t-b', 't-c', 't-x', 't-u']);
batch.assigneeFilter = '';
assert.deepEqual(shown(), ['t-u']);
assert.match(vm.runInContext("batchPrompt(visibleTickets(), 'demo')", batch), /^Use \$ticket-fan-out to execute ticket t-u in demo\. Read \.tickets\/t-u\.md/);
batch.assigneeFilter = 'Opus';
assert.deepEqual(shown(), ['t-b', 't-c']);
assert.equal(vm.runInContext("batchPrompt(visibleTickets(), 'demo')", batch), [
  'Use $ticket-fan-out to execute these 2 tickets in demo, in the order listed:',
  '',
  '- t-c: First',
  '- t-b: Second (after t-c)',
  '',
  'For each ticket, read .tickets/<id>.md, follow its dependencies and acceptance criteria, and verify the result before starting the next.',
].join('\n'));
// The full version puts each ticket's front matter and body under the summary.
batch.tickets[0].body = '# Second\n\nDo the second thing.';
batch.tickets[1].body = '# First\n\nDo the first thing.';
batch.tickets[1].metadata = { id: 't-c', status: 'open', deps: '[]', assignee: 'Opus' };
assert.equal(vm.runInContext("batchPrompt(visibleTickets(), '/home/me/demo', true)", batch), [
  'Use $ticket-fan-out to execute these 2 tickets in demo, in the order listed:',
  '',
  '- t-c: First',
  '- t-b: Second (after t-c)',
  '',
  'The full text of each ticket is below; the .tickets/ files may not be available. For each ticket, follow its dependencies and acceptance criteria, and verify the result before starting the next.',
  '',
  '<ticket id="t-c">',
  '---',
  'id: t-c',
  'status: open',
  'deps: []',
  'assignee: Opus',
  '---',
  '# First',
  '',
  'Do the first thing.',
  '</ticket>',
  '',
  '<ticket id="t-b">',
  '---',
  'assignee: Opus',
  '---',
  '# Second',
  '',
  'Do the second thing.',
  '</ticket>',
  '',
].join('\n'));
console.log('ticket view status filters: ok');
