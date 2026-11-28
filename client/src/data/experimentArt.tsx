import type { ReactNode } from 'react'

/**
 * One small engraved plate per thought experiment: gilt lines on the night,
 * with a single warm accent. Drawn in a classical idiom, so even the modern
 * puzzles (the teleporter, the Chinese room) belong in the same world.
 */

const LINE = '#E9D5A6'
const FAINT = 'rgba(233,213,166,.45)'
const WARM = '#FFC877'

/** A robed figure standing with its feet at (x, y). */
function Figure({ x, y = 100, s = 1, dashed, warm }: { x: number; y?: number; s?: number; dashed?: boolean; warm?: boolean }) {
  const c = warm ? WARM : LINE
  return (
    <g stroke={c} strokeDasharray={dashed ? '2 2.5' : undefined}>
      <circle cx={x} cy={y - 34 * s} r={4.5 * s} />
      <path d={`M${x - 6.5 * s} ${y} L${x - 3.5 * s} ${y - 26 * s} Q${x} ${y - 30 * s} ${x + 3.5 * s} ${y - 26 * s} L${x + 6.5 * s} ${y} Z`} />
    </g>
  )
}

/** A figure lying on a couch, head to the left. */
function Lying({ x, y, w = 40 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <circle cx={x + 5} cy={y - 6} r={4.5} />
      <path d={`M${x + 10} ${y - 9} Q${x + w * 0.5} ${y - 13} ${x + w} ${y - 6} L${x + w} ${y} L${x + 10} ${y} Z`} />
      <path d={`M${x - 4} ${y} H${x + w + 6} M${x - 2} ${y} V${y + 9} M${x + w + 4} ${y} V${y + 9} M${x - 4} ${y} Q${x - 6} ${y - 8} ${x} ${y - 10}`} />
    </g>
  )
}

function Flame({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path className="xa-flame" d={`M${x} ${y} C${x - 3 * s} ${y - 3 * s}, ${x - 2 * s} ${y - 7 * s}, ${x} ${y - 11 * s} C${x + 2 * s} ${y - 7 * s}, ${x + 3 * s} ${y - 3 * s}, ${x} ${y} Z`} fill={WARM} stroke="none" />
}

function Stars({ pts }: { pts: [number, number][] }) {
  return (
    <g fill={FAINT} stroke="none">
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.1 : 0.7} />
      ))}
    </g>
  )
}

const ground = <path d="M8 100 H232" stroke={FAINT} />

