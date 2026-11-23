/* Traced horse artwork.
 *
 * Every pose is a set of filled SVG paths traced from the reference
 * illustration (one path per colour class), so the drawing keeps the
 * original ink lines, shading and hair strands while the colours stay
 * customisable. Path data is stored in "path units" = 1/5 of a figure unit
 * (integers keep the strings short); the renderer wraps them in scale(.2).
 *
 * Figure units: ground line at y = 292, the standing horse spans roughly
 * x 5..214 / y 14..292 (same frame the old rig used, so viewBoxes carry over).
 */

export type V2 = [number, number]

/** Colour classes of the trace, drawn bottom → top in this order. */
export type ArtLayer =
  | 'base'                                  // silhouette, filled with the coat colour
  | 'hi' | 'sh1' | 'sh2' | 'sh3' | 'sh4'    // highlight + stacked shading bands
  | 'hair' | 'hairD' | 'hairL' | 'hairLL'   // mane / tail / dark face: base + tones
  | 'hoof' | 'hoofL'
  | 'ink'                                   // line art

export type ArtMark = 'blaze' | 'socks' | 'manta'

export interface ArtGroup {
  /** 'body' or a separately animatable part ('tail', 'earN', 'hind'…). */
  id: string
  /** Rotation pivot in figure units (absent for 'body'). */
  pivot?: V2
  L: Partial<Record<ArtLayer, string>>
  /** White markings clipped to this group (careto, cuatroalbo, appaloosa blanket). */
  M?: Partial<Record<ArtMark, string>>
}

export interface PoseArt {
  name: string
  /** Bounding box of the silhouette [x, y, w, h] in figure units. */
  box: [number, number, number, number]
  groups: ArtGroup[]
  /** Leopard-spot seeds per group, flat [x, y, r, x, y, r…] in figure units. */
  spots: Record<string, number[]>
  /** Pinto patch seeds (body group), flat [x, y, r…]. */
  pio: number[]
  eye?: { c: V2; r: number }
  anchors: { head: V2; hooves: V2; tail: V2; back: V2 }
}
