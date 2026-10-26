import React, { useEffect, useMemo, useState } from 'react'
import {
  listConspects,
  listCurriculum,
  listLessonProblems,
  listLiterature,
  listTopics,
  setProblemStatus,
} from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { useAuth } from '../lib/auth.jsx'
import AttemptButtons, { ATTEMPT_CARD } from '../components/AttemptButtons.jsx'
import { Chip, Icon, Link, SkeletonCards, SkeletonLines, navigate } from '../components/ui.jsx'
import MathText from '../components/MathText.jsx'
import { conspectPath } from './Conspect.jsx'

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

function ProblemItem({ problem, status, onStatus }) {
  const [showAnswer, setShowAnswer] = useState(false)
  return (
    <li className={`rounded-xl border p-4 transition ${ATTEMPT_CARD[status] || 'border-line bg-white'}`}>
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
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-700 hover:text-pen-900"
              >
                {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
                <Icon name="chevronDown" className={`h-4 w-4 transition ${showAnswer ? 'rotate-180' : ''}`} />
              </button>
              {showAnswer && <AnswerImage src={asset(problem.answer_image)} number={problem.number} />}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-ink-400">Ответа в сборнике нет.</p>
          )}
          <div className="mt-3 border-t border-line/70 pt-3">
            <AttemptButtons status={status} onChange={(s) => onStatus(problem.id, s)} />
          </div>
        </div>
      </div>
    </li>
  )
}

