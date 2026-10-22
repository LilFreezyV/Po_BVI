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

function Forces({ still }) {
  return (
    <Sheet caption="разложение сил на наклонной">
      <path d="M40 150 L270 150 L270 60 Z" fill={INK} fillOpacity="0.05" />
      <path d="M40 150 L270 150 L270 60 Z" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="1.6" />
      <motion.g
        initial={{ x: 0, y: 0 }}
        animate={still ? { x: -30, y: 12 } : { x: [0, -70, 0], y: [0, 28, 0] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      >
        <rect x="186" y="84" width="26" height="18" rx="3" fill={INK} transform="rotate(-21 199 93)" />
        <line x1="199" y1="93" x2="199" y2="136" stroke={MARK} strokeWidth="2.2" />
        <polygon points="199,140 195,130 203,130" fill={MARK} />
        <line x1="199" y1="93" x2="229" y2="105" stroke={INK} strokeOpacity="0.45" strokeWidth="2" strokeDasharray="4 3" />
      </motion.g>
      <text x="206" y="136" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        mg
      </text>
    </Sheet>
  )
}

function Orbit({ still }) {
  return (
    <Sheet caption="GMm/r² = mv²/r">
      <circle cx="160" cy="92" r="26" fill={INK} fillOpacity="0.18" />
      <circle cx="160" cy="92" r="26" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="1.6" />
      <circle cx="160" cy="92" r="62" fill="none" stroke={INK} strokeOpacity="0.25" strokeWidth="1.4" strokeDasharray="5 5" />
      <motion.g
        style={{ originX: '160px', originY: '92px' }}
        initial={{ rotate: 0 }}
        animate={still ? { rotate: 30 } : { rotate: 360 }}
        transition={still ? {} : loop(6)}
      >
        <circle cx="222" cy="92" r="6" fill={MARK} />
      </motion.g>
    </Sheet>
  )
}

function Tension({ still }) {
  return (
    <Sheet caption="натяжение вдоль нити">
      <line x1="60" y1="30" x2="260" y2="30" stroke={INK} strokeOpacity="0.35" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <line
            x1={110 + i * 50}
            y1="30"
            x2={110 + i * 50}
            y2={70 + i * 18}
            stroke={INK}
            strokeOpacity="0.45"
            strokeWidth="1.6"
          />
          <motion.rect
            x={98 + i * 50}
            width="24"
            height="18"
            rx="3"
            fill={i === 1 ? MARK : INK}
            initial={{ y: 70 + i * 18 }}
            animate={still ? {} : { y: [70 + i * 18, 78 + i * 18, 70 + i * 18] }}
            transition={still ? {} : loop(3.2, { ease: 'easeInOut', delay: i * 0.2 })}
          />
        </g>
      ))}
      <text x="190" y="128" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        T = const
      </text>
    </Sheet>
  )
}

function Weight({ still }) {
  return (
    <Sheet caption="N = m(g + a)">
      <motion.g
        initial={{ y: 0 }}
        animate={still ? { y: -10 } : { y: [0, -26, 0, 26, 0] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      >
        <rect x="112" y="46" width="96" height="88" rx="6" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="1.8" />
        <rect x="140" y="104" width="40" height="22" rx="3" fill={INK} />
        <motion.line
          x1="160"
          y1="104"
          x2="160"
          y2="66"
          stroke={MARK}
          strokeWidth="2.4"
          initial={{ opacity: 1 }}
          animate={still ? {} : { opacity: [1, 0.35, 1, 0.35, 1] }}
          transition={still ? {} : loop(5)}
        />
        <polygon points="160,60 156,70 164,70" fill={MARK} />
      </motion.g>
      <text x="210" y="92" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        лифт
      </text>
    </Sheet>
  )
}

function Friction({ still }) {
  return (
    <Sheet caption="F ≤ μN — покой, F = μN — скольжение">
      <line x1="20" y1="124" x2="300" y2="124" stroke={INK} strokeOpacity="0.35" strokeWidth="1.8" />
      <motion.g
        initial={{ x: 0 }}
        animate={still ? { x: 20 } : { x: [0, 0, 150, 150] }}
        transition={still ? {} : loop(5, { times: [0, 0.45, 0.9, 1] })}
      >
        <rect x="60" y="96" width="46" height="28" rx="3" fill={INK} />
        <motion.line
          x1="106"
          y1="110"
          y2="110"
          stroke={MARK}
          strokeWidth="2.6"
          initial={{ x2: 110 }}
          animate={still ? { x2: 140 } : { x2: [110, 156, 156, 110] }}
          transition={still ? {} : loop(5, { times: [0, 0.45, 0.9, 1] })}
        />
      </motion.g>
      <text x="40" y="70" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        тянем сильнее → поехал
      </text>
    </Sheet>
  )
}

function Viscous({ still }) {
  return (
    <Sheet caption="выход на установившуюся скорость">
      <Axis />
      <line x1="24" y1="56" x2="300" y2="56" stroke={MARK} strokeOpacity="0.5" strokeDasharray="5 4" strokeWidth="1.6" />
      <motion.path
        d="M24 148 C90 148 120 70 300 58"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1] }}
        transition={still ? {} : loop(4.5, { times: [0, 0.7, 1] })}
      />
      <text x="240" y="48" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        v₀ = mg/k
      </text>
    </Sheet>
  )
}

