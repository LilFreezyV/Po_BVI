import React, { useMemo, useState } from 'react'
import { listOlympiads, listSections, listTopics } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { useAuth } from '../lib/auth.jsx'
import { SUBJECT_LABELS } from '../lib/subjects.js'
import { STATUS_META } from '../data/site.js'
import { Chip, Icon, Link, ProgressBar } from '../components/ui.jsx'

const FILTERS = [
  { id: 'all', label: 'Все предметы' },
  { id: 'physics', label: 'Физика' },
  { id: 'math', label: 'Математика' },
]

function TopicCard({ topic, olympiadTitle }) {
  const meta = STATUS_META[topic.progress.status]

  return (
    <Link
      to={`/topic/${topic.id}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-bold leading-snug group-hover:text-brand-700">{topic.title}</h3>
        {topic.free ? (
          <Chip className="shrink-0 bg-brand-50 text-brand-700">Бесплатно</Chip>
        ) : (
          <span className="shrink-0 text-ink-300" title="Доступно по подписке">
            <Icon name="lock" className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>

      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-500">{topic.blurb}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {topic.olympiad_ids.slice(0, 3).map((id) => (
          <Chip key={id} className="border border-line bg-paper text-[11px] text-ink-500">
            {olympiadTitle(id)}
          </Chip>
        ))}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="inline-flex items-center gap-2 font-semibold text-ink-500">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.title}
          </span>
          <span className="inline-flex items-center gap-1.5 text-ink-400">
            <Icon name="clock" className="h-4 w-4" />
            {topic.minutes} мин
          </span>
        </div>
        {topic.progress.percent > 0 && (
          <div className="mt-3">
            <ProgressBar value={topic.progress.percent} className={meta.bar} height="h-1" />
          </div>
        )}
      </div>
    </Link>
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

  return (
    <div className="container-x py-10 lg:py-14">
      <div className="max-w-3xl">
        <p className="eyebrow mb-3">Каталог тем</p>
        <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
          Всё, что спрашивают на перечневых олимпиадах
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
          Темы сгруппированы по разделам школьного курса, но отобраны под олимпиадные требования. Внутри темы —
          конспект теории и задачи трёх уровней сложности.
        </p>
        <Link
          to="/program"
          className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-brand-700 hover:text-brand-900"
        >
          Программа по физике для 9, 10 и 11 класса
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>

      <div className="sticky top-[68px] z-30 -mx-5 mt-8 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-line bg-white p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSubject(f.id)}
                className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
                  subject === f.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск темы: импульс, графы…"
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-brand-400 sm:w-64"
            />
            <span className="hidden shrink-0 text-sm text-ink-400 sm:block">{total} тем</span>
          </div>
        </div>
      </div>

      {loading && <p className="py-16 text-center text-ink-400">Загружаем каталог…</p>}
      {error && !loading && (
        <p className="py-16 text-center text-ink-400">
          Не удалось загрузить данные. Проверьте, что бэкенд запущен.
        </p>
      )}
      {!loading && !error && sections.length === 0 && (
        <p className="py-16 text-center text-ink-400">Ничего не нашлось. Попробуйте другой запрос.</p>
      )}

      {!loading && !error && (
        <div className="space-y-12 pt-10">
          {sections.map((section) => (
            <section key={section.id}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="text-[22px] font-extrabold">{section.title}</h2>
                <span className="rounded-full bg-ink-900/[0.05] px-2.5 py-0.5 text-[12px] font-semibold text-ink-500">
                  {SUBJECT_LABELS[section.subject] || section.subject}
                </span>
                <p className="text-[15px] text-ink-400">{section.hint}</p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} olympiadTitle={olympiadTitle} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
