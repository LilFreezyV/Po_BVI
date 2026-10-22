import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/* Анимированные иллюстрации к конспектам подтем.

   Правила этих картинок:
   — не украшение, а объяснение: каждая показывает именно тот приём, о котором конспект;
   — то же «тетрадное» оформление, что на сайте: чернильная линия, красная пометка;
   — анимация зациклена и безостановочна, но выключается при системном «уменьшить движение»
     (тогда остаётся статичный кадр — он должен быть осмысленным сам по себе).

   Ключ фигуры хранится в БД у подтемы (`curriculum_lessons.figure`), список — в шапке
   backend/scripts/theory_physics.py. Если ключ неизвестен, рисуем нейтральную сетку. */

const INK = '#1E2C4F'
const MARK = '#B23A2A'
const W = 320
const H = 180

const loop = (duration, extra = {}) => ({
  duration,
  repeat: Infinity,
  ease: 'linear',
  ...extra,
})

/** Общая «тетрадная» подложка. */
function Sheet({ children, caption }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-white">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={caption}>
        <defs>
          <pattern id="theory-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke={INK} strokeOpacity="0.07" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#theory-grid)" />
        {children}
      </svg>
      {caption && (
        <p className="absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300">
          {caption}
        </p>
      )}
    </div>
  )
}

const Axis = () => (
  <>
    <line x1="24" y1="148" x2="300" y2="148" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
    <line x1="24" y1="148" x2="24" y2="24" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
  </>
)

/* ——— отдельные фигуры ——— */

function Uniform({ still }) {
  return (
    <Sheet caption="x = x₀ + vt">
      <Axis />
      <line x1="24" y1="110" x2="300" y2="110" stroke={INK} strokeOpacity="0.15" strokeDasharray="4 4" />
      <motion.circle
        r="7"
        fill={INK}
        cy="110"
        initial={{ cx: 40 }}
        animate={still ? { cx: 170 } : { cx: [40, 288, 40] }}
        transition={still ? {} : loop(6)}
      />
      <motion.line
        y1="110"
        y2="110"
        stroke={MARK}
        strokeWidth="2.5"
        initial={{ x1: 40, x2: 40 }}
        animate={still ? { x1: 40, x2: 170 } : { x1: 40, x2: [40, 288, 40] }}
        transition={still ? {} : loop(6)}
      />
      <text x="250" y="100" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        v = const
      </text>
    </Sheet>
  )
}

function Graph({ still }) {
  const area = 'M24 148 L24 96 L160 60 L240 60 L240 148 Z'
  return (
    <Sheet caption="площадь под v(t) = путь">
      <Axis />
      <motion.path
        d={area}
        fill={MARK}
        fillOpacity="0.12"
        initial={{ opacity: still ? 1 : 0 }}
        animate={still ? {} : { opacity: [0, 1, 1, 0] }}
        transition={still ? {} : loop(5, { times: [0, 0.3, 0.8, 1] })}
      />
      <motion.path
        d="M24 96 L160 60 L240 60 L240 148"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1] }}
        transition={still ? {} : loop(5, { times: [0, 0.5, 1] })}
      />
      <text x="36" y="86" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        v(t)
      </text>
    </Sheet>
  )
}

function Relative({ still }) {
  return (
    <Sheet caption="переход в систему второго тела">
      <motion.circle
        r="7"
        fill={INK}
        cy="60"
        initial={{ cx: 40 }}
        animate={still ? { cx: 150 } : { cx: [40, 280, 40] }}
        transition={still ? {} : loop(7)}
      />
      <motion.circle
        r="7"
        fill={MARK}
        cy="132"
        initial={{ cx: 280 }}
        animate={still ? { cx: 190 } : { cx: [280, 60, 280] }}
        transition={still ? {} : loop(7)}
      />
      <motion.line
        stroke={INK}
        strokeOpacity="0.35"
        strokeDasharray="5 5"
        strokeWidth="1.6"
        y1="60"
        y2="132"
        initial={{ x1: 40, x2: 280 }}
        animate={still ? { x1: 150, x2: 190 } : { x1: [40, 280, 40], x2: [280, 60, 280] }}
        transition={still ? {} : loop(7)}
      />
      <text x="40" y="40" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        v₁
      </text>
      <text x="250" y="160" fill={MARK} fillOpacity="0.7" fontSize="12" fontFamily="monospace">
        v₂
      </text>
    </Sheet>
  )
}

