"""Read-only Phase 03 specification checks. Not browser/domain behavior tests."""
from collections import Counter
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


class Controls(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if (tag in ('button', 'input', 'select', 'textarea', 'a')
                or 'onclick' in attrs or attrs.get('role') in ('button', 'tab')):
            self.items.append((self.getpos()[0], tag, {
                k: v for k, v in attrs.items() if k != 'class'
            }))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def references(audit=None, verbose=False):
    audit = read('docs/ui-reference-audit.md') if audit is None else audit
    manifest = json.loads(read('stitch-export/manifest.json'))
    require(len(manifest['screens']) == 9, 'Expected nine original sources')
    assigned = {}
    for line in audit.splitlines():
        if not re.match(r'^\| \d{2} \|', line):
            continue
        ref, ranges, disposition, requirements, reason = [x.strip() for x in line.split('|')[1:-1]]
        require(disposition in ('retained', 'adapted', 'removed'), f'{ref}: disposition')
        require(re.search(r'R-\d+', requirements) and reason, f'{ref}: authority/reason')
        for part in ranges.split(','):
            limits = [int(x) for x in part.strip().split('-')]
            for n in range(limits[0], limits[-1] + 1):
                key = (int(ref), n)
                require(key not in assigned, f'Duplicate control {key}')
                assigned[key] = disposition
    expected = set()
    for s in manifest['screens']:
        directory = ROOT / 'stitch-export' / s['directory']
        metadata = json.loads((directory / 'metadata.json').read_text(encoding='utf-8'))
        require(metadata == s, f'Metadata differs: {s["directory"]}')
        require(s['id'] in audit and s['directory'].split('/')[-1] in audit, 'Missing provenance')
        require(s['image'] == ('screen.jpg' if s['number'] <= 3 else 'screen.png'), 'Wrong image extension')
        for filename, hash_key in [(s['image'], 'downloadedScreenshot'), (s['code'], 'downloadedCode')]:
            content = (directory / filename).read_bytes()
            # Git autocrlf changes checkout line endings on Windows. Images stay
            # byte-exact; code must match the original hash after only CRLF→LF.
            matches = sha256(content).hexdigest() == s[hash_key]['sha256']
            if not matches and filename == s['code']:
                matches = sha256(content.replace(b'\r\n', b'\n')).hexdigest() == s[hash_key]['sha256']
            require(matches, f'Changed original: {directory / filename}')
        parser = Controls()
        parser.feed((directory / s['code']).read_text(encoding='utf-8'))
        for n, item in enumerate(parser.items, 1):
            expected.add((s['number'], n))
            if verbose:
                print(f'{s["number"]:02}/{n}: line {item[0]} {item[1]} {item[2]}')
    require(set(assigned) == expected, f'Control coverage missing={expected-set(assigned)} extra={set(assigned)-expected}')
    print(f'PASS A: 9 metadata/source/image sets, 18 original hashes (code permits Git CRLF checkout), {len(expected)} control dispositions; visual review is recorded separately.')


def actions(document=None):
    document = read('docs/ui-actions.md') if document is None else document
    catalog = json.loads(read('contracts/operations.json'))['operations']
    known = {op['id'] for op in catalog}
    covered = Counter()
    rows = set()
    for line in document.splitlines():
        if not re.match(r'^\| [AEB]\d{2} \|', line):
            continue
        cells = [x.strip() for x in line.split('|')[1:-1]]
        require(len(cells) == 7 and all(cells), f'Incomplete action row: {line}')
        row_id, role, surface, behavior, operations, phase, requirements = cells
        require(row_id not in rows, f'Duplicate row {row_id}')
        rows.add(row_id)
        require(re.search(r'P\d{2}', phase) and re.search(r'R-\d+', requirements), f'{row_id}: missing phase/requirement')
        ids = re.findall(r'`([^`]+)`', operations)
        require(ids, f'{row_id}: no operation')
        for operation in ids:
            require(operation in known, f'{row_id}: unknown operation {operation}')
            covered[operation] += 1
    require(set(covered) == known, f'Unmapped operations: {sorted(known-set(covered))}')
    spec = read('docs/ui-spec.md')
    for section in ('Reference inventory', 'Driver simplicity', 'Routes and actions',
                    'State copy and feedback', 'Components and overlays', 'Screen coverage', 'Visual acceptance'):
        require(f'## {section}' in spec, f'Missing UI spec section: {section}')
    for op in catalog:
        phase, family = op['ownerPhase'], op['family']
        implemented_scope = (
            op['id'] == 'workspace.getHealth'
            or (phase == 7 and family == 'session-context')
            or (phase == 8 and family == 'integration-provisioning')
            or (phase in (9, 10) and family == 'intake')
            or (phase == 10 and op['id'] == 'task.urgencyChanged')
            or (phase == 11 and family == 'locations')
            or (phase == 12 and op['id'] in ('routing.getVehicleProfiles', 'routing.computeRoadRoute', 'routing.optimize'))
            or (phase == 13 and op['id'] in ('planning.saveDraft', 'planning.requestPreview', 'planning.requestReplan', 'planning.getJob', 'planning.getPlan', 'planning.publishRevision', 'plan.revisionPublished'))
            or (phase == 14 and op['id'] == 'planning.setManualOrder')
            or (phase in (15, 16, 17, 18, 19) and family == 'execution')
            or op['id'] in ('device.getContext', 'device.takeOver', 'device.getSnapshot',
                            'action.getResult', 'evidence.receiveFormerDevice', 'sync.getEvidenceReceipt',
                            'device.executionTransferred', 'evidence.received')
        )
        if phase in (21, 22) and family == 'returns': implemented_scope = True
        if phase == 23 and family in ('execution', 'sync-recovery'): implemented_scope = True
        if phase == 24 and family == 'monitoring-history': implemented_scope = True
        if not implemented_scope:
            require(op['lifecycle'] == 'designed', f'Operation outside verified workspace/P07–P24 scope promoted: {op["id"]}')
    print(f'PASS B: {len(rows)} action/effect rows cover all {len(known)} canonical operations; role/state/surface/phase/requirements present. Verified workspace/P07–P24 scope only; no UI completion inferred.')


def states(document=None, demo=False):
    document = read('docs/ui-spec.md') if document is None else document
    operations = {op['id'] for op in json.loads(read('contracts/operations.json'))['operations']}
    cases = {}
    for line in document.splitlines():
        if not re.match(r'^\| [JS]\d{2} \|', line):
            continue
        cells = [x.strip() for x in line.split('|')[1:-1]]
        require(len(cells) == 7 and all(cells), f'Incomplete state case: {line}')
        case, category, purpose, next_action, missing, waiting, expected = cells
        require(case not in cases, f'Duplicate case: {case}')
        require(re.search('[\u0600-\u06ff]', purpose), f'{case}: missing Arabic purpose')
        require(re.search('[\u0600-\u06ff]', next_action), f'{case}: missing Arabic next action')
        ids = re.findall(r'`([^`]+)`', next_action)
        require(ids and all(op in operations for op in ids), f'{case}: invalid operation')
        if category in ('missing', 'invalid', 'denied', 'rejected', 'stale'):
            require(missing not in ('لا يوجد', '—', '-'), f'{case}: no visible cause/recovery')
        if category in ('pending', 'waiting', 'loading'):
            require(waiting not in ('لا شيء', '—', '-'), f'{case}: no awaited fact')
        cases[case] = cells
    require({'ready', 'missing', 'empty', 'waiting', 'pending', 'rejected', 'stale'} <= {c[1] for c in cases.values()}, 'Missing required state category')
    require(all(f'J{n:02}' in cases for n in range(1, 8)), 'Incomplete login-to-result walkthrough')
    for viewport in ('360×800', '390×844', '1366×768', '1440×900', '200%', '400%'):
        require(viewport in document, f'Missing viewport/zoom: {viewport}')
    require('owner review pending' in document, 'Missing truthful review status')
    print(f'PASS C: {len(cases)} designed Arabic state cases with purpose/action/cause/waiting; four viewports and zoom criteria. No browser behavior tested.')
    if demo:
        print('\nPAPER WALKTHROUGH — no API calls, no browser, no owner approval')
        for case in ['J01', 'J02', 'S01', 'J03', 'J04', 'J05', 'J06', 'S07', 'S09', 'J07', 'S13', 'S14', 'S15']:
            row = cases[case]
            print(f'\n{row[0]} [{row[1]}] {row[2]}\n  Next: {row[3]}\n  Missing/recovery: {row[4]}\n  Waiting: {row[5]}\n  Expected: {row[6]}')


def negative_checks():
    # Mutate only in-memory document copies. These prove the checker rejects
    # omissions; they do not prove the designed domain/interaction semantics.
    mutations = [
        ('unclassified exported control', references, re.sub(r'^\| 01 \| 1 \|.*\n', '', read('docs/ui-reference-audit.md'), count=1, flags=re.M)),
        ('unmapped required operation', actions, re.sub(r'^\| A26 \|.*\n', '', read('docs/ui-actions.md'), count=1, flags=re.M)),
        ('invented operation', actions, re.sub(r'(\| A13 \|[^\n]*?)`round\.start`', r'\1`round.fakeStart`', read('docs/ui-actions.md'), count=1)),
        ('missing-pin cause removed', states, read('docs/ui-spec.md').replace('لم يتم تأكيد الموقع؛ افتح المراجعة ثم أكّد الدبوس', '—', 1)),
        ('pending waiting omitted', states, read('docs/ui-spec.md').replace('بانتظار المزامنة مع توصيل', '—', 1)),
        ('viewport omitted', states, read('docs/ui-spec.md').replace('1440×900', '1441×900')),
    ]
    for label, check, document in mutations:
        try:
            check(document)
        except ValueError as error:
            print(f'PASS negative: {label} rejected ({error})')
        else:
            raise ValueError(f'Checker accepted mutation: {label}')


def local_links():
    documents = ['DESIGN.md', 'docs/ui-spec.md', 'docs/ui-actions.md',
                 'docs/ui-reference-audit.md', 'docs/ui-component-research.md', 'docs/phase-03-evidence.md']
    count = 0
    for document in documents:
        for target in re.findall(r'\]\(([^)]+)\)', read(document)):
            if '://' in target or target.startswith('#'):
                continue
            path = target.split('#')[0]
            require((ROOT / document).parent.joinpath(path).exists(), f'{document}: broken local link {target}')
            count += 1
    print(f'PASS: {count} local file links in Phase 03 documents resolve (fragment/browser checks separate).')


def token_contrast():
    tokens = dict(re.findall(r'--([a-z-]+): (#[0-9a-f]{6});', read('DESIGN.md')))

    def luminance(color):
        rgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
        return sum(c * weight for c, weight in zip(linear, (.2126, .7152, .0722)))

    pairs = [('primary-foreground', 'primary', 4.5), ('foreground', 'card', 4.5),
             ('muted-foreground', 'muted', 4.5), ('brand', 'card', 4.5),
             ('error-text', 'error-surface', 4.5), ('waiting-text', 'waiting-surface', 4.5),
             ('success-text', 'success-surface', 4.5), ('input', 'muted', 3)]
    for foreground, background, minimum in pairs:
        low, high = sorted((luminance(tokens[foreground]), luminance(tokens[background])))
        ratio = (high + .05) / (low + .05)
        require(ratio >= minimum, f'Token contrast {foreground}/{background}: {ratio:.2f} below {minimum}')
        print(f'PASS token contrast: {foreground}/{background} {ratio:.2f}:1')


if __name__ == '__main__':
    try:
        mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
        require(mode in ('A', 'B', 'C', 'check', 'demo', 'controls', 'negative'), 'Use A, B, C, check, demo, controls or negative')
        references(verbose=mode == 'controls')
        if mode not in ('A', 'controls'):
            actions()
        if mode not in ('A', 'B', 'controls'):
            states(demo=mode == 'demo')
            local_links()
            token_contrast()
        if mode in ('check', 'negative'):
            negative_checks()
    except (ValueError, OSError, KeyError) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
