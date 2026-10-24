// Drives finder.eircode.ie in headless Chrome the way a person would:
// type the Eircode, open the result, View on Map, zoom right in, screenshot.
// Returns { eircode, address, lat, lng, zoom, mapPng (Buffer), mapShot (the
// result-page screenshot, Buffer) }.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => p && fs.existsSync(p));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = 1000, H = 1100;

async function launch() {
  if (!CHROME) throw new Error('Chrome or Edge not found');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'srf-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--window-size=${W},${H}`,
    // GitHub's Linux runners have no user namespace sandbox for Chrome
    ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errText = '', exited = null;
  proc.stderr.on('data', d => { errText = (errText + d).slice(-2000); });
  proc.on('exit', c => { exited = c; });
  // port 0: Chrome picks a free port and writes it to DevToolsActivePort (slow on a cold cloud machine)
  const portFile = path.join(dir, 'DevToolsActivePort');
  let port;
  for (let i = 0; i < 300 && !port && exited === null; i++) {
    await sleep(100);
    if (fs.existsSync(portFile)) port = +fs.readFileSync(portFile, 'utf8').split('\n')[0];
  }
  if (!port) {
    proc.kill();
    const why = errText.split('\n').filter(l => l.trim()).slice(-3).join(' | ').slice(0, 400);
    throw new Error(`Chrome did not start (${CHROME}${exited !== null ? ', exit ' + exited : ''})${why ? ': ' + why : ''}`);
  }
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map(), listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else if (m.method) listeners.forEach(f => f(m));
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const close = () => {
    try { ws.close(); } catch (e) {}
    // taskkill /T so Chrome's helper processes go too
    if (process.platform === 'win32') spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
    else proc.kill();
    setTimeout(() => fs.rm(dir, { recursive: true, force: true }, () => {}), 3000);
  };
  return { send, on: f => listeners.push(f), close };
}

async function evaluate(send, expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'page script failed');
  return r.result.value;
}

async function until(send, expr, ms = 15000, step = 200) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const v = await evaluate(send, expr); if (v) return v; } catch (e) {}
    await sleep(step);
  }
  return null;
}

async function click(send, x, y) {
  for (const type of ['mousePressed', 'mouseReleased'])
    await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
}

// centre of the first visible element matching the selector/text test
const centreOf = test => `(() => {
  const els = [...document.querySelectorAll('*')].filter(e => { ${test} });
  for (const e of els) { const r = e.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight) return [r.left + r.width / 2, r.top + r.height / 2]; }
  return null; })()`;

async function clickWhere(send, test, ms = 8000) {
  const p = await until(send, centreOf(test), ms);
  if (!p) return false;
  await click(send, p[0], p[1]);
  return true;
}

function normalise(code) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[ACDEFHKNPRTVWXY]\d[0-9W][0-9ACDEFHKNPRTVWXY]{4}$/.test(c)) return null;
  return c.slice(0, 3) + ' ' + c.slice(3);
}

