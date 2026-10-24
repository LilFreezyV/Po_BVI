import React, { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { getBvi } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { LEVEL_LABEL } from '../lib/olympiadLevels.js'
import { Chip, Icon, PageHeader, SkeletonCards, SkeletonLines } from '../components/ui.jsx'
import { EASE, Reveal, Stagger, staggerItem } from '../components/motion.jsx'

/* БВИ-навигатор: сводная таблица «олимпиада × вуз» и карточки с условиями.
   Данные — /api/bvi, собраны из приказа Минобрнауки и правил приёма вузов;
   что именно откуда — в backend/scripts/bvi_data.py и в блоке «Источники» ниже. */

const LEVEL_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'vsosh', label: 'ВсОШ' },
  { id: 'I', label: 'I уровень' },
  { id: 'II', label: 'II уровень' },
  { id: 'III', label: 'III уровень' },
  { id: 'off', label: 'Вне перечня' },
]

// Оформление ячейки: БВИ — залитая, БВИ* — контурная, 100 баллов — красные чернила.
const CELL = {
  bvi: { label: 'БВИ', className: 'bg-pen-700 text-white' },
  bvi_part: { label: 'БВИ*', className: 'border border-pen-300 bg-pen-50 text-pen-700' },
  score100: { label: '100', className: 'border border-mark-100 bg-mark-50 text-mark-600' },
  none: { label: '—', className: 'text-ink-300' },
  unknown: { label: '?', className: 'border border-dashed border-line text-ink-300' },
}

const LEVEL_CHIP = {
  vsosh: 'bg-mark-500 text-white',
  I: 'bg-pen-700 text-white',
  II: 'bg-pen-100 text-pen-700',
  III: 'border border-line bg-paper text-ink-500',
  off: 'border border-dashed border-line text-ink-400',
}


