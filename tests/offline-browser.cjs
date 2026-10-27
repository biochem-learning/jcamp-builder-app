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