function Wedge({ still }) {
  return (
    <Sheet caption="тело едет по клину, клин — по полу">
      <line x1="16" y1="150" x2="304" y2="150" stroke={INK} strokeOpacity="0.35" strokeWidth="1.8" />
      <motion.g
        initial={{ x: 0 }}
        animate={still ? { x: -14 } : { x: [0, -40, 0] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      >
        <path d="M110 150 L250 150 L250 70 Z" fill={INK} fillOpacity="0.07" stroke={INK} strokeOpacity="0.4" strokeWidth="1.6" />
        <motion.rect
          width="26"
          height="18"
          rx="3"
          fill={MARK}
          initial={{ x: 222, y: 76 }}
          animate={still ? { x: 190, y: 96 } : { x: [222, 140, 222], y: [76, 124, 76] }}
          transition={still ? {} : loop(5, { ease: 'easeInOut' })}
        />
      </motion.g>
    </Sheet>
  )
}

function Loop({ still }) {
  const R = 46
  return (
    <Sheet caption="верхняя точка: mg + N = mv²/R">
      <circle cx="170" cy="86" r={R} fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="2" />
      <line x1="30" y1="150" x2="290" y2="150" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" />
      <motion.g
        style={{ originX: '170px', originY: '86px' }}
        initial={{ rotate: 0 }}
        animate={still ? { rotate: 180 } : { rotate: 360 }}
        transition={still ? {} : loop(3)}
      >
        <circle cx="170" cy={86 - R} r="6.5" fill={MARK} />
      </motion.g>
      <text x="196" y="30" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        v² ≥ gR
      </text>
    </Sheet>
  )
}

function Com({ still }) {
  return (
    <Sheet caption="центр масс не сдвинется">
      <line x1="30" y1="120" x2="290" y2="120" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" />
      <motion.circle
        r="13"
        fill={INK}
        cy="104"
        initial={{ cx: 110 }}
        animate={still ? { cx: 96 } : { cx: [110, 86, 110] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      />
      <motion.circle
        r="7"
        fill={MARK}
        cy="110"
        initial={{ cx: 220 }}
        animate={still ? { cx: 252 } : { cx: [220, 268, 220] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      />
      <line x1="160" y1="60" x2="160" y2="140" stroke={MARK} strokeOpacity="0.5" strokeDasharray="5 4" strokeWidth="1.6" />
      <text x="166" y="54" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        ц. масс
      </text>
    </Sheet>
  )
}

function Collision({ still }) {
  return (
    <Sheet caption="импульс сохраняется">
      <line x1="20" y1="118" x2="300" y2="118" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" />
      <motion.circle
        r="12"
        fill={INK}
        cy="104"
        initial={{ cx: 60 }}
        animate={still ? { cx: 110 } : { cx: [60, 140, 140, 96, 60] }}
        transition={still ? {} : loop(5, { times: [0, 0.4, 0.42, 0.75, 1] })}
      />
      <motion.circle
        r="12"
        fill={MARK}
        cy="104"
        initial={{ cx: 164 }}
        animate={still ? { cx: 164 } : { cx: [164, 164, 164, 250, 164] }}
        transition={still ? {} : loop(5, { times: [0, 0.4, 0.42, 0.75, 1] })}
      />
    </Sheet>
  )
}

function Energy({ still }) {
  return (
    <Sheet caption="mgh ↔ mv²/2">
      <path d="M30 56 Q110 150 170 150 L290 150" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="2" />
      <motion.circle
        r="8"
        fill={MARK}
        initial={{ cx: 34, cy: 62 }}
        animate={
          still
            ? { cx: 90, cy: 116 }
            : { cx: [34, 70, 120, 200, 120, 70, 34], cy: [62, 98, 138, 142, 138, 98, 62] }
        }
        transition={still ? {} : loop(6, { ease: 'easeInOut' })}
      />
      <line x1="30" y1="56" x2="30" y2="150" stroke={INK} strokeOpacity="0.25" strokeDasharray="4 4" />
      <text x="36" y="48" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        h
      </text>
    </Sheet>
  )
}

function Cart({ still }) {
  return (
    <Sheet caption="в верхней точке скорости равны">
      <line x1="16" y1="150" x2="304" y2="150" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" />
      <motion.g
        initial={{ x: 0 }}
        animate={still ? { x: 10 } : { x: [0, 34, 0] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      >
        <path d="M150 150 Q210 150 226 72" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="2" />
        <line x1="150" y1="150" x2="226" y2="150" stroke={INK} strokeOpacity="0.4" strokeWidth="2" />
      </motion.g>
      <motion.circle
        r="8"
        fill={MARK}
        initial={{ cx: 60, cy: 142 }}
        animate={still ? { cx: 150, cy: 134 } : { cx: [60, 150, 226, 150, 60], cy: [142, 142, 86, 142, 142] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      />
    </Sheet>
  )
}

function Wall({ still }) {
  return (
    <Sheet caption="v′ = 2u − v">
      <motion.rect
        y="40"
        width="16"
        height="100"
        fill={INK}
        fillOpacity="0.5"
        initial={{ x: 240 }}
        animate={still ? { x: 228 } : { x: [240, 206, 240] }}
        transition={still ? {} : loop(4, { ease: 'easeInOut' })}
      />
      <motion.circle
        r="9"
        fill={MARK}
        cy="92"
        initial={{ cx: 60 }}
        animate={still ? { cx: 150 } : { cx: [60, 196, 60] }}
        transition={still ? {} : loop(4, { ease: 'easeInOut' })}
      />
      <text x="40" y="54" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        стенка идёт навстречу
      </text>
    </Sheet>
  )
}

function Spring({ still }) {
  const coil = (x) => {
    const n = 8
    const step = (200 - x) / n
    let d = `M${x} 100`
    for (let i = 0; i < n; i++) {
      d += ` l${step / 2} -14 l${step / 2} 14`
    }
    return d
  }
  return (
    <Sheet caption="максимум сжатия — скорости равны">
      <line x1="20" y1="124" x2="300" y2="124" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" />
      <motion.path
        fill="none"
        stroke={INK}
        strokeOpacity="0.5"
        strokeWidth="2"
        initial={{ d: coil(100) }}
        animate={still ? { d: coil(140) } : { d: [coil(100), coil(150), coil(100)] }}
        transition={still ? {} : loop(3.4, { ease: 'easeInOut' })}
      />
      <motion.rect
        y="86"
        width="24"
        height="28"
        rx="3"
        fill={MARK}
        initial={{ x: 76 }}
        animate={still ? { x: 116 } : { x: [76, 126, 76] }}
        transition={still ? {} : loop(3.4, { ease: 'easeInOut' })}
      />
      <rect x="200" y="76" width="18" height="48" rx="3" fill={INK} />
    </Sheet>
  )
}

function Oblique({ still }) {
  return (
    <Sheet caption="равные массы разлетаются под 90°">
      <motion.circle
        r="10"
        fill={INK}
        cy="92"
        initial={{ cx: 50 }}
        animate={still ? { cx: 120 } : { cx: [50, 150, 150, 50] }}
        transition={still ? {} : loop(4.5, { times: [0, 0.45, 0.46, 1] })}
      />
      <motion.circle
        r="10"
        fill={MARK}
        initial={{ cx: 160, cy: 92 }}
        animate={
          still ? { cx: 160, cy: 92 } : { cx: [160, 160, 240, 160], cy: [92, 92, 44, 92] }
        }
        transition={still ? {} : loop(4.5, { times: [0, 0.46, 0.85, 1] })}
      />
      <motion.circle
        r="10"
        fill={INK}
        fillOpacity="0.5"
        initial={{ cx: 150, cy: 92 }}
        animate={
          still ? { cx: 150, cy: 92 } : { cx: [150, 150, 230, 150], cy: [92, 92, 142, 92] }
        }
        transition={still ? {} : loop(4.5, { times: [0, 0.46, 0.85, 1] })}
      />
      <path d="M160 92 L206 64 M160 92 L206 120" stroke={INK} strokeOpacity="0.2" strokeDasharray="4 4" />
    </Sheet>
  )
}

function Lever({ still }) {
  return (
    <Sheet caption="ΣM = 0 относительно любой оси">
      <polygon points="160,120 146,146 174,146" fill={INK} fillOpacity="0.5" />
      <motion.g
        style={{ originX: '160px', originY: '118px' }}
        initial={{ rotate: -7 }}
        animate={still ? { rotate: 0 } : { rotate: [-7, 7, -7] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      >
        <line x1="54" y1="118" x2="266" y2="118" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="68" y="96" width="30" height="22" rx="3" fill={INK} />
        <rect x="228" y="88" width="22" height="30" rx="3" fill={MARK} />
      </motion.g>
      <text x="60" y="80" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        F₁d₁ = F₂d₂
      </text>
    </Sheet>
  )
}

function Archimedes({ still }) {
  return (
    <Sheet caption="F = ρgV_погр">
      <rect x="40" y="76" width="240" height="72" fill={INK} fillOpacity="0.08" />
      <line x1="40" y1="76" x2="280" y2="76" stroke={INK} strokeOpacity="0.35" strokeWidth="1.6" />
      <motion.g
        initial={{ y: 0 }}
        animate={still ? { y: 8 } : { y: [0, 18, 0] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      >
        <rect x="136" y="58" width="48" height="44" rx="3" fill={INK} />
        <line x1="160" y1="58" x2="160" y2="30" stroke={MARK} strokeWidth="2.4" />
        <polygon points="160,24 156,34 164,34" fill={MARK} />
      </motion.g>
      <text x="196" y="44" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        F_арх
      </text>
    </Sheet>
  )
}

function Vessel({ still }) {
  return (
    <Sheet caption="поверхность ⊥ эффективной тяжести">
      <motion.g
        initial={{ x: 0 }}
        animate={still ? { x: 12 } : { x: [0, 26, 0] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      >
        <rect x="100" y="54" width="120" height="86" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
        <motion.path
          fill={INK}
          fillOpacity="0.12"
          initial={{ d: 'M100 92 L220 92 L220 140 L100 140 Z' }}
          animate={
            still
              ? { d: 'M100 80 L220 104 L220 140 L100 140 Z' }
              : {
                  d: [
                    'M100 92 L220 92 L220 140 L100 140 Z',
                    'M100 72 L220 110 L220 140 L100 140 Z',
                    'M100 92 L220 92 L220 140 L100 140 Z',
                  ],
                }
          }
          transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
        />
      </motion.g>
      <line x1="40" y1="150" x2="290" y2="150" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" />
      <text x="48" y="44" fill={MARK} fillOpacity="0.7" fontSize="11" fontFamily="monospace">
        a →
      </text>
    </Sheet>
  )
}

function Harmonic({ still }) {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const t = i / 59
    return { x: 30 + 260 * t, y: 92 - 48 * Math.sin(2 * Math.PI * 2 * t) }
  })
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <Sheet caption="x = A·sin(ωt + φ₀)">
      <line x1="24" y1="92" x2="300" y2="92" stroke={INK} strokeOpacity="0.3" strokeWidth="1.5" />
      <path d={d} fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="2" />
      <motion.circle
        r="7"
        fill={MARK}
        initial={{ cx: pts[0].x, cy: pts[0].y }}
        animate={
          still
            ? { cx: pts[8].x, cy: pts[8].y }
            : { cx: pts.map((p) => p.x), cy: pts.map((p) => p.y) }
        }
        transition={still ? {} : loop(4)}
      />
    </Sheet>
  )
}

function Balance({ still }) {
  return (
    <Sheet caption="Σ Q = 0">
      <rect x="54" y="60" width="86" height="76" rx="4" fill={MARK} fillOpacity="0.14" stroke={MARK} strokeOpacity="0.4" strokeWidth="1.6" />
      <rect x="180" y="60" width="86" height="76" rx="4" fill={INK} fillOpacity="0.08" stroke={INK} strokeOpacity="0.4" strokeWidth="1.6" />
      <motion.g
        initial={{ opacity: 0.3 }}
        animate={still ? { opacity: 0.8 } : { opacity: [0.3, 1, 0.3] }}
        transition={still ? {} : loop(3.2)}
      >
        <line x1="142" y1="98" x2="176" y2="98" stroke={MARK} strokeWidth="2.6" />
        <polygon points="180,98 170,93 170,103" fill={MARK} />
      </motion.g>
      <text x="70" y="52" fill={MARK} fillOpacity="0.75" fontSize="11" fontFamily="monospace">
        горячее
      </text>
      <text x="196" y="52" fill={INK} fillOpacity="0.5" fontSize="11" fontFamily="monospace">
        холодное
      </text>
    </Sheet>
  )
}

function Flow({ still }) {
  return (
    <Sheet caption="поток массы и теплоты">
      <path d="M40 60 L150 60 L150 110 L280 110" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          r="5"
          fill={MARK}
          initial={{ cx: 40, cy: 60 }}
          animate={
            still
              ? { cx: 150, cy: 86 }
              : { cx: [40, 150, 150, 280], cy: [60, 60, 110, 110] }
          }
          transition={still ? {} : loop(4, { delay: i * 1.2, times: [0, 0.42, 0.5, 1] })}
        />
      ))}
    </Sheet>
  )
}

function Phase({ still }) {
  return (
    <Sheet caption="на переходе температура стоит">
      <Axis />
      <motion.path
        d="M24 140 L96 96 L196 96 L278 46"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1] }}
        transition={still ? {} : loop(5, { times: [0, 0.75, 1] })}
      />
      <line x1="96" y1="96" x2="196" y2="96" stroke={MARK} strokeWidth="3" />
      <text x="112" y="86" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        Q = λm
      </text>
    </Sheet>
  )
}

function Conduction({ still }) {
  return (
    <Sheet caption="P = kS·ΔT/L">
      <rect x="86" y="74" width="150" height="40" rx="3" fill={INK} fillOpacity="0.08" stroke={INK} strokeOpacity="0.35" strokeWidth="1.6" />
      <rect x="56" y="58" width="30" height="72" fill={MARK} fillOpacity="0.2" />
      <rect x="236" y="58" width="30" height="72" fill={INK} fillOpacity="0.12" />
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          r="4"
          cy="94"
          fill={MARK}
          initial={{ cx: 90, opacity: 0 }}
          animate={still ? { cx: 160, opacity: 0.8 } : { cx: [90, 232], opacity: [0, 1, 0] }}
          transition={still ? {} : loop(3, { delay: i * 0.9 })}
        />
      ))}
      <text x="56" y="48" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        T₁
      </text>
      <text x="240" y="48" fill={INK} fillOpacity="0.5" fontSize="11" fontFamily="monospace">
        T₂
      </text>
    </Sheet>
  )
}

function Molecules({ still }) {
  const seeds = [
    [80, 60], [140, 44], [206, 70], [250, 110], [104, 118], [170, 104], [226, 44], [120, 86],
  ]
  return (
    <Sheet caption="⟨E⟩ = (3/2)kT">
      <rect x="54" y="30" width="212" height="112" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="2" />
      {seeds.map(([x, y], i) => (
        <motion.circle
          key={i}
          r="4.5"
          fill={i % 3 === 0 ? MARK : INK}
          fillOpacity={i % 3 === 0 ? 0.9 : 0.55}
          initial={{ cx: x, cy: y }}
          animate={
            still
              ? {}
              : {
                  cx: [x, x + (i % 2 ? 36 : -30), x + (i % 3 ? -22 : 28), x],
                  cy: [y, y + (i % 2 ? -24 : 30), y + (i % 3 ? 26 : -18), y],
                }
          }
          transition={still ? {} : loop(3 + (i % 4) * 0.6, { ease: 'easeInOut' })}
        />
      ))}
    </Sheet>
  )
}

function Isoprocess({ still }) {
  return (
    <Sheet caption="pV = νRT">
      <Axis />
      <path d="M44 130 Q110 50 280 40" fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="1.8" />
      <path d="M44 100 Q130 40 280 32" fill="none" stroke={INK} strokeOpacity="0.18" strokeWidth="1.6" />
      <motion.circle
        r="7"
        fill={MARK}
        initial={{ cx: 60, cy: 118 }}
        animate={
          still
            ? { cx: 140, cy: 66 }
            : { cx: [60, 110, 180, 250, 180, 110, 60], cy: [118, 82, 58, 46, 58, 82, 118] }
        }
        transition={still ? {} : loop(6, { ease: 'easeInOut' })}
      />
      <text x="36" y="40" fill={INK} fillOpacity="0.45" fontSize="12" fontFamily="monospace">
        p
      </text>
      <text x="286" y="142" fill={INK} fillOpacity="0.45" fontSize="12" fontFamily="monospace">
        V
      </text>
    </Sheet>
  )
}

function Piston({ still }) {
  return (
    <Sheet caption="равновесие поршня задаёт давление">
      <rect x="90" y="46" width="140" height="100" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
      <motion.g
        initial={{ y: 0 }}
        animate={still ? { y: -12 } : { y: [0, -28, 0] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      >
        <rect x="90" y="86" width="140" height="12" fill={INK} />
        <rect x="140" y="62" width="40" height="24" rx="3" fill={MARK} />
      </motion.g>
      <motion.rect
        x="92"
        width="136"
        fill={INK}
        fillOpacity="0.08"
        initial={{ y: 98, height: 46 }}
        animate={still ? { y: 86, height: 58 } : { y: [98, 70, 98], height: [46, 74, 46] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      />
      <text x="236" y="120" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        газ
      </text>
    </Sheet>
  )
}

function PvWork({ still }) {
  return (
    <Sheet caption="A = площадь под p(V)">
      <Axis />
      <motion.path
        d="M50 132 L50 64 Q140 44 250 86 L250 148 L50 148 Z"
        fill={MARK}
        fillOpacity="0.14"
        initial={{ opacity: still ? 1 : 0 }}
        animate={still ? {} : { opacity: [0, 1, 1, 0] }}
        transition={still ? {} : loop(5, { times: [0, 0.35, 0.8, 1] })}
      />
      <path d="M50 64 Q140 44 250 86" fill="none" stroke={INK} strokeWidth="2.4" />
      <text x="120" y="120" fill={MARK} fillOpacity="0.8" fontSize="12" fontFamily="monospace">
        A
      </text>
    </Sheet>
  )
}

function FirstLaw({ still }) {
  return (
    <Sheet caption="Q = ΔU + A">
      <rect x="112" y="56" width="96" height="76" rx="5" fill={INK} fillOpacity="0.07" stroke={INK} strokeOpacity="0.4" strokeWidth="1.8" />
      <motion.g
        initial={{ opacity: 0.35 }}
        animate={still ? { opacity: 0.9 } : { opacity: [0.35, 1, 0.35] }}
        transition={still ? {} : loop(3)}
      >
        <line x1="60" y1="94" x2="106" y2="94" stroke={MARK} strokeWidth="2.6" />
        <polygon points="110,94 100,89 100,99" fill={MARK} />
      </motion.g>
      <motion.g
        initial={{ opacity: 0.35 }}
        animate={still ? { opacity: 0.6 } : { opacity: [0.35, 1, 0.35] }}
        transition={still ? {} : loop(3, { delay: 1.2 })}
      >
        <line x1="212" y1="94" x2="256" y2="94" stroke={INK} strokeOpacity="0.6" strokeWidth="2.6" />
        <polygon points="260,94 250,89 250,99" fill={INK} fillOpacity="0.6" />
      </motion.g>
      <text x="56" y="80" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        Q
      </text>
      <text x="246" y="80" fill={INK} fillOpacity="0.5" fontSize="11" fontFamily="monospace">
        A
      </text>
      <text x="138" y="98" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        ΔU
      </text>
    </Sheet>
  )
}

function Adiabat({ still }) {
  return (
    <Sheet caption="адиабата круче изотермы">
      <Axis />
      <path d="M50 46 Q120 110 280 128" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="2" />
      <motion.path
        d="M50 46 Q96 124 200 142"
        fill="none"
        stroke={MARK}
        strokeWidth="2.4"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1] }}
        transition={still ? {} : loop(4.5, { times: [0, 0.7, 1] })}
      />
      <text x="214" y="124" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        изотерма
      </text>
      <text x="124" y="146" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        адиабата
      </text>
    </Sheet>
  )
}

function Cycle({ still }) {
  return (
    <Sheet caption="работа цикла — его площадь">
      <Axis />
      <path d="M80 60 L220 60 L220 124 L80 124 Z" fill={MARK} fillOpacity="0.12" />
      <path d="M80 60 L220 60 L220 124 L80 124 Z" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
      <motion.circle
        r="7"
        fill={MARK}
        initial={{ cx: 80, cy: 60 }}
        animate={
          still
            ? { cx: 220, cy: 60 }
            : { cx: [80, 220, 220, 80, 80], cy: [60, 60, 124, 124, 60] }
        }
        transition={still ? {} : loop(5)}
      />
    </Sheet>
  )
}

function Vapor({ still }) {
  return (
    <Sheet caption="p_нас зависит только от T">
      <rect x="96" y="40" width="128" height="104" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
      <rect x="98" y="112" width="124" height="30" fill={INK} fillOpacity="0.12" />
      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={i}
          r="4"
          fill={MARK}
          fillOpacity="0.8"
          initial={{ cx: 116 + i * 28, cy: 108 }}
          animate={still ? { cy: 86 } : { cy: [108, 56, 108], opacity: [0.9, 0.5, 0.9] }}
          transition={still ? {} : loop(3.6 + i * 0.3, { ease: 'easeInOut', delay: i * 0.25 })}
        />
      ))}
    </Sheet>
  )
}

function Surface({ still }) {
  return (
    <Sheet caption="Δp = 2σ/R, h = 2σcosθ/ρgr">
      <rect x="40" y="110" width="240" height="36" fill={INK} fillOpacity="0.08" />
      <line x1="40" y1="110" x2="280" y2="110" stroke={INK} strokeOpacity="0.3" strokeWidth="1.4" />
      <rect x="140" y="30" width="28" height="116" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="1.8" />
      <motion.rect
        x="142"
        width="24"
        fill={MARK}
        fillOpacity="0.25"
        initial={{ y: 110, height: 36 }}
        animate={still ? { y: 78, height: 68 } : { y: [110, 62, 110], height: [36, 84, 36] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      />
      <motion.circle
        cx="232"
        r="20"
        fill="none"
        stroke={MARK}
        strokeOpacity="0.6"
        strokeWidth="1.8"
        initial={{ cy: 70 }}
        animate={still ? {} : { cy: [70, 60, 70] }}
        transition={still ? {} : loop(3.4, { ease: 'easeInOut' })}
      />
    </Sheet>
  )
}

function Coulomb({ still }) {
  return (
    <Sheet caption="F = kq₁q₂/r²">
      <motion.circle
        r="14"
        fill={MARK}
        cy="92"
        initial={{ cx: 96 }}
        animate={still ? { cx: 86 } : { cx: [96, 78, 96] }}
        transition={still ? {} : loop(4, { ease: 'easeInOut' })}
      />
      <motion.circle
        r="14"
        fill={INK}
        cy="92"
        initial={{ cx: 224 }}
        animate={still ? { cx: 234 } : { cx: [224, 242, 224] }}
        transition={still ? {} : loop(4, { ease: 'easeInOut' })}
      />
      <text x="90" y="98" fill="#fff" fontSize="14" fontFamily="monospace">
        +
      </text>
      <text x="219" y="98" fill="#fff" fontSize="14" fontFamily="monospace">
        +
      </text>
      <line x1="120" y1="92" x2="200" y2="92" stroke={INK} strokeOpacity="0.25" strokeDasharray="5 4" />
      <text x="146" y="78" fill={INK} fillOpacity="0.45" fontSize="12" fontFamily="monospace">
        r
      </text>
    </Sheet>
  )
}

function Field({ still }) {
  const lines = [-52, -26, 0, 26, 52]
  return (
    <Sheet caption="силовые линии от заряда">
      <circle cx="160" cy="92" r="13" fill={MARK} />
      <text x="154" y="98" fill="#fff" fontSize="14" fontFamily="monospace">
        +
      </text>
      {lines.map((dy, i) => (
        <g key={i}>
          <line x1="176" y1="92" x2="290" y2={92 + dy} stroke={INK} strokeOpacity="0.25" strokeWidth="1.4" />
          <line x1="144" y1="92" x2="30" y2={92 - dy} stroke={INK} strokeOpacity="0.25" strokeWidth="1.4" />
          <motion.circle
            r="3.5"
            fill={INK}
            fillOpacity="0.7"
            initial={{ cx: 176, cy: 92 }}
            animate={still ? { cx: 230, cy: 92 + dy / 2 } : { cx: [176, 290], cy: [92, 92 + dy] }}
            transition={still ? {} : loop(3, { delay: i * 0.3 })}
          />
        </g>
      ))}
    </Sheet>
  )
}

function Gauss({ still }) {
  return (
    <Sheet caption="Φ = q/ε₀">
      <motion.circle
        cx="160"
        cy="90"
        r="58"
        fill="none"
        stroke={INK}
        strokeOpacity="0.4"
        strokeWidth="1.8"
        strokeDasharray="6 5"
        initial={{ rotate: 0 }}
        animate={still ? {} : { rotate: 360 }}
        style={{ originX: '160px', originY: '90px' }}
        transition={still ? {} : loop(14)}
      />
      <circle cx="160" cy="90" r="11" fill={MARK} />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const a = (deg * Math.PI) / 180
        return (
          <motion.line
            key={deg}
            x1={160 + 16 * Math.cos(a)}
            y1={90 + 16 * Math.sin(a)}
            x2={160 + 74 * Math.cos(a)}
            y2={90 + 74 * Math.sin(a)}
            stroke={MARK}
            strokeOpacity="0.4"
            strokeWidth="1.6"
            initial={{ pathLength: still ? 1 : 0 }}
            animate={still ? {} : { pathLength: [0, 1, 1, 0] }}
            transition={still ? {} : loop(4, { delay: i * 0.15, times: [0, 0.3, 0.8, 1] })}
          />
        )
      })}
    </Sheet>
  )
}

function Potential({ still }) {
  return (
    <Sheet caption="эквипотенциали ⊥ силовым линиям">
      <circle cx="160" cy="90" r="11" fill={MARK} />
      {[30, 48, 66].map((r, i) => (
        <motion.circle
          key={r}
          cx="160"
          cy="90"
          r={r}
          fill="none"
          stroke={INK}
          strokeOpacity="0.3"
          strokeWidth="1.5"
          initial={{ opacity: still ? 1 : 0.25 }}
          animate={still ? {} : { opacity: [0.25, 0.85, 0.25] }}
          transition={still ? {} : loop(3.6, { delay: i * 0.4 })}
        />
      ))}
      <line x1="160" y1="90" x2="268" y2="90" stroke={MARK} strokeOpacity="0.5" strokeWidth="1.8" />
      <text x="206" y="80" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        φ убывает
      </text>
    </Sheet>
  )
}

function Conductor({ still }) {
  return (
    <Sheet caption="внутри проводника E = 0">
      <circle cx="160" cy="90" r="54" fill={INK} fillOpacity="0.07" stroke={INK} strokeOpacity="0.4" strokeWidth="2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const a = (deg * Math.PI) / 180
        return (
          <motion.circle
            key={deg}
            r="4.5"
            fill={MARK}
            initial={{ cx: 160 + 26 * Math.cos(a), cy: 90 + 26 * Math.sin(a) }}
            animate={
              still
                ? { cx: 160 + 54 * Math.cos(a), cy: 90 + 54 * Math.sin(a) }
                : {
                    cx: [160 + 20 * Math.cos(a), 160 + 54 * Math.cos(a), 160 + 54 * Math.cos(a)],
                    cy: [90 + 20 * Math.sin(a), 90 + 54 * Math.sin(a), 90 + 54 * Math.sin(a)],
                  }
            }
            transition={still ? {} : loop(4, { delay: i * 0.06, times: [0, 0.5, 1] })}
          />
        )
      })}
      <text x="128" y="94" fill={INK} fillOpacity="0.4" fontSize="12" fontFamily="monospace">
        E = 0
      </text>
    </Sheet>
  )
}

