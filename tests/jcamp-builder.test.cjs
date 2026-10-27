const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { buildJcamp } = require('../src/jcamp-builder.js');

test('preserves headers, block order, metadata, and one line per assigned atom', () => {
  assert.equal(buildJcamp({ TITLE: 'Example', OWNER: '' },
    '##TITLE=Spectrum\r\n##END=\r\n', '##TITLE=Structure\n##END=\n',
    [[1.2, 3, [1, 2]], [2, 4, []]]), [
    '##DATA_TYPE=LINK', '##BLOCKS=', '##TITLE=Example', '##OWNER=', '',
    '##TITLE=Structure', '##BLOCK_ID=1', '##END=', '',
    '##BLOCK_ID=3', '##PEAK ASSIGNMENTS=(XYMA)',
    '(1.2, 3, , <1>)', '(1.2, 3, , <2>)',
    '##END=$$ End of the assignment block', '',
    '##TITLE=Spectrum', '##BLOCK_ID=4', '##END='
  ].join('\n'));
});

test('keeps empty assignment blocks and Python-style small numeric values', () => {
  const empty = buildJcamp({}, 'spectrum', 'structure', []);
  assert.ok(empty.includes('##PEAK ASSIGNMENTS=(XYMA)\n##END='));
  const output = buildJcamp({}, 'spectrum', 'structure', [
    [0.000001, -0.00001, [1]], [1e-4, 1e21, [2]], [-0, 1e20, [3]]
  ]);
  assert.ok(output.includes('(1e-06, -1e-05, , <1>)'));
  assert.ok(output.includes('(0.0001, 1e+21, , <2>)'));
  assert.ok(output.includes('(0, 100000000000000000000, , <3>)'));
});

test('retains existing missing-file errors', () => {
  assert.throws(() => buildJcamp({}, 'spectrum', '', []), /Invalid Structure JCAMP file/);
  assert.throws(() => buildJcamp({}, '', 'structure', []), /Invalid Spectral JCAMP file/);
});

test('merge, editable preview, and download work without network access', async () => {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', style: { display: 'none' }, listeners: {},
      addEventListener(event, callback) { this.listeners[event] = callback; }
    });
    return elements.get(selector);
  };
  const assignment = {
    querySelector(selector) {
      return { value: ({ '.struc-file-reader-x': '1.2',
        '.struc-file-reader-y': '3', '.atom-assign-input': '1, 2' })[selector] };
    }
  };
  const errors = [];
  let blob;
  let downloaded;
  let revoked;
  const link = { click() { downloaded = this.download; } };
  const context = vm.createContext({
    console: { log() {} }, Blob,
    window: { getComputedStyle: el => el.style },
    URL: {
      createObjectURL(value) { blob = value; return 'blob:local'; },
      revokeObjectURL(value) { revoked = value; }
    },
    document: {
      querySelector: element, getElementById: element,
      querySelectorAll: selector => selector === '.assignments-wrapper' ? [assignment] : [],
      createElement: () => link
    },
    alert: error => errors.push(String(error)),
    fetch() { throw new Error('App processing must not use the network'); }
  });
  const root = path.join(__dirname, '..');
  // Exercise the scripts in the order used by the actual page.
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/src="(src\/(?:peak-finding\.js|jcamp-builder\.js|main\.js))"/g)];
  assert.equal(scripts.length, 3);
  for (const [, file] of scripts) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);

  element('#merge-btn').listeners.click();
  assert.match(errors.pop(), /Invalid Structure JCAMP file/);
  assert.equal(element('.preview-area').value, '');
  vm.runInContext("specFileContent = 'spectrum'; strucFileContent = 'structure';", context);
  element('#merge-btn').listeners.click();
  assert.deepEqual(errors, []);
  assert.equal(element('.preview-area').value,
    buildJcamp({}, 'spectrum', 'structure', [[1.2, 3, [1, 2]]]));
  assert.equal(element('.overlay').style.display, 'block');
  assert.equal(element('#downloadable-content').style.display, 'block');

  // Download must use the user's edited preview, just as before.
  element('.preview-area').value += '\n$$ Edited';
  element('.file-name').querySelector = () => ({ value: 'example' });
  element('.download-btn').listeners.click();
  assert.equal(downloaded, 'example.jdx');
  assert.equal(await blob.text(), element('.preview-area').value);
  assert.equal(revoked, 'blob:local');
});
