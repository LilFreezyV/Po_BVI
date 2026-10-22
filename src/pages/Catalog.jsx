import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { listCurriculum } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Chip, Icon, Link, PageHeader, ProgressBar, SkeletonCards } from '../components/ui.jsx'
import { Reveal, Stagger, staggerItem } from '../components/motion.jsx'

/* «Темы (конспекты)» — теория всей программы: крупная тема → подтемы → конспект подтемы.

   Задач тут нет: их решают в разделе «Задачи по темам» (#/program). Раньше это была своя
   сущность (разделы и темы каталога из seed_data), но темы программы и темы каталога
   разошлись, и держать два списка было незачем — см. CLAUDE.md, решение 2026-10-22. */

const SUBJECTS = [
  { id: 'physics', label: 'Физика' },
  { id: 'math', label: 'Математика' },
]

const num = (n) => String(n).padStart(2, '0')
const gradesLabel = (grades) => (grades?.length ? `${grades.join(', ')} класс` : null)

function LessonRow({ lesson }) {
  return (
    <motion.li variants={staggerItem}>
      <Link
        to={`/theory/${lesson.id}`}
        className="group flex items-start gap-4 border-t border-line px-5 py-3.5 transition-colors first:border-t-0 hover:bg-pen-50/40 sm:px-6"
      >
        <span className="mt-0.5 font-mono text-[12px] text-ink-300">{num(lesson.number)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug group-hover:text-pen-700">
            {lesson.title}
            {gradesLabel(lesson.grades) && (
              <span className="ml-2 font-mono text-[11px] font-normal text-ink-300">
                {gradesLabel(lesson.grades)}
              </span>
            )}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-ink-400 line-clamp-2">
            {lesson.description}
          </span>
        </span>
        <span className="mt-0.5 shrink-0">
          {lesson.has_theory ? (
            <Icon name="arrow" className="h-4 w-4 text-pen-400 transition group-hover:text-pen-700" />
          ) : (
            <span className="font-mono text-[11px] text-ink-300">скоро</span>
          )}
        </span>
      </Link>
    </motion.li>
  )
}

function TopicCard({ module, index, open, onToggle }) {
  const ready = module.lessons.filter((l) => l.has_theory).length
  const percent = module.lessons.length ? Math.round((100 * ready) / module.lessons.length) : 0

  return (
    <section id={module.id} className="card scroll-mt-[150px] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-5 px-5 py-4 text-left transition hover:bg-paper/60 sm:px-6"
      >
        <span className="font-mono text-[22px] font-semibold leading-none text-ink-300">
          {num(index + 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[20px] font-semibold leading-snug">
            {module.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-400">
            <span>{module.lessons.length} подтем</span>
            {gradesLabel(module.grades) && <span>· {gradesLabel(module.grades)}</span>}
            <span className="font-mono text-[12px]">
              · конспектов {ready}/{module.lessons.length}
            </span>
          </span>
          <span className="mt-3 block max-w-[220px]">
            <ProgressBar value={percent} className="bg-pen-500" height="h-1" />
          </span>
        </span>
        <Icon
          name="chevronDown"
          className={`mt-1 h-5 w-5 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <Stagger as="ul" className="border-t border-line" step={0.03}>
          {module.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </Stagger>
      )}
    </section>
  )
}

export default function Catalog() {
  const [subject, setSubject] = useState('physics')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const { data, loading, error } = useAsync(() => listCurriculum(subject), [subject])
  const curriculum = data || []

  const modules = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return curriculum
    return curriculum
      .map((m) => ({
        ...m,
        lessons: m.lessons.filter(
          (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
        ),
      }))
      .filter((m) => m.lessons.length > 0)
  }, [curriculum, query])

  const lessons = curriculum.flatMap((m) => m.lessons)
  const ready = lessons.filter((l) => l.has_theory).length
  const searching = query.trim().length > 0

  return (
    <div className="container-x py-10 lg:py-14">
      <PageHeader
        eyebrow="Темы и конспекты"
        title="Вся теория курса, тема за темой"
        text="Тот же список, что в программе: крупная тема, внутри — подтемы. У каждой подтемы конспект: в чём суть, какой приём работает и что помнить наизусть. Задачи — в соседнем разделе."
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-ink-400">
          <span>
            <span className="text-[15px] font-semibold text-ink-900">{curriculum.length}</span> тем
          </span>
          <span>
            <span className="text-[15px] font-semibold text-ink-900">{lessons.length}</span> подтем
          </span>
          <span>
            <span className="text-[15px] font-semibold text-mark-500">{ready}</span> конспектов
            готово
          </span>
        </div>

        <Link
          to="/program"
          className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
        >
          Перейти к задачам по этим темам
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </PageHeader>

      <div className="sticky top-[68px] z-30 -mx-5 mt-8 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-line bg-white p-1">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSubject(s.id)
                  setQuery('')
                }}
                className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
                  subject === s.id ? 'bg-pen-700 text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по подтемам: парабола, Дирихле…"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-pen-400 sm:w-72"
          />
        </div>
      </div>

      {loading && (
        <div className="pt-10">
          <SkeletonCards count={4} columns="" />
        </div>
      )}
      {error && !loading && (
        <p className="py-16 text-center text-ink-400">
          Не удалось загрузить данные. Проверьте, что бэкенд запущен.
        </p>
      )}
      {!loading && !error && modules.length === 0 && (
        <p className="py-16 text-center text-ink-400">Ничего не нашлось. Попробуйте другой запрос.</p>
      )}

      {!loading && !error && modules.length > 0 && (
        <Reveal className="space-y-4 pt-10">
          {modules.map((module, i) => (
            <TopicCard
              key={module.id}
              module={module}
              index={curriculum.findIndex((m) => m.id === module.id)}
              open={searching || !collapsed[module.id]}
              onToggle={() => setCollapsed((c) => ({ ...c, [module.id]: !c[module.id] }))}
            />
          ))}
        </Reveal>
      )}
    </div>
  )
}