function Plates({ still }) {
  return (
    <Sheet caption="поля пластин складываются">
      <rect x="92" y="40" width="10" height="108" fill={MARK} fillOpacity="0.6" />
      <rect x="218" y="40" width="10" height="108" fill={INK} fillOpacity="0.6" />
      {[56, 80, 104, 128].map((y, i) => (
        <motion.g key={y}>
          <line x1="110" y1={y} x2="210" y2={y} stroke={INK} strokeOpacity="0.2" strokeWidth="1.3" />
          <motion.circle
            r="4"
            cy={y}
            fill={INK}
            fillOpacity="0.65"
            initial={{ cx: 110 }}
            animate={still ? { cx: 160 } : { cx: [110, 210] }}
            transition={still ? {} : loop(2.6, { delay: i * 0.25 })}
          />
        </motion.g>
      ))}
    </Sheet>
  )
}

function Capacitor({ still }) {
  const pts = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29
    return { x: 96 + 150 * t, y: 60 + 60 * t * t }
  })
  return (
    <Sheet caption="частица в поле конденсатора">
      <rect x="86" y="38" width="170" height="8" fill={MARK} fillOpacity="0.6" />
      <rect x="86" y="140" width="170" height="8" fill={INK} fillOpacity="0.6" />
      <path
        d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
        fill="none"
        stroke={INK}
        strokeOpacity="0.3"
        strokeWidth="1.6"
      />
      <motion.circle
        r="6"
        fill={MARK}
        initial={{ cx: pts[0].x, cy: pts[0].y }}
        animate={
          still
            ? { cx: pts[14].x, cy: pts[14].y }
            : { cx: pts.map((p) => p.x), cy: pts.map((p) => p.y) }
        }
        transition={still ? {} : loop(3)}
      />
    </Sheet>
  )
}

