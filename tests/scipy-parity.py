"""Compare the JS subset with real SciPy. Requires Python with scipy and Node.

Run: python tests/scipy-parity.py
"""
import json
from pathlib import Path
import random
import subprocess

import numpy as np
import scipy
from scipy.signal import find_peaks

rng = random.Random(4729)
signals = [
    [], [1], [0, 1], [1, 1, 1], [0, 1, 2], [2, 1, 0],
    [9, 0, 3, 3, 0, 2, 2, 2, 0, 9], [2, 2, 0, 1, 2, 2],
    [0, 5, 3, 4, 3, 6, 0], [0, 3, 1, 3, 0],
    [0, 1, 0, 3, 1, 3, 0, 4, 0], [-5, -1, -4, -2, -5],
]
for _ in range(2000):
    length = rng.randrange(257)
    # Discrete data deliberately creates many plateaus and equal-height peaks.
    signals.append([rng.randrange(-5, 6) for _ in range(length)])
    signals.append([rng.uniform(-10, 10) for _ in range(length)])

axis = np.linspace(0, 60 * np.pi, 12000)
signals.append((np.sin(axis) + 0.6 * np.sin(2.6 * axis)).tolist())
signals.append(([0, 1] * 6000) + [0])
cases = [
    {"samples": signal, "prominence": prominence}
    for signal in signals
    for prominence in [None, -1, 0, 0.25, 1, 2, 3, 5, 10, 20]
]
root = Path(__file__).resolve().parent.parent
runner = """
const fs = require('node:fs');
const { findPeaks } = require('./src/peak-finding.js');
const cases = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(cases.map(c => findPeaks(c.samples, c.prominence))));
"""
result = subprocess.run(
    ["node", "-e", runner], cwd=root, input=json.dumps(cases),
    capture_output=True, text=True, check=True,
)
actual = json.loads(result.stdout)
assert len(actual) == len(cases)
for index, (case, peaks) in enumerate(zip(cases, actual)):
    expected = find_peaks(case["samples"], prominence=case["prominence"])[0].tolist()
    assert peaks == expected, (index, case, expected, peaks)
print(f"Matched SciPy {scipy.__version__} on {len(cases):,} cases ({len(signals):,} signals).")