const ART: Record<string, ReactNode> = {
  trolley: (
    <>
      <path d="M8 92 H112 L232 72 M112 92 L232 106" stroke={FAINT} />
      <path d="M8 96 H110 L232 76 M110 96 L232 110" stroke={FAINT} strokeDasharray="1 4" />
      <rect x="26" y="74" width="34" height="16" rx="2" />
      <path d="M30 74 V66 H56 V74" />
      <circle cx="34" cy="92" r="3.5" />
      <circle cx="52" cy="92" r="3.5" />
      <path d="M112 92 L104 70" />
      <circle cx="104" cy="69" r="2.5" fill={WARM} stroke="none" />
      {[176, 186, 196, 206, 216].map((x, i) => (
        <Figure key={x} x={x} y={84 - i * 1.8} s={0.42} />
      ))}
      <Figure x={204} y={104} s={0.42} warm />
    </>
  ),
  theseus: (
    <>
      <path d="M8 96 Q20 92 32 96 T56 96 T80 96 T104 96 T128 96 T152 96 T176 96 T200 96 T232 96" stroke={FAINT} />
      <path d="M30 88 H100 L92 98 H40 Z" />
      <path d="M64 88 V40 M64 44 Q86 58 64 80 M44 88 L40 80" />
      <path d="M140 88 H210 L202 98 H150 Z" strokeDasharray="3 2" />
      <path d="M174 88 V40 M174 44 Q196 58 174 80" strokeDasharray="3 2" />
      <path d="M150 92 H200" stroke={WARM} />
      <path d="M114 64 H126 M122 60 L126 64 L122 68" stroke={FAINT} />
    </>
  ),
  'experience-machine': (
    <>
      {ground}
      <Lying x={84} y={88} w={56} />
      <path d="M96 68 Q92 56 102 54 Q104 38 122 40 Q132 28 146 38 Q162 36 160 52 Q170 58 160 66 Z" stroke={FAINT} />
      <circle cx="130" cy="52" r="6" fill={WARM} stroke="none" />
      <path d="M112 60 L118 52 L124 60 M140 60 L146 50 L152 60" />
      <path d="M100 72 L98 66 M104 74 L104 70" stroke={FAINT} strokeDasharray="1 2" />
    </>
  ),
  veil: (
    <>
      {ground}
      <path d="M120 16 V30 M90 30 H150 M90 30 L82 48 H98 Z M150 30 L142 48 H158 Z" />
      <circle cx="120" cy="14" r="2" fill={WARM} stroke="none" />
      <path d="M70 56 Q80 52 90 56 T110 56 T130 56 T150 56 T170 56 V100 M70 56 V100 M90 56 Q86 78 92 100 M110 56 Q106 78 112 100 M130 56 Q126 78 132 100 M150 56 Q146 78 152 100" stroke={FAINT} />
      <Figure x={120} s={0.95} dashed />
    </>
  ),
  gyges: (
    <>
      {ground}
      <ellipse cx="92" cy="62" rx="26" ry="26" />
      <ellipse cx="92" cy="62" rx="20" ry="20" stroke={FAINT} />
      <path d="M84 36 L92 28 L100 36 Z" fill={WARM} stroke="none" />
      <Figure x={164} dashed />
      <path d="M150 58 Q146 54 150 50 M178 58 Q182 54 178 50" stroke={FAINT} strokeDasharray="1 3" />
    </>
  ),
  cave: (
    <>
      <path d="M8 100 V40 Q30 14 80 16 Q150 18 196 26 Q226 34 232 60" />
      <path d="M232 60 Q214 64 206 80 Q200 92 204 100" />
      <circle cx="218" cy="82" r="7" stroke={WARM} />
      <path d="M8 100 H232" stroke={FAINT} />
      <Flame x={150} y={96} s={1.4} />
      {[64, 84, 104].map((x) => (
        <Figure key={x} x={x} s={0.62} />
      ))}
      {[30, 46, 62].map((x, i) => (
        <path key={x} d={`M${x} ${66 - i} m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M${x - 8} ${92} Q${x} ${70 - i} ${x + 8} 92`} fill="rgba(0,0,0,.35)" stroke={FAINT} />
      ))}
      <Figure x={182} s={0.62} warm />
    </>
  ),
  'marys-room': (
    <>
      {ground}
      <path d="M40 100 V30 H140 V100 M120 100 V62 H140" />
      <path d="M50 40 H130 M50 50 H130" stroke={FAINT} strokeDasharray="2 3" />
      <Figure x={84} s={0.85} />
      <path d="M180 100 Q178 80 184 64" stroke={FAINT} />
      <path d="M184 64 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0" fill={WARM} stroke="none" />
      <path d="M180 84 Q172 80 170 74 M182 78 Q192 74 194 70" stroke={FAINT} />
    </>
  ),
  teleporter: (
    <>
      {ground}
      <path d="M40 100 V44 Q60 24 80 44 V100" />
      <path d="M160 100 V44 Q180 24 200 44 V100" />
      <Figure x={60} />
      <Figure x={180} dashed />
      <g fill={WARM} stroke="none">
        {[92, 102, 112, 122, 132, 142].map((x, i) => (
          <circle key={x} cx={x} cy={62 + Math.sin(i) * 6} r={1.3} />
        ))}
      </g>
    </>
  ),
  violinist: (
    <>
      <Lying x={46} y={84} w={50} />
      <Lying x={140} y={84} w={50} />
      <path d="M96 80 Q118 64 140 80" stroke={WARM} />
      <g transform="rotate(-24 118 40)">
        <path d="M118 30 C110 30 110 38 113 40 C108 42 108 52 118 52 C128 52 128 42 123 40 C126 38 126 30 118 30 Z" stroke={WARM} />
        <path d="M118 30 V12 M115 12 h6 M115 37 q-1 2 0 4 M121 37 q1 2 0 4 M118 44 v6" stroke={WARM} />
      </g>
      <path d="M102 20 L136 56" stroke={FAINT} />
    </>
  ),
  'drowning-child': (
    <>
      <path d="M8 84 H70 Q78 84 84 88" />
      <ellipse cx="150" cy="92" rx="70" ry="12" stroke={FAINT} />
      <path d="M100 90 q8 -3 16 0 t16 0 M150 96 q8 -3 16 0 t16 0" stroke={FAINT} />
      <circle cx="150" cy="84" r="4" stroke={WARM} />
      <path d="M156 82 L162 68" stroke={WARM} />
      <Figure x={46} y={84} s={0.95} />
    </>
  ),
  euthyphro: (
    <>
      {ground}
      <path d="M70 34 Q62 20 78 18 Q84 6 100 12 Q114 4 122 16 Q138 14 134 30 Z" stroke={FAINT} />
      <path d="M102 30 L94 52 H104 L96 72" stroke={WARM} />
      <path d="M140 100 V54 Q140 46 150 46 H186 Q196 46 196 54 V100 Z" />
      <path d="M150 60 H186 M150 70 H186 M150 80 H180 M150 90 H176" stroke={FAINT} />
      <Figure x={60} s={0.85} />
    </>
  ),
  wager: (
    <>
      {ground}
      <path d="M120 100 V30 M70 30 H170 M120 100 h-14 h28" />
      <path d="M70 30 L58 56 H82 Z M170 30 L158 50 H182 Z" />
      <ellipse cx="70" cy="56" rx="12" ry="2" />
      <ellipse cx="170" cy="50" rx="12" ry="2" />
      <circle cx="170" cy="45" r="3" stroke={FAINT} />
      <Flame x={70} y={54} s={1.5} />
      <path d="M60 22 q4 -6 10 0 t10 0" stroke={WARM} />
    </>
  ),
  prisoners: (
    <>
      {ground}
      <path d="M24 100 V34 H108 V100 M132 100 V34 H216 V100" />
      {[38, 52, 66, 80, 94].map((x) => (
        <path key={x} d={`M${x} 34 V100`} stroke={FAINT} />
      ))}
      {[146, 160, 174, 188, 202].map((x) => (
        <path key={x} d={`M${x} 34 V100`} stroke={FAINT} />
      ))}
      <Figure x={66} s={0.8} />
      <Figure x={174} s={0.8} />
      <path d="M120 40 V100" stroke={FAINT} strokeDasharray="2 3" />
      <circle cx="120" cy="30" r="3" fill={WARM} stroke="none" />
    </>
  ),
  omelas: (
    <>
      <path d="M8 70 H232" stroke={FAINT} />
      <path d="M30 70 V40 H46 V70 M56 70 V28 L64 18 L72 28 V70 M86 70 V46 H110 V70 M98 46 V34 M120 70 V36 H136 V70 M150 70 V24 L158 14 L166 24 V70 M180 70 V44 H204 V70" />
      <path d="M98 34 l12 3 l-12 3 M158 14 l12 3 l-12 3" stroke={WARM} />
      <rect x="100" y="84" width="40" height="22" stroke={FAINT} />
      <path d="M114 106 Q112 94 120 92 Q128 94 126 106" stroke={WARM} />
      <circle cx="120" cy="89" r="3" stroke={WARM} />
    </>
  ),
  demon: (
    <>
      {ground}
      <path d="M80 36 Q120 8 160 36 Q120 64 80 36 Z" />
      <circle cx="120" cy="36" r="8" />
      <circle cx="120" cy="36" r="3" fill={WARM} stroke="none" />
      <path d="M120 60 V70 M100 56 L94 64 M140 56 L146 64" stroke={FAINT} strokeDasharray="1 3" />
      <path d="M100 100 V84 H140 V100 M104 84 V78 h32 v6" stroke={FAINT} />
      <Figure x={120} y={84} s={0.6} />
    </>
  ),
  'murderer-at-the-door': (
    <>
      {ground}
      <path d="M90 100 V30 H150 V100" />
      <path d="M150 100 L176 92 V38 L150 30" stroke={FAINT} />
      <Figure x={110} s={0.85} />
      <Figure x={70} s={0.6} dashed />
      <g fill="rgba(0,0,0,.45)">
        <Figure x={200} s={1} />
      </g>
      <circle cx="128" cy="50" r="2.4" fill={WARM} stroke="none" />
    </>
  ),
  'deathbed-promise': (
    <>
      {ground}
      <Lying x={60} y={80} w={70} />
      <Figure x={160} s={0.75} />
      <path d="M150 74 Q140 70 130 74" stroke={WARM} />
      <path d="M200 100 V70 M194 70 h12" stroke={FAINT} />
      <Flame x={200} y={68} />
    </>
  ),
  commons: (
    <>
      <path d="M8 100 Q70 70 120 72 Q180 74 232 96" stroke={FAINT} />
      <path d="M30 100 V84 M30 88 H60 M60 100 V84 M180 100 V84 M180 88 H210 M210 100 V84" stroke={FAINT} />
      <path d="M120 72 V44" />
      <circle cx="120" cy="38" r="12" />
      {[
        [80, 84],
        [96, 80],
        [140, 80],
        [156, 84],
        [110, 88],
        [130, 90],
      ].map(([x, y]) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx="6" ry="4" />
          <circle cx={x + 6} cy={y - 2} r="2" />
        </g>
      ))}
      <circle cx="120" cy="38" r="3" fill={WARM} stroke="none" />
    </>
  ),
  sisyphus: (
    <>
      <path d="M8 104 L232 34" />
      <circle cx="154" cy="42" r="15" />
      <path d="M110 71 L120 58 L124 67 M120 58 L132 47 M132 47 L141 48 M130 50 L140 54" />
      <circle cx="134" cy="41" r="4" />
      <circle cx="212" cy="22" r="5" fill={WARM} stroke="none" />
    </>
  ),
  recurrence: (
    <>
      <circle cx="120" cy="58" r="38" />
      <path d="M152 36 L160 30 L162 40" />
      <circle cx="120" cy="58" r="30" stroke={FAINT} strokeDasharray="2 3" />
      <path d="M110 40 H130 L112 76 H130 Z M112 40 L128 76" />
      <path d="M116 70 H126" stroke={WARM} />
      <circle cx="120" cy="58" r="1.6" fill={WARM} stroke="none" />
    </>
  ),
  'utility-monster': (
    <>
      {ground}
      <g fill="rgba(0,0,0,.4)">
        <circle cx="62" cy="38" r="14" />
        <path d="M34 100 L42 50 Q62 40 82 50 L90 100 Z" />
      </g>
      <path d="M96 76 H222" />
      {[110, 130, 150].map((x) => (
        <ellipse key={x} cx={x} cy="73" rx="8" ry="3" stroke={WARM} />
      ))}
      {[176, 196, 216].map((x) => (
        <Figure key={x} x={x} s={0.55} />
      ))}
    </>
  ),
  'chinese-room': (
    <>
      {ground}
      <path d="M70 100 V30 H170 V100" />
      <path d="M170 60 H186 M170 66 H186" stroke={FAINT} />
      <Figure x={110} s={0.8} />
      <path d="M128 74 h22 v12 h-22 Z M139 74 V86" />
      <path d="M192 54 h18 v18 h-18 Z" stroke={WARM} />
      <path d="M196 60 h4 v4 M204 58 v8 M198 68 h8" stroke={WARM} />
      <path d="M30 54 h18 v18 h-18 Z" stroke={FAINT} />
      <path d="M34 62 h10 M39 57 v10" stroke={FAINT} />
    </>
  ),
  'lottery-of-birth': (
    <>
      {ground}
      <path d="M108 24 h24 M112 24 Q112 32 104 36 Q90 46 94 64 Q98 78 112 80 h16 Q142 78 146 64 Q150 46 136 36 Q128 32 128 24" />
      <path d="M96 44 q-12 2 -10 14 M144 44 q12 2 10 14" stroke={FAINT} />
      <g fill={WARM} stroke="none">
        <circle cx="114" cy="90" r="1.6" />
        <circle cx="126" cy="94" r="1.6" />
        <circle cx="120" cy="86" r="1.6" />
      </g>
      {[40, 64, 176, 200].map((x) => (
        <Figure key={x} x={x} s={0.55} />
      ))}
      <Stars pts={[[30, 20], [56, 30], [190, 18], [214, 34], [160, 12]]} />
    </>
  ),
}

/** The plate for an experiment, or nothing if none is drawn. */
export function ExperimentArt({ id, className = '' }: { id: string; className?: string }) {
  const art = ART[id]
  if (!art) return null
  return (
    <svg className={`xa ${className}`} viewBox="0 0 240 120" aria-hidden="true" fill="none" stroke={LINE} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      {art}
    </svg>
  )
}