function Dielectric({ still }) {
  return (
    <Sheet caption="диэлектрик втягивается">
      <rect x="80" y="50" width="180" height="10" fill={INK} fillOpacity="0.55" />
      <rect x="80" y="126" width="180" height="10" fill={INK} fillOpacity="0.55" />
      <motion.rect
        y="60"
        width="90"
        height="66"
        fill={MARK}
        fillOpacity="0.18"
        stroke={MARK}
        strokeOpacity="0.5"
        strokeWidth="1.6"
        initial={{ x: 210 }}
        animate={still ? { x: 150 } : { x: [240, 110, 240] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      />
      <text x="92" y="100" fill={INK} fillOpacity="0.4" fontSize="12" fontFamily="monospace">
        ε
      </text>
    </Sheet>
  )
}

function Resistor({ still }) {
  return (
    <Sheet caption="R = ρL/S">
      <line x1="30" y1="92" x2="96" y2="92" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="224" y1="92" x2="290" y2="92" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <rect x="96" y="74" width="128" height="36" rx="3" fill={INK} fillOpacity="0.08" stroke={INK} strokeOpacity="0.45" strokeWidth="1.8" />
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          r="4.5"
          cy="92"
          fill={MARK}
          initial={{ cx: 30 }}
          animate={still ? { cx: 160 } : { cx: [30, 290] }}
          transition={still ? {} : loop(3.2, { delay: i * 1 })}
        />
      ))}
    </Sheet>
  )
}

