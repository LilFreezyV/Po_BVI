import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationFrame, useInView, useReducedMotion } from 'framer-motion'
import { AUDIENCE } from '../data/site.js'
import { listOlympiads, listPlans, listSections, listTopics, listUniversities } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Icon, Link, navigate } from '../components/ui.jsx'
import { CountUp, DrawnUnderline, EASE, Reveal, ScrollLine, Stagger, staggerItem, useParallax } from '../components/motion.jsx'

/* Лендинг переписан 2026-10-21: моушен-дизайн как основа подачи.
   Идея: страница ведёт себя как решение задачи на бумаге — сначала чертёж траектории,
   потом по шагам разбор, в конце ответ. Всё движение завязано на прокрутку, ничего не
   мигает само по себе; при системной настройке «уменьшить движение» анимации выключаются
   (см. components/motion.jsx). */

const MSK = 'Europe/Moscow'
const mskDay = new Intl.DateTimeFormat('en-CA', { timeZone: MSK })
const mskDate = new Intl.DateTimeFormat('ru-RU', { timeZone: MSK, day: 'numeric', month: 'long' })
const mskTime = new Intl.DateTimeFormat('ru-RU', { timeZone: MSK, hour: 'numeric', minute: '2-digit' })
const daysUntil = (now, date) =>
  Math.round((Date.parse(mskDay.format(date)) - Date.parse(mskDay.format(now))) / 86400000)

const daysWord = (n) => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня'
  return 'дней'
}

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

const nextStage = (stages, subject, now) =>
  stages
    .filter((s) => s.subject === subject)
    .map((s) => ({ ...s, date: new Date(s.starts_at) }))
    .find((s) => s.date > now)

/* ——— Хиро: один чертёж, который перетекает из темы в тему ———
   Кривая непрерывно превращается: парабола броска → окружность → синусоида колебаний →
   спираль заряда в магнитном поле. По кривой бежит тело, за ним тянется след, рядом
   подписывается тема и её формула. Все четыре фигуры — реальные темы нашей программы.

   Морфинг считаем сами по точкам (а не анимацией атрибута d): так кривые гарантированно
   совпадают по числу узлов и переход получается без рывков. */

const FIGURE_POINTS = 180
const HOLD_MS = 3200 // сколько держим фигуру
const MORPH_MS = 1400 // сколько длится превращение

const FIGURES = [
  {
    id: 'ballistics',
    topic: 'Бросок под углом к горизонту',
    formula: 'h = v₀² sin²α / 2g',
    point: (t) => ({ x: 40 + 620 * t, y: 300 - 4 * 230 * t * (1 - t) }),
  },
  {
    id: 'circle',
    topic: 'Движение по окружности',
    formula: 'a = v² / R',
    point: (t) => ({ x: 350 + 118 * Math.cos(2 * Math.PI * t - Math.PI), y: 170 + 118 * Math.sin(2 * Math.PI * t - Math.PI) }),
  },
  {
    id: 'oscillation',
    topic: 'Механические колебания',
    formula: 'x = A sin(ωt + φ)',
    point: (t) => ({ x: 40 + 620 * t, y: 170 - 105 * Math.sin(4 * Math.PI * t) }),
  },
  {
    id: 'magnetic',
    topic: 'Частица в магнитном поле',
    formula: 'R = mv / qB',
    point: (t) => {
      const turns = 3.4
      const angle = 2 * Math.PI * turns * t
      const radius = 24 + 104 * t
      return { x: 350 + radius * Math.cos(angle), y: 170 + radius * Math.sin(angle) * 0.82 }
    },
  },
]

const samples = FIGURES.map((f) => Array.from({ length: FIGURE_POINTS }, (_, i) => f.point(i / (FIGURE_POINTS - 1))))

const toPath = (points) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

