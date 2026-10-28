// Optional real-browser check. Requires Playwright and sample files from the API
// reference folder (used only as test inputs; no API process is started).
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const sampleRoot = process.env.JCAMP_SAMPLES || path.resolve(root, '../jcamp_builder_api/test');
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
  });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const requests = [];
    await context.route('**/*', route => {
      requests.push({ url: route.request().url(), type: route.request().resourceType() });
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    const dialogs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    // Serve the actual page and assets through interception. No HTTP server or
    // network connection is used; remote fonts and icons remain blocked.
    await page.route('https://jcamp.test/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      assert.ok(file.startsWith(root + path.sep));
      await route.fulfill({ body: await fs.readFile(file), contentType: {
        '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css'
      }[path.extname(file)] || 'application/octet-stream' });
    });
    await page.goto('https://jcamp.test/', { waitUntil: 'networkidle' });
    const upload = async (selector, name) => page.locator(selector).setInputFiles({
      name, mimeType: 'text/plain', buffer: await fs.readFile(path.join(sampleRoot, name))
    });
    await upload('#struc-file-reader', '2-PentanoneStruc.jdx');
    await page.waitForFunction(() => strucCanvas && strucCanvas[0]);
    assert.ok(await page.evaluate(() => strucCanvas[0].getMolecule().atoms.length > 0));
    // Replacing a canvas does not dispatch mouseout on the old one. Its hover
    // tooltip and assignment IDs must be explicitly reset for the new structure.
    await page.evaluate(() => {
      createAssignments('1.2', '3.4', '1,2');
      const atom = strucCanvas[0].getMolecule().atoms[0];
      strucCanvas[0].mousemove({ p: new ChemDoodle.structures.Point(atom.x, atom.y) });
    });
    assert.equal(await page.locator('#hoverInfo').evaluate(el => el.style.display), 'block');
    const replacement = (await fs.readFile(path.join(sampleRoot, '2-PentanoneStruc.jdx'), 'utf8'))
      .replace('##TITLE=', '##TITLE=Replacement ');
    await page.locator('#struc-file-reader').setInputFiles({
      name: 'replacement.jdx', mimeType: 'text/plain', buffer: Buffer.from(replacement)
    });
    await page.waitForFunction(() => strucFileContent.includes('##TITLE=Replacement '));
    assert.equal(await page.locator('#hoverInfo').evaluate(el => el.style.display), 'none');
    assert.equal(await page.locator('#hoverInfo').textContent(), '');
    assert.equal(await page.locator('.atom-assign-input').inputValue(), '');
    assert.equal(await page.locator('.struc-file-reader-x').inputValue(), '1.2');
    assert.equal(await page.locator('.struc-file-reader-y').inputValue(), '3.4');
    const newAtomId = await page.evaluate(() => {
      const atom = strucCanvas[0].getMolecule().atoms[0];
      const event = { p: new ChemDoodle.structures.Point(atom.x, atom.y) };
      strucCanvas[0].mousemove(event);
      strucCanvas[0].mousedown(event);
      return String(atom.pid);
    });
    assert.equal(await page.locator('.atom-assign-input').inputValue(), newAtomId);
    await page.evaluate(() => {
      const atom = strucCanvas[0].getMolecule().atoms[0];
      const event = { p: new ChemDoodle.structures.Point(atom.x, atom.y) };
      strucCanvas[0].mousedown(event);
    });
    assert.equal(await page.locator('.atom-assign-input').inputValue(), '');
    await page.evaluate(() => {
      const atom = strucCanvas[0].getMolecule().atoms[0];
      strucCanvas[0].mousedown({ p: new ChemDoodle.structures.Point(atom.x, atom.y) });
    });
    assert.equal(await page.locator('.atom-assign-input').inputValue(), newAtomId);
    await page.locator('.atom-assign-input').fill('1, 2, 1, 02, 3, 3');
    await page.locator('.struc-file-reader-x').click();
    assert.equal(await page.locator('.atom-assign-input').inputValue(), '1,2,3');
    await page.locator('.atom-assign-input').fill(newAtomId);
    const settleAtoms = () => page.evaluate(() => new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const redAtomPixels = () => page.evaluate(() => {
      const canvas = document.getElementById('struc_molecule');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let red = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 196 && pixels[i + 1] === 61 && pixels[i + 2] === 50) red++;
      }
      return red;
    });
    await settleAtoms();
    assert.ok(await redAtomPixels() > 0, 'Selected assignment atoms are highlighted');
    await page.locator('#add-assign-btn').click();
    await settleAtoms();
    assert.equal(await redAtomPixels(), 0, 'Blank selected assignment has no atom highlight');
    await page.locator('.assignments-wrapper').first().click();
    await settleAtoms();
    assert.ok(await redAtomPixels() > 0, 'Switching back restores selected atom highlights');
    await page.locator('.atom-assign-input').first().fill('');
    await settleAtoms();
    assert.equal(await redAtomPixels(), 0, 'Editing IDs clears atom highlights');
    await page.locator('.atom-assign-input').first().fill(newAtomId);
    await settleAtoms();
    assert.ok(await redAtomPixels() > 0);
    await page.locator('.assignments-wrapper').first().locator('.delete-assign').click();
    await settleAtoms();
    assert.equal(await redAtomPixels(), 0, 'Deleting selected assignment clears atom highlights');
    console.log('PASS: selected atoms are highlighted in red and track selection, ID edits, and deletion, even without a spectrum.');
    console.log('PASS: repeated atom clicks toggle selection; duplicate manual IDs are deduplicated within the assignment.');
    console.log('PASS: switching structure clears stale atom IDs and hover text; new atoms remain assignable.');
    for (const name of ['2-PentanoneHNMR.jdx', '2-PentanoneCNMR.jdx',
      '2-PentanoneIR.jdx', '2-PentanoneMSFull.jdx']) {
      await upload('#spec-file-reader', name);
      await page.waitForFunction(() => spectrumMap && spectrumMap.size > 0);
      await page.locator('#prominence-input').fill('0.1');
      await page.locator('#auto-id').click();
      console.log(name, JSON.stringify(await page.evaluate(() => ({
        points: spectrumMap.size, assignments: document.querySelectorAll('.assignments-wrapper').length
      }))));
    }
    await upload('#spec-file-reader', '2-PentanoneHNMR.jdx');
    const settleHighlights = () => page.evaluate(() => new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const markerPixels = () => page.evaluate(() => {
      const canvas = document.getElementById('spec_spectrum');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if ((pixels[i] === 196 && pixels[i + 1] === 61 && pixels[i + 2] === 50) ||
            (pixels[i] === 118 && pixels[i + 1] === 82 && pixels[i + 2] === 199)) count++;
      }
      return count;
    });
    while (await page.locator('.assignments-wrapper').count()) {
      await page.locator('.assignments-wrapper .delete-assign').last().click();
    }
    await settleHighlights();
    assert.equal(await markerPixels(), 0);
    const hoverPoint = await page.evaluate(() => {
      const canvas = specCanvas[1];
      const peak = canvas.spectrum.data.reduce((a, b) => b.y > a.y ? b : a);
      const rect = document.getElementById('spec_spectrum').getBoundingClientRect();
      return {
        x: rect.left + canvas.spectrum.getTransformedX(peak.x, canvas.styles,
          canvas.spectrum.memory.width, canvas.spectrum.memory.offsetLeft),
        y: rect.top + rect.height / 2
      };
    });
    await page.mouse.move(hoverPoint.x, hoverPoint.y);
    await page.evaluate(() => specCanvas[1].repaint());
    assert.ok(await page.evaluate(() => !!specCanvas[1].spectrum.hovered));
    await page.locator('.title').hover();
    assert.equal(await page.evaluate(() => !!specCanvas[1].spectrum.hovered), false);
    assert.equal(await page.evaluate(() => {
      const canvas = document.getElementById('spec_spectrum');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let red = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 0) red++;
      }
      return red;
    }), 0, 'No stale red hover line after leaving the spectrum');
    await page.locator('#add-assign-btn').click();
    await page.locator('.struc-file-reader-x').fill('2.1');
    await page.locator('.struc-file-reader-y').fill('0.5');
    await page.locator('.title').hover();
    await settleHighlights();
    assert.ok(await markerPixels() > 0, 'Assigned peak remains marked after moving away');
    const marked = await page.locator('#spec_spectrum').evaluate(el => el.toDataURL());
    await page.locator('.struc-file-reader-x').fill('3.1');
    await settleHighlights();
    assert.notEqual(await page.locator('#spec_spectrum').evaluate(el => el.toDataURL()), marked);
    await page.locator('.assignments-wrapper .delete-assign').click();
    await settleHighlights();
    assert.equal(await markerPixels(), 0);
    console.log('PASS: assigned peak stays visibly highlighted, moves with edits, and disappears on deletion.');
    // A small movement is a click; a drag must zoom without assigning a peak.
    await page.locator('#add-assign-btn').click();
    const gestureRow = page.locator('.assignments-wrapper').last();
    const plot = await page.locator('#spec_spectrum').boundingBox();
    const start = { x: plot.x + plot.width * 0.25, y: plot.y + plot.height * 0.5 };
    const spectrumRange = () => page.evaluate(() => ({
      min: specCanvas[1].spectrum.minX, max: specCanvas[1].spectrum.maxX
    }));
    const initialRange = await spectrumRange();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    assert.equal(await gestureRow.locator('.struc-file-reader-x').inputValue(), '');
    await page.mouse.move(start.x + 3, start.y + 2);
    await page.mouse.up();
    assert.notEqual(await gestureRow.locator('.struc-file-reader-x').inputValue(), '');
    assert.notEqual(await gestureRow.locator('.struc-file-reader-y').inputValue(), '');
    assert.deepEqual(await spectrumRange(), initialRange);
    const assignedX = await gestureRow.locator('.struc-file-reader-x').inputValue();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + plot.width * 0.4, start.y, { steps: 8 });
    await page.mouse.up();
    const zoomed = await spectrumRange();
    assert.ok(zoomed.max - zoomed.min < initialRange.max - initialRange.min);
    assert.equal(await gestureRow.locator('.struc-file-reader-x').inputValue(), assignedX);
    await gestureRow.locator('.struc-file-reader-x').fill('');
    await gestureRow.locator('.struc-file-reader-y').fill('');
    // Moving away then returning to the start remains a drag, not a click.
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 30, start.y, { steps: 3 });
    await page.mouse.move(start.x, start.y, { steps: 3 });
    await page.mouse.up();
    assert.equal(await gestureRow.locator('.struc-file-reader-x').inputValue(), '');
    await page.evaluate(() => specCanvas[1].dblclick());
    console.log('PASS: click with 3px/2px movement assigns on release; drag zooms without assigning or alerting; out-and-back drag does not assign.');
    await page.locator('#auto-id').click();
    await page.locator('.atom-assign-input').first().fill('1, 2');
    await page.locator('.metadata-input').first().fill('Offline browser test');
    await page.locator('#add-md-assign-btn').click();
    await page.locator('.metadata input.label').fill('CUSTOM');
    await page.locator('.metadata .metadata-input').last().fill('local');
    await page.locator('#merge-btn').click();
    const preview = page.locator('.preview-area');
    const merged = await preview.inputValue();
    assert.ok(merged.includes('##CUSTOM=local'));
    assert.ok(merged.includes('<1>'));
    const edited = merged + '\n$$ Browser edit';
    await preview.fill(edited);
    await page.locator('.file-name-input').fill('offline-test');
    const downloadReady = page.waitForEvent('download');
    await page.locator('.download-btn').click();
    const download = await downloadReady;
    assert.equal(download.suggestedFilename(), 'offline-test.jdx');
    assert.equal(await fs.readFile(await download.path(), 'utf8'), edited);
    await page.locator('.overlay').click({ position: { x: 5, y: 5 } });
    const count = await page.locator('.assignments-wrapper').count();
    await page.locator('#add-assign-btn').click();
    assert.equal(await page.locator('.assignments-wrapper').count(), count + 1);
    await page.locator('.assignments-wrapper').last().locator('.delete-assign').click();
    assert.equal(await page.locator('.assignments-wrapper').count(), count);
    const first = page.locator('.assignments-wrapper').first();
    const expectedY = await first.locator('.struc-file-reader-y').inputValue();
    await first.locator('.struc-file-reader-y').fill('');
    await page.locator('#from-x-id').click();
    assert.equal(await first.locator('.struc-file-reader-y').inputValue(), expectedY);
    assert.deepEqual(errors, [], 'Browser errors');
    assert.deepEqual(dialogs, [], 'Unexpected alerts');
    assert.deepEqual(requests.filter(r => ['fetch', 'xhr'].includes(r.type)), [], 'API requests');
    console.log('PASS: file loading/rendering, auto/manual assignments, X-to-Y lookup, metadata, merge, edited preview, and downloaded bytes; zero API requests.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