function Kirchhoff({ still }) {
  return (
    <Sheet caption="ΣI = 0 в узле">
      <line x1="40" y1="92" x2="150" y2="92" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="150" y1="92" x2="268" y2="44" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="150" y1="92" x2="268" y2="140" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="150" cy="92" r="5" fill={INK} />
      {[0, 1].map((i) => (
        <motion.circle
          key={`in-${i}`}
          r="4.5"
          cy="92"
          fill={MARK}
          initial={{ cx: 40 }}
          animate={still ? { cx: 110 } : { cx: [40, 150] }}
          transition={still ? {} : loop(2.4, { delay: i * 1.2 })}
        />
      ))}
      <motion.circle
        r="4.5"
        fill={INK}
        fillOpacity="0.7"
        initial={{ cx: 150, cy: 92 }}
        animate={still ? { cx: 200, cy: 72 } : { cx: [150, 268], cy: [92, 44] }}
        transition={still ? {} : loop(2.4, { delay: 0.6 })}
      />
      <motion.circle
        r="4.5"
        fill={INK}
        fillOpacity="0.7"
        initial={{ cx: 150, cy: 92 }}
        animate={still ? { cx: 200, cy: 112 } : { cx: [150, 268], cy: [92, 140] }}
        transition={still ? {} : loop(2.4, { delay: 1.8 })}
      />
    </Sheet>
  )
}