function Accelerated({ still }) {
  // Отметки «закона нечётных чисел»: 1 : 3 : 5 : 7.
  const marks = [24, 41, 92, 177, 296].map((x) => Math.min(x, 300))
  return (
    <Sheet caption="пути за равные времена — 1 : 3 : 5 : 7">
      <line x1="24" y1="120" x2="300" y2="120" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
      {marks.map((x, i) => (
        <line key={i} x1={x} y1="112" x2={x} y2="128" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
      ))}
      <motion.circle
        r="7"
        fill={INK}
        cy="120"
        initial={{ cx: 24 }}
        animate={still ? { cx: 92 } : { cx: [24, 296] }}
        transition={still ? {} : loop(3.6, { ease: [0.4, 0, 1, 1] })}
      />
      <text x="36" y="66" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        a = const
      </text>
    </Sheet>
  )
}

const parabola = (n = 40) =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return { x: 28 + 264 * t, y: 150 - 4 * 104 * t * (1 - t) }
  })

function Projectile({ still }) {
  const pts = parabola()
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <Sheet caption="h = v₀²sin²α / 2g">
      <line x1="16" y1="150" x2="304" y2="150" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
      <path d={d} fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="1.8" />
      <motion.circle
        r="7"
        fill={MARK}
        initial={{ cx: pts[0].x, cy: pts[0].y }}
        animate={
          still
            ? { cx: pts[20].x, cy: pts[20].y }
            : { cx: pts.map((p) => p.x), cy: pts.map((p) => p.y) }
        }
        transition={still ? {} : loop(3.2)}
      />
      <line x1="160" y1="150" x2="160" y2="46" stroke={MARK} strokeOpacity="0.35" strokeDasharray="4 4" />
    </Sheet>
  )
}

