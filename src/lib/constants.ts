// ─── BRAND COLORS ────────────────────────────────────────────────────────────
export const COLORS = {
  granate:      '#7B1F3A',
  granateDark:  '#5C1629',
  granateLight: '#F5E8EC',
  granateMid:   '#C4607A',
  arena:        '#F7F3EE',
  terracota:    '#C4704A',
  green:        '#2E6B3E',
  greenLight:   '#EAF3EC',
  amber:        '#9C6A00',
  amberLight:   '#FDF3DC',
  blue:         '#1A4F7A',
  blueLight:    '#E8F0F8',
  red:          '#8C1F1F',
  redLight:     '#FCEAEA',
} as const

// ─── MEADOW COLOR PALETTE (low opacity, user-selectable) ─────────────────────
export const MEADOW_COLORS = [
  { label: 'Verde',      rgba: 'rgba(46,107,62,0.18)',   hex: '#2E6B3E' },
  { label: 'Ámbar',      rgba: 'rgba(156,106,0,0.15)',   hex: '#9C6A00' },
  { label: 'Azul',       rgba: 'rgba(26,79,122,0.14)',   hex: '#1A4F7A' },
  { label: 'Granate',    rgba: 'rgba(123,31,58,0.14)',   hex: '#7B1F3A' },
  { label: 'Terracota',  rgba: 'rgba(196,112,74,0.16)',  hex: '#C4704A' },
  { label: 'Violeta',    rgba: 'rgba(90,30,130,0.14)',   hex: '#5A1E82' },
  { label: 'Teal',       rgba: 'rgba(20,110,140,0.15)',  hex: '#146E8C' },
  { label: 'Rojo',       rgba: 'rgba(180,60,60,0.14)',   hex: '#B43C3C' },
  { label: 'Esmeralda',  rgba: 'rgba(60,120,60,0.15)',   hex: '#3C783C' },
  { label: 'Dorado',     rgba: 'rgba(200,160,20,0.14)',  hex: '#C8A014' },
  { label: 'Gris',       rgba: 'rgba(160,136,136,0.14)', hex: '#A08888' },
  { label: 'Índigo',     rgba: 'rgba(40,100,160,0.14)',  hex: '#2864A0' },
] as const

// ─── AZULEJO INK COLORS ──────────────────────────────────────────────────────
export const AZULEJO_COLORS = [
  { label: 'Negro',       ink: '#14100C', bg: '#E8E0DC' },
  { label: 'Castaño osc.',ink: '#4A2810', bg: '#F0E4D4' },
  { label: 'Castaño',     ink: '#7A3018', bg: '#F2E4D8' },
  { label: 'Alazán',      ink: '#8C3818', bg: '#F4E8DC' },
  { label: 'Palomino',    ink: '#C06840', bg: '#F8EDE0' },
  { label: 'Isabela',     ink: '#C8A050', bg: '#FBF5E8' },
  { label: 'Gris',        ink: '#606060', bg: '#EBEBEB' },
  { label: 'Tordo osc.',  ink: '#7A8898', bg: '#EEF0F4' },
  { label: 'Tordo claro', ink: '#A09070', bg: '#F8F2E8' },
  { label: 'Blanco',      ink: '#C0B8A8', bg: '#FAF8F4' },
] as const

// ─── COAT OPTIONS ─────────────────────────────────────────────────────────────
export const COAT_BASES = [
  { value: 'negro',   label: 'Negro',   color: '#1A1208' },
  { value: 'castano', label: 'Castaño', color: '#6B3A18' },
  { value: 'alazan',  label: 'Alazán',  color: '#C07030' },
] as const

export const COAT_PATTERNS = [
  { value: 'lisa',      label: 'Lisa'      },
  { value: 'pio',       label: 'Pío'       },
  { value: 'appaloosa', label: 'Appaloosa' },
] as const

// ─── GENETICS LOCI ───────────────────────────────────────────────────────────
export const LOCI_PRIMARY = [
  { key: 'grey',       label: 'Grey (G)',       options: ['GG','Gg','gg'] },
  { key: 'extension',  label: 'Extension (E)',  options: ['EE','Ee','ee'] },
  { key: 'agouti',     label: 'Agouti (A)',     options: ['AA','Aa','aa'] },
  { key: 'cream',      label: 'Cream (Cr)',     options: ['N/N','N/Cr','Cr/Cr'] },
  { key: 'pearl',      label: 'Pearl (Prl)',    options: ['N/N','N/Prl','Prl/Prl'] },
  { key: 'appaloosa',  label: 'Appaloosa (LP)', options: ['N/N','N/LP','LP/LP'] },
] as const

export const LOCI_SECONDARY = [
  { key: 'dun',     label: 'Dun (D)',       options: ['N/N','N/D','D/D'] },
  { key: 'silver',  label: 'Silver (Z)',    options: ['N/N','N/Z','Z/Z'] },
  { key: 'roan',    label: 'Roan (Rn)',     options: ['N/N','N/Rn'] },
  { key: 'tobiano', label: 'Tobiano (TO)',  options: ['N/N','N/TO','TO/TO'] },
  { key: 'overo',   label: 'Overo (O)',     options: ['N/N','N/O'] },
  { key: 'sabino',  label: 'Sabino (SB1)',  options: ['N/N','N/SB1'] },
] as const

// ─── ANIMAL SEX LABELS ───────────────────────────────────────────────────────
export const SEX_LABELS: Record<string, string> = {
  semental: 'Semental',
  yegua:    'Yegua',
  potro:    'Potro',
  potra:    'Potra',
  castrado: 'Castrado',
}

export const STATUS_LABELS: Record<string, string> = {
  activo:   'Activo',
  vendido:  'Vendido',
  fallecido:'Fallecido',
  cedido:   'Cedido',
  custodia: 'En custodia',
}

// ─── DOC TYPES ───────────────────────────────────────────────────────────────
export const DOC_TYPE_LABELS: Record<string, string> = {
  veterinario: 'Veterinario',
  genetica:    'Genética',
  certificado: 'Certificado',
  otro:        'Otro',
}

// ─── HERRADO TYPES ───────────────────────────────────────────────────────────
export const HERRADO_TYPE_LABELS: Record<string, string> = {
  completo:   'Completo',
  reherrado:  'Reherrado',
  correctivo: 'Correctivo',
  descalzo:   'Descalzo',
}

// ─── PREGNANCY EXPECTED DAYS ─────────────────────────────────────────────────
export const PREGNANCY_DAYS = 340

// ─── WATER/FOOD SEMAPHORE LOGIC ──────────────────────────────────────────────
// amber when > half of average, red when >= average
export function getWaterFoodStatus(
  daysSince: number,
  average: number
): 'ok' | 'warn' | 'due' {
  if (daysSince >= average) return 'due'
  if (daysSince >= Math.ceil(average / 2)) return 'warn'
  return 'ok'
}
