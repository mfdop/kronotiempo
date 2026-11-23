/* Horse tracing tool — turns the reference illustration into the layered
 * vector artwork in src/components/horse/art/*.ts.
 *
 *   cd tools/horse-trace && npm i --no-save pngjs potrace
 *   cp <reference illustration 1536x1024> ref.png
 *   node gen.js stand        # one pose (see specs.js) -> out/stand.json (+ out/stand_cls.png debug map)
 *   node export.js           # out/*.json -> src/components/horse/art/*.ts
 *
 * Pipeline per pose: crop -> silhouette (non-black, non-backdrop pixels, holes
 * filled) -> per-pixel class (ink / body / spot / hair / hoof) guided by the
 * zones in specs.js -> spots removed by inpainting the coat luminance ->
 * shading bands from the smoothed luminance -> every class mask upsampled,
 * traced with potrace and written as compact relative paths (1/5 unit ints).
 * Spot / pío seeds and white markings (careto, cuatroalbo, manta) are also
 * produced here; the app draws the blobs procedurally from the seeds.
 */
// node gen.js specName -> out/<name>.json  (layers per group, output coords)
const L = require('./lib'), M = require('./m'), potrace = require('potrace'), { PNG } = require('pngjs'), fs = require('fs')
delete require.cache[require.resolve('./specs')]
const SPECS = require('./specs')
const ref = L.load(require('path').join(__dirname, 'ref.png'))
const CREAM = 222

function traceMask(m, w, h, turd = 6, tol = 0.8, alpha = 1.0) {
  return new Promise((res, rej) => {
    const png = new PNG({ width: w, height: h })
    for (let i = 0; i < w * h; i++) { const v = m[i] ? 0 : 255; png.data[i * 4] = v; png.data[i * 4 + 1] = v; png.data[i * 4 + 2] = v; png.data[i * 4 + 3] = 255 }
    potrace.trace(PNG.sync.write(png), { turdSize: turd, alphaMax: alpha, optCurve: true, optTolerance: tol, threshold: 128 }, (e, svg) => {
      if (e) return rej(e); const m2 = svg.match(/ d="([^"]*)"/); res(m2 ? m2[1] : '')
    })
  })
}

const rnd = v => Math.round(v * 10) / 10
const rq = v => Math.round(v * 5) / 5
// paths are emitted in tenth-units (integers); the renderer scales them by 0.1
const Q = 5 // path units per output unit
const fmt = v => String(Math.round(v * Q))
function nums(arr) { let s = ''; for (const v of arr) { const t = fmt(v); s += (s === '' || t.startsWith('-')) ? t : ' ' + t } return s }

// potrace absolute path -> compact relative path in output coords
function xformPath(d, f) {
  const toks = d.replace(/,/g, ' ').trim().split(/\s+/)
  let out = '', i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = ''
  const P = () => { const [x, y] = f(+toks[i++], +toks[i++]); return [rq(x), rq(y)] }
  while (i < toks.length) {
    let t = toks[i]
    if (/^[A-Za-z]$/.test(t)) i++; else t = cmd === 'c' ? 'C' : cmd === 'l' ? 'L' : 'L'
    if (t === 'M') { const [X, Y] = P(); out += out ? 'm' + nums([X - cx, Y - cy]) : 'M' + nums([X, Y]); cx = sx = X; cy = sy = Y; cmd = 'm' }
    else if (t === 'C') {
      const a = P(), b = P(), c = P()
      const s = nums([a[0] - cx, a[1] - cy, b[0] - cx, b[1] - cy, c[0] - cx, c[1] - cy])
      out += cmd === 'c' ? (s.startsWith('-') ? s : ' ' + s) : 'c' + s; cmd = 'c'; cx = c[0]; cy = c[1]
    } else if (t === 'L') {
      const [X, Y] = P(); const s = nums([X - cx, Y - cy])
      out += cmd === 'l' ? (s.startsWith('-') ? s : ' ' + s) : 'l' + s; cmd = 'l'; cx = X; cy = Y
    } else if (t === 'Z' || t === 'z') { out += 'z'; cx = sx; cy = sy; cmd = 'z' }
    else throw new Error('tok ' + t)
  }
  return out
}

