/* ════════════════════════════════════════════════════════════════════════════
 * HORSE ANIMATIONS — registry + CSS keyframes for the HorseFigure rig.
 *
 * HOW TO ADD A NEW ANIMATION
 *   1. Add an entry to HORSE_ANIMATIONS (id, label shown in the stage, duration
 *      in ms, optional emote).
 *   2. Add CSS rules below scoped to `.hz-live[data-anim="<id>"] .hz-<part>`
 *      using keyframes named `hz-<id>-<part>`. Animate only `transform`.
 *      Parts: .hz-rig .hz-body .hz-barrel .hz-neck .hz-mane .hz-head .hz-jaw
 *      .hz-ear .hz-eye .hz-tail .hz-shadow and legs .hz-nf .hz-ff .hz-nh .hz-fh
 *      (near/far × front/hind), each with .hz-up (upper) > .hz-lo (lower).
 *      Rotation sign (horse faces left, SVG y down): positive = clockwise.
 *        neck/head +  → head goes up;      neck −  → head goes down
 *        front/hind leg upper + → hoof forward (left);  − → hoof back
 *        front lower −  → knee folds (hoof goes back/up)
 *        rig +  → rears (pivot at hind hooves)
 *   3. Make the keyframes' total length match `ms` (iterations × duration).
 * Idle loops (breathing, tail, blink, ears) run whenever `.hz-live` is set
 * and are overridden part-by-part by the action rules (higher specificity).
 * ══════════════════════════════════════════════════════════════════════════ */

export type HorseEmote = 'neigh' | 'graze' | 'dust' | 'shake' | 'bang' | 'heart'

export interface HorseAnimation {
  id: string
  label: string
  ms: number
  emote?: HorseEmote
}

export const HORSE_ANIMATIONS: HorseAnimation[] = [
  { id: 'neigh',  label: '¡Relincho!',      ms: 1800, emote: 'neigh' },
  { id: 'graze',  label: 'Pastando…',       ms: 3000, emote: 'graze' },
  { id: 'trot',   label: 'Al trote',        ms: 2400, emote: 'dust'  },
  { id: 'gallop', label: '¡Al galope!',     ms: 2500, emote: 'dust'  },
  { id: 'shake',  label: 'Sacude la crin',  ms: 1400, emote: 'shake' },
  { id: 'rear',   label: '¡Encabritado!',   ms: 2300, emote: 'bang'  },
  { id: 'buck',   label: '¡Coz!',           ms: 1500, emote: 'bang'  },
  { id: 'nuzzle', label: '¡Mimos!',         ms: 2000, emote: 'heart' },
]

const A = (sel: string, anim: string, rule: string) =>
  `.hz-live[data-anim="${anim}"] ${sel}{animation:${rule}}`

