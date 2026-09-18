import React, { useEffect, useMemo, useState } from 'react'
import { listCurriculum, listLessonProblems, listTopics } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Chip, Icon, Link } from '../components/ui.jsx'
import MathText from '../components/MathText.jsx'

const asset = (path) => `${import.meta.env.BASE_URL}${path}`

const problemsWord = (n) => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'задача'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'задачи'
  return 'задач'
}

// Картинки вырезаны из PDF с увеличением (ответы — 2,4 px на пункт, рисунки — 3 px на пункт).
// Показываем их примерно в размер основного текста (кегль книги 10 pt → ~15 px), а не в
// натуральную величину: иначе подписи на рисунках и формулы в ответах выглядят огромными.
const ANSWER_SCALE = 0.62
const FIGURE_SCALE = 0.55

function ScaledImage({ src, scale, alt, className }) {
  const [width, setWidth] = useState(null)
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={(e) => setWidth(Math.round(e.currentTarget.naturalWidth * scale))}
      style={width ? { width } : undefined}
      className={className}
    />
  )
}

function AnswerImage({ src, number }) {
  return (
    <ScaledImage
      src={src}
      scale={ANSWER_SCALE}
      alt={`Ответ к задаче ${number}`}
      className="mt-2 block max-w-full rounded-lg border border-line bg-paper p-2"
    />
  )
}