function Symmetry({ still }) {
  return (
    <Sheet caption="равные потенциалы можно соединить">
      <polygon points="160,34 254,92 160,150 66,92" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
      <circle cx="66" cy="92" r="5" fill={INK} />
      <circle cx="254" cy="92" r="5" fill={INK} />
      <motion.line
        x1="160"
        y1="34"
        x2="160"
        y2="150"
        stroke={MARK}
        strokeWidth="2.4"
        strokeDasharray="6 4"
        initial={{ opacity: still ? 1 : 0 }}
        animate={still ? {} : { opacity: [0, 1, 1, 0] }}
        transition={still ? {} : loop(4, { times: [0, 0.3, 0.75, 1] })}
      />
      <text x="168" y="28" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
        φ₁ = φ₂
      </text>
    </Sheet>
  )
}

function Source({ still }) {
  return (
    <Sheet caption="эквивалентный источник">
      <rect x="54" y="52" width="92" height="80" rx="5" fill={INK} fillOpacity="0.07" stroke={INK} strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="5 4" />
      <text x="68" y="96" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        схема
      </text>
      <motion.g
        initial={{ opacity: still ? 1 : 0.2 }}
        animate={still ? {} : { opacity: [0.2, 1, 1, 0.2] }}
        transition={still ? {} : loop(4.5, { times: [0, 0.35, 0.8, 1] })}
      >
        <line x1="186" y1="64" x2="186" y2="88" stroke={MARK} strokeWidth="3" />
        <line x1="176" y1="88" x2="196" y2="88" stroke={MARK} strokeWidth="2" />
        <rect x="174" y="100" width="24" height="26" rx="3" fill="none" stroke={INK} strokeOpacity="0.5" strokeWidth="1.8" />
        <text x="206" y="76" fill={MARK} fillOpacity="0.8" fontSize="11" fontFamily="monospace">
          ЭДС
        </text>
        <text x="206" y="120" fill={INK} fillOpacity="0.5" fontSize="11" fontFamily="monospace">
          r
        </text>
      </motion.g>
    </Sheet>
  )
}

function Joule({ still }) {
  return (
    <Sheet caption="P = I²R">
      <rect x="110" y="70" width="100" height="40" rx="3" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="1.8" />
      <line x1="40" y1="90" x2="110" y2="90" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="210" y1="90" x2="280" y2="90" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <motion.path
          key={i}
          d={`M${126 + i * 22} 70 q6 -14 0 -22`}
          fill="none"
          stroke={MARK}
          strokeWidth="2"
          initial={{ opacity: still ? 0.6 : 0, pathLength: still ? 1 : 0 }}
          animate={still ? {} : { opacity: [0, 0.9, 0], pathLength: [0, 1, 1] }}
          transition={still ? {} : loop(2.6, { delay: i * 0.25 })}
        />
      ))}
    </Sheet>
  )
}

function Meter({ still }) {
  return (
    <Sheet caption="амперметр — в разрыв, вольтметр — параллельно">
      <line x1="40" y1="60" x2="280" y2="60" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="124" cy="60" r="16" fill="none" stroke={INK} strokeOpacity="0.6" strokeWidth="1.8" />
      <text x="119" y="65" fill={INK} fillOpacity="0.7" fontSize="12" fontFamily="monospace">
        A
      </text>
      <rect x="186" y="44" width="54" height="32" rx="3" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="1.8" />
      <line x1="213" y1="76" x2="213" y2="112" stroke={INK} strokeOpacity="0.4" strokeWidth="1.6" />
      <motion.circle
        cx="213"
        cy="128"
        r="16"
        fill="none"
        stroke={MARK}
        strokeOpacity="0.7"
        strokeWidth="1.8"
        initial={{ opacity: still ? 1 : 0.4 }}
        animate={still ? {} : { opacity: [0.4, 1, 0.4] }}
        transition={still ? {} : loop(3)}
      />
      <text x="208" y="133" fill={MARK} fillOpacity="0.8" fontSize="12" fontFamily="monospace">
        V
      </text>
    </Sheet>
  )
}

function Nonlinear({ still }) {
  return (
    <Sheet caption="рабочая точка = пересечение">
      <Axis />
      <path d="M24 148 Q150 146 250 40" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="2.2" />
      <motion.line
        x1="40"
        y1="40"
        x2="280"
        y2="140"
        stroke={MARK}
        strokeWidth="2.2"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1] }}
        transition={still ? {} : loop(4, { times: [0, 0.6, 1] })}
      />
      <motion.circle
        cx="214"
        cy="113"
        r="6.5"
        fill={MARK}
        initial={{ scale: still ? 1 : 0 }}
        animate={still ? {} : { scale: [0, 0, 1.2, 1] }}
        transition={still ? {} : loop(4, { times: [0, 0.6, 0.72, 1] })}
      />
    </Sheet>
  )
}

