import type { CoatPattern } from '../../types'

/** Everything the horse renderer needs to paint a coat. */
export interface HorseCoat {
  ink: string
  spotInk: string
  /** Optional mane & tail colour; null/undefined = derived from ink. */
  maneInk?: string | null
  /** 'lisa' | 'pio' | 'appaloosa' (manta) | 'leopardo'; unknown values render as lisa. */
  pattern: CoatPattern | string
  careto: boolean
  cuatroalbo: boolean
}

/** Build a HorseCoat from an Animal-like record (azulejo_* + coat_* columns). */
export function coatFromAnimal(a: {
  azulejo_ink?: string | null; azulejo_spot_ink?: string | null; azulejo_mane_ink?: string | null
  coat_pattern?: string | null; coat_careto?: boolean | null; coat_cuatroalbo?: boolean | null
}): HorseCoat {
  return {
    ink:        a.azulejo_ink      ?? '#4A2810',
    spotInk:    a.azulejo_spot_ink ?? '#1A100C',
    maneInk:    a.azulejo_mane_ink ?? null,
    pattern:    a.coat_pattern     ?? 'lisa',
    careto:     !!a.coat_careto,
    cuatroalbo: !!a.coat_cuatroalbo,
  }
}
