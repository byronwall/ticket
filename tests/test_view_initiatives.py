"""Run with python3 tests/test_view_initiatives.py."""

import json
from pathlib import Path
import runpy
from tempfile import TemporaryDirectory

viewer = runpy.run_path(str(Path(__file__).parents[1] / 'plugins/ticket-view'))

with TemporaryDirectory() as temp:
    root = Path(temp)
    tickets = root / '.tickets'
    tickets.mkdir()

    def write_map(slug, implementation):
        folder = root / 'docs' / 'intent' / slug
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / 'initiative-map.json'
        path.write_text(json.dumps({
            'initiative': {'title': slug, 'current_phase': 'plan', 'summary': 'A summary'},
            'implementation': implementation,
        }))
        return path

    write_map('pending', {'status': 'current', 'milestones': [{'status': 'planned'}]})
    write_map('pending-more', {'status': 'current'})
    write_map('active', {'status': 'current', 'milestones': [{'status': 'completed'}, {'status': 'planned'}]})
    write_map('finished', {'status': 'complete'})
    write_map('linked', {'status': 'current', 'ticket_graph': {'tickets': ['work']}})
    write_map('stale', {'status': 'complete'})
    broken = write_map('broken', {})
    broken.write_text('{')
    wrong = write_map('wrong', {'milestones': [{'status': []}]})
    ignored = root / 'node_modules' / 'example'
    ignored.mkdir(parents=True)
    (ignored / 'initiative-map.json').write_text('{}')
    (tickets / 'work.md').write_text('---\nstatus: ready\n---\n# Work\n')
    (tickets / 'other.md').write_text('---\nstatus: in_progress\nexternal-ref: docs/intent/pending-more/implementation-plan.md\n---\n# Other\n')
    (tickets / 'stale.md').write_text('---\nstatus: partially_implemented\n---\n# Stale\n\ndocs/intent/stale/intent-brief.md\n')

    def read():
        items, errors = viewer['initiatives_from'](root, viewer['tickets_from'](tickets))
        assert len(errors) == 2 and any('broken' in error for error in errors) and any('wrong' in error for error in errors)
        return {item['map']['initiative']['title']: item for item in items}

    items = read()
    assert len(items) == 6
    assert items['pending']['status'] == 'No recorded start'  # A current plan is not started work.
    assert items['pending-more']['status'] == 'Started'  # Similar slugs stay separate.
    assert items['active']['status'] == 'Started'
    assert items['finished']['status'] == 'Complete'
    assert items['linked']['status'] == 'No recorded start'
    assert items['stale']['status'] == 'Started'  # Live tickets override stale maps.
    assert items['linked']['map']['initiative']['summary'] == 'A summary'
    (tickets / 'work.md').write_text('---\nstatus: done\n---\n# Work\n')
    assert read()['linked']['status'] == 'Complete'
    write_map('linked', {'status': 'current', 'ticket_graph': {'tickets': ['work']}, 'milestones': [{'status': 'planned'}]})
    assert read()['linked']['status'] == 'Started'  # Closed packets do not complete future milestones.
    (root / 'docs/intent/finished/initiative-map.json').unlink()
    assert 'finished' not in read()

print('ticket view initiatives: ok')

# Documents carry their first heading as a title, and a project without
# .tickets/ still opens from its git root.
import os
import subprocess
with TemporaryDirectory() as temp:
    root = Path(temp).resolve()
    folder = root / 'docs' / 'intent' / 'solo'
    (folder / 'resources').mkdir(parents=True)
    (folder / 'initiative-map.json').write_text(json.dumps({'initiative': {'title': 'Solo'}}))
    (folder / 'intent-brief.md').write_text('Intro\n\n# Solo intent #\n')
    (folder / 'resources' / 'notes.md').write_text('no heading\n')
    items, errors = viewer['initiatives_from'](root, viewer['tickets_from'](None))
    assert not errors and [doc['title'] for doc in items[0]['documents']] == ['Solo intent', '']
    subprocess.run(['git', 'init', '-q', str(root)], check=True)
    previous, saved = Path.cwd(), os.environ.pop('TICKETS_DIR', None)
    os.chdir(folder)
    try:
        assert viewer['find_project']() == (root, None)
        (root / '.tickets').mkdir()
        assert viewer['find_project']() == (root, root / '.tickets')
    finally:
        os.chdir(previous)
        if saved is not None:
            os.environ['TICKETS_DIR'] = saved

# Status, phase, next action and dependency edits write the map in place.
with TemporaryDirectory() as temp:
    root = Path(temp).resolve()

    def make(slug, extra=None):
        folder = root / 'docs' / 'intent' / slug
        folder.mkdir(parents=True)
        path = folder / 'initiative-map.json'
        path.write_text(json.dumps({'initiative': {'title': slug, 'slug': slug, 'status': 'planned', **(extra or {})}, 'history': []}, indent=4) + '\n')
        return path.relative_to(root).as_posix()

    a, b = make('a'), make('b', {'depends_on': ['a']})
    write = viewer['write_initiative']
    version = lambda rel: str((root / rel).stat().st_mtime_ns)
    write(root, a, version(a), {'status': 'active', 'next_action': ' Ship it '}, '2026-10-12')
    text = (root / a).read_text()
    data = json.loads(text)
    assert text.startswith('{\n    "initiative"') and text.endswith('}\n')  # Indentation and newline kept.
    assert data['initiative']['status'] == 'active' and data['initiative']['next_action'] == 'Ship it'
    assert data['initiative']['last_updated'] == '2026-10-12' and data['history'][-1]['event'] == 'updated-in-tk-view'

    def fails(error, *args):
        try:
            write(root, *args, '2026-10-12')
        except error:
            return True
        return False

    assert fails(RuntimeError, a, '1', {'status': 'paused'})  # Stale version.
    assert fails(ValueError, a, version(a), {'status': 'done'})
    assert fails(ValueError, a, version(a), {'depends_on': ['b']})  # b already depends on a.
    assert fails(ValueError, a, version(a), {'depends_on': ['a']})
    assert fails(ValueError, a, version(a), {'depends_on': ['missing']})
    assert fails(LookupError, '../outside/initiative-map.json', '1', {'status': 'active'})
    write(root, b, version(b), {'depends_on': []}, '2026-10-12')
    write(root, a, version(a), {'depends_on': ['b']}, '2026-10-12')
    items, _ = viewer['initiatives_from'](root, [])
    assert {item['slug']: item['map']['initiative'].get('depends_on') for item in items} == {'a': ['b'], 'b': []}
    assert all(item['modified'] > 0 and item['version'] for item in items)
print('ticket view initiative edits: ok')
