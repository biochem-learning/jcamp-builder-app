"""Compare JS merging with the original Python builder, without its dependencies.

Run: python tests/jcamp-parity.py [path/to/jcamp_builder_api]
"""
import ast
import json
from pathlib import Path
import random
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
api = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / 'jcamp_builder_api'
source = ast.parse((api / 'process.py').read_text(encoding='utf-8'))
# Execute the actual pure builder functions; skip unrelated imports/demo code.
functions = ast.Module(body=[node for node in source.body if isinstance(node, ast.FunctionDef)], type_ignores=[])
original = {}
exec(compile(functions, str(api / 'process.py'), 'exec'), original)

cases = []
def add(spec, structure, assignments, metadata=None):
    cases.append(dict(metadatas=metadata or {}, specJcamp=spec,
                      strucJcamp=structure, assignments=assignments))

for separator in ['\n', '\r\n', '\r', '\v', '\f', '\x1c', '\x1d', '\x1e', '\x85', '\u2028', '\u2029']:
    for ending in ['', separator, separator * 2]:
        add(separator.join(['##TITLE=Test', '##END=']) + ending,
            separator + '##TITLE=Structure' + ending,
            [[1.2, 3, [1, 2]], [2, 4, []]], {'TITLE': 'Unicode: α, é', 'OWNER': ''})
add('one line', 'one line', [])
add('spectrum', 'structure', [[0, 0, [1]]], {'custom': 'a=b\n##EXTRA=value'})
rng = random.Random(529)
for _ in range(1000):
    assignments = [[rng.uniform(-10, 10) * 10 ** rng.randrange(-12, 25),
                    rng.uniform(-10, 10) * 10 ** rng.randrange(-12, 25),
                    [rng.randrange(1, 20) for _ in range(rng.randrange(4))]]
                   for _ in range(rng.randrange(8))]
    add('##TITLE=Spectrum\n##END=\n', '##TITLE=Structure\r\n##END=\r\n', assignments,
        {'TITLE': f'Example {_}', 'DATA TYPE': 'NMR SPECTRUM'})

structure = (api / 'test' / '2-PentanoneStruc.jdx').read_text(encoding='utf-8')
for sample in sorted((api / 'test').glob('*.jdx')):
    add(sample.read_text(encoding='utf-8'), structure,
        [[0.000001, -0.00001, [1, 2]], [1e-4, 1e21, [3]], [-0.0, 1e20, []]],
        {'TITLE': sample.stem, 'OWNER': '', 'ORIGIN': 'Parity test'})

payload = json.dumps(cases)
runner = """
const fs = require('node:fs');
const { buildJcamp } = require('./src/jcamp-builder.js');
const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(cases.map(c =>
  buildJcamp(c.metadatas, c.specJcamp, c.strucJcamp, c.assignments))));
"""
result = subprocess.run(['node', '-e', runner], cwd=root, input=payload,
                        capture_output=True, text=True, encoding='utf-8', check=True)
actual = json.loads(result.stdout)
# Match the JSON serialization performed by the browser before the old request.
browser_payload = subprocess.run(['node', '-e',
    "process.stdout.write(JSON.stringify(JSON.parse(require('node:fs').readFileSync(0, 'utf8'))))"],
    input=payload, capture_output=True, text=True, encoding='utf-8', check=True)
decoded = json.loads(browser_payload.stdout)
assert len(actual) == len(decoded)
for index, (case, output) in enumerate(zip(decoded, actual)):
    expected = original['build_jcamp'](
        original['build_metadata'](case['metadatas']),
        original['build_jcamp_blocks'](case['strucJcamp'], 1),
        original['build_jcamp_blocks'](case['specJcamp'], 4),
        original['build_assignment_table'](case['assignments']))
    assert output == expected, (index, case, expected, output)
print(f'Matched original Python builder byte-for-byte on {len(cases):,} cases, including sample JCAMP files.')