export const HORSE_CSS = `
.hz{display:block;overflow:visible;-webkit-tap-highlight-color:transparent}
.hz g,.hz ellipse{transform-box:view-box}
.hz-rig{transform-origin:163px 187px}
.hz-body{transform-origin:122px 120px}
.hz-barrel{transform-origin:122px 130px}
.hz-neck{transform-origin:90px 104px}
.hz-tail{transform-origin:173px 86px}

/* ── idle loops ─────────────────────────────────────────── */
.hz-live .hz-barrel{animation:hz-breathe 3.4s ease-in-out infinite}
.hz-live .hz-tail{animation:hz-tail-idle 4.2s ease-in-out infinite}
.hz-live .hz-neck{animation:hz-neck-idle 5.2s ease-in-out infinite}
.hz-live .hz-eye{animation:hz-blink 4.8s linear infinite}
.hz-live .hz-ear-near{animation:hz-ear-idle 6.5s ease-in-out infinite}
.hz-live .hz-ear-far{animation:hz-ear-idle 6.5s ease-in-out -1.7s infinite}
@keyframes hz-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.006,1.03)}}
@keyframes hz-tail-idle{0%,100%{transform:rotate(-2deg)}45%{transform:rotate(5deg)}60%{transform:rotate(3deg)}}
@keyframes hz-neck-idle{0%,100%{transform:rotate(0)}50%{transform:rotate(-2.5deg)}}
@keyframes hz-blink{0%,93%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.08)}}
@keyframes hz-ear-idle{0%,84%,100%{transform:rotate(0)}88%{transform:rotate(16deg)}92%{transform:rotate(-4deg)}95%{transform:rotate(0)}}

/* ── RELINCHAR (neigh) 1.8s ──────────────────────────────── */
${A('.hz-neck', 'neigh', 'hz-neigh-neck 1.8s ease-in-out both')}
${A('.hz-head', 'neigh', 'hz-neigh-head 1.8s ease-in-out both')}
${A('.hz-jaw', 'neigh', 'hz-neigh-jaw 1.8s ease-in-out both')}
${A('.hz-body', 'neigh', 'hz-neigh-body 1.8s ease-in-out both')}
${A('.hz-nf .hz-up', 'neigh', 'hz-neigh-fu 1.8s ease-in-out both')}
${A('.hz-nf .hz-lo', 'neigh', 'hz-neigh-fl 1.8s ease-in-out both')}
${A('.hz-ear', 'neigh', 'hz-neigh-ear 1.8s ease-in-out both')}
${A('.hz-tail', 'neigh', 'hz-neigh-tail 1.8s ease-in-out both')}
@keyframes hz-neigh-neck{0%,100%{transform:rotate(0)}22%{transform:rotate(15deg)}36%{transform:rotate(11deg)}50%{transform:rotate(15deg)}64%{transform:rotate(11deg)}78%{transform:rotate(13deg)}}
@keyframes hz-neigh-head{0%,100%{transform:rotate(0)}22%,78%{transform:rotate(16deg)}}
@keyframes hz-neigh-jaw{0%,18%,86%,100%{transform:rotate(0)}28%{transform:rotate(-20deg)}38%{transform:rotate(-9deg)}48%{transform:rotate(-20deg)}58%{transform:rotate(-9deg)}70%{transform:rotate(-18deg)}}
@keyframes hz-neigh-body{0%,100%{transform:rotate(0)}22%,78%{transform:rotate(3deg)}}
@keyframes hz-neigh-fu{0%,100%{transform:rotate(0)}25%{transform:rotate(30deg)}45%{transform:rotate(6deg)}62%{transform:rotate(30deg)}80%{transform:rotate(0)}}
@keyframes hz-neigh-fl{0%,100%{transform:rotate(0)}25%{transform:rotate(-70deg)}45%{transform:rotate(-10deg)}62%{transform:rotate(-70deg)}80%{transform:rotate(0)}}
@keyframes hz-neigh-ear{0%,100%{transform:rotate(0)}20%,80%{transform:rotate(-12deg)}}
@keyframes hz-neigh-tail{0%,100%{transform:rotate(0)}25%{transform:rotate(-24deg)}50%{transform:rotate(-14deg)}75%{transform:rotate(-22deg)}}

/* ── PASTAR (graze) 3s ──────────────────────────────────── */
${A('.hz-neck', 'graze', 'hz-graze-neck 3s ease-in-out both')}
${A('.hz-head', 'graze', 'hz-graze-head 3s ease-in-out both')}
${A('.hz-jaw', 'graze', 'hz-graze-jaw 3s ease-in-out both')}
${A('.hz-body', 'graze', 'hz-graze-body 3s ease-in-out both')}
${A('.hz-nf .hz-up', 'graze', 'hz-graze-nf 3s ease-in-out both')}
${A('.hz-ear', 'graze', 'hz-graze-ear 3s ease-in-out both')}
@keyframes hz-graze-neck{0%,100%{transform:rotate(0)}28%,80%{transform:rotate(-86deg)}}
@keyframes hz-graze-head{0%,100%{transform:rotate(0)}20%{transform:rotate(-10deg)}34%,80%{transform:rotate(40deg)}}
@keyframes hz-graze-jaw{0%,32%,78%,100%{transform:rotate(0)}38%,50%,62%,74%{transform:rotate(-12deg)}44%,56%,68%{transform:rotate(-2deg)}}
@keyframes hz-graze-body{0%,100%{transform:rotate(0)}28%,80%{transform:rotate(-3deg)}}
@keyframes hz-graze-nf{0%,100%{transform:rotate(0)}28%,80%{transform:rotate(9deg)}}
@keyframes hz-graze-ear{0%,100%{transform:rotate(0)}40%{transform:rotate(14deg)}55%{transform:rotate(0)}66%{transform:rotate(14deg)}}

/* ── TROTE (trot) 4 × .6s — diagonal pairs nf+fh / ff+nh ── */
${A('.hz-rig', 'trot', 'hz-bob .3s ease-in-out 8 both')}
${A('.hz-shadow', 'trot', 'hz-shadow-bob .3s ease-in-out 8 both')}
${A('.hz-neck', 'trot', 'hz-trot-neck .3s ease-in-out 8 both')}
${A('.hz-tail', 'trot', 'hz-trot-tail .3s ease-in-out 8 both')}
${A('.hz-mane', 'trot', 'hz-mane-flap .3s ease-in-out 8 both')}
${A('.hz-nf .hz-up', 'trot', 'hz-trot-fu-a .6s ease-in-out 4 both')}
${A('.hz-nf .hz-lo', 'trot', 'hz-trot-fl-a .6s ease-in-out 4 both')}
${A('.hz-fh .hz-up', 'trot', 'hz-trot-hu-a .6s ease-in-out 4 both')}
${A('.hz-fh .hz-lo', 'trot', 'hz-trot-hl-a .6s ease-in-out 4 both')}
${A('.hz-ff .hz-up', 'trot', 'hz-trot-fu-b .6s ease-in-out 4 both')}
${A('.hz-ff .hz-lo', 'trot', 'hz-trot-fl-b .6s ease-in-out 4 both')}
${A('.hz-nh .hz-up', 'trot', 'hz-trot-hu-b .6s ease-in-out 4 both')}
${A('.hz-nh .hz-lo', 'trot', 'hz-trot-hl-b .6s ease-in-out 4 both')}
@keyframes hz-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3.5px)}}
@keyframes hz-shadow-bob{0%,100%{transform:scale(1)}50%{transform:scale(.93)}}
@keyframes hz-trot-neck{0%,100%{transform:rotate(0)}50%{transform:rotate(-3deg)}}
@keyframes hz-trot-tail{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(-16deg)}}
@keyframes hz-mane-flap{0%,100%{transform:rotate(0)}50%{transform:rotate(4deg)}}
@keyframes hz-trot-fu-a{0%{transform:rotate(-6deg)}25%{transform:rotate(24deg)}50%{transform:rotate(8deg)}100%{transform:rotate(-6deg)}}
@keyframes hz-trot-fl-a{0%,50%,100%{transform:rotate(0)}25%{transform:rotate(-70deg)}}
@keyframes hz-trot-fu-b{0%{transform:rotate(8deg)}50%{transform:rotate(-6deg)}75%{transform:rotate(24deg)}100%{transform:rotate(8deg)}}
@keyframes hz-trot-fl-b{0%,50%,100%{transform:rotate(0)}75%{transform:rotate(-70deg)}}
@keyframes hz-trot-hu-a{0%{transform:rotate(-10deg)}25%{transform:rotate(16deg)}50%{transform:rotate(6deg)}100%{transform:rotate(-10deg)}}
@keyframes hz-trot-hl-a{0%,50%,100%{transform:rotate(0)}25%{transform:rotate(-34deg)}}
@keyframes hz-trot-hu-b{0%{transform:rotate(6deg)}50%{transform:rotate(-10deg)}75%{transform:rotate(16deg)}100%{transform:rotate(6deg)}}
@keyframes hz-trot-hl-b{0%,50%,100%{transform:rotate(0)}75%{transform:rotate(-34deg)}}

/* ── GALOPE (gallop) 5 × .5s ────────────────────────────── */
${A('.hz-rig', 'gallop', 'hz-gal-rig .5s ease-in-out 5 both')}
${A('.hz-body', 'gallop', 'hz-gal-body .5s ease-in-out 5 both')}
${A('.hz-shadow', 'gallop', 'hz-gal-shadow .5s ease-in-out 5 both')}
${A('.hz-neck', 'gallop', 'hz-gal-neck .5s ease-in-out 5 both')}
${A('.hz-tail', 'gallop', 'hz-gal-tail .5s ease-in-out 5 both')}
${A('.hz-mane', 'gallop', 'hz-mane-flap .25s ease-in-out 10 both')}
${A('.hz-ear', 'gallop', 'hz-gal-ear 2.5s ease-in-out both')}
${A('.hz-nf .hz-up', 'gallop', 'hz-gal-fu .5s ease-in-out 5 both')}
${A('.hz-nf .hz-lo', 'gallop', 'hz-gal-fl .5s ease-in-out 5 both')}
${A('.hz-ff .hz-up', 'gallop', 'hz-gal-fu .5s ease-in-out -.06s 5 both')}
${A('.hz-ff .hz-lo', 'gallop', 'hz-gal-fl .5s ease-in-out -.06s 5 both')}
${A('.hz-nh .hz-up', 'gallop', 'hz-gal-hu .5s ease-in-out 5 both')}
${A('.hz-nh .hz-lo', 'gallop', 'hz-gal-hl .5s ease-in-out 5 both')}
${A('.hz-fh .hz-up', 'gallop', 'hz-gal-hu .5s ease-in-out -.06s 5 both')}
${A('.hz-fh .hz-lo', 'gallop', 'hz-gal-hl .5s ease-in-out -.06s 5 both')}
@keyframes hz-gal-rig{0%,100%{transform:translateY(0)}35%{transform:translateY(-9px)}65%{transform:translateY(-3px)}}
@keyframes hz-gal-body{0%,100%{transform:rotate(-4deg)}35%{transform:rotate(5deg)}70%{transform:rotate(-1deg)}}
@keyframes hz-gal-shadow{0%,100%{transform:scale(1)}35%{transform:scale(.82)}}
@keyframes hz-gal-neck{0%,100%{transform:rotate(5deg)}35%{transform:rotate(-7deg)}70%{transform:rotate(3deg)}}
@keyframes hz-gal-tail{0%,100%{transform:rotate(-38deg)}50%{transform:rotate(-48deg)}}
@keyframes hz-gal-ear{0%,100%{transform:rotate(0)}15%,85%{transform:rotate(18deg)}}
@keyframes hz-gal-fu{0%,100%{transform:rotate(-26deg)}30%{transform:rotate(8deg)}50%{transform:rotate(40deg)}72%{transform:rotate(18deg)}}
@keyframes hz-gal-fl{0%,100%{transform:rotate(-12deg)}22%{transform:rotate(-95deg)}48%{transform:rotate(-8deg)}60%{transform:rotate(0)}}
@keyframes hz-gal-hu{0%,100%{transform:rotate(28deg)}35%{transform:rotate(-6deg)}58%{transform:rotate(-34deg)}78%{transform:rotate(0)}}
@keyframes hz-gal-hl{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(8deg)}72%{transform:rotate(-50deg)}90%{transform:rotate(-20deg)}}

/* ── CABECEAR (shake mane) 1.4s ─────────────────────────── */
${A('.hz-neck', 'shake', 'hz-shake-neck 1.4s ease-in-out both')}
${A('.hz-head', 'shake', 'hz-shake-head 1.4s ease-in-out both')}
${A('.hz-mane', 'shake', 'hz-shake-mane 1.4s ease-in-out both')}
${A('.hz-ear', 'shake', 'hz-shake-ear 1.4s ease-in-out both')}
${A('.hz-tail', 'shake', 'hz-shake-tail 1.4s ease-in-out both')}
@keyframes hz-shake-neck{0%,100%{transform:rotate(0)}12%{transform:rotate(8deg)}26%{transform:rotate(-7deg)}40%{transform:rotate(7deg)}54%{transform:rotate(-6deg)}68%{transform:rotate(4deg)}82%{transform:rotate(-2deg)}}
@keyframes hz-shake-head{0%,100%{transform:rotate(0)}16%{transform:rotate(-12deg)}30%{transform:rotate(12deg)}44%{transform:rotate(-11deg)}58%{transform:rotate(9deg)}72%{transform:rotate(-5deg)}86%{transform:rotate(2deg)}}
@keyframes hz-shake-mane{0%,100%{transform:rotate(0) skewX(0)}18%{transform:rotate(-6deg) skewX(8deg)}32%{transform:rotate(6deg) skewX(-8deg)}46%{transform:rotate(-6deg) skewX(8deg)}60%{transform:rotate(5deg) skewX(-6deg)}76%{transform:rotate(-2deg)}}
@keyframes hz-shake-ear{0%,100%{transform:rotate(0)}20%{transform:rotate(22deg)}40%{transform:rotate(-12deg)}60%{transform:rotate(20deg)}80%{transform:rotate(-6deg)}}
@keyframes hz-shake-tail{0%,100%{transform:rotate(0)}25%{transform:rotate(12deg)}50%{transform:rotate(-10deg)}75%{transform:rotate(8deg)}}

/* ── ENCABRITARSE (rear) 2.3s ───────────────────────────── */
${A('.hz-rig', 'rear', 'hz-rear-rig 2.3s cubic-bezier(.45,0,.3,1) both')}
${A('.hz-shadow', 'rear', 'hz-rear-shadow 2.3s ease-in-out both')}
${A('.hz-neck', 'rear', 'hz-rear-neck 2.3s ease-in-out both')}
${A('.hz-head', 'rear', 'hz-rear-head 2.3s ease-in-out both')}
${A('.hz-jaw', 'rear', 'hz-neigh-jaw 2.3s ease-in-out both')}
${A('.hz-tail', 'rear', 'hz-rear-tail 2.3s ease-in-out both')}
${A('.hz-nf .hz-up', 'rear', 'hz-rear-fu 2.3s ease-in-out both')}
${A('.hz-nf .hz-lo', 'rear', 'hz-rear-fl 2.3s ease-in-out both')}
${A('.hz-ff .hz-up', 'rear', 'hz-rear-fu 2.3s ease-in-out -.12s both')}
${A('.hz-ff .hz-lo', 'rear', 'hz-rear-fl 2.3s ease-in-out -.12s both')}
${A('.hz-nh .hz-up', 'rear', 'hz-rear-hu 2.3s cubic-bezier(.45,0,.3,1) both')}
${A('.hz-fh .hz-up', 'rear', 'hz-rear-hu 2.3s cubic-bezier(.45,0,.3,1) both')}
${A('.hz-ear', 'rear', 'hz-neigh-ear 2.3s ease-in-out both')}
@keyframes hz-rear-rig{0%,100%{transform:rotate(0)}30%{transform:rotate(30deg)}50%{transform:rotate(27deg)}70%{transform:rotate(30deg)}82%{transform:rotate(26deg)}}
@keyframes hz-rear-shadow{0%,100%{transform:translateX(0) scaleX(1)}30%,82%{transform:translateX(18px) scaleX(.62)}}
@keyframes hz-rear-neck{0%,100%{transform:rotate(0)}30%,82%{transform:rotate(-10deg)}}
@keyframes hz-rear-head{0%,100%{transform:rotate(0)}30%,82%{transform:rotate(8deg)}}
@keyframes hz-rear-tail{0%,100%{transform:rotate(0)}30%,82%{transform:rotate(-30deg)}}
@keyframes hz-rear-fu{0%,100%{transform:rotate(0)}28%{transform:rotate(40deg)}40%{transform:rotate(18deg)}52%{transform:rotate(42deg)}64%{transform:rotate(18deg)}76%{transform:rotate(38deg)}}
@keyframes hz-rear-fl{0%,100%{transform:rotate(0)}28%{transform:rotate(-100deg)}40%{transform:rotate(-55deg)}52%{transform:rotate(-100deg)}64%{transform:rotate(-55deg)}76%{transform:rotate(-95deg)}}
@keyframes hz-rear-hu{0%,100%{transform:rotate(0)}30%,70%{transform:rotate(-26deg)}50%{transform:rotate(-23deg)}82%{transform:rotate(-22deg)}}

/* ── COZ (buck / kick) 1.5s — pivots on the front hooves ── */
${A('.hz-rig', 'buck', 'hz-buck-rig 1.5s cubic-bezier(.4,0,.3,1) both')}
${A('.hz-shadow', 'buck', 'hz-buck-shadow 1.5s ease-in-out both')}
${A('.hz-neck', 'buck', 'hz-buck-neck 1.5s ease-in-out both')}
${A('.hz-ear', 'buck', 'hz-buck-ear 1.5s ease-in-out both')}
${A('.hz-tail', 'buck', 'hz-buck-tail 1.5s ease-in-out both')}
${A('.hz-nh .hz-up', 'buck', 'hz-buck-hu 1.5s ease-in-out both')}
${A('.hz-fh .hz-up', 'buck', 'hz-buck-hu 1.5s ease-in-out -.05s both')}
${A('.hz-nh .hz-lo', 'buck', 'hz-buck-hl 1.5s ease-in-out both')}
${A('.hz-fh .hz-lo', 'buck', 'hz-buck-hl 1.5s ease-in-out -.05s both')}
${A('.hz-nf .hz-up', 'buck', 'hz-buck-fu 1.5s ease-in-out both')}
${A('.hz-ff .hz-up', 'buck', 'hz-buck-fu 1.5s ease-in-out both')}
@keyframes hz-buck-rig{0%,100%{transform:translate(0,0) rotate(0)}10%{transform:translate(0,2px) rotate(0)}32%,52%{transform:translate(-88px,0) rotate(-17deg) translate(88px,0)}}
@keyframes hz-buck-shadow{0%,100%{transform:translateX(0) scaleX(1)}32%,52%{transform:translateX(-22px) scaleX(.7)}}
@keyframes hz-buck-neck{0%,100%{transform:rotate(0)}32%,52%{transform:rotate(-12deg)}}
@keyframes hz-buck-ear{0%,100%{transform:rotate(0)}20%,60%{transform:rotate(28deg)}}
@keyframes hz-buck-tail{0%,100%{transform:rotate(0)}32%{transform:rotate(-70deg)}52%{transform:rotate(-55deg)}}
@keyframes hz-buck-hu{0%,100%{transform:rotate(0)}12%{transform:rotate(10deg)}34%,50%{transform:rotate(-58deg)}}
@keyframes hz-buck-hl{0%,100%{transform:rotate(0)}12%{transform:rotate(-30deg)}34%,50%{transform:rotate(12deg)}}
@keyframes hz-buck-fu{0%,100%{transform:rotate(0)}32%,52%{transform:rotate(17deg)}}

/* ── MIMOS (nuzzle: tilts head toward the viewer, happy ears) 2s ── */
${A('.hz-neck', 'nuzzle', 'hz-nuz-neck 2s ease-in-out both')}
${A('.hz-head', 'nuzzle', 'hz-nuz-head 2s ease-in-out both')}
${A('.hz-ear', 'nuzzle', 'hz-nuz-ear 2s ease-in-out both')}
${A('.hz-eye', 'nuzzle', 'hz-nuz-eye 2s ease-in-out both')}
${A('.hz-tail', 'nuzzle', 'hz-nuz-tail 2s ease-in-out both')}
@keyframes hz-nuz-neck{0%,100%{transform:rotate(0)}25%,75%{transform:rotate(-14deg)}}
@keyframes hz-nuz-head{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}40%{transform:rotate(-6deg)}55%{transform:rotate(-14deg)}75%{transform:rotate(-8deg)}}
@keyframes hz-nuz-ear{0%,100%{transform:rotate(0)}20%,80%{transform:rotate(-14deg)}50%{transform:rotate(-4deg)}}
@keyframes hz-nuz-eye{0%,20%,80%,100%{transform:scaleY(1)}30%,70%{transform:scaleY(.25)}}
@keyframes hz-nuz-tail{0%,100%{transform:rotate(0)}20%{transform:rotate(10deg)}40%{transform:rotate(-8deg)}60%{transform:rotate(10deg)}80%{transform:rotate(-6deg)}}

/* ── stage emotes (HTML overlays in HorseStage) ─────────── */
.hz-emote{position:absolute;pointer-events:none;animation:hz-emote-pop var(--hz-ms,1.6s) ease-out both}
@keyframes hz-emote-pop{0%{opacity:0;transform:translateY(6px) scale(.6)}12%{opacity:1;transform:translateY(0) scale(1.08)}20%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-10px) scale(.95)}}
.hz-wave{animation:hz-wave .6s ease-out infinite}
@keyframes hz-wave{0%{opacity:0;transform:scale(.6)}40%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
.hz-float{animation:hz-float 1.2s ease-in-out infinite}
@keyframes hz-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.hz-dust{animation:hz-dust .5s ease-out infinite}
@keyframes hz-dust{0%{opacity:.7;transform:translateX(0) scale(.6)}100%{opacity:0;transform:translateX(18px) scale(1.4)}}
.hz-hint{animation:hz-hint 2.4s ease-in-out infinite}
@keyframes hz-hint{0%,100%{opacity:.55}50%{opacity:1}}

@media (prefers-reduced-motion: reduce){
  .hz-live *,.hz-emote,.hz-wave,.hz-float,.hz-dust,.hz-hint{animation:none!important}
}
`
