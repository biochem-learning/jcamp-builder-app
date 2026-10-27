const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { findPeaks } = require('../src/peak-finding.js');

test('empty, short, constant, and monotonic signals have no peaks', () => {
  for (const signal of [[], [1], [0, 1], [1, 1, 1], [0, 1, 2], [2, 1, 0]]) {
    assert.deepEqual(findPeaks(signal), []);
  }
});

test('only interior maxima count; flat tops use their rounded-down midpoint', () => {
  assert.deepEqual(findPeaks([9, 0, 3, 3, 0, 2, 2, 2, 0, 9]), [2, 6]);
  assert.deepEqual(findPeaks([2, 2, 0, 1, 2, 2]), []);
});

test('prominence uses the higher valley and includes the cutoff itself', () => {
  const signal = [0, 5, 3, 4, 3, 6, 0];
  assert.deepEqual(findPeaks(signal), [1, 3, 5]);
  assert.deepEqual(findPeaks(signal, 1), [1, 3, 5]);
  assert.deepEqual(findPeaks(signal, 2), [1, 5]);
  assert.deepEqual(findPeaks(signal, 5), [5]);
  assert.deepEqual(findPeaks(signal, 6), [5]);
  assert.deepEqual(findPeaks(signal, 6.01), []);
});

test('equal-height peaks do not block the prominence search', () => {
  assert.deepEqual(findPeaks([0, 3, 1, 3, 0], 3), [1, 3]);
  assert.deepEqual(findPeaks([0, 1, 0, 3, 1, 3, 0, 4, 0], 3), [3, 5, 7]);
});

test('negative signals, typed arrays, and nonpositive prominence are supported', () => {
  assert.deepEqual(findPeaks(new Float64Array([-5, -1, -4, -2, -5]), 3), [1]);
  assert.deepEqual(findPeaks([0, 1, 0], -1), [1]);
  assert.deepEqual(findPeaks([0, 1, 0], 0), [1]);
});

test('rejects invalid input instead of silently corrupting peak indices', () => {
  for (const signal of [null, {}, '010', [0, NaN, 0], [0, Infinity, 0], [0, '1', 0]]) {
    assert.throws(() => findPeaks(signal), TypeError);
  }
  for (const prominence of [NaN, Infinity, '1', [1, 2]]) {
    assert.throws(() => findPeaks([0, 1, 0], prominence), TypeError);
  }
});

test('browser auto-identification uses local peaks and preserves assignments on errors', () => {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', listeners: {},
      addEventListener(event, callback) { this.listeners[event] = callback; }
    });
    return elements.get(selector);
  };
  let removals = 0;
  const created = [];
  const errors = [];
  const context = vm.createContext({
    console: { log() {} },
    document: {
      querySelector: element,
      getElementById: element,
      querySelectorAll: () => [{ remove() { removals++; } }]
    },
    alert: message => errors.push(message),
    fetch() { throw new Error('Peak detection must not use the network'); }
  });
  const root = path.join(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(root, 'src/peak-finding.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/main.js'), 'utf8'), context);
  context.recordAssignment = (...args) => created.push(args);
  vm.runInContext(`
    spectrumMap = new Map([[0, 0], [1, 3], [2, 0], [3, 1], [4, 0]]);
    createAssignments = recordAssignment;
  `, context);
  element('#prominence-input').value = '2';
  element('#auto-id').listeners.click();
  assert.deepEqual(created, [['1.0000', '3.0000']]);
  assert.equal(removals, 1);
  assert.deepEqual(errors, []);

  element('#prominence-input').value = 'Infinity';
  element('#auto-id').listeners.click();
  assert.equal(removals, 1);
  assert.equal(errors.length, 1);
  element('#prominence-input').value = '';
  vm.runInContext('spectrumMap = new Map([[0, 0], [1, NaN], [2, 0]])', context);
  element('#auto-id').listeners.click();
  assert.equal(removals, 1);
  assert.equal(errors.length, 2);
});
