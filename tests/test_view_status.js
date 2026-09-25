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
console.log('ticket view status filters: ok');
