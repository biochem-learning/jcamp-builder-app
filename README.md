# jcamp-builder-app

App JavaScript and CSS live in `src/`; `index.html` remains the entry point.

Peak identification runs locally in `src/peak-finding.js`, matching the app's former
`scipy.signal.find_peaks(samples, prominence=value)` call for finite numeric data.
Leave prominence blank to return all local maxima. Flat tops use the middle sample
(rounded down); endpoints are excluded. A numeric prominence is an inclusive minimum.
Other SciPy filters and its properties dictionary are not implemented. Non-finite
samples and prominence values are rejected. With prominence enabled, the search
can take quadratic time on repetitive signals, as in SciPy's unwindowed algorithm.
JCAMP merging runs locally in `src/jcamp-builder.js`. It preserves the former API's
metadata headers, block IDs/order, assignment formatting, and newline handling.
Neither peak identification nor merging requires the API. Open `index.html` to
use the app; fonts and icons still reference external services.
The bundled ChemDoodle renderer's optional cloud update check is disabled.

Run JavaScript and browser-handler checks with `npm test`.
For comparison against SciPy, run `python tests/scipy-parity.py` in an environment
with SciPy installed and Node on PATH. This checks fixed edge cases, seeded random
signals, flat tops, and long periodic signals against the Python implementation.

Run `python tests/jcamp-parity.py` to compare merging against the original Python
builder and the sample JCAMP files in the neighboring `jcamp_builder_api` folder.
This check uses only Python's standard library and Node; it does not run a server.

Optional browser verification: with Playwright installed, run
`node tests/offline-browser.cjs`. Set `CHROME_PATH` to a local Chrome executable
if needed, `PLAYWRIGHT_MODULE` to an alternate Playwright module location, and
`JCAMP_SAMPLES` to an alternate sample folder. It loads the actual page and
scripts with remote requests blocked and checks file loading/rendering, peak
identification, assignments, metadata, merging, preview editing, and downloads.