function Rc({ still }) {
  return (
    <Sheet caption="τ = RC">
      <Axis />
      <line x1="24" y1="48" x2="300" y2="48" stroke={MARK} strokeOpacity="0.4" strokeDasharray="5 4" strokeWidth="1.5" />
      <motion.path
        d="M24 148 C70 148 90 70 160 56 C220 48 260 48 300 48"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1] }}
        transition={still ? {} : loop(4.5, { times: [0, 0.7, 1] })}
      />
      <line x1="86" y1="48" x2="86" y2="148" stroke={INK} strokeOpacity="0.2" strokeDasharray="4 4" />
      <text x="90" y="140" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        τ
      </text>
    </Sheet>
  )
}

function BioSavart({ still }) {
  return (
    <Sheet caption="B = μ₀I/2πr">
      <line x1="160" y1="22" x2="160" y2="158" stroke={INK} strokeOpacity="0.6" strokeWidth="3" />
      {[26, 48, 70].map((r, i) => (
        <motion.ellipse
          key={r}
          cx="160"
          cy="90"
          rx={r}
          ry={r / 3}
          fill="none"
          stroke={MARK}
          strokeOpacity="0.45"
          strokeWidth="1.6"
          initial={{ opacity: still ? 1 : 0.2 }}
          animate={still ? {} : { opacity: [0.2, 0.9, 0.2] }}
          transition={still ? {} : loop(3.4, { delay: i * 0.35 })}
        />
      ))}
      <polygon points="160,22 155,34 165,34" fill={INK} fillOpacity="0.7" />
      <text x="170" y="34" fill={INK} fillOpacity="0.5" fontSize="12" fontFamily="monospace">
        I
      </text>
    </Sheet>
  )
}

function Lorentz({ still }) {
  const R = 44
  return (
    <Sheet caption="R = mv/qB">
      {[0, 1, 2, 3].map((i) =>
        [0, 1, 2].map((j) => (
          <text
            key={`${i}-${j}`}
            x={60 + i * 68}
            y={46 + j * 42}
            fill={INK}
            fillOpacity="0.2"
            fontSize="12"
            fontFamily="monospace"
          >
            ×
          </text>
        ))
      )}
      <circle cx="160" cy="92" r={R} fill="none" stroke={INK} strokeOpacity="0.3" strokeWidth="1.6" strokeDasharray="5 4" />
      <motion.g
        style={{ originX: '160px', originY: '92px' }}
        initial={{ rotate: 0 }}
        animate={still ? { rotate: 40 } : { rotate: 360 }}
        transition={still ? {} : loop(3.6)}
      >
        <circle cx={160 + R} cy="92" r="6.5" fill={MARK} />
      </motion.g>
    </Sheet>
  )
}

function Ampere({ still }) {
  return (
    <Sheet caption="F = BIL">
      {[0, 1, 2].map((j) =>
        [0, 1, 2, 3].map((i) => (
          <text key={`${i}-${j}`} x={54 + i * 66} y={44 + j * 42} fill={INK} fillOpacity="0.18" fontSize="12" fontFamily="monospace">
            ×
          </text>
        ))
      )}
      <motion.g
        initial={{ y: 0 }}
        animate={still ? { y: -14 } : { y: [0, -32, 0] }}
        transition={still ? {} : loop(4, { ease: 'easeInOut' })}
      >
        <line x1="80" y1="110" x2="240" y2="110" stroke={MARK} strokeWidth="4" strokeLinecap="round" />
        <line x1="160" y1="110" x2="160" y2="76" stroke={INK} strokeOpacity="0.6" strokeWidth="2.2" />
        <polygon points="160,70 155,82 165,82" fill={INK} fillOpacity="0.6" />
      </motion.g>
    </Sheet>
  )
}

