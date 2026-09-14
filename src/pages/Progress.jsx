import React, { useMemo, useState } from 'react'
import {
  listSections,
  listTopics,
  progressContinue,
  progressOverview,
  progressSubjects,
  progressWeakSpots,
} from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { useAuth } from '../lib/auth.jsx'
import { STATUS_META } from '../data/site.js'
import { SUBJECT_LABELS } from '../lib/subjects.js'
import { Chip, Icon, Link, ProgressBar, navigate } from '../components/ui.jsx'

const FILTERS = [
  { id: 'all', label: 'Все темы' },
  { id: 'progress', label: 'В процессе' },
  { id: 'new', label: 'Не начато' },
  { id: 'done', label: 'Пройдено' },
]

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase())
  return letters.join('') || '?'
}

function planLabel(user) {
  if (!user.subscription_active) return 'Бесплатный тариф'
  if (!user.subscription_expires_at) return 'Подписка активна'
  const date = new Date(user.subscription_expires_at).toLocaleDateString('ru-RU')
  return `Подписка активна до ${date}`
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

function TopicRow({ topic, sectionTitle }) {
  const meta = STATUS_META[topic.progress.status]

  return (
    <Link
      to={`/topic/${topic.id}`}
      className="flex flex-col gap-3 border-b border-line px-1 py-4 transition last:border-0 hover:bg-brand-50/40 sm:flex-row sm:items-center sm:gap-5 sm:px-3"
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{topic.title}</span>
        <span className="mt-0.5 block text-[13px] text-ink-400">{sectionTitle}</span>
      </span>
      <span className="flex items-center gap-4 sm:w-64">
        <span className="w-full">
          <ProgressBar value={topic.progress.percent} className={meta.bar} height="h-1.5" />
        </span>
        <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-ink-400">
          {topic.progress.solved}/{topic.progress.total}
        </span>
      </span>
      <Chip className={`shrink-0 ${meta.chip} hidden sm:inline-flex`}>{meta.title}</Chip>
    </Link>
  )
}

function LoginGate() {
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon name="lock" />
        </span>
        <h1 className="mt-4 text-[22px] font-extrabold">Личный кабинет — только для своих</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
          Войдите или зарегистрируйтесь, чтобы видеть свой прогресс по темам и рекомендации.
        </p>
        <button className="btn-primary mt-6 w-full" onClick={() => navigate('/login')}>
          Войти или зарегистрироваться
        </button>
      </div>
    </div>
  )
}

function CabinetContent({ user }) {
  const [filter, setFilter] = useState('all')
  const { token } = useAuth()

  const { data, loading, error } = useAsync(
    () =>
      Promise.all([
        listTopics(token),
        listSections(),
        progressSubjects(token),
        progressOverview(token),
        progressContinue(token),
        progressWeakSpots(token),
      ]),
    [token]
  )

  const sectionTitleOf = useMemo(() => {
    const map = new Map((data?.[1] || []).map((s) => [s.id, s.title]))
    return (sectionId) => map.get(sectionId) || ''
  }, [data])

  if (loading) {
    return <p className="py-24 text-center text-ink-400">Загружаем кабинет…</p>
  }
  if (error) {
    return (
      <p className="py-24 text-center text-ink-400">Не удалось загрузить данные. Проверьте, что бэкенд запущен.</p>
    )
  }

  const [topics, , subjects, overview, continueList, weakSpots] = data
  const totalTopics = overview.done + overview.progress + overview.new
  const visible = topics.filter((t) => filter === 'all' || t.progress.status === filter)
  const physics = subjects.find((s) => s.subject === 'physics') || { percent: 0, done: 0, total: 0 }
  const math = subjects.find((s) => s.subject === 'math') || { percent: 0, done: 0, total: 0 }

  return (
    <div className="container-x py-10 lg:py-14">
      {/* Шапка кабинета */}
      <div className="card flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-700 text-[18px] font-extrabold text-white">
            {initials(user.name)}
          </span>
          <div>
            <h1 className="text-[24px] font-extrabold leading-tight sm:text-[28px]">{user.name}</h1>
            <p className="mt-1 text-[15px] text-ink-500">
              {user.grade || 'Класс не указан'} · цель:{' '}
              <span className="font-semibold text-ink-900">{user.goal || 'не указана'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 lg:gap-10">
          <div>
            <p className="text-[13px] text-ink-400">Целевые олимпиады</p>
            <p className="mt-1 text-[15px] font-semibold">{user.target || 'не указаны'}</p>
          </div>
          <div>
            <p className="text-[13px] text-ink-400">Тариф</p>
            <p className="mt-1 text-[15px] font-semibold">{planLabel(user)}</p>
          </div>
        </div>
      </div>

      {/* Цифры */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={overview.done} label="Тем пройдено" hint={`из ${totalTopics} в каталоге`} accent="text-brand-700" />
        <StatCard value={overview.progress} label="В процессе" hint="есть незакрытые уровни" accent="text-amber-600" />
        <StatCard value={overview.new} label="Не начато" hint="ждут в плане подготовки" accent="text-ink-400" />
        <StatCard value={`${overview.solved_tasks}/${overview.total_tasks}`} label="Задач решено" />
      </div>

      {/* Прогресс по предметам */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          { title: SUBJECT_LABELS.physics, data: physics, cls: 'bg-brand-500' },
          { title: SUBJECT_LABELS.math, data: math, cls: 'bg-clay-400' },
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
              <TopicRow key={topic.id} topic={topic} sectionTitle={sectionTitleOf(topic.section_id)} />
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
            {continueList.length === 0 ? (
              <p className="mt-4 text-[14px] leading-relaxed text-ink-400">
                Начните любую тему — она появится здесь, пока не будет пройдена целиком.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {continueList.map((t) => (
                  <li key={t.topic_id}>
                    <Link
                      to={`/topic/${t.topic_id}`}
                      className="block rounded-xl bg-paper p-4 transition hover:bg-brand-50"
                    >
                      <p className="text-[15px] font-semibold">{t.title}</p>
                      <p className="mt-1 text-[13px] text-ink-400">
                        {t.section_title} · осталось {t.remaining} задачи
                      </p>
                      <div className="mt-3">
                        <ProgressBar value={t.percent} className="bg-amber-600" height="h-1" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2.5">
              <Icon name="layers" className="h-5 w-5 text-brand-600" />
              <p className="text-[15px] font-bold">План под цель</p>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
              Для БВИ в {user.goal || 'выбранный вуз'} нужен диплом призёра Физтеха или Росатома по физике и
              подтверждение ЕГЭ от 75 баллов.
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
            {weakSpots.length === 0 ? (
              <p className="mt-4 text-[14px] leading-relaxed text-ink-400">
                Пока не над чем работать — начните хотя бы одну тему.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-ink-500">
                {weakSpots.map((w) => (
                  <li key={w.topic_id}>
                    «{w.title}» — {w.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const { user, authLoading } = useAuth()

  if (authLoading) {
    return <p className="py-24 text-center text-ink-400">Проверяем сессию…</p>
  }
  if (!user) {
    return <LoginGate />
  }
  return <CabinetContent user={user} />
}
