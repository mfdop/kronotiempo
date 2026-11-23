// node export.js -> writes src/components/horse/art/*.ts from out/*.json
const fs = require('fs')
const path = require('path')
const DST = path.resolve(__dirname, '../../src/components/horse/art') + '/'
fs.mkdirSync(DST, { recursive: true })
const KEEP = { icon: ['base', 'sh1', 'hair', 'hairD', 'hoof', 'ink'] }
for (const name of ['stand', 'front', 'graze', 'rear', 'gallop', 'rest', 'icon']) {
  const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', name + '.json'), 'utf8'))
  const keep = KEEP[name]
  const art = {
    name, box: J.box,
    groups: J.groups.map(g => ({ id: g.id, ...(g.pivot ? { pivot: g.pivot } : {}), L: Object.fromEntries(Object.entries(g.L).filter(([k, v]) => v && (!keep || keep.includes(k)))), ...(Object.keys(g.M || {}).length ? { M: g.M } : {}) })),
    spots: Object.fromEntries(Object.entries(J.spots).map(([k, v]) => [k, v.flat()])),
    pio: (J.pio || []).flat(),
    ...(J.eye ? { eye: J.eye } : {}),
    anchors: J.anchors,
  }
  const src = `// AUTO-GENERATED from the reference illustration by the horse tracing tool\n// (per-class masks vectorised with potrace; tool: tools/horse-trace). Do not edit by hand.\nimport type { PoseArt } from './types'\n\nconst art: PoseArt = ${JSON.stringify(art)}\nexport default art\n`
  fs.writeFileSync(DST + name + '.ts', src)
  console.log(name, src.length)
}
