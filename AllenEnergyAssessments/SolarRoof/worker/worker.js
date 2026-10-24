// Runs inside GitHub Actions for one job handed out by the Apps Script relay.
// env: CALLBACK (the Apps Script /exec URL), JOB (job id), TOKEN (one-time job token)
// 1. collect the job (Eircode, picked point) from the relay
// 2. run the same pipeline as the local app
// 3. post progress lines and finally the result, with small images, back to the relay
const fs = require('fs');
const os = require('os');
const path = require('path');

const here = p => { try { return require(path.join(__dirname, p)); } catch (e) { return require(path.join(__dirname, '..', p)); } };
const { find } = here('pipeline');

const { CALLBACK, JOB, TOKEN } = process.env;
if (!CALLBACK) { console.error('The SOLAR_RELAY_URL repository secret is not set'); process.exit(2); }
if (!JOB || !TOKEN) { console.error('JOB and TOKEN are required'); process.exit(2); }

async function post(body) {
  // text/plain keeps Apps Script happy; the redirect after the POST only fetches the reply
  const r = await fetch(CALLBACK, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...body, id: JOB, token: TOKEN }), signal: AbortSignal.timeout(60000) });
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { throw new Error('relay replied ' + r.status + ': ' + t.slice(0, 200)); }
}

const b64 = f => fs.existsSync(f) ? fs.readFileSync(f).toString('base64') : null;

(async () => {
  const job = await post({ action: 'claim' });
  if (!job.ok) throw new Error(job.error || 'job not found');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roof-'));
  // the Actions log of a public repo is public: it gets step counts, never addresses
  let step = 0;
  const log = msg => { console.log(`  step ${++step}`); post({ action: 'progress', msg }).catch(() => {}); };
  try {
    const r = await find(job.code, dir, { fresh: true, log, at: job.at || null });
    r.images = {
      aerial: b64(path.join(dir, 'aerial.jpg')),
      cut: b64(path.join(dir, 'cut-thumb.jpg')),
      result: b64(path.join(dir, 'result-thumb.jpg')),
    };
    const done = await post({ action: 'result', result: r });
    if (!done.ok) throw new Error(done.error || 'relay refused the result');
    console.log('done');
  } catch (e) {
    await post({ action: 'fail', msg: e.message }).catch(() => {});
    throw e;
  }
})().catch(e => { console.error(e.message); process.exit(1); });