function Faraday({ still }) {
  return (
    <Sheet caption="ε = −ΔΦ/Δt">
      <line x1="40" y1="52" x2="280" y2="52" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="40" y1="134" x2="280" y2="134" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="40" y1="52" x2="40" y2="134" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      {[0, 1, 2].map((j) =>
        [0, 1, 2].map((i) => (
          <text key={`${i}-${j}`} x={86 + i * 60} y={76 + j * 30} fill={INK} fillOpacity="0.18" fontSize="12" fontFamily="monospace">
            ×
          </text>
        ))
      )}
      <motion.rect
        y="48"
        width="7"
        height="90"
        fill={MARK}
        initial={{ x: 120 }}
        animate={still ? { x: 180 } : { x: [120, 240, 120] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      />
      <text x="48" y="100" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        R
      </text>
    </Sheet>
  )
}

function Inductance({ still }) {
  return (
    <Sheet caption="W = LI²/2">
      <line x1="40" y1="92" x2="104" y2="92" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <line x1="216" y1="92" x2="280" y2="92" stroke={INK} strokeOpacity="0.5" strokeWidth="2" />
      <path
        d="M104 92 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0"
        fill="none"
        stroke={INK}
        strokeOpacity="0.6"
        strokeWidth="2.4"
      />
      {[0, 1].map((i) => (
        <motion.circle
          key={i}
          r="4.5"
          cy="92"
          fill={MARK}
          initial={{ cx: 40 }}
          animate={still ? { cx: 160 } : { cx: [40, 280] }}
          transition={still ? {} : loop(3.4, { delay: i * 1.7, ease: 'easeInOut' })}
        />
      ))}
    </Sheet>
  )
}

function Lc({ still }) {
  return (
    <Sheet caption="энергия перетекает C ↔ L">
      <rect x="66" y="64" width="54" height="56" rx="4" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="1.6" />
      <line x1="80" y1="78" x2="106" y2="78" stroke={INK} strokeOpacity="0.6" strokeWidth="3" />
      <line x1="80" y1="106" x2="106" y2="106" stroke={INK} strokeOpacity="0.6" strokeWidth="3" />
      <path
        d="M198 92 a11 11 0 0 1 22 0 a11 11 0 0 1 22 0 a11 11 0 0 1 22 0"
        fill="none"
        stroke={INK}
        strokeOpacity="0.6"
        strokeWidth="2.4"
      />
      <motion.rect
        x="66"
        width="54"
        fill={MARK}
        fillOpacity="0.25"
        initial={{ y: 64, height: 56 }}
        animate={still ? { y: 92, height: 28 } : { y: [64, 120, 64], height: [56, 0, 56] }}
        transition={still ? {} : loop(3.6, { ease: 'easeInOut' })}
      />
      <motion.circle
        cx="220"
        cy="70"
        r="10"
        fill={MARK}
        initial={{ opacity: 0 }}
        animate={still ? { opacity: 0.4 } : { opacity: [0, 0.75, 0] }}
        transition={still ? {} : loop(3.6, { ease: 'easeInOut' })}
      />
    </Sheet>
  )
}

function Damped({ still }) {
  const pts = Array.from({ length: 80 }, (_, i) => {
    const t = i / 79
    return { x: 26 + 268 * t, y: 92 - 52 * Math.exp(-2.4 * t) * Math.sin(2 * Math.PI * 3 * t) }
  })
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return (
    <Sheet caption="амплитуда убывает">
      <line x1="24" y1="92" x2="300" y2="92" stroke={INK} strokeOpacity="0.3" strokeWidth="1.4" />
      <motion.path
        d={d}
        fill="none"
        stroke={INK}
        strokeWidth="2.2"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? {} : { pathLength: [0, 1, 1] }}
        transition={still ? {} : loop(5, { times: [0, 0.75, 1] })}
      />
    </Sheet>
  )
}

function Shadow({ still }) {
  return (
    <Sheet caption="тень и полутень">
      <motion.circle
        cx="46"
        r="10"
        fill={MARK}
        initial={{ cy: 76 }}
        animate={still ? { cy: 90 } : { cy: [76, 108, 76] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      />
      <rect x="140" y="62" width="12" height="58" fill={INK} fillOpacity="0.65" />
      <rect x="264" y="26" width="10" height="130" fill={INK} fillOpacity="0.25" />
      <motion.polygon
        fill={INK}
        fillOpacity="0.14"
        initial={{ points: '152,62 264,40 264,146 152,120' }}
        animate={
          still
            ? {}
            : { points: ['152,62 264,40 264,146 152,120', '152,62 264,60 264,166 152,120', '152,62 264,40 264,146 152,120'] }
        }
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      />
    </Sheet>
  )
}

function Mirror({ still }) {
  return (
    <Sheet caption="изображение симметрично">
      <line x1="160" y1="22" x2="160" y2="158" stroke={INK} strokeOpacity="0.55" strokeWidth="3" />
      <motion.circle
        r="8"
        fill={MARK}
        cy="70"
        initial={{ cx: 96 }}
        animate={still ? { cx: 76 } : { cx: [96, 60, 96] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      />
      <motion.circle
        r="8"
        fill={MARK}
        fillOpacity="0.35"
        cy="70"
        initial={{ cx: 224 }}
        animate={still ? { cx: 244 } : { cx: [224, 260, 224] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      />
      <motion.line
        y1="70"
        y2="70"
        stroke={INK}
        strokeOpacity="0.25"
        strokeDasharray="5 4"
        initial={{ x1: 96, x2: 224 }}
        animate={still ? { x1: 76, x2: 244 } : { x1: [96, 60, 96], x2: [224, 260, 224] }}
        transition={still ? {} : loop(4.5, { ease: 'easeInOut' })}
      />
      <path d="M96 70 L160 118 L96 150" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="1.6" />
    </Sheet>
  )
}

function Refraction({ still }) {
  return (
    <Sheet caption="n₁sin α = n₂sin β">
      <rect x="20" y="92" width="280" height="62" fill={INK} fillOpacity="0.08" />
      <line x1="20" y1="92" x2="300" y2="92" stroke={INK} strokeOpacity="0.4" strokeWidth="1.6" />
      <line x1="160" y1="26" x2="160" y2="150" stroke={INK} strokeOpacity="0.2" strokeDasharray="4 4" />
      <motion.g
        initial={{ rotate: 0 }}
        style={{ originX: '160px', originY: '92px' }}
        animate={still ? { rotate: 6 } : { rotate: [-10, 12, -10] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      >
        <line x1="62" y1="34" x2="160" y2="92" stroke={MARK} strokeWidth="2.4" />
      </motion.g>
      <motion.g
        initial={{ rotate: 0 }}
        style={{ originX: '160px', originY: '92px' }}
        animate={still ? { rotate: 3 } : { rotate: [-5, 6, -5] }}
        transition={still ? {} : loop(5, { ease: 'easeInOut' })}
      >
        <line x1="160" y1="92" x2="212" y2="150" stroke={MARK} strokeOpacity="0.65" strokeWidth="2.4" />
      </motion.g>
      <text x="38" y="84" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        n₁
      </text>
      <text x="38" y="124" fill={INK} fillOpacity="0.45" fontSize="11" fontFamily="monospace">
        n₂
      </text>
    </Sheet>
  )
}

function Lens({ still }) {
  return (
    <Sheet caption="1/d + 1/f = 1/F">
      <line x1="20" y1="92" x2="300" y2="92" stroke={INK} strokeOpacity="0.3" strokeWidth="1.4" />
      <ellipse cx="160" cy="92" rx="13" ry="52" fill={INK} fillOpacity="0.1" stroke={INK} strokeOpacity="0.45" strokeWidth="1.8" />
      <circle cx="212" cy="92" r="3" fill={INK} fillOpacity="0.5" />
      <circle cx="108" cy="92" r="3" fill={INK} fillOpacity="0.5" />
      <motion.g
        initial={{ x: 0 }}
        animate={still ? { x: -14 } : { x: [0, -34, 0] }}
        transition={still ? {} : loop(5.5, { ease: 'easeInOut' })}
      >
        <line x1="70" y1="92" x2="70" y2="52" stroke={MARK} strokeWidth="2.6" />
        <polygon points="70,46 66,56 74,56" fill={MARK} />
        <line x1="70" y1="52" x2="160" y2="52" stroke={INK} strokeOpacity="0.35" strokeWidth="1.4" />
        <line x1="160" y1="52" x2="256" y2="128" stroke={INK} strokeOpacity="0.35" strokeWidth="1.4" />
        <line x1="70" y1="52" x2="256" y2="128" stroke={INK} strokeOpacity="0.25" strokeWidth="1.2" />
      </motion.g>
      <motion.g
        initial={{ x: 0 }}
        animate={still ? { x: 10 } : { x: [0, 26, 0] }}
        transition={still ? {} : loop(5.5, { ease: 'easeInOut' })}
      >
        <line x1="256" y1="92" x2="256" y2="128" stroke={MARK} strokeOpacity="0.7" strokeWidth="2.6" />
        <polygon points="256,134 252,124 260,124" fill={MARK} fillOpacity="0.7" />
      </motion.g>
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
  forces: Forces,
  orbit: Orbit,
  tension: Tension,
  weight: Weight,
  friction: Friction,
  viscous: Viscous,
  wedge: Wedge,
  loop: Loop,
  com: Com,
  collision: Collision,
  energy: Energy,
  cart: Cart,
  wall: Wall,
  spring: Spring,
  oblique: Oblique,
  lever: Lever,
  archimedes: Archimedes,
  vessel: Vessel,
  harmonic: Harmonic,
  balance: Balance,
  flow: Flow,
  phase: Phase,
  conduction: Conduction,
  molecules: Molecules,
  isoprocess: Isoprocess,
  piston: Piston,
  pvwork: PvWork,
  firstlaw: FirstLaw,
  adiabat: Adiabat,
  cycle: Cycle,
  vapor: Vapor,
  surface: Surface,
  coulomb: Coulomb,
  field: Field,
  gauss: Gauss,
  potential: Potential,
  conductor: Conductor,
  plates: Plates,
  capacitor: Capacitor,
  dielectric: Dielectric,
  resistor: Resistor,
  kirchhoff: Kirchhoff,
  symmetry: Symmetry,
  source: Source,
  joule: Joule,
  meter: Meter,
  nonlinear: Nonlinear,
  rc: Rc,
  biosavart: BioSavart,
  lorentz: Lorentz,
  ampere: Ampere,
  faraday: Faraday,
  inductance: Inductance,
  lc: Lc,
  damped: Damped,
  shadow: Shadow,
  mirror: Mirror,
  refraction: Refraction,
  lens: Lens,
}

export default function TheoryFigure({ name }) {
  const reduce = useReducedMotion()
  const Figure = FIGURES[name] || Blank
  return <Figure still={Boolean(reduce)} />
}