function LessonProblems({ lessonId }) {
  const { token } = useAuth()
  const { data, loading, error } = useAsync(() => listLessonProblems(lessonId, token), [lessonId, token])
  const [statuses, setStatuses] = useState({})
  if (loading) return <SkeletonLines count={4} className="mt-4" />
  if (error) return <p className="mt-3 text-[14px] text-ink-400">Не удалось загрузить задачи.</p>

  const onStatus = async (problemId, status) => {
    const res = await setProblemStatus(token, problemId, status)
    setStatuses((prev) => ({ ...prev, [problemId]: res.status }))
  }

  return (
    <div className="mt-3">
      <ol className="space-y-3">
        {data.problems.map((p) => (
          <ProblemItem
            key={p.id}
            problem={p}
            status={p.id in statuses ? statuses[p.id] : p.status}
            onStatus={onStatus}
          />
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

// «9, 10 класс» — подпись у темы и подтемы вместо прежнего деления на классы.
function gradesLabel(grades) {
  if (!grades || grades.length === 0) return null
  return `${grades.join(', ')} класс`
}
const SUBJECT_KEY = 'bvi_program_subject'

const SUBJECTS = {
  physics: {
    title: 'Физика',
    intro:
      'Весь курс одним списком, в порядке прохождения: крупная тема — подтемы внутри. У подтемы собраны задачи: свои, трёх уровней, и задачи из сборников. Теория — в разделе «Темы».',
    placeholder: 'Поиск по подтемам: линзы, Кирхгоф…',
  },
  math: {
    title: 'Математика',
    intro:
      'Черновик программы одним списком: к каждой подтеме — какие задачи решать в классических задачниках. Ссылки открывают нужную страницу официального PDF.',
    placeholder: 'Поиск по подтемам: Виета, инверсия…',
  },
}

function readSaved(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // localStorage недоступен — просто не запомним выбор
  }
}


function readSavedSubject() {
  const value = readSaved(SUBJECT_KEY)
  return value in SUBJECTS ? value : 'physics'
}

const refsWord = (n) => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'ссылка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ссылки'
  return 'ссылок'
}

const pdfPage = (url, page) => (url && page ? `${url}#page=${page}` : url)

function ReferenceItem({ reference, source }) {
  if (!source) return null
  const href = pdfPage(source.url, reference.page)
  const label = (
    <>
      <span className="font-semibold text-ink-700">{source.short_title || source.title}</span>
      {': '}
      {reference.locator}
      {reference.problems && <span className="tabular-nums">, задачи {reference.problems}</span>}
    </>
  )
  return (
    <li className="flex gap-2 text-[13px] leading-relaxed text-ink-500">
      <Icon name="book" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-300" />
      <span className="min-w-0">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="hover:text-pen-800 hover:underline">
            {label}
          </a>
        ) : (
          label
        )}
        {source.url && reference.solutions_page && (
          <>
            {' · '}
            <a
              href={pdfPage(source.url, reference.solutions_page)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-pen-700 hover:text-pen-900"
            >
              решения
            </a>
          </>
        )}
      </span>
    </li>
  )
}

function Literature({ sources }) {
  const groups = []
  for (const s of sources) {
    const key = s.category || 'Другое'
    const group = groups.find((g) => g.title === key)
    if (group) group.items.push(s)
    else groups.push({ title: key, items: [s] })
  }
  return (
    <section id="literature" className="scroll-mt-[240px] pt-12 lg:scroll-mt-[160px]">
      <p className="eyebrow mb-3">Литература</p>
      <h2 className="text-[24px] font-extrabold leading-tight sm:text-[28px]">Книги и сайты к программе</h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-500">
        Условия задач, рисунки и решения — в самих книгах: у подтем указано, какие параграфы и номера задач решать.
        Бесплатные PDF открываются на сайтах издательства и авторов.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-400">{g.title}</h3>
            <ul className="mt-3 space-y-3">
              {g.items.map((s) => (
                <li key={s.id} className="rounded-xl border border-line bg-white p-4">
                  <p className="text-[15px] font-bold leading-snug">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-pen-800 hover:underline">
                        {s.title}
                      </a>
                    ) : (
                      s.title
                    )}
                  </p>
                  {s.authors && (
                    <p className="mt-0.5 text-[13px] text-ink-500">
                      {s.authors}
                      {s.year ? `, ${s.year}` : ''}
                    </p>
                  )}
                  {s.annotation && <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{s.annotation}</p>}
                  <p className="mt-2 text-[12px] text-ink-400">
                    {s.license ? (
                      <>
                        Лицензия{' '}
                        {s.license_url ? (
                          <a href={s.license_url} target="_blank" rel="noreferrer" className="underline">
                            {s.license}
                          </a>
                        ) : (
                          s.license
                        )}
                        , задачи с ответами — прямо на сайте
                      </>
                    ) : (
                      s.access_note
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
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

/* «Открыть конспект» — большой конспект темы сразу на разделе подтемы. Открыт только
   вошедшим: гость по кнопке идёт на вход и после него попадает прямо в этот раздел. */
function FullConspectButton({ to }) {
  const { user } = useAuth()
  return (
    <button
      onClick={() => navigate(user ? to : `/login?next=${encodeURIComponent(to)}`)}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-700 hover:text-pen-900"
    >
      <Icon name="book" className="h-3.5 w-3.5" />
      Открыть конспект
      {!user && <span className="font-mono text-[11px] font-normal text-ink-300">после входа</span>}
    </button>
  )
}

function LessonRow({ lesson, topicTitle, sources, focused, conspectTo }) {
  const [open, setOpen] = useState(focused)
  useEffect(() => {
    if (focused) setOpen(true)
  }, [focused])
  return (
    <li
      id={lesson.id}
      className={`flex scroll-mt-[240px] gap-4 border-t border-line px-5 py-4 first:border-t-0 sm:px-6 lg:scroll-mt-[160px] ${
        focused ? 'bg-amber-50/60' : ''
      }`}
    >
      <span className="mt-0.5 grid h-7 min-w-[28px] shrink-0 place-items-center rounded-lg bg-paper px-1.5 text-[13px] font-bold tabular-nums text-ink-500">
        {lesson.number}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-[15px] font-bold leading-snug">
          {lesson.title}
          {gradesLabel(lesson.grades) && (
            <span className="ml-2 font-mono text-[12px] font-normal text-ink-300">
              {gradesLabel(lesson.grades)}
            </span>
          )}
        </h4>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-500">{lesson.description}</p>
        {lesson.references?.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {lesson.references.map((ref, i) => (
              <ReferenceItem key={i} reference={ref} source={sources[ref.source_id]} />
            ))}
          </ul>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {lesson.has_theory && (
            <Link
              to={`/theory/${lesson.id}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-pen-700"
            >
              <Icon name="book" className="h-3.5 w-3.5" />
              Конспект
            </Link>
          )}
          {conspectTo && <FullConspectButton to={conspectTo} />}
        </div>
        {(lesson.problem_count > 0 || lesson.topic_id) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
            {lesson.problem_count > 0 && (
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 rounded-full bg-mark-50 px-3 py-1 text-[13px] font-semibold text-mark-600 transition hover:bg-mark-100"
              >
                Задачи из сборника · {lesson.problem_count}
                <Icon name="chevronDown" className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
              </button>
            )}
            {lesson.topic_id && (
              <Link
                to={`/topic/${lesson.topic_id}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-700 hover:text-pen-900"
              >
                Задачи темы{lesson.task_count ? ` · ${lesson.task_count}` : ''}
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

function ModuleCard({ module, index, open, onToggle, topicTitle, sources, focusLesson, conspectFor }) {
  const count = module.lessons.length

  return (
    <section id={module.id} className="card scroll-mt-[150px] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-paper/60 sm:px-6"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pen-500">Тема {index + 1}</p>
          <h3 className="mt-1 text-[18px] font-extrabold leading-snug sm:text-[20px]">{module.title}</h3>
          <p className="mt-1 text-[13px] text-ink-400">
            {count} {lessonsWord(count)}
            {gradesLabel(module.grades) ? ` · ${gradesLabel(module.grades)}` : ''}
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
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              topicTitle={topicTitle(lesson.topic_id)}
              sources={sources}
              focused={lesson.id === focusLesson}
              conspectTo={conspectFor(lesson.id)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

// id подтемы вида «physics-kinematics-12» → предмет (класса в адресе больше нет).
function parseLessonId(id) {
  const m = /^(physics|math)-/.exec(id || '')
  return m ? { subject: m[1] } : null
}

export default function Program({ focusLesson = null }) {
  const focus = parseLessonId(focusLesson)
  const [subject, setSubject] = useState(() => focus?.subject || readSavedSubject())
  const { data, loading, error } = useAsync(
    () =>
      Promise.all([
        listCurriculum(subject),
        listTopics(),
        listLiterature(subject),
        // Без больших конспектов страница должна работать как раньше — ошибку не пробрасываем.
        listConspects(subject).catch(() => []),
      ]),
    [subject]
  )
  const [curriculum, topics, literature, conspects] = data || [[], [], [], []]
  // Подтема → адрес её раздела в большом конспекте темы. Разделы s1…sN идут в порядке подтем
  // темы (это сверяет scripts/load_conspects.py), поэтому считаем по полному списку, а не по
  // отфильтрованному поиском.
  const conspectLinks = useMemo(() => {
    const byModule = Object.fromEntries(
      conspects.filter((c) => c.module_id).map((c) => [c.module_id, c.number])
    )
    const links = {}
    for (const module of curriculum) {
      const number = byModule[module.id]
      if (number == null) continue
      module.lessons.forEach((lesson, i) => {
        links[lesson.id] = conspectPath(subject, number, `s${i + 1}`)
      })
    }
    return links
  }, [curriculum, conspects, subject])
  const sources = useMemo(() => Object.fromEntries(literature.map((s) => [s.id, s])), [literature])
  const meta = SUBJECTS[subject]

  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => {
    if (!focus) return
    setSubject(focus.subject)
    setQuery('')
  }, [focusLesson]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusLesson || loading) return
    requestAnimationFrame(() => document.getElementById(focusLesson)?.scrollIntoView({ block: 'start' }))
  }, [focusLesson, loading])

  const selectSubject = (value) => {
    setSubject(value)
    setQuery('')
    save(SUBJECT_KEY, value)
  }

  const topicTitle = (id) => (id ? topics.find((t) => t.id === id)?.title : null)

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

  const stats = useMemo(() => {
    if (!curriculum.length) return null
    const lessons = curriculum.flatMap((m) => m.lessons)
    return {
      modules: curriculum.length,
      lessons: lessons.length,
      withTasks: lessons.filter((l) => l.topic_id).length,
      problems: lessons.reduce((acc, l) => acc + (l.problem_count || 0), 0),
      references: lessons.reduce((acc, l) => acc + (l.references?.length || 0), 0),
    }
  }, [curriculum])

  const searching = query.trim().length > 0
  const shownLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)
  const allCollapsed = modules.length > 0 && modules.every((m) => collapsed[m.id])

  const setAll = (value) => setCollapsed(Object.fromEntries(modules.map((m) => [m.id, value])))

  const jumpTo = (id) => {
    setCollapsed((c) => ({ ...c, [id]: false }))
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="container-x relative py-10 lg:py-14">
      <div className="ruled-paper pointer-events-none absolute inset-x-0 top-0 h-56 -z-10" />
      <div className="max-w-3xl">
        <p className="eyebrow mb-3">Программа</p>
        <h1 className="font-serif text-[32px] font-semibold leading-tight sm:text-[40px]">
          {meta.title}: задачи по темам
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-500">{meta.intro}</p>
      </div>

      <div className="sticky top-[68px] z-30 -mx-5 mt-8 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-xl border border-line bg-white p-1">
              {Object.entries(SUBJECTS).map(([id, s]) => (
                <button
                  key={id}
                  onClick={() => selectSubject(id)}
                  className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
                    id === subject ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={meta.placeholder}
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-pen-400 sm:w-72"
          />
        </div>
      </div>

      {loading && <div className="pt-8"><SkeletonCards count={4} columns="" /></div>}
      {error && !loading && (
        <p className="py-16 text-center text-ink-400">Не удалось загрузить данные. Проверьте, что бэкенд запущен.</p>
      )}
      {!loading && !error && curriculum.length === 0 && (
        <p className="py-16 text-center text-ink-400">
          Программа пока не загружена в базу — запустите <code>python -m scripts.seed</code>.
        </p>
      )}

      {!loading && !error && curriculum.length > 0 && (
        <div className="grid gap-8 pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* Оглавление */}
          <aside className="hidden lg:block">
            <div className="sticky top-[160px]">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Темы программы
              </p>
              <ol className="mt-3 space-y-1">
                {curriculum.map((m, i) => (
                  <li key={m.id}>
                    <button
                      onClick={() => jumpTo(m.id)}
                      className="flex w-full items-baseline gap-2 rounded-lg px-2.5 py-2 text-left text-[14px] leading-snug text-ink-700 transition hover:bg-pen-50 hover:text-pen-800"
                    >
                      <span className="w-4 shrink-0 text-[12px] font-bold tabular-nums text-ink-300">{i + 1}</span>
                      <span className="flex-1">{m.title}</span>
                      <span className="shrink-0 text-[12px] tabular-nums text-ink-300">{m.lessons.length}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {literature.length > 0 && (
                <button
                  onClick={() => document.getElementById('literature')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg border-t border-line px-2.5 pb-2 pt-4 text-left text-[14px] font-semibold text-ink-700 transition hover:text-pen-800"
                >
                  <Icon name="book" className="h-4 w-4 text-ink-400" />
                  Литература · {literature.length}
                </button>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {searching ? (
                  <Chip className="bg-pen-50 text-pen-700">
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
                    <Chip className="bg-pen-50 text-pen-700">{stats.withTasks} с задачами на сайте</Chip>
                    {stats.problems > 0 && (
                      <Chip className="bg-mark-50 text-mark-600">
                        {stats.problems} {problemsWord(stats.problems)} из сборника
                      </Chip>
                    )}
                    {stats.references > 0 && (
                      <button onClick={() => document.getElementById('literature')?.scrollIntoView({ behavior: 'smooth' })}>
                        <Chip className="border border-line bg-white text-ink-700 hover:border-ink-300">
                          {stats.references} {refsWord(stats.references)} на литературу
                        </Chip>
                      </button>
                    )}
                  </>
                )}
              </div>
              {!searching && (
                <button
                  onClick={() => setAll(!allCollapsed)}
                  className="text-[14px] font-semibold text-pen-700 hover:text-pen-900"
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
                  index={curriculum.findIndex((x) => x.id === m.id)}
                  open={searching || !collapsed[m.id]}
                  onToggle={() => setCollapsed((c) => ({ ...c, [m.id]: !c[m.id] }))}
                  topicTitle={topicTitle}
                  sources={sources}
                  focusLesson={focusLesson}
                  conspectFor={(id) => conspectLinks[id]}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && literature.length > 0 && <Literature sources={literature} />}
    </div>
  )
}
