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