function Envelope({ still }) {
  const angles = [25, 40, 55, 70]
  const traj = (deg) => {
    const a = (deg * Math.PI) / 180
    const v = 1
    const range = 264 * Math.sin(2 * a)
    return Array.from({ length: 24 }, (_, i) => {
      const t = i / 23
      const x = 28 + range * t
      const y = 150 - 4 * (range * Math.tan(a) / 4) * t * (1 - t)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${Math.max(y, 14).toFixed(1)}`
    }).join(' ')
  }
  return (
    <Sheet caption="парабола безопасности">
      <line x1="16" y1="150" x2="304" y2="150" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
      {angles.map((deg, i) => (
        <motion.path
          key={deg}
          d={traj(deg)}
          fill="none"
          stroke={INK}
          strokeOpacity="0.28"
          strokeWidth="1.5"
          initial={{ pathLength: still ? 1 : 0 }}
          animate={still ? {} : { pathLength: [0, 1, 1, 0] }}
          transition={still ? {} : loop(6, { delay: i * 0.4, times: [0, 0.35, 0.8, 1] })}
        />
      ))}
      <path
        d="M28 42 Q166 42 300 150"
        fill="none"
        stroke={MARK}
        strokeWidth="2.4"
        strokeDasharray="6 4"
      />
    </Sheet>
  )
}

function Circular({ still }) {
  const R = 54
  return (
    <Sheet caption="a = v² / R">
      <circle cx="160" cy="92" r={R} fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="1.8" />
      <circle cx="160" cy="92" r="3" fill={INK} fillOpacity="0.5" />
      <motion.g
        style={{ originX: '160px', originY: '92px' }}
        initial={{ rotate: 0 }}
        animate={still ? { rotate: 45 } : { rotate: 360 }}
        transition={still ? {} : loop(4)}
      >
        <circle cx={160 + R} cy="92" r="7" fill={INK} />
        <line x1={160 + R} y1="92" x2={160 + R - 26} y2="92" stroke={MARK} strokeWidth="2.4" />
        <polygon
          points={`${160 + R - 26},92 ${160 + R - 20},88 ${160 + R - 20},96`}
          fill={MARK}
        />
      </motion.g>
      <text x="196" y="40" fill={MARK} fillOpacity="0.8" fontSize="12" fontFamily="monospace">
        a → к центру
      </text>
    </Sheet>
  )
}

function Curvature({ still }) {
  const pts = parabola()
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <Sheet caption="R = v² / aₙ">
      <path d={d} fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="1.8" />
      <motion.circle
        cx="160"
        cy="150"
        r="104"
        fill="none"
        stroke={MARK}
        strokeOpacity="0.45"
        strokeWidth="1.8"
        strokeDasharray="5 4"
        initial={{ opacity: still ? 1 : 0.2 }}
        animate={still ? {} : { opacity: [0.2, 0.9, 0.2] }}
        transition={still ? {} : loop(3.4)}
      />
      <circle cx="160" cy="46" r="6" fill={INK} />
      <line x1="160" y1="46" x2="160" y2="150" stroke={MARK} strokeWidth="2" />
      <text x="168" y="104" fill={MARK} fillOpacity="0.8" fontSize="12" fontFamily="monospace">
        R
      </text>
    </Sheet>
  )
}

function Vectors({ still }) {
  return (
    <Sheet caption="треугольник скоростей">
      <motion.line
        x1="50"
        y1="140"
        x2="210"
        y2="140"
        stroke={INK}
        strokeWidth="2.6"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1, 1] }}
        transition={still ? {} : loop(5, { times: [0, 0.3, 0.9, 1] })}
      />
      <motion.line
        x1="210"
        y1="140"
        x2="210"
        y2="56"
        stroke={MARK}
        strokeWidth="2.6"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 0, 1, 1] }}
        transition={still ? {} : loop(5, { times: [0, 0.3, 0.6, 1] })}
      />
      <motion.line
        x1="50"
        y1="140"
        x2="210"
        y2="56"
        stroke={INK}
        strokeOpacity="0.45"
        strokeWidth="2.6"
        strokeDasharray="6 4"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 0, 0, 1] }}
        transition={still ? {} : loop(5, { times: [0, 0.6, 0.65, 1] })}
      />
      <text x="120" y="158" fill={INK} fillOpacity="0.55" fontSize="12" fontFamily="monospace">
        v₁
      </text>
      <text x="218" y="100" fill={MARK} fillOpacity="0.8" fontSize="12" fontFamily="monospace">
        v₂
      </text>
    </Sheet>
  )
}

function Extremum({ still }) {
  return (
    <Sheet caption="минимум функции">
      <Axis />
      <path d="M40 40 Q160 190 280 40" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="2" />
      <motion.circle
        r="7"
        fill={MARK}
        initial={{ cx: 60, cy: 68 }}
        animate={
          still
            ? { cx: 160, cy: 115 }
            : { cx: [60, 110, 160, 210, 260, 210, 160, 110, 60], cy: [68, 98, 115, 98, 68, 98, 115, 98, 68] }
        }
        transition={still ? {} : loop(6)}
      />
      <line x1="160" y1="115" x2="160" y2="148" stroke={MARK} strokeOpacity="0.4" strokeDasharray="4 4" />
    </Sheet>
  )
}

function Pursuit({ still }) {
  return (
    <Sheet caption="скорость сближения — проекция">
      <motion.circle
        r="7"
        fill={MARK}
        cy="50"
        initial={{ cx: 90 }}
        animate={still ? { cx: 170 } : { cx: [90, 280, 90] }}
        transition={still ? {} : loop(6)}
      />
      <motion.circle
        r="7"
        fill={INK}
        initial={{ cx: 40, cy: 140 }}
        animate={still ? { cx: 120, cy: 110 } : { cx: [40, 250, 40], cy: [140, 70, 140] }}
        transition={still ? {} : loop(6)}
      />
      <motion.line
        stroke={INK}
        strokeOpacity="0.3"
        strokeDasharray="5 5"
        strokeWidth="1.6"
        y1="50"
        initial={{ x1: 90, x2: 40, y2: 140 }}
        animate={
          still
            ? { x1: 170, x2: 120, y2: 110 }
            : { x1: [90, 280, 90], x2: [40, 250, 40], y2: [140, 70, 140] }
        }
        transition={still ? {} : loop(6)}
      />
    </Sheet>
  )
}

function Rolling({ still }) {
  const R = 34
  return (
    <Sheet caption="мгновенный центр — точка касания">
      <line x1="16" y1="140" x2="304" y2="140" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
      <motion.g
        initial={{ x: 0 }}
        animate={still ? { x: 90 } : { x: [0, 200, 0] }}
        transition={still ? {} : loop(7)}
      >
        <motion.g
          style={{ originX: '70px', originY: '106px' }}
          initial={{ rotate: 0 }}
          animate={still ? { rotate: 60 } : { rotate: [0, 337, 0] }}
          transition={still ? {} : loop(7)}
        >
          <circle cx="70" cy="106" r={R} fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
          <line x1="70" y1="106" x2="70" y2={106 - R} stroke={MARK} strokeWidth="2.2" />
          <circle cx="70" cy={106 - R} r="5" fill={MARK} />
        </motion.g>
        <circle cx="70" cy="140" r="4" fill={INK} />
      </motion.g>
      <text x="196" y="40" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        v = ωR
      </text>
    </Sheet>
  )
}

function Constraint({ still }) {
  return (
    <Sheet caption="длина нити постоянна">
      <line x1="60" y1="34" x2="260" y2="34" stroke={INK} strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="110" cy="46" r="12" fill="none" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="210" cy="46" r="12" fill="none" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <motion.g
        initial={{ y: 0 }}
        animate={still ? { y: 14 } : { y: [0, 34, 0] }}
        transition={still ? {} : loop(4, { ease: 'easeInOut' })}
      >
        <line x1="98" y1="46" x2="98" y2="92" stroke={INK} strokeOpacity="0.45" strokeWidth="1.6" />
        <rect x="86" y="92" width="24" height="20" rx="3" fill={INK} />
      </motion.g>
      <motion.g
        initial={{ y: 0 }}
        animate={still ? { y: -14 } : { y: [0, -34, 0] }}
        transition={still ? {} : loop(4, { ease: 'easeInOut' })}
      >
        <line x1="222" y1="46" x2="222" y2="110" stroke={INK} strokeOpacity="0.45" strokeWidth="1.6" />
        <rect x="210" y="110" width="24" height="20" rx="3" fill={MARK} />
      </motion.g>
    </Sheet>
  )
}

function Rod({ still }) {
  // Палочка у стены: концы ездят по осям, длина сохраняется.
  const L = 120
  const frames = Array.from({ length: 9 }, (_, i) => {
    const a = (Math.PI / 2) * (0.12 + 0.76 * (i / 8))
    return { x: 40 + L * Math.sin(a), y: 150 - L * Math.cos(a) }
  })
  return (
    <Sheet caption="проекции скоростей на стержень равны">
      <line x1="40" y1="20" x2="40" y2="150" stroke={INK} strokeOpacity="0.3" strokeWidth="1.8" />
      <line x1="40" y1="150" x2="290" y2="150" stroke={INK} strokeOpacity="0.3" strokeWidth="1.8" />
      <motion.line
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
        x1="40"
        initial={{ y1: frames[0].y, x2: frames[0].x, y2: 150 }}
        animate={
          still
            ? { y1: frames[4].y, x2: frames[4].x, y2: 150 }
            : {
                y1: [...frames.map((f) => f.y), ...frames.map((f) => f.y).reverse()],
                x2: [...frames.map((f) => f.x), ...frames.map((f) => f.x).reverse()],
                y2: 150,
              }
        }
        transition={still ? {} : loop(6)}
      />
      <motion.circle
        r="5"
        cx="40"
        fill={MARK}
        initial={{ cy: frames[0].y }}
        animate={
          still
            ? { cy: frames[4].y }
            : { cy: [...frames.map((f) => f.y), ...frames.map((f) => f.y).reverse()] }
        }
        transition={still ? {} : loop(6)}
      />
      <motion.circle
        r="5"
        cy="150"
        fill={MARK}
        initial={{ cx: frames[0].x }}
        animate={
          still
            ? { cx: frames[4].x }
            : { cx: [...frames.map((f) => f.x), ...frames.map((f) => f.x).reverse()] }
        }
        transition={still ? {} : loop(6)}
      />
    </Sheet>
  )
}

function Blank() {
  return (
    <Sheet caption="конспект без иллюстрации">
      <text
        x={W / 2}
        y={H / 2}
        textAnchor="middle"
        fill={INK}
        fillOpacity="0.22"
        fontSize="15"
        fontFamily="monospace"
      >
        §
      </text>
    </Sheet>
  )
}

const FIGURES = {
  uniform: Uniform,
  graph: Graph,
  relative: Relative,
  accelerated: Accelerated,
  projectile: Projectile,
  envelope: Envelope,
  circular: Circular,
  curvature: Curvature,
  vectors: Vectors,
  extremum: Extremum,
  pursuit: Pursuit,
  rolling: Rolling,
  constraint: Constraint,
  rod: Rod,
}

export default function TheoryFigure({ name }) {
  const reduce = useReducedMotion()
  const Figure = FIGURES[name] || Blank
  return <Figure still={Boolean(reduce)} />
}