function HeroFigure() {
  const reduce = useReducedMotion()
  const wrapRef = useRef(null)
  const inView = useInView(wrapRef, { once: false, margin: '-40px' })

  const pathRef = useRef(null)
  const trailRef = useRef(null)
  const bodyRef = useRef(null)
  const startedAt = useRef(null)
  const [figure, setFigure] = useState(0)

  useAnimationFrame((time) => {
    if (reduce || !inView || !pathRef.current) return
    if (startedAt.current === null) startedAt.current = time
    const elapsed = time - startedAt.current

    // какая фигура сейчас и насколько она «перетекла» в следующую
    const cycle = HOLD_MS + MORPH_MS
    const index = Math.floor(elapsed / cycle) % FIGURES.length
    const inCycle = elapsed % cycle
    const morph = inCycle <= HOLD_MS ? 0 : easeInOut((inCycle - HOLD_MS) / MORPH_MS)

    const from = samples[index]
    const to = samples[(index + 1) % FIGURES.length]
    const points = from.map((p, i) => ({
      x: p.x + (to[i].x - p.x) * morph,
      y: p.y + (to[i].y - p.y) * morph,
    }))

    pathRef.current.setAttribute('d', toPath(points))

    // тело бежит по кривой, за ним — короткий след
    const u = (elapsed / 2600) % 1
    const head = Math.min(FIGURE_POINTS - 1, Math.floor(u * (FIGURE_POINTS - 1)))
    const body = points[head]
    if (bodyRef.current) {
      bodyRef.current.setAttribute('cx', body.x.toFixed(1))
      bodyRef.current.setAttribute('cy', body.y.toFixed(1))
    }
    if (trailRef.current) {
      const tailStart = Math.max(0, head - 26)
      trailRef.current.setAttribute('d', toPath(points.slice(tailStart, head + 1)))
    }

    if (index !== figure) setFigure(index)
  })

  const current = FIGURES[figure]

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <svg viewBox="0 0 700 340" fill="none" className="h-full w-full" aria-label={`Чертёж: ${current.topic}`}>
        {/* ось */}
        <line x1="0" y1="300" x2="700" y2="300" stroke="#1E2C4F" strokeOpacity="0.18" strokeWidth="1.5" />

        {/* сама кривая */}
        <motion.path
          ref={pathRef}
          d={toPath(samples[0])}
          stroke="#1E2C4F"
          strokeOpacity="0.55"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
        />

        {/* след за телом */}
        {!reduce && (
          <path ref={trailRef} stroke="#B23A2A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* тело */}
        {!reduce && <circle ref={bodyRef} r="6.5" fill="#1E2C4F" cx={samples[0][0].x} cy={samples[0][0].y} />}
      </svg>

      {/* подпись темы — меняется вместе с фигурой */}
      <div className="pointer-events-none absolute left-0 top-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-pen-300">§ тема программы</p>
            <p className="mt-1 text-[14px] font-bold text-ink-900">{current.topic}</p>
            <p className="mt-0.5 font-mono text-[13px] text-mark-500">{current.formula}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function HeroWords({ text, delay = 0 }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{text}</>
  return text.split(' ').map((word, i) => (
    <motion.span
      key={`${word}-${i}`}
      className="inline-block"
      initial={{ opacity: 0, y: '0.4em' }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: delay + i * 0.06 }}
    >
      {word}&nbsp;
    </motion.span>
  ))
}

function Countdown({ olympiads }) {
  const now = useNow()
  const olympiad = olympiads.find((o) => (o.stages || []).length > 0)
  if (!olympiad) return null
  const rows = [
    ['physics', 'Физика'],
    ['math', 'Математика'],
  ]
    .map(([subject, label]) => ({ label, stage: nextStage(olympiad.stages || [], subject, now) }))
    .filter((r) => r.stage)
  if (rows.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 1.2 }}
      className="card w-full max-w-sm p-5"
    >
      <p className="eyebrow mb-3">ближайший этап</p>
      <p className="font-serif text-[20px] font-semibold leading-tight">Олимпиада «{olympiad.title}»</p>
      <ul className="mt-4 space-y-3">
        {rows.map(({ label, stage }) => {
          const days = daysUntil(now, stage.date)
          const time = mskTime.format(stage.date)
          return (
            <li key={label} className="flex items-baseline gap-3">
              <span className="font-mono text-[28px] font-semibold leading-none text-mark-500 tabular-nums">
                {days}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink-900">
                  {daysWord(days)} до «{label.toLowerCase()}»
                </span>
                <span className="block font-mono text-[12px] text-ink-400">
                  {mskDate.format(stage.date)}
                  {time !== '0:00' && time !== '00:00' ? `, ${time} МСК` : ''}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}

function Hero({ stats, olympiads, loading }) {
  const ref = useRef(null)
  const y = useParallax(ref, 80)

  return (
    <section ref={ref} className="relative overflow-hidden border-b border-line">
      <motion.div style={{ y }} className="grid-paper pointer-events-none absolute inset-0 -z-10" />

      <div className="container-x pb-14 pt-12 lg:pb-20 lg:pt-16">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          физика и математика · 9–11 класс
        </motion.p>

        <h1 className="mt-5 max-w-4xl font-serif text-[40px] font-semibold leading-[1.05] sm:text-[58px] lg:text-[68px]">
          <HeroWords text="Поступи в вуз мечты" delay={0.15} />
          <br className="hidden sm:block" />
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: '0.4em' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
          >
            <DrawnUnderline delay={1}>без экзаменов</DrawnUnderline>
          </motion.span>
        </h1>

        <motion.p
          className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-500"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
        >
          Диплом перечневой олимпиады даёт БВИ — зачисление без вступительных испытаний. Показываем, какая олимпиада
          что даёт, и ведём по программе: тема → конспект → задачи → разбор.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.75 }}
        >
          <motion.button
            className="btn-primary"
            onClick={() => navigate('/program')}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            Открыть программу
            <Icon name="arrow" className="h-[18px] w-[18px]" />
          </motion.button>
          <motion.button
            className="btn-secondary"
            onClick={() => navigate('/base')}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            Какая олимпиада даёт БВИ
          </motion.button>
        </motion.div>

        <div className="mt-12 grid items-end gap-10 lg:grid-cols-[1fr_380px]">
          {/* чертёж */}
          <motion.div
            className="order-2 h-[220px] sm:h-[280px] lg:order-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <HeroFigure />
          </motion.div>

          <div className="order-1 lg:order-2">
            <Countdown olympiads={olympiads} />
          </div>
        </div>

        {/* цифры */}
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.9 + i * 0.08 }}
            >
              <dt className="font-mono text-[30px] font-semibold leading-none text-pen-700 tabular-nums">
                {loading ? <span className="text-ink-300">—</span> : <CountUp value={s.value} />}
              </dt>
              <dd className="mt-2 text-[13px] leading-snug text-ink-400">{s.label}</dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ——— Маршрут: линия, которая чертится по мере прокрутки ——— */

const ROUTE = [
  { n: '01', title: 'Выбираете цель', text: 'База вузов: какая олимпиада даёт БВИ в МФТИ, ВШЭ или ИТМО и что для этого нужно.' },
  { n: '02', title: 'Открываете тему', text: 'Программа по физике и математике — в порядке прохождения, без входных тестов.' },
  { n: '03', title: 'Читаете конспект', text: 'Короткая выжимка: идея, ключевые формулы, типичные ошибки.' },
  { n: '04', title: 'Решаете три уровня', text: 'От техники до задач заключительных этапов прошлых лет — с ответами.' },
  { n: '05', title: 'Видите прогресс', text: 'Отмечаете решённое, в кабинете видно, где пробелы.' },
]

function Route() {
  const ref = useRef(null)
  return (
    <section className="border-b border-line bg-white">
      <div className="container-x py-16 lg:py-24">
        <Reveal>
          <p className="eyebrow mb-3">как это работает</p>
          <h2 className="max-w-2xl font-serif text-[30px] font-semibold leading-tight sm:text-[38px]">
            Маршрут от «не знаю, с чего начать» до диплома
          </h2>
        </Reveal>

        <div ref={ref} className="relative mt-12 pl-10 sm:pl-14">
          {/* направляющая и линия, которая прочерчивается при прокрутке */}
          <div className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-line sm:left-[23px]" />
          <ScrollLine targetRef={ref} className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-pen-700 sm:left-[23px]" />

          <Stagger className="space-y-10" step={0.1}>
            {ROUTE.map((step) => (
              <motion.div key={step.n} variants={staggerItem} className="relative">
                <span className="absolute -left-10 top-0 grid h-8 w-8 place-items-center rounded-full border border-line bg-white font-mono text-[12px] font-semibold text-pen-700 sm:-left-14 sm:h-12 sm:w-12 sm:text-[14px]">
                  {step.n}
                </span>
                <h3 className="text-[18px] font-bold leading-snug">{step.title}</h3>
                <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-500">{step.text}</p>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  )
}

/* ——— Живой пример задачи: подсказка раскрывается с анимацией ——— */

function TaskDemo() {
  const [open, setOpen] = useState(false)
  return (
    <section className="border-b border-line">
      <div className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <Reveal>
          <p className="eyebrow mb-3">как выглядит задача</p>
          <h2 className="font-serif text-[30px] font-semibold leading-tight sm:text-[38px]">
            Условие, рисунок, ответ — и ни одного лишнего клика
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-500">
            Задачи привязаны к теме программы и к олимпиаде, на которой встречались. Ответ открывается по кнопке —
            сначала решайте сами.
          </p>
          <Link
            to="/program"
            className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
          >
            Все задачи по темам
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="shrink-0 rounded bg-paper px-1.5 py-0.5 font-mono text-[12px] font-bold text-ink-500">
                №1.3.5
              </span>
              <p className="text-[15px] leading-relaxed">
                Спортсмен толкает ядро под углом 45° к горизонту со скоростью 20 м/с. Через какое время после толчка
                угол наклона скорости к горизонту уменьшится до 30°?
              </p>
            </div>

            <button
              onClick={() => setOpen((v) => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-700 hover:text-pen-900"
            >
              {open ? 'Скрыть ответ' : 'Показать ответ'}
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }}>
                <Icon name="chevronDown" className="h-4 w-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="mt-3 rounded-lg bg-paper p-4 font-mono text-[14px] leading-relaxed text-ink-700">
                    t ≃ 0,61 с
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-400">
              Савченко О. Я., Балдин Е. М. «Сборник задач по физике», 2003 · GNU FDL
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ——— Для кого ——— */

function Audience() {
  return (
    <section className="border-b border-line bg-white">
      <div className="container-x py-16 lg:py-24">
        <Reveal>
          <p className="eyebrow mb-3">для кого это</p>
          <h2 className="max-w-2xl font-serif text-[30px] font-semibold leading-tight sm:text-[38px]">
            Два пути к БВИ — и оба начинаются здесь
          </h2>
        </Reveal>

        <Stagger className="mt-10 grid gap-5 md:grid-cols-2" step={0.12}>
          {AUDIENCE.map((a) => (
            <motion.article
              key={a.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="card flex flex-col p-6 sm:p-7"
            >
              <span className="chip self-start border border-line bg-paper text-ink-500">{a.tag}</span>
              <h3 className="mt-4 text-[20px] font-bold leading-snug">{a.title}</h3>
              <ul className="mt-5 space-y-3">
                {a.pains.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink-500">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3 rounded-lg bg-pen-50 p-4">
                <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-pen-600" />
                <p className="text-[15px] leading-relaxed text-pen-800">{a.gets}</p>
              </div>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

/* ——— База: олимпиада → вуз ——— */

function Bases({ olympiads, universities }) {
  return (
    <section className="border-b border-line">
      <div className="container-x py-16 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <p className="eyebrow mb-3">база олимпиад и вузов</p>
            <h2 className="max-w-2xl font-serif text-[30px] font-semibold leading-tight sm:text-[38px]">
              Сначала цель, потом подготовка
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link to="/base" className="inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900">
              Вся база
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <Stagger className="mt-10 grid gap-4 md:grid-cols-3" step={0.08}>
          {olympiads.slice(0, 3).map((o) => (
            <motion.article key={o.id} variants={staggerItem} whileHover={{ y: -4 }} className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[18px] font-bold">{o.title}</h3>
                <span className="chip bg-pen-50 text-pen-700">{o.level}</span>
              </div>
              <p className="mt-1.5 text-sm text-ink-400">{o.organizer}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-700">{o.perk}</p>
            </motion.article>
          ))}
        </Stagger>

        <Stagger className="mt-4 grid gap-4 md:grid-cols-3" step={0.08}>
          {universities.slice(0, 3).map((u) => (
            <motion.article key={u.id} variants={staggerItem} className="card flex items-start gap-4 p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-pen-700 font-mono text-[13px] font-bold text-white">
                {u.short}
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold leading-snug">{u.title}</h3>
                <p className="mt-1 text-sm text-ink-400">{u.city}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
                  Принимает: {u.accepts.map((a) => a.title).join(' · ')}
                </p>
              </div>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

/* ——— ИИ-помощник: диалог печатается при появлении ——— */

const CHAT = [
  { me: true, text: 'Подбери 5 задач по импульсу уровня отбора Физтеха' },
  { me: false, text: 'Собрала: две на упругий удар, одна на центр масс и две на разрыв тела. Начните со второй — она ближе всего к формату.' },
  { me: true, text: 'Проверь моё решение третьей задачи' },
  { me: false, text: 'Импульс записан верно, но в проекции на вертикаль потерян знак скорости второго осколка — поэтому ответ вдвое больше.' },
]

function Assistant() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()

  return (
    <section className="border-b border-line bg-pen-800 text-white">
      <div className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
        <Reveal>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-pen-300">§ ии-помощник</p>
          <h2 className="mt-3 font-serif text-[30px] font-semibold leading-tight sm:text-[38px]">
            Спросить можно так же, как у репетитора
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-pen-100">
            Помощник знает программу и задачи прошлых лет: соберёт подборку под ваш уровень и найдёт шаг, на котором
            вы потеряли условие.
          </p>
          <motion.button
            className="btn mt-8 bg-white text-pen-800 hover:bg-pen-50"
            onClick={() => navigate('/program')}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            Посмотреть на примере темы
            <Icon name="arrow" className="h-[18px] w-[18px]" />
          </motion.button>
        </Reveal>

        <div ref={ref} className="space-y-3">
          {CHAT.map((m, i) => (
            <motion.div
              key={i}
              className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}
              initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.45 }}
            >
              <p
                className={`max-w-[85%] rounded-lg px-4 py-3 text-[15px] leading-relaxed ${
                  m.me ? 'bg-pen-600 text-white' : 'bg-white text-ink-700'
                }`}
              >
                {m.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ——— Тарифы ——— */

function Pricing({ plans }) {
  return (
    <section id="pricing" className="scroll-mt-24 border-b border-line bg-white">
      <div className="container-x py-16 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3">тарифы</p>
          <h2 className="font-serif text-[30px] font-semibold leading-tight sm:text-[38px]">
            Сориентироваться — бесплатно
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
            База олимпиад и вузов открыта всегда: понять свой маршрут можно, ничего не оплачивая.
          </p>
        </Reveal>

        <Stagger className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2" step={0.12}>
          {plans.map((plan) => (
            <motion.article
              key={plan.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className={`relative flex flex-col rounded-lg border bg-white p-7 ${
                plan.accent ? 'border-pen-700' : 'border-line'
              }`}
            >
              {plan.accent && (
                <span className="chip absolute -top-2.5 left-6 bg-pen-700 text-white">популярный</span>
              )}
              <h3 className="text-[18px] font-bold">{plan.title}</h3>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="font-mono text-[34px] font-semibold leading-none tabular-nums">{plan.price_display}</span>
                <span className="text-[15px] text-ink-400">{plan.period}</span>
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-500">{plan.summary}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                    <Icon name="check" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-pen-600" strokeWidth={2.2} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-8 w-full ${plan.accent ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => navigate(plan.accent ? '/login' : '/program')}
              >
                {plan.cta}
              </button>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

/* ——— Финал ——— */

function FinalCta({ sections }) {
  const physics = sections.filter((s) => s.subject === 'physics').length
  const math = sections.filter((s) => s.subject === 'math').length

  return (
    <section className="relative overflow-hidden">
      <div className="grid-paper pointer-events-none absolute inset-0 -z-10" />
      <div className="container-x py-16 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-[30px] font-semibold leading-tight sm:text-[40px]">
            До отборочных этапов — меньше трёх месяцев
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
            {physics} разделов по физике и {math} по математике уже разложены по темам. Начните с той, которая
            западает сильнее всего.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <motion.button className="btn-primary" onClick={() => navigate('/program')} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
              Открыть программу
              <Icon name="arrow" className="h-[18px] w-[18px]" />
            </motion.button>
            <motion.button className="btn-secondary" onClick={() => navigate('/progress')} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
              Посмотреть кабинет
            </motion.button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function Landing() {
  const { data, loading } = useAsync(
    () => Promise.all([listTopics(), listOlympiads(), listUniversities(), listPlans(), listSections()]),
    []
  )
  const [topics, olympiads, universities, plans, sections] = data || [[], [], [], [], []]

  const stats = [
    { value: olympiads.length, label: 'перечневых олимпиад в базе' },
    { value: topics.length, label: 'тем по физике и математике' },
    { value: topics.length * 6, label: 'задач трёх уровней сложности' },
    { value: universities.length, label: 'вузов с разбором льгот' },
  ]

  return (
    <>
      <Hero stats={stats} olympiads={olympiads} loading={loading} />
      <Route />
      <TaskDemo />
      <Audience />
      {!loading && <Bases olympiads={olympiads} universities={universities} />}
      <Assistant />
      {!loading && plans.length > 0 && <Pricing plans={plans} />}
      {!loading && <FinalCta sections={sections} />}
    </>
  )
}
