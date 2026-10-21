import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { listOlympiads, listSections, listTopics } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { useAuth } from '../lib/auth.jsx'
import { SUBJECT_LABELS } from '../lib/subjects.js'
import { STATUS_META } from '../data/site.js'
import { Chip, Icon, Link, PageHeader, ProgressBar, SkeletonCards } from '../components/ui.jsx'
import { Reveal, Stagger, staggerItem } from '../components/motion.jsx'

/* Каталог тем: раздел школьного курса → темы с конспектом и задачами трёх уровней.
   Оформление — как в тетради: разделы пронумерованы моноширинным, карточки плоские,
   без теней; «подчёркивание» раздела — тонкая линейка, а не плашка. */

const FILTERS = [
  { id: 'all', label: 'Все предметы' },
  { id: 'physics', label: 'Физика' },
  { id: 'math', label: 'Математика' },
]

const num = (n) => String(n).padStart(2, '0')

function TopicCard({ topic, index, olympiadTitle }) {
  const meta = STATUS_META[topic.progress.status]

  return (
    <motion.div variants={staggerItem}>
      <Link
        to={`/topic/${topic.id}`}
        className="card group flex h-full flex-col p-5 transition-colors hover:border-pen-200 hover:bg-pen-50/30"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[12px] text-ink-300">№ {num(index + 1)}</span>
          {topic.free ? (
            <Chip className="border border-pen-200 bg-white text-pen-700">Бесплатно</Chip>
          ) : (
            <span className="text-ink-300" title="Доступно по подписке">
              <Icon name="lock" className="h-[18px] w-[18px]" />
            </span>
          )}
        </div>

        <h3 className="mt-2 text-[17px] font-bold leading-snug group-hover:text-pen-700">{topic.title}</h3>
        <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-500">{topic.blurb}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {topic.olympiad_ids.slice(0, 3).map((id) => (
            <Chip key={id} className="border border-line bg-paper text-[11px] text-ink-500">
              {olympiadTitle(id)}
            </Chip>
          ))}
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="inline-flex items-center gap-2 font-semibold text-ink-500">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {meta.title}
            </span>
            <span className="font-mono text-[12px] text-ink-400">{topic.minutes} мин</span>
          </div>
          {topic.progress.percent > 0 && (
            <div className="mt-2.5">
              <ProgressBar value={topic.progress.percent} className={meta.bar} height="h-1" />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

export default function Catalog() {
  const [subject, setSubject] = useState('all')
  const [query, setQuery] = useState('')
  const { token } = useAuth()

  const { data, loading, error } = useAsync(
    () => Promise.all([listSections(), listTopics(token), listOlympiads()]),
    [token]
  )
  const [sectionsData, topicsData, olympiadsData] = data || [[], [], []]

  const olympiadTitle = (id) => olympiadsData.find((o) => o.id === id)?.title || id

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sectionsData
      .filter((s) => subject === 'all' || s.subject === subject)
      .map((section) => ({
        ...section,
        topics: topicsData.filter(
          (t) =>
            t.section_id === section.id &&
            (!q || t.title.toLowerCase().includes(q) || t.blurb.toLowerCase().includes(q))
        ),
      }))
      .filter((s) => s.topics.length > 0)
  }, [sectionsData, topicsData, subject, query])

  const total = sections.reduce((acc, s) => acc + s.topics.length, 0)
  const free = sections.reduce((acc, s) => acc + s.topics.filter((t) => t.free).length, 0)
  const started = sections.reduce(
    (acc, s) => acc + s.topics.filter((t) => t.progress.percent > 0).length,
    0
  )

  const jumpTo = (id) =>
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="container-x py-10 lg:py-14">
      <PageHeader
        eyebrow="Каталог тем"
        title="Всё, что спрашивают на перечневых олимпиадах"
        text="Темы сгруппированы по разделам школьного курса, но отобраны под олимпиадные требования. Внутри темы — конспект теории и задачи трёх уровней сложности."
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-ink-400">
          <span>
            <span className="text-[15px] font-semibold text-ink-900">{total}</span> тем
          </span>
          <span>
            <span className="text-[15px] font-semibold text-ink-900">{free}</span> открыты бесплатно
          </span>
          {started > 0 && (
            <span>
              <span className="text-[15px] font-semibold text-mark-500">{started}</span> в работе
            </span>
          )}
        </div>

        <Link
          to="/program"
          className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
        >
          Программа по физике и математике целиком
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </PageHeader>

      <div className="sticky top-[68px] z-30 -mx-5 mt-8 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-line bg-white p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSubject(f.id)}
                className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
                  subject === f.id ? 'bg-pen-700 text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск темы: импульс, графы…"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-pen-400 sm:w-72"
          />
        </div>

        {/* Быстрый переход по разделам — вместо прокрутки всего каталога. */}
        {sections.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {sections.map((section, i) => (
              <button
                key={section.id}
                onClick={() => jumpTo(section.id)}
                className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-500 transition hover:border-pen-200 hover:text-pen-700"
              >
                <span className="mr-1.5 font-mono text-[11px] text-ink-300">{num(i + 1)}</span>
                {section.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="pt-10">
          <SkeletonCards count={6} />
        </div>
      )}
      {error && !loading && (
        <p className="py-16 text-center text-ink-400">
          Не удалось загрузить данные. Проверьте, что бэкенд запущен.
        </p>
      )}
      {!loading && !error && sections.length === 0 && (
        <p className="py-16 text-center text-ink-400">Ничего не нашлось. Попробуйте другой запрос.</p>
      )}

      {!loading && !error && (
        <div className="space-y-14 pt-10">
          {sections.map((section, i) => (
            <section key={section.id} id={`section-${section.id}`} className="scroll-mt-[190px]">
              <Reveal>
                <div className="flex items-start gap-5 border-b border-line pb-4">
                  <span className="font-mono text-[28px] font-semibold leading-none text-ink-300 sm:text-[34px]">
                    {num(i + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="font-serif text-[24px] font-semibold leading-tight sm:text-[28px]">
                        {section.title}
                      </h2>
                      <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-400">
                        {SUBJECT_LABELS[section.subject] || section.subject} ·{' '}
                        {section.topics.length} тем
                      </span>
                    </div>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">{section.hint}</p>
                  </div>
                </div>
              </Reveal>

              <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.topics.map((topic, index) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    index={index}
                    olympiadTitle={olympiadTitle}
                  />
                ))}
              </Stagger>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
