// The analysis behind one Eircode, shared by the local server and the cloud worker:
// finder lookup (finder.js) -> outline from the map shot (footprint.py) -> roof faces (roof.py).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const finder = require('./finder');

const ROOT = __dirname;
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'py' : 'python3');

function py(args) {
  return new Promise((res, rej) => {
    const p = spawn(PY, args, { cwd: ROOT });
    let out = '', err = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('error', rej);
    p.on('close', () => {
      try { res(JSON.parse(out.trim().split('\n').pop())); }
      catch (e) { rej(new Error((err || out || 'python failed').slice(-400))); }
    });
  });
}

// web mercator pixel at a zoom
function worldPx(lat, lng, z) {
  const n = 256 * 2 ** z, s = Math.sin(lat * Math.PI / 180);
  return [(lng + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
}

// at: a clicked point to take the building from, {lat, lng (on the map), slat, slng (on the photo)}
async function analyse(dir, f, at) {
  const p = at || { lat: f.lat, lng: f.lng };
  let anchor = f.anchor || null;
  if (at) {
    const [x0, y0] = worldPx(f.lat, f.lng, f.zoom), [x1, y1] = worldPx(at.lat, at.lng, f.zoom);
    const base = f.anchor || [0, 0];
    anchor = [base[0] + x1 - x0, base[1] + y1 - y0];
  }
  // a deliberate click means that building: only look a few metres round it on the map
  const fp = await py(['footprint.py', path.join(dir, 'finder-map.png'), p.lat, p.lng, f.zoom,
    path.join(dir, 'finder-cut.png'), JSON.stringify(anchor), at ? 3 : 12].map(String));
  let roof;
  if (fp.ok) {
    fs.writeFileSync(path.join(dir, 'footprint.json'), JSON.stringify(fp.outline));
    roof = await py(['roof.py', f.lat, f.lng, dir, '--footprint', path.join(dir, 'footprint.json')].map(String));
  } else {
    // nothing on the finder map there (newer than the map, or a shed): cut the roof out of the photo
    const seed = at ? ['--seed', `${at.slat ?? at.lat},${at.slng ?? at.lng}`] : [];
    roof = await py(['roof.py', f.lat, f.lng, dir, ...seed].map(String));
    roof.fallback = fp.error;
  }
  roof.footprint = { area_m2: fp.area_m2, warn: fp.warn, shared_with: fp.shared_with || 0 };
  // small JPEG views of the finder map and result page for the screen and the report
  try { await py(['thumbs.py', dir, JSON.stringify(fp.anchor_px || anchor || null)]); } catch (e) {}
  const result = { finder: f, roof, run: path.basename(dir), stamp: Date.now() };
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(result));
  return result;
}

// look the Eircode up (or reuse a saved lookup in dir) and analyse it
async function find(code, dir, { fresh = false, log = () => {}, at = null } = {}) {
  const ec = finder.normalise(code);
  if (!ec) throw new Error('That does not look like an Eircode (e.g. A65 F4E2)');
  fs.mkdirSync(dir, { recursive: true });
  const fj = path.join(dir, 'finder.json');
  let f;
  if (!fresh && fs.existsSync(fj) && fs.existsSync(path.join(dir, 'finder-map.png'))) {
    f = JSON.parse(fs.readFileSync(fj, 'utf8'));
    log('Using the saved Eircode Finder lookup');
  } else {
    f = await finder.lookup(ec, log);
    fs.writeFileSync(path.join(dir, 'finder-map.png'), f.mapPng);
    fs.writeFileSync(path.join(dir, 'finder-result.png'), f.resultPng);
    delete f.mapPng; delete f.resultPng;
    fs.writeFileSync(fj, JSON.stringify(f));
  }
  log(at ? 'Tracing the building you clicked' : 'Tracing the house outline and fetching the aerial photo');
  const r = await analyse(dir, f, at);
  log(r.roof.ok ? `Found ${r.roof.wings.length} roof section${r.roof.wings.length > 1 ? 's' : ''}` : r.roof.error);
  return r;
}

module.exports = { find, analyse, py };
