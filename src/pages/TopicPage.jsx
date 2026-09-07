import React, { useMemo, useState } from 'react'
import { LEVELS, TOPICS, getSection, getTopic } from '../data/topics.js'
import { AI_SUGGESTIONS, OLYMPIADS, PROGRESS, STATUS_META } from '../data/site.js'
import { Chip, Icon, Link, ProgressBar, navigate } from '../components/ui.jsx'

const olympiad = (id) => OLYMPIADS.find((o) => o.id === id)

function TaskCard({ task, index }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex gap-4">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-paper text-[13px] font-bold text-ink-500">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-relaxed text-ink-900">{task.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[13px] text-ink-400">{task.source}</span>
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-900"
            >
              {open ? 'Скрыть подсказку' : 'Подсказка к решению'}
              <Icon name="chevronDown" className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {open && (
            <div className="mt-3 rounded-lg bg-paper p-4 text-[14px] leading-relaxed text-ink-500">
              Начните с рисунка и выпишите, что сохраняется. В прототипе здесь появляется полный разбор с шагами
              решения и типичными ошибками, а ниже — кнопка «проверить своё решение через ИИ-помощника».
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function LevelBlock({ level, tasks, locked }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <Chip className={`border ${level.badge}`}>{level.title} уровень</Chip>
          <span className="text-[14px] text-ink-400">{level.hint}</span>
        </div>
        <span className="text-[13px] text-ink-400">{tasks.length} задачи</span>
      </div>

      <div className="relative">
        <ul className={`space-y-3 p-4 sm:p-5 ${locked ? 'pointer-events-none select-none blur-[5px]' : ''}`}>
          {tasks.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i + 1} />
          ))}
        </ul>

        {locked && (
          <div className="absolute inset-0 grid place-items-center bg-white/60 p-6">
            <div className="max-w-sm text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name="lock" />
              </span>
              <p className="mt-4 text-[16px] font-bold">Доступно по подписке</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
                Средний и сложный уровни, полные разборы и ИИ-помощник открываются в платном тарифе.
              </p>
              <button className="btn-primary mt-5" onClick={() => navigate('/#pricing')}>
                Смотреть тарифы
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Assistant({ topic }) {
  const [messages, setMessages] = useState([
    {
      me: false,
      text: `Готова помочь с темой «${topic.title}». Могу подобрать задачи нужного уровня или разобрать ваше решение по шагам.`,
    },
  ])

  const ask = (text) => {
    setMessages((prev) => [
      ...prev,
      { me: true, text },
      {
        me: false,
        text: `Собрала ответ по теме «${topic.title}». В прототипе ответы заранее заготовлены: в рабочей версии помощник опирается на конспект темы и задачи прошлых лет.`,
      },
    ])
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-white">
          <Icon name="spark" className="h-4 w-4" />
        </span>
        <p className="text-[15px] font-bold">ИИ-помощник</p>
      </div>

      <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                m.me ? 'bg-brand-700 text-white' : 'bg-paper text-ink-700'
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {AI_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-[13px] font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TopicPage({ topicId }) {
  const topic = getTopic(topicId)
  const [pro, setPro] = useState(true)

  const neighbours = useMemo(() => {
    if (!topic) return { prev: null, next: null }
    const i = TOPICS.findIndex((t) => t.id === topic.id)
    return { prev: TOPICS[i - 1] || null, next: TOPICS[i + 1] || null }
  }, [topic])

  if (!topic) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-[18px] font-bold">Тема не найдена</p>
        <button className="btn-primary mt-6" onClick={() => navigate('/catalog')}>
          Вернуться в каталог
        </button>
      </div>
    )
  }

  const section = getSection(topic.sectionId)
  const subjectTitle = section.subject === 'physics' ? 'Физика' : 'Математика'
  const progress = PROGRESS[topic.id] || { status: 'new', percent: 0, solved: 0, total: 6 }
  const meta = STATUS_META[progress.status]
  const locked = !topic.free && !pro

  return (
    <div className="container-x py-8 lg:py-12">
      <nav className="flex flex-wrap items-center gap-2 text-[14px] text-ink-400">
        <Link to="/catalog" className="hover:text-ink-700">
          Каталог
        </Link>
        <Icon name="chevron" className="h-3.5 w-3.5" />
        <span>{subjectTitle}</span>
        <Icon name="chevron" className="h-3.5 w-3.5" />
        <span className="text-ink-700">{section.title}</span>
      </nav>

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className={meta.chip}>{meta.title}</Chip>
            <Chip className="border border-line bg-white text-ink-500">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {topic.minutes} мин
            </Chip>
            {topic.free && <Chip className="bg-brand-50 text-brand-700">Открытая тема</Chip>}
          </div>

          <h1 className="mt-4 text-[32px] font-extrabold leading-tight sm:text-[40px]">{topic.title}</h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-500">{topic.blurb}</p>

          {/* Конспект теории */}
          <section className="card mt-8 p-6 sm:p-8">
            <div className="flex items-center gap-2.5">
              <Icon name="book" className="h-5 w-5 text-brand-600" />
              <h2 className="text-[19px] font-bold">Конспект теории</h2>
            </div>

            <p className="mt-4 text-[16px] leading-relaxed text-ink-700">{topic.theory.summary}</p>

            <div className="mt-6 rounded-xl bg-paper p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Что нужно помнить</p>
              <ul className="mt-3 space-y-2.5">
                {topic.theory.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-5 text-[14px] leading-relaxed text-ink-400">
              В прототипе конспект сокращён. В продукте здесь полная выжимка, собранная из лучших учебников и
              задачников, с выводами формул и разбором типичных ошибок.
            </p>
          </section>

          {/* Задачи по уровням */}
          <div className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-extrabold">Задачи</h2>
                <p className="mt-1.5 text-[15px] text-ink-500">
                  Три уровня: от техники до задач заключительных этапов прошлых лет.
                </p>
              </div>
              <span className="text-[14px] text-ink-400">
                Решено {progress.solved} из {progress.total}
              </span>
            </div>

            <div className="mt-6 space-y-5">
              {LEVELS.map((level) => (
                <LevelBlock
                  key={level.id}
                  level={level}
                  tasks={topic.tasks[level.id]}
                  locked={locked && level.id !== 'easy'}
                />
              ))}
            </div>
          </div>

          {/* Переходы между темами */}
          <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
            {neighbours.prev ? (
              <Link
                to={`/topic/${neighbours.prev.id}`}
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-500 hover:text-brand-700"
              >
                <Icon name="chevron" className="h-4 w-4 rotate-180" />
                {neighbours.prev.title}
              </Link>
            ) : (
              <span />
            )}
            {neighbours.next && (
              <Link
                to={`/topic/${neighbours.next.id}`}
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-500 hover:text-brand-700"
              >
                {neighbours.next.title}
                <Icon name="chevron" className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Сайдбар */}
        <aside className="space-y-5 lg:sticky lg:top-[92px] lg:self-start">
          <div className="card p-5">
            <p className="text-[15px] font-bold">Прогресс по теме</p>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[30px] font-extrabold leading-none">{progress.percent}%</span>
              <span className="text-[13px] text-ink-400">
                {progress.solved}/{progress.total} задач
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={progress.percent} className={meta.bar} />
            </div>
            <button className="btn-secondary mt-5 w-full" onClick={() => navigate('/progress')}>
              Открыть кабинет
            </button>
          </div>

          <div className="card p-5">
            <p className="text-[15px] font-bold">Где встречается</p>
            <ul className="mt-4 space-y-3">
              {topic.olympiads.map((id) => {
                const o = olympiad(id)
                if (!o) return null
                return (
                  <li key={id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold">{o.title}</p>
                      <p className="text-[13px] text-ink-400">{o.organizer}</p>
                    </div>
                    <Chip className="shrink-0 bg-paper text-[11px] text-ink-500">{o.level}</Chip>
                  </li>
                )
              })}
            </ul>
            <Link
              to="/base"
              className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-700 hover:text-brand-900"
            >
              База олимпиад и вузов
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>

          <Assistant topic={topic} />

          <div className="rounded-2xl border border-dashed border-line p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={pro}
                onChange={(e) => setPro(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#1D473B]"
              />
              <span>
                <span className="block text-[14px] font-semibold">Режим подписчика</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-ink-400">
                  Снимите галочку, чтобы увидеть тему глазами бесплатного пользователя.
                </span>
              </span>
            </label>
          </div>
        </aside>
      </div>
    </div>
  )
}