async function run(name) {
  const S0 = SPECS[name]; const [x0, y0, w, h] = S0.box, N = w * h, K = S0.k || 2
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = ((y + y0) * ref.w + x + x0) * 4; R[y * w + x] = ref.d[k]; G[y * w + x] = ref.d[k + 1]; B[y * w + x] = ref.d[k + 2] }
  const Z = n => M.polyMask(S0.zones[n] || [], x0, y0, w, h)
  const zHair = Z('hair'), zHoof = Z('hoof'), zNoSpot = Z('noSpot'), zErase = Z('erase'), zAdd = Z('add'), zCut = Z('cut'), zInk = Z('ink'), zNoInk = Z('noInk'), zFace = Z('face'), zFar = Z('farLeg'), zTail = Z('tail'), zEye = Z('eye')
  const mx = i => Math.max(R[i], G[i], B[i]), lum = i => (R[i] + G[i] + B[i]) / 3, rat = i => (R[i] - B[i]) / Math.max(R[i], 1)
  const DK = S0.dark || 62
  const dark = new Uint8Array(N), col = new Uint8Array(N)
  const BG = S0.bgMax ?? 16
  for (let i = 0; i < N; i++) {
    const hz = zHair[i] || zTail[i]
    dark[i] = mx(i) < (hz ? (S0.hairInk ?? 40) : DK) ? 1 : 0
    const green = mx(i) >= DK && G[i] >= R[i] - (S0.greenTol ?? 3) && G[i] - B[i] > 12
    col[i] = ((mx(i) >= BG && !green && !zErase[i]) || zAdd[i]) ? 1 : 0
  }
  let S = M.close(col, w, h, S0.closeR ?? 1)
  for (let i = 0; i < N; i++) if (zCut[i]) S[i] = 0
  S = M.fillHoles(S, w, h, S0.holeMax ?? 4000)
  for (let i = 0; i < N; i++) if (zErase[i] || zCut[i]) S[i] = 0; else if (zAdd[i]) S[i] = 1
  { const So = M.open(S, w, h, S0.openR ?? 1.2); for (let i = 0; i < N; i++) if (!(zHair[i] || zTail[i])) S[i] = So[i] }
  { const sb = M.blur(S, w, h, 0.7); for (let i = 0; i < N; i++) S[i] = sb[i] > 0.5 ? 1 : 0 }
  S = M.removeSmall(S, w, h, S0.minComp ?? 1500)
  const RING = S0.ring ?? 1.3 // inner rim always inked
  const dIn = M.dist(S.map(v => v ? 0 : 1), w, h)
  const ring = S

  const cls = new Uint8Array(N) // 0 bg 1 body 2 spot 3 hair 4 hoof 5 ink
  const inkSoft = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    if (!ring[i]) continue
    const m = mx(i), dk = (zHair[i] || zTail[i]) ? (S0.hairInk ?? 40) : DK
    inkSoft[i] = Math.max(Math.min(1, Math.max(0, (dk + 14 - m) / 28)), Math.min(1, Math.max(0, RING + 0.5 - dIn[i])))
    if (dIn[i] <= RING) { cls[i] = 5; continue }
    if ((dark[i] && !zNoInk[i]) || zInk[i]) { cls[i] = 5; continue }
    const l = lum(i), r = rat(i)
    if (zEye[i] && l < (S0.eyeLum || 95)) { cls[i] = 5; continue }
    if (zHoof[i] && l < (S0.hoofLum || 178) && R[i] - B[i] < (S0.hoofRB || 48)) { cls[i] = 4; continue }
    if (zTail[i] && l < (S0.tailLum || 195)) { cls[i] = 3; continue }
    if (zHair[i] && (l < (S0.hairLum || 75) || (R[i] - B[i] < (S0.hairRB || 48) && l < 185))) { cls[i] = 3; continue }
    if (zFace[i] && l < (S0.faceLum || 172)) { cls[i] = 3; continue }
    if (zNoSpot[i]) { cls[i] = 1; continue }
    if (zFar[i]) { cls[i] = l < (S0.farSpotLum || 118) ? 2 : 1; continue }
    cls[i] = (l < (S0.spotLum || 145) || (r > (S0.spotRat || 0.42) && l < 182)) ? 2 : 1
  }
  const spotM = M.dilate(cls.map(c => c === 2 ? 1 : 0), w, h, S0.spotDil ?? Math.max(2, 3.5 * 0.34 / S0.T.s))
  const lm = new Float32Array(N), filled = new Uint8Array(N)
  for (let i = 0; i < N; i++) if (cls[i] === 1 && !spotM[i]) { lm[i] = lum(i); filled[i] = 1 }
  let front = []
  for (let i = 0; i < N; i++) if (ring[i] && !filled[i]) front.push(i)
  for (let pass = 0; pass < 600 && front.length; pass++) {
    const nf = [], upd = []
    for (const p of front) {
      const x = p % w; let s = 0, c = 0
      for (const q of [p - 1, p + 1, p - w, p + w, p - w - 1, p - w + 1, p + w - 1, p + w + 1]) {
        if (q < 0 || q >= N || Math.abs(q % w - x) > 1) continue
        if (filled[q]) { s += lm[q]; c++ }
      }
      if (c) upd.push([p, s / c]); else nf.push(p)
    }
    for (const [p, v] of upd) { lm[p] = v; filled[p] = 1 }
    if (!upd.length) break; front = nf
  }
  for (let i = 0; i < N; i++) if (!filled[i]) lm[i] = CREAM
  const lmb = M.blur(lm, w, h, S0.shadeBlur ?? 5 * 0.34 / S0.T.s); for (let i = 0; i < N; i++) if (zNoSpot[i]) lmb[i] = lm[i] * 0.6 + lmb[i] * 0.4

  // hair / hoof masks grown under the ink so no coat colour peeks between them
  const hairX = M.dilate(cls.map(c => c === 3 ? 1 : 0), w, h, 1.6), hoofX = M.dilate(cls.map(c => c === 4 ? 1 : 0), w, h, 1.6)
  // socks (cuatroalbo): thin leg parts within ~16 figure units of a hoof
  const sockM = new Uint8Array(N)
  { const dH = M.dist(cls.map(c => c === 4 ? 1 : 0), w, h), sk = S0.sockH ?? 16, thin = S0.sockThin ?? 6.5
    for (let i = 0; i < N; i++) sockM[i] = S[i] && cls[i] !== 4 && dH[i] * S0.T.s <= sk && dIn[i] * S0.T.s <= thin ? 1 : 0
    const so = M.open(sockM, w, h, 1.5); for (let i = 0; i < N; i++) sockM[i] = so[i] }
  const groups = (S0.groups || []).map(g => ({ ...g, zone: M.polyMask([g.poly], x0, y0, w, h) }))
  const gid = new Int8Array(N).fill(-1); groups.forEach((g, k) => { for (let i = 0; i < N; i++) if (g.zone[i] && gid[i] < 0) gid[i] = k })
  const T = S0.T
  const fRef = (x, y) => [(S0.mirror ? -(x - T.ox) : (x - T.ox)) * T.s + T.tx, (y - T.oy) * T.s + T.ty]
  const f = (X, Y) => fRef(X / K + x0, Y / K + y0)
  const W = w * K, H = h * K
  async function layer(soft, thr = 0.5, blur = 0.7, turd = 10, tol = 0.8, alpha = 1.0) {
    const b = blur ? M.blur(soft, w, h, blur) : soft; const u = M.upsample(b, w, h, K)
    const m = new Uint8Array(W * H); let any = 0; for (let i = 0; i < W * H; i++) { m[i] = u[i] >= thr ? 1 : 0; any |= m[i] }
    if (!any) return ''
    const d = await traceMask(m, W, H, turd, tol, alpha); return d ? xformPath(d, f) : ''
  }
  const out = { name, groups: [] }
  const ids = ['body', ...groups.map(g => g.id)]
  const bands = S0.bands || [['hi', -1.03], ['sh1', 0.935], ['sh2', 0.835], ['sh3', 0.72], ['sh4', 0.6]]
  for (let gk = -1; gk < groups.length; gk++) {
    const inG = new Uint8Array(N)
    if (gk < 0) { for (let i = 0; i < N; i++) inG[i] = gid[i] < 0 ? 1 : 0 }
    else { const z = M.dilate(groups[gk].zone, w, h, groups[gk].overlap ?? 2.5); for (let i = 0; i < N; i++) inG[i] = z[i] }
    const sel = fn => { const a = new Float32Array(N); for (let i = 0; i < N; i++) if (inG[i]) a[i] = fn(i); return a }
    const g = { id: ids[gk + 1], pivot: gk >= 0 ? fRef(...groups[gk].pivot).map(rnd) : null, L: {} }
    const und = gk < 0 ? M.polyMask(groups.filter(q => q.under).map(q => q.under), x0, y0, w, h) : null
    g.L.base = await layer(gk < 0 ? Float32Array.from(S, (v, i) => v && (inG[i] || (und[i] && dIn[i] * T.s > (S0.underInset ?? 2.6))) ? 1 : 0) : sel(i => S[i]), 0.5, 0.8, 10, 1.2)
    for (const [n, t] of bands) g.L[n] = await layer(sel(i => S[i] ? (t < 0 ? (lmb[i] > -t * CREAM ? 1 : 0) : (lmb[i] < t * CREAM ? 1 : 0)) : 0), 0.5, 1.2, S0.bandTurd ?? 220, 1.5, 1.2)
    g.L.hair = await layer(sel(i => cls[i] === 3 || (cls[i] === 5 && hairX[i]) ? 1 : 0), 0.5, 0.8, S0.hairTurd ?? 16, 1.4, 1.1)
    g.L.hairD = await layer(sel(i => cls[i] === 3 && lum(i) < (S0.hairDk || 72) ? 1 : 0), 0.5, 0.9, S0.hairTurd2 ?? 30, 1.2, 1.1)
    g.L.hairL = await layer(sel(i => cls[i] === 3 && lum(i) > (S0.hairLt || 118) ? 1 : 0), 0.5, 0.9, S0.hairTurd2 ?? 30, 1.2, 1.1)
    g.L.hairLL = await layer(sel(i => cls[i] === 3 && lum(i) > (S0.hairLLt || 150) ? 1 : 0), 0.5, 0.9, S0.hairTurd2 ?? 30, 1.2, 1.1)
    g.L.hoof = await layer(sel(i => cls[i] === 4 || (cls[i] === 5 && hoofX[i]) ? 1 : 0), 0.5, 0.7)
    g.L.hoofL = await layer(sel(i => cls[i] === 4 && lum(i) > (S0.hoofLt || 125) ? 1 : 0), 0.5, 0.7)
    g.L.ink = await layer(sel(i => cls[i] === 5 ? Math.max(inkSoft[i], 0.62) : (S[i] ? inkSoft[i] * 0.8 : 0)), S0.inkThr ?? 0.5, S0.inkBlur ?? 0.6, S0.inkTurd ?? 22, S0.inkTol ?? 1.4, 1.0)
    g.M = {}
    for (const [n, polys] of Object.entries(S0.marks || {})) {
      const pm = n === 'socks' ? sockM : M.polyMask(polys, x0, y0, w, h)
      const d = await layer(sel(i => pm[i] && S[i] ? 1 : 0), 0.5, S0.markBlur ?? 1.4, 20, 1.2)
      if (d) g.M[n] = d
    }
    out.groups.push(g)
  }
  { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (S[y * w + x]) { a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); d = Math.max(d, y) }
    const p1 = fRef(a + x0, b + y0), p2 = fRef(c + x0 + 1, d + y0 + 1); out.box = [Math.min(p1[0], p2[0]), p1[1], Math.abs(p2[0] - p1[0]), p2[1] - p1[1]].map(rnd) }
  const P = pt => fRef(pt[0], pt[1]).map(rnd)
  out.eye = S0.eye ? { c: P(S0.eye.c), r: rnd(S0.eye.r * T.s) } : null
  out.marks = {}
  // ── procedural spot seeds (leopardo) + pio patches, sized by local body thickness (output units)
  {
    let seed = S0.seed || 7; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
    const Ts = T.s
    out.spots = {}
    const hairD2 = M.dilate(cls.map(c => c === 3 ? 1 : 0), w, h, 2)
    for (let gk = -1; gk < groups.length; gk++) {
      if (gk >= 0 && !groups[gk].spots) continue
      const bm = new Uint8Array(N); for (let i = 0; i < N; i++) bm[i] = S[i] && !hairD2[i] && cls[i] !== 4 && !zTail[i] && !zFace[i] && !zNoSpot[i] && gid[i] === gk ? 1 : 0
      const dt = M.dist(bm.map(v => v ? 0 : 1), w, h)
      const RR = 14, hw = new Float32Array(N), tmp = new Float32Array(N)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 0; for (let i = Math.max(0, x - RR); i <= Math.min(w - 1, x + RR); i++) m = Math.max(m, dt[y * w + i]); tmp[y * w + x] = m }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 0; for (let j = Math.max(0, y - RR); j <= Math.min(h - 1, y + RR); j++) m = Math.max(m, tmp[j * w + x]); hw[y * w + x] = m * Ts }
      const pts = []; const sk = S0.spotScale || 1
      for (let t = 0; t < 60000 && pts.length < 400; t++) {
        const x = Math.floor(rand() * w), y = Math.floor(rand() * h), i = y * w + x
        if (!bm[i] || dt[i] * Ts < 0.5) continue
        if (zFar[i] && rand() > (S0.farSpotP ?? 0.35)) continue
        if (hw[i] < 4.8 && rand() < 0.45) continue
        const r = Math.max(1.1, Math.min(8.2, hw[i] * (S0.spotK ?? 0.36))) * (0.6 + rand() * 0.65) * sk
        let ok = true
        for (const p of pts) { const d = Math.hypot(p[0] - x, p[1] - y) * Ts; if (d < (p[2] + r) * (S0.spotGap ?? 1.12) + 0.85) { ok = false; break } }
        if (ok) pts.push([x, y, r])
      }
      out.spots[gk < 0 ? 'body' : groups[gk].id] = pts.map(([x, y, r]) => { const p = fRef(x + x0, y + y0); return [rnd(p[0]), rnd(p[1]), rnd(r)] })
      if (gk < 0) {
        const pp = []
        for (let t = 0; t < 20000 && pp.length < (S0.pioN || 5); t++) {
          const x = Math.floor(rand() * w), y = Math.floor(rand() * h), i = y * w + x
          if (!bm[i] || hw[i] < (S0.pioMinHw || 9)) continue
          const r = hw[i] * (0.85 + rand() * 0.4)
          if (pp.some(p => Math.hypot(p[0] - x, p[1] - y) * Ts < (p[2] + r) * 0.9)) continue
          pp.push([x, y, r])
        }
        out.pio = pp.map(([x, y, r]) => { const p = fRef(x + x0, y + y0); return [rnd(p[0]), rnd(p[1]), rnd(r)] })
      }
    }
  }
  out.anchors = Object.fromEntries(Object.entries(S0.anchors || {}).map(([k, v]) => [k, P(v)]))
  { const acc = {}; const add = (k, i) => { const a = acc[k] || (acc[k] = [0, 0, 0, 0]); a[0] += R[i]; a[1] += G[i]; a[2] += B[i]; a[3]++ }
    for (let i = 0; i < N; i++) { const l = lum(i)
      if (cls[i] === 3) add(l < (S0.hairDk || 72) ? 'hairD' : l > (S0.hairLLt || 150) ? 'hairLL' : l > (S0.hairLt || 118) ? 'hairL' : 'hair', i)
      if (cls[i] === 4) add(l > (S0.hoofLt || 125) ? 'hoofL' : 'hoof', i)
      if (cls[i] === 2) add('spot', i); if (cls[i] === 5) add('ink', i)
      if (cls[i] === 1 && !spotM[i]) add('b' + Math.floor(lm[i] / CREAM * 10), i) }
    console.log(Object.entries(acc).sort().map(([k, a]) => k + ':' + a.slice(0, 3).map(v => Math.round(v / a[3])).join(',') + '(' + a[3] + ')').join(' ')) }
  const OUT = require('path').join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(OUT + '/' + name + '.json', JSON.stringify(out))
  const o = { w, h, d: Buffer.alloc(N * 4) }; const C = [[0, 0, 80], [255, 230, 170], [200, 40, 40], [120, 60, 170], [40, 160, 160], [0, 0, 0]]
  for (let i = 0; i < N; i++) { let c = C[cls[i]]; if (gid[i] >= 0 && cls[i]) c = c.map(v => v * 0.7 + 60); o.d.set([...c, 255], i * 4) }
  L.save(require('path').join(__dirname, 'out', name + '_cls.png'), o)
  const sizes = {}; for (const g of out.groups) for (const [k, v] of Object.entries(g.L)) sizes[k] = (sizes[k] || 0) + v.length
  console.log(name, 'bytes', JSON.stringify(out).length, JSON.stringify(sizes))
}
run(process.argv[2]).catch(e => { console.error(e); process.exit(1) })
