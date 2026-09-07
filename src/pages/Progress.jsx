import React, { useMemo, useState } from 'react'
import { SECTIONS, TOPICS, getSection } from '../data/topics.js'
import { PROGRESS, STATUS_META, USER } from '../data/site.js'
import { Chip, Icon, Link, ProgressBar, navigate } from '../components/ui.jsx'

const FILTERS = [
  { id: 'all', label: 'Все темы' },
  { id: 'progress', label: 'В процессе' },
  { id: 'new', label: 'Не начато' },
  { id: 'done', label: 'Пройдено' },
]

const statusOf = (id) => PROGRESS[id]?.status || 'new'

function subjectStats(subject) {
  const ids = SECTIONS.filter((s) => s.subject === subject).map((s) => s.id)
  const topics = TOPICS.filter((t) => ids.includes(t.sectionId))
  const percent = Math.round(topics.reduce((acc, t) => acc + (PROGRESS[t.id]?.percent || 0), 0) / topics.length)
  const done = topics.filter((t) => statusOf(t.id) === 'done').length
  return { percent, done, total: topics.length }
}

function StatCard({ value, label, hint, accent = 'text-ink-900' }) {
  return (
    <div className="card p-5">
      <p className={`text-[30px] font-extrabold leading-none ${accent}`}>{value}</p>
      <p className="mt-2 text-[15px] font-semibold">{label}</p>
      {hint && <p className="mt-1 text-[13px] text-ink-400">{hint}</p>}
    </div>
  )
}

function TopicRow({ topic }) {
  const p = PROGRESS[topic.id] || { status: 'new', percent: 0, solved: 0, total: 6 }
  const meta = STATUS_META[p.status]

  return (
    <Link
      to={`/topic/${topic.id}`}
      className="flex flex-col gap-3 border-b border-line px-1 py-4 transition last:border-0 hover:bg-brand-50/40 sm:flex-row sm:items-center sm:gap-5 sm:px-3"
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{topic.title}</span>
        <span className="mt-0.5 block text-[13px] text-ink-400">{getSection(topic.sectionId).title}</span>
      </span>
      <span className="flex items-center gap-4 sm:w-64">
        <span className="w-full">
          <ProgressBar value={p.percent} className={meta.bar} height="h-1.5" />
        </span>
        <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-ink-400">
          {p.solved}/{p.total}
        </span>
      </span>
      <Chip className={`shrink-0 ${meta.chip} hidden sm:inline-flex`}>{meta.title}</Chip>
    </Link>
  )
}

export default function ProgressPage() {
  const [filter, setFilter] = useState('all')

  const counts = useMemo(() => {
    const base = { done: 0, progress: 0, new: 0 }
    TOPICS.forEach((t) => {
      base[statusOf(t.id)] += 1
    })
    return base
  }, [])

  const solved = useMemo(() => Object.values(PROGRESS).reduce((acc, p) => acc + p.solved, 0), [])
  const totalTasks = useMemo(() => Object.values(PROGRESS).reduce((acc, p) => acc + p.total, 0), [])

  const physics = subjectStats('physics')
  const math = subjectStats('math')

  const visible = TOPICS.filter((t) => filter === 'all' || statusOf(t.id) === filter)

  const recommended = TOPICS.filter((t) => statusOf(t.id) === 'progress').slice(0, 3)

  return (
    <div className="container-x py-10 lg:py-14">
      {/* Шапка кабинета */}
      <div className="card flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-700 text-[18px] font-extrabold text-white">
            АС
          </span>
          <div>
            <h1 className="text-[24px] font-extrabold leading-tight sm:text-[28px]">{USER.name}</h1>
            <p className="mt-1 text-[15px] text-ink-500">
              {USER.grade} · цель: <span className="font-semibold text-ink-900">{USER.goal}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 lg:gap-10">
          <div>
            <p className="text-[13px] text-ink-400">Целевые олимпиады</p>
            <p className="mt-1 text-[15px] font-semibold">{USER.target}</p>
          </div>
          <div>
            <p className="text-[13px] text-ink-400">До отборочного этапа</p>
            <p className="mt-1 text-[15px] font-semibold">{USER.daysLeft} дня</p>
          </div>
          <div>
            <p className="text-[13px] text-ink-400">Тариф</p>
            <p className="mt-1 text-[15px] font-semibold">{USER.plan}</p>
          </div>
        </div>
      </div>

      {/* Цифры */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={counts.done} label="Тем пройдено" hint={`из ${TOPICS.length} в каталоге`} accent="text-brand-700" />
        <StatCard value={counts.progress} label="В процессе" hint="есть незакрытые уровни" accent="text-amber-600" />
        <StatCard value={counts.new} label="Не начато" hint="ждут в плане подготовки" accent="text-ink-400" />
        <StatCard value={`${solved}/${totalTasks}`} label="Задач решено" hint={`серия ${USER.streak} дней подряд`} />
      </div>

      {/* Прогресс по предметам */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          { title: 'Физика', data: physics, cls: 'bg-brand-500' },
          { title: 'Математика', data: math, cls: 'bg-clay-400' },
        ].map((s) => (
          <div key={s.title} className="card p-6">
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-bold">{s.title}</p>
              <span className="text-[15px] font-semibold text-ink-500">{s.data.percent}%</span>
            </div>
            <div className="mt-4">
              <ProgressBar value={s.data.percent} className={s.cls} height="h-2" />
            </div>
            <p className="mt-3 text-[14px] text-ink-400">
              Пройдено {s.data.done} из {s.data.total} тем
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        {/* Список тем */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-[22px] font-extrabold">Темы</h2>
            <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                    filter === f.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card mt-5 px-2 py-1 sm:px-3">
            {visible.map((topic) => (
              <TopicRow key={topic.id} topic={topic} />
            ))}
            {visible.length === 0 && <p className="py-10 text-center text-ink-400">В этой группе пока пусто.</p>}
          </div>
        </div>

        {/* Сайдбар */}
        <aside className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <Icon name="target" className="h-5 w-5 text-clay-500" />
              <p className="text-[15px] font-bold">Продолжить</p>
            </div>
            <ul className="mt-4 space-y-3">
              {recommended.map((t) => {
                const p = PROGRESS[t.id]
                return (
                  <li key={t.id}>
                    <Link to={`/topic/${t.id}`} className="block rounded-xl bg-paper p-4 transition hover:bg-brand-50">
                      <p className="text-[15px] font-semibold">{t.title}</p>
                      <p className="mt-1 text-[13px] text-ink-400">
                        {getSection(t.sectionId).title} · осталось {p.total - p.solved} задачи
                      </p>
                      <div className="mt-3">
                        <ProgressBar value={p.percent} className="bg-amber-600" height="h-1" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <Icon name="layers" className="h-5 w-5 text-brand-600" />
              <p className="text-[15px] font-bold">План под цель</p>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
              Для БВИ в {USER.goal} нужен диплом призёра Физтеха или Росатома по физике и подтверждение ЕГЭ от 75
              баллов.
            </p>
            <button className="btn-secondary mt-4 w-full" onClick={() => navigate('/base')}>
              Проверить условия вуза
            </button>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <Icon name="chart" className="h-5 w-5 text-brand-600" />
              <p className="text-[15px] font-bold">Слабые места</p>
            </div>
            <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-ink-500">
              <li>Сложный уровень в «Постоянном токе» — 1 задача из 2 не решена</li>
              <li>Стереометрия не начата, а на Физтехе встречается ежегодно</li>
              <li>Диофантовы уравнения — прогресс 17%</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