async function lookup(code, log = () => {}) {
  const eircode = normalise(code);
  if (!eircode) throw new Error('That does not look like an Eircode (e.g. A65 F4E2)');
  const b = await launch();
  const { send } = b;
  try {
    await send('Page.enable');
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    // keep the finder's own lookup reply: it carries the building's coordinates
    const lookups = [];
    b.on(m => {
      if (m.method === 'Network.responseReceived' && /\/lookup\?/.test(m.params.response.url)) lookups.push(m.params.requestId);
    });

    log('Opening Eircode Finder');
    await send('Page.navigate', { url: 'https://finder.eircode.ie/#/' });
    const box = `document.querySelector('input[placeholder*="Eircode"]')`;
    if (!await until(send, '!!' + box, 20000)) throw new Error('Eircode Finder did not load');
    await sleep(800);
    // cookie banner: decline the optional ones
    await clickWhere(send, `return /^decline all$/i.test((e.textContent||'').trim()) && e.children.length === 0`, 1500);

    log('Searching ' + eircode);
    await evaluate(send, `${box}.focus()`);
    await send('Input.insertText', { text: eircode });
    // wait for the suggestions, then take the first one (a house has just one)
    const sugg = `return e.matches('li, [role=option], .autoaddress-option, [class*="option"]') && /${eircode.replace(' ', '\\s*')}|,/i.test(e.textContent||'') && e.offsetParent !== null`;
    await sleep(1500);
    const picked = await clickWhere(send, sugg, 5000);
    if (!picked) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await sleep(1500);
      await clickWhere(send, sugg, 4000);
    }
    if (!await until(send, `location.hash.includes('result')`, 12000))
      throw new Error('Eircode Finder found no address for ' + eircode);
    await until(send, `!!document.querySelector('.search-result-map canvas')`, 8000);
    await sleep(1500);

    let info = null;
    for (const rid of lookups.reverse()) {
      try {
        const body = await send('Network.getResponseBody', { requestId: rid });
        const j = JSON.parse(body.base64Encoded ? Buffer.from(body.body, 'base64').toString() : body.body);
        if (j?.data?.location) { info = j; break; }
      } catch (e) {}
    }
    if (!info) throw new Error('Eircode Finder gave no location');
    const { latitude: lat, longitude: lng } = info.data.location;
    const address = (info.address?.label || []).join(', ');
    const found = info.address?.postcode?.value || eircode;
    log(`Found ${address} at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);

    const shot = await send('Page.captureScreenshot', { format: 'png' });

    log('Opening the map and zooming in');
    await clickWhere(send, `return /^view on map$/i.test((e.textContent||'').trim()) && e.tagName === 'SPAN'`, 6000);
    await until(send, `location.hash.includes('map')`, 8000);
    await sleep(1500);
    // the map page scrolls the canvas into place: bring it to the top
    await evaluate(send, `scrollTo(0, 0)`);
    const zoomIn = `return (e.getAttribute('title')||e.getAttribute('aria-label')||'').match(/zoom in/i) || ((e.textContent||'').trim() === '+' && e.children.length <= 1 && e.offsetWidth < 60)`;
    for (let i = 0; i < 4; i++) { await clickWhere(send, zoomIn, 3000); await sleep(900); }
    const zoom = await until(send, `(() => { const z = performance.getEntriesByType('resource').map(e => e.name)
      .map(n => (n.match(/MapServer\\/tile\\/(\\d+)\\//) || [])[1]).filter(Boolean).map(Number);
      return z.length ? Math.max(...z) : null; })()`, 5000);
    await sleep(2500); // let the last tiles paint

    // the map, with the page's own buttons and crosshair hidden
    // the crosshair is an <img> over the OpenLayers map: note where it points, then hide it
    const rect = await evaluate(send, `(() => {
      const c = document.querySelector('#ol-map') || [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
      const r = c.getBoundingClientRect();
      const t = [...document.querySelectorAll('img')].find(i => /target/i.test(i.src) && i.offsetParent);
      let anchor = null;
      if (t) { const q = t.getBoundingClientRect(); anchor = [q.left + q.width / 2 - r.left, q.top + q.height / 2 - r.top]; }
      const st = document.createElement('style');
      st.textContent = '#ol-map .ol-overlaycontainer-stopevent, #ol-map .ol-control, #ol-map a, #ol-map button, img[src*="arget" i] { visibility: hidden !important }';
      document.head.appendChild(st);
      return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, anchor };
    })()`);
    await sleep(300);
    const map = await send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 },
    });
    return {
      eircode: found, address, lat, lng, zoom: zoom || 19, anchor: rect.anchor,
      mapPng: Buffer.from(map.data, 'base64'),
      resultPng: Buffer.from(shot.data, 'base64'),
    };
  } finally {
    b.close();
  }
}

module.exports = { lookup, normalise, launch, evaluate, until };

if (require.main === module) {
  const out = process.argv[3] || '.';
  lookup(process.argv[2], m => console.error('  ' + m)).then(r => {
    fs.writeFileSync(path.join(out, 'finder-map.png'), r.mapPng);
    fs.writeFileSync(path.join(out, 'finder-result.png'), r.resultPng);
    delete r.mapPng; delete r.resultPng;
    console.log(JSON.stringify(r));
  }).catch(e => { console.error(e.message); process.exit(1); });
}