function ProblemItem({ problem }) {
  const [showAnswer, setShowAnswer] = useState(false)
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0 rounded-md bg-paper px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-ink-500">
          №{problem.number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-relaxed text-ink-900">
            <MathText text={problem.text} />
          </p>
          {problem.figure && (
            <ScaledImage
              src={asset(problem.figure)}
              scale={FIGURE_SCALE}
              alt={`Рисунок к задаче ${problem.number}`}
              className="mt-3 block max-w-full rounded-lg border border-line bg-white p-2"
            />
          )}
          {problem.answer_image ? (
            <div className="mt-3">
              <button
                onClick={() => setShowAnswer((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-900"
              >
                {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
                <Icon name="chevronDown" className={`h-4 w-4 transition ${showAnswer ? 'rotate-180' : ''}`} />
              </button>
              {showAnswer && <AnswerImage src={asset(problem.answer_image)} number={problem.number} />}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-ink-400">Ответа в сборнике нет.</p>
          )}
        </div>
      </div>
    </li>
  )
}

function LessonProblems({ lessonId }) {
  const { data, loading, error } = useAsync(() => listLessonProblems(lessonId), [lessonId])
  if (loading) return <p className="mt-3 text-[14px] text-ink-400">Загружаем задачи…</p>
  if (error) return <p className="mt-3 text-[14px] text-ink-400">Не удалось загрузить задачи.</p>
  return (
    <div className="mt-3">
      <ol className="space-y-3">
        {data.problems.map((p) => (
          <ProblemItem key={p.id} problem={p} />
        ))}
      </ol>
      {data.sources.map((s) => (
        <p key={s.id} className="mt-3 text-[12px] leading-relaxed text-ink-400">
          Задачи и ответы: {s.authors} «{s.title}», {s.year}. Распространяется по лицензии{' '}
          {s.license_url ? (
            <a href={s.license_url} target="_blank" rel="noreferrer" className="underline hover:text-ink-700">
              {s.license}
            </a>
          ) : (
            s.license
          )}
          . Тексты условий сверены с оригиналом, исправлены опечатки. По условию авторов решения к этим задачам не
          публикуются.
        </p>
      ))}
    </div>
  )
}

const GRADE_KEY = 'bvi_program_grade'

function readSavedGrade() {
  try {
    const value = Number(localStorage.getItem(GRADE_KEY))
    return Number.isInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function saveGrade(grade) {
  try {
    localStorage.setItem(GRADE_KEY, String(grade))
  } catch {
    // localStorage недоступен — просто не запомним выбор
  }
}

const lessonsWord = (n) => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'подтема'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'подтемы'
  return 'подтем'
}

const topicsWord = (n) => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'тема'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'темы'
  return 'тем'
}

function LessonRow({ lesson, topicTitle }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="flex gap-4 border-t border-line px-5 py-4 first:border-t-0 sm:px-6">
      <span className="mt-0.5 grid h-7 min-w-[28px] shrink-0 place-items-center rounded-lg bg-paper px-1.5 text-[13px] font-bold tabular-nums text-ink-500">
        {lesson.number}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-[15px] font-bold leading-snug">{lesson.title}</h4>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-500">{lesson.description}</p>
        {(lesson.problem_count > 0 || lesson.topic_id) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
            {lesson.problem_count > 0 && (
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 rounded-full bg-clay-50 px-3 py-1 text-[13px] font-semibold text-clay-600 transition hover:bg-clay-100"
              >
                Задачи из сборника · {lesson.problem_count}
                <Icon name="chevronDown" className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
              </button>
            )}
            {lesson.topic_id && (
              <Link
                to={`/topic/${lesson.topic_id}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-900"
              >
                Задачи по теме{topicTitle ? `: ${topicTitle}` : ''}
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
        {open && <LessonProblems lessonId={lesson.id} />}
      </div>
    </li>
  )
}

function ModuleCard({ module, index, open, onToggle, topicTitle, showRange }) {
  const count = module.lessons.length
  const first = module.lessons[0]?.number
  const last = module.lessons[count - 1]?.number

  return (
    <section id={module.id} className="card scroll-mt-[150px] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-paper/60 sm:px-6"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">Тема {index + 1}</p>
          <h3 className="mt-1 text-[18px] font-extrabold leading-snug sm:text-[20px]">{module.title}</h3>
          <p className="mt-1 text-[13px] text-ink-400">
            {count} {lessonsWord(count)}
            {showRange && first !== undefined && first !== last ? ` · занятия ${first}–${last}` : ''}
          </p>
        </div>
        <Icon
          name="chevronDown"
          className={`h-5 w-5 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ol className="border-t border-line">
          {module.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} topicTitle={topicTitle(lesson.topic_id)} />
          ))}
        </ol>
      )}
    </section>
  )
}

export default function Program() {
  const { data, loading, error } = useAsync(() => Promise.all([listCurriculum('physics'), listTopics()]), [])
  const [curriculum, topics] = data || [[], []]

  const [grade, setGrade] = useState(readSavedGrade)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState({})

  // Если сохранённого класса нет в данных — берём первый доступный.
  useEffect(() => {
    if (curriculum.length && !curriculum.some((g) => g.grade === grade)) setGrade(curriculum[0].grade)
  }, [curriculum, grade])

  const selectGrade = (value) => {
    setGrade(value)
    setQuery('')
    saveGrade(value)
  }

  const topicTitle = (id) => (id ? topics.find((t) => t.id === id)?.title : null)

  const current = curriculum.find((g) => g.grade === grade)

  const modules = useMemo(() => {
    if (!current) return []
    const q = query.trim().toLowerCase()
    if (!q) return current.modules
    return current.modules
      .map((m) => ({
        ...m,
        lessons: m.lessons.filter(
          (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
        ),
      }))
      .filter((m) => m.lessons.length > 0)
  }, [current, query])

  const stats = useMemo(() => {
    if (!current) return null
    const lessons = current.modules.flatMap((m) => m.lessons)
    return {
      modules: current.modules.length,
      lessons: lessons.length,
      withTasks: lessons.filter((l) => l.topic_id).length,
      problems: lessons.reduce((acc, l) => acc + (l.problem_count || 0), 0),
    }
  }, [current])

  const searching = query.trim().length > 0
  const shownLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)
  const allCollapsed = modules.length > 0 && modules.every((m) => collapsed[m.id])

  const setAll = (value) => setCollapsed(Object.fromEntries(modules.map((m) => [m.id, value])))

  const jumpTo = (id) => {
    setCollapsed((c) => ({ ...c, [id]: false }))
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="container-x py-10 lg:py-14">
      <div className="max-w-3xl">
        <p className="eyebrow mb-3">Программа</p>
        <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">Физика: программа по классам</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
          Что проходим в каждом классе — по темам и подтемам, в порядке занятий. Если по подтеме уже есть конспект
          и задачи трёх уровней, рядом будет ссылка на них.
        </p>
      </div>

      <div className="sticky top-[68px] z-30 -mx-5 mt-8 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex self-start rounded-xl border border-line bg-white p-1">
            {curriculum.map((g) => (
              <button
                key={g.grade}
                onClick={() => selectGrade(g.grade)}
                className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
                  g.grade === grade ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {g.grade} класс
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по подтемам: линзы, Кирхгоф…"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-brand-400 sm:w-72"
          />
        </div>
      </div>

      {loading && <p className="py-16 text-center text-ink-400">Загружаем программу…</p>}
      {error && !loading && (
        <p className="py-16 text-center text-ink-400">Не удалось загрузить данные. Проверьте, что бэкенд запущен.</p>
      )}
      {!loading && !error && curriculum.length === 0 && (
        <p className="py-16 text-center text-ink-400">
          Программа пока не загружена в базу — запустите <code>python -m scripts.seed</code>.
        </p>
      )}

      {!loading && !error && current && (
        <div className="grid gap-8 pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* Оглавление */}
          <aside className="hidden lg:block">
            <div className="sticky top-[160px]">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-400">{grade} класс</p>
              <ol className="mt-3 space-y-1">
                {current.modules.map((m, i) => (
                  <li key={m.id}>
                    <button
                      onClick={() => jumpTo(m.id)}
                      className="flex w-full items-baseline gap-2 rounded-lg px-2.5 py-2 text-left text-[14px] leading-snug text-ink-700 transition hover:bg-brand-50 hover:text-brand-800"
                    >
                      <span className="w-4 shrink-0 text-[12px] font-bold tabular-nums text-ink-300">{i + 1}</span>
                      <span className="flex-1">{m.title}</span>
                      <span className="shrink-0 text-[12px] tabular-nums text-ink-300">{m.lessons.length}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {searching ? (
                  <Chip className="bg-brand-50 text-brand-700">
                    Найдено: {shownLessons} {lessonsWord(shownLessons)}
                  </Chip>
                ) : (
                  <>
                    <Chip className="border border-line bg-white text-ink-700">
                      {stats.modules} {topicsWord(stats.modules)}
                    </Chip>
                    <Chip className="border border-line bg-white text-ink-700">
                      {stats.lessons} {lessonsWord(stats.lessons)}
                    </Chip>
                    <Chip className="bg-brand-50 text-brand-700">{stats.withTasks} с задачами на сайте</Chip>
                    {stats.problems > 0 && (
                      <Chip className="bg-clay-50 text-clay-600">
                        {stats.problems} {problemsWord(stats.problems)} из сборника
                      </Chip>
                    )}
                  </>
                )}
              </div>
              {!searching && (
                <button
                  onClick={() => setAll(!allCollapsed)}
                  className="text-[14px] font-semibold text-brand-700 hover:text-brand-900"
                >
                  {allCollapsed ? 'Развернуть все' : 'Свернуть все'}
                </button>
              )}
            </div>

            {modules.length === 0 && (
              <p className="py-12 text-center text-ink-400">По запросу «{query}» ничего не нашлось.</p>
            )}

            <div className="space-y-4">
              {modules.map((m) => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  index={current.modules.findIndex((x) => x.id === m.id)}
                  open={searching || !collapsed[m.id]}
                  onToggle={() => setCollapsed((c) => ({ ...c, [m.id]: !c[m.id] }))}
                  topicTitle={topicTitle}
                  showRange={!searching}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