function Cell({ code }) {
  const meta = CELL[code] || CELL.unknown
  return (
    <span
      className={`inline-flex min-w-[42px] items-center justify-center rounded px-1.5 py-1 font-mono text-[12px] font-semibold leading-none ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

/* ——— Сводная таблица ———
   Первый столбец липкий, остальные уезжают по горизонтали: 11 вузов в экран телефона
   не влезают никак, а резать их на «карточки по вузу» — терять главное, сравнение. */

function Matrix({ universities, olympiads, legend, role, onRole, level, onLevel }) {
  const rows = useMemo(
    () => olympiads.filter((o) => level === 'all' || o.level === level),
    [olympiads, level]
  )

  return (
    <section id="tablica" className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Сводная таблица</p>
          <h2 className="font-serif text-[26px] font-semibold leading-tight sm:text-[32px]">
            Диплом по строкам, вузы по столбцам
          </h2>
        </div>

        <div className="inline-flex rounded-xl border border-line bg-white p-1">
          {[
            { id: 'winner', label: 'Победителю' },
            { id: 'prize', label: 'Призёру' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => onRole(r.id)}
              className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
                role === r.id ? 'bg-pen-700 text-white' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {LEVEL_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onLevel(f.id)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
              level === f.id
                ? 'bg-ink-900 text-white'
                : 'border border-line bg-white text-ink-500 hover:text-ink-900'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[12px] text-ink-400">{rows.length} олимпиад</span>
      </div>

      {/* На телефоне 11 столбцов живут за правым краем — подсказываем, что таблица листается. */}
      <div className="mt-3 sm:hidden">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-300">
          таблица листается вбок →
        </p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-20 min-w-[150px] bg-white px-3 py-3 sm:min-w-[240px] sm:px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-400">
                Олимпиада
              </th>
              {universities.map((u) => (
                <th
                  key={u.id}
                  className="whitespace-nowrap px-3 py-3 text-center text-[12px] font-bold text-ink-500"
                >
                  {u.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="group border-b border-line/70 last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-3 py-3 font-normal group-hover:bg-pen-50/60 sm:px-4"
                >
                  <a href={`#/bvi#oly-${o.id}`} className="block">
                    <span className="text-[14px] font-semibold leading-snug text-ink-900 group-hover:text-pen-700">
                      {o.title}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-ink-400">
                      {LEVEL_LABEL[o.level]}
                    </span>
                  </a>
                </th>
                {universities.map((u) => {
                  const cell = o.benefits.find((b) => b.university_id === u.id)
                  return (
                    <td key={u.id} className="px-3 py-3 text-center group-hover:bg-pen-50/60">
                      <Cell code={cell ? cell[role] : 'unknown'} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {legend.map((l) => (
          <div key={l.code} className="flex items-center gap-2">
            <dt>
              <Cell code={l.code} />
            </dt>
            <dd className="text-[13px] text-ink-500">{l.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ——— Ближайшие даты ———
   Прошедшее отфильтровал бэкенд, здесь показываем первые шесть, остальное — по кнопке. */

function Dates({ items }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, 6)

  if (!items.length) return null

  return (
    <section className="mt-16">
      <p className="eyebrow mb-3">Ближайшие даты</p>
      <h2 className="font-serif text-[26px] font-semibold leading-tight sm:text-[32px]">
        Что закрывается в следующие недели
      </h2>

      <Stagger className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {shown.map((d) => (
            <motion.article
              key={`${d.label}-${d.olympiad}`}
              variants={staggerItem}
              layout
              exit={{ opacity: 0 }}
              className="card flex gap-4 p-4"
            >
              <span className="w-[86px] shrink-0 font-mono text-[13px] font-semibold leading-snug text-mark-500">
                {d.label}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold leading-snug">{d.olympiad}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-ink-500">{d.note}</span>
              </span>
            </motion.article>
          ))}
        </AnimatePresence>
      </Stagger>

      {items.length > 6 && (
        <button
          onClick={() => setAll((v) => !v)}
          className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
        >
          {all ? 'Свернуть' : `Ещё ${items.length - 6}`}
          <Icon name={all ? 'chevronDown' : 'arrow'} className="h-4 w-4" />
        </button>
      )}
    </section>
  )
}

/* ——— Карточка олимпиады ——— */

function OlympiadCard({ o, universities }) {
  const bvi = o.benefits.filter((b) => b.winner === 'bvi' || b.winner === 'bvi_part')
  const full = o.benefits.filter((b) => b.winner === 'bvi')
  const stages = [
    ['Регистрация', o.registration],
    ['Отбор', o.selection],
    ['Финал', o.final],
  ].filter(([, v]) => v)

  return (
    <motion.article variants={staggerItem} id={`oly-${o.id}`} className="card scroll-mt-24 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="max-w-[26ch] text-[18px] font-bold leading-snug">{o.title}</h3>
        <Chip className={`shrink-0 ${LEVEL_CHIP[o.level]}`}>{LEVEL_LABEL[o.level]}</Chip>
      </div>

      <p className="mt-2 text-[14px] text-ink-400">
        {o.organizer} · {o.grades}
      </p>

      <p className="mt-3 inline-flex items-center gap-2 font-mono text-[12px] text-pen-600">
        <span className="h-1.5 w-1.5 rounded-full bg-mark-400" />
        {o.status}
      </p>

      <dl className="mt-5 space-y-3 border-t border-line pt-4">
        {stages.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[88px_1fr] gap-3">
            <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">{label}</dt>
            <dd className="text-[14px] leading-relaxed text-ink-700">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-500">
        Победителю даёт БВИ в{' '}
        <span className="font-semibold text-ink-900">
          {bvi.length} из {universities.length}
        </span>{' '}
        вузов списка
        {full.length > 0 && `, из них без оговорок — в ${full.length}`}.
      </p>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[14px] font-semibold">
        {o.site_url && (
          <a href={o.site_url} target="_blank" rel="noreferrer noopener" className="text-pen-700 hover:text-pen-900">
            Сайт олимпиады
          </a>
        )}
        {o.reg_url && o.reg_url !== o.site_url && (
          <a href={o.reg_url} target="_blank" rel="noreferrer noopener" className="text-pen-700 hover:text-pen-900">
            Регистрация
          </a>
        )}
        {o.chat_url && (
          <a href={o.chat_url} target="_blank" rel="noreferrer noopener" className="text-ink-400 hover:text-ink-900">
            Канал
          </a>
        )}
      </div>
    </motion.article>
  )
}

/* ——— Карточка вуза ——— */

function UniversityCard({ u }) {
  const rows = [
    ['Победителю', u.winner],
    ['Призёру', u.prize],
    ['Порог ЕГЭ', u.ege],
    ['Классы', u.grades],
  ]

  return (
    <motion.article variants={staggerItem} id={`vuz-${u.id}`} className="card scroll-mt-24 p-6">
      <h3 className="text-[18px] font-bold">{u.short}</h3>
      <p className="mt-1 text-[14px] text-ink-400">{u.title}</p>

      <dl className="mt-5 space-y-3 border-t border-line pt-4">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[96px_1fr] gap-3">
            <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">{label}</dt>
            <dd className="text-[14px] leading-relaxed text-ink-700">{value}</dd>
          </div>
        ))}
      </dl>

      {u.draft_2027 && (
        <div className="mt-5 border-t border-dashed border-mark-100 pt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-mark-500">проект 2027</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{u.draft_2027}</p>
        </div>
      )}
    </motion.article>
  )
}

/* ——— Страница ——— */

export default function Bvi() {
  const [role, setRole] = useState('winner')
  const [level, setLevel] = useState('all')
  const { data, loading, error } = useAsync(() => getBvi(), [])
  const reduce = useReducedMotion()
  const headRef = useRef(null)

  // «В перечне» — только I–III уровни: ВсОШ и олимпиады вне перечня сюда не входят.
  const inList = data ? data.olympiads.filter((o) => ['I', 'II', 'III'].includes(o.level)).length : 0

  return (
    <div className="container-x py-10 lg:py-14">
      <div ref={headRef}>
        <PageHeader
          eyebrow="БВИ-навигатор"
          title="Что даёт олимпиада по физике в одиннадцати вузах"
          text="Одна таблица вместо десяти PDF с правилами приёма: уровень диплома, льгота у победителя и призёра, порог ЕГЭ и даты туров."
        >
          {data && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-ink-400"
            >
              <span>
                <span className="text-[15px] font-semibold text-ink-900">{inList}</span> олимпиад в перечне
                2026/27
              </span>
              <span>
                <span className="text-[15px] font-semibold text-ink-900">{data.universities.length}</span>{' '}
                вузов
              </span>
              <span>данные на {new Date(data.updated_on).toLocaleDateString('ru-RU')}</span>
            </motion.div>
          )}
        </PageHeader>
      </div>

      {loading && (
        <div className="pt-12">
          <SkeletonLines count={4} className="max-w-xl" />
          <div className="mt-10">
            <SkeletonCards count={6} />
          </div>
        </div>
      )}

      {error && !loading && (
        <p className="py-16 text-center text-ink-400">
          Не удалось загрузить данные. Проверьте, что бэкенд запущен.
        </p>
      )}

      {data && !loading && (
        <>
          <Stagger className="mt-12 grid gap-4 lg:grid-cols-3">
            {data.highlights.map((h) => (
              <motion.article
                key={h.title}
                variants={staggerItem}
                className={`card p-6 ${h.tone === 'warn' ? 'border-mark-100 bg-mark-50/40' : ''}`}
              >
                <h2 className="text-[17px] font-bold leading-snug">{h.title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{h.text}</p>
              </motion.article>
            ))}
          </Stagger>

          <Matrix
            universities={data.universities}
            olympiads={data.olympiads}
            legend={data.legend}
            role={role}
            onRole={setRole}
            level={level}
            onLevel={setLevel}
          />

          <Dates items={data.dates} />

          <section id="olimpiady" className="mt-16">
            <Reveal>
              <p className="eyebrow mb-3">Олимпиады</p>
              <h2 className="font-serif text-[26px] font-semibold leading-tight sm:text-[32px]">
                Сроки сезона и ссылки на регистрацию
              </h2>
            </Reveal>
            <Stagger className="mt-6 grid gap-4 lg:grid-cols-2">
              {data.olympiads
                .filter((o) => level === 'all' || o.level === level)
                .map((o) => (
                  <OlympiadCard key={o.id} o={o} universities={data.universities} />
                ))}
            </Stagger>
          </section>

          <section id="vuzy" className="mt-16">
            <Reveal>
              <p className="eyebrow mb-3">Вузы</p>
              <h2 className="font-serif text-[26px] font-semibold leading-tight sm:text-[32px]">
                Чем подтверждать диплом
              </h2>
            </Reveal>
            <Stagger className="mt-6 grid gap-4 lg:grid-cols-2">
              {data.universities.map((u) => (
                <UniversityCard key={u.id} u={u} />
              ))}
            </Stagger>
          </section>

          <Reveal className="mt-16 border-t border-line pt-8">
            <p className="eyebrow mb-3">Источники</p>
            <ul className="grid gap-4 sm:grid-cols-3">
              {data.sources.map((s) => (
                <li key={s.title}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[15px] font-semibold text-pen-700 hover:text-pen-900"
                    >
                      {s.title}
                    </a>
                  ) : (
                    <span className="text-[15px] font-semibold text-ink-900">{s.title}</span>
                  )}
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{s.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-3xl text-[13px] leading-relaxed text-ink-400">
              Правила приёма вузы публикуют до 20 января, поэтому «проект 2027» ещё изменится. Перед
              подачей документов сверяйтесь с сайтом приёмной комиссии: решение принимает она, а не
              мы.
            </p>
          </Reveal>
        </>
      )}
    </div>
  )
}
