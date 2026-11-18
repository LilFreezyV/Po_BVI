import React, { useEffect, useState } from 'react'
import { LEVELS } from '../data/topics.js'
import { STATUS_META } from '../data/site.js'
import { getTopic as fetchTopic, setTaskStatus } from '../lib/api.js'
import AttemptButtons, { ATTEMPT_CARD } from '../components/AttemptButtons.jsx'
import TopicAssistant from '../components/TopicAssistant.jsx'
import { useAsync } from '../lib/useAsync.js'
import { useAuth } from '../lib/auth.jsx'
import { LEVEL_LABEL } from '../lib/olympiadLevels.js'
import { Chip, Icon, Link, ProgressBar, Skeleton, SkeletonLines, navigate } from '../components/ui.jsx'

function TaskCard({ task, index, status, onStatus, assistantTo }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={`rounded-xl border p-4 transition sm:p-5 ${ATTEMPT_CARD[status] || 'border-line bg-white'}`}>
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
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-700 hover:text-pen-900"
            >
              {open ? 'Скрыть подсказку' : 'Подсказка к решению'}
              <Icon name="chevronDown" className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {open && (
            <div className="mt-3 rounded-lg bg-paper p-4 text-[14px] leading-relaxed text-ink-500">
              {task.hint || 'Подсказка появится в следующих обновлениях.'}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/70 pt-3">
            <AttemptButtons status={status} onChange={(s) => onStatus(task.id, s)} />
            {assistantTo && !task.locked && task.text && (
              <Link to={assistantTo(task.id)} className="rounded text-sm font-semibold text-pen-700 hover:underline focus-visible:outline-pen-500">
                Разобрать с помощником
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function LevelBlock({ level, tasks, statusOf, onStatus, assistantTo }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <Chip className={`border ${level.badge}`}>{level.title} уровень</Chip>
          <span className="text-[14px] text-ink-400">{level.hint}</span>
        </div>
        <span className="text-[13px] text-ink-400">{tasks.length} задачи</span>
      </div>

      <ul className="space-y-3 p-4 sm:p-5">
        {tasks.map((task, i) => (
          <TaskCard key={task.id} task={task} index={i + 1} status={statusOf(task)} onStatus={onStatus} assistantTo={assistantTo} />
        ))}
      </ul>
    </section>
  )
}

export default function TopicPage({ topicId, assistantTarget }) {
  const { token, user, authLoading } = useAuth()
  const { data: topic, loading, error } = useAsync(() => fetchTopic(topicId, token), [topicId, token])
  // Отметки и прогресс после нажатий — поверх загруженной темы, без перезагрузки страницы.
  const [statuses, setStatuses] = useState({})
  const [progressOverride, setProgressOverride] = useState(null)

  useEffect(() => {
    setStatuses({})
    setProgressOverride(null)
  }, [topic])

  const statusOf = (task) => (task.id in statuses ? statuses[task.id] : task.status)

  const onStatus = async (taskId, status) => {
    const res = await setTaskStatus(token, taskId, status)
    setStatuses((prev) => ({ ...prev, [taskId]: res.status }))
    setProgressOverride(res.topic_progress)
  }

  if (loading) {
    return (
      <div className="container-x py-10 lg:py-14">
        <Skeleton className="h-8 w-2/3 max-w-lg" />
        <SkeletonLines count={6} className="mt-8 max-w-2xl" />
      </div>
    )
  }

  if (error?.status === 404 || (!loading && !topic)) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-[18px] font-bold">Тема не найдена</p>
        <button className="btn-primary mt-6" onClick={() => navigate('/catalog')}>
          Вернуться в каталог
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-[18px] font-bold">Не удалось загрузить тему</p>
        <p className="mt-2 text-ink-400">Проверьте, что бэкенд запущен, и обновите страницу.</p>
      </div>
    )
  }

  const progress = progressOverride || topic.progress
  const meta = STATUS_META[progress.status]
  const topicPath = `/topic/${topic.id}`
  const assistantTask = assistantTarget
    ? Object.values(topic.tasks).flat().find((task) => task.id === assistantTarget && !task.locked && task.text)
    : undefined
  const assistantTo = (target) => {
    const path = `${topicPath}?assistant=${encodeURIComponent(target)}`
    return user ? path : `/login?next=${encodeURIComponent(path)}`
  }

  return (
    <div className="container-x py-8 lg:py-12">
      <nav className="flex flex-wrap items-center gap-2 text-[14px] text-ink-400">
        <Link to="/catalog" className="hover:text-ink-700">
          Каталог
        </Link>
        <Icon name="chevron" className="h-3.5 w-3.5" />
        <span>{topic.subject === 'physics' ? 'Физика' : 'Математика'}</span>
        <Icon name="chevron" className="h-3.5 w-3.5" />
        <span className="text-ink-700">{topic.section_title}</span>
      </nav>

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className={meta.chip}>{meta.title}</Chip>
            <Chip className="border border-line bg-white text-ink-500">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {topic.minutes} мин
            </Chip>
          </div>

          <h1 className="mt-4 font-serif text-[32px] font-semibold leading-tight sm:text-[40px]">
            Задачи: {topic.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-500">{topic.blurb}</p>

          {/* Конспект теории переехал к подтемам программы (#/theory/<подтема>) —
              здесь страница только про задачи, см. CLAUDE.md, решение 2026-10-22. */}

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
                  statusOf={statusOf}
                  onStatus={onStatus}
                  assistantTo={authLoading ? undefined : assistantTo}
                />
              ))}
            </div>
          </div>

          {/* Переходы между темами */}
          <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
            {topic.prev_topic_id ? (
              <Link
                to={`/topic/${topic.prev_topic_id}`}
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-500 hover:text-pen-700"
              >
                <Icon name="chevron" className="h-4 w-4 rotate-180" />
                Предыдущая тема
              </Link>
            ) : (
              <span />
            )}
            {topic.next_topic_id && (
              <Link
                to={`/topic/${topic.next_topic_id}`}
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-500 hover:text-pen-700"
              >
                Следующая тема
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
              {topic.olympiads.map((o) => (
                <li key={o.id}>
                  <Link to={`/bvi#oly-${o.id}`} className="flex items-start justify-between gap-3 hover:text-pen-800">
                    <div>
                      <p className="text-[15px] font-semibold">{o.title}</p>
                      <p className="text-[13px] text-ink-400">{o.organizer}</p>
                    </div>
                    <Chip className="shrink-0 bg-paper text-[11px] text-ink-500">{LEVEL_LABEL[o.level] || o.level}</Chip>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/bvi"
              className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-pen-700 hover:text-pen-900"
            >
              Какая олимпиада даёт БВИ
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>

          {!authLoading && (
            <section className="card p-5" aria-labelledby="topic-assistant-launcher">
              <h2 id="topic-assistant-launcher" className="font-sans text-base font-semibold tracking-normal">Помощник по задачам</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {user ? 'Задайте вопрос по теме или откройте разбор из карточки задачи.' : 'Войдите, чтобы задать вопрос о ходе решения.'}
              </p>
              <Link to={assistantTo('topic')} className="btn-secondary mt-4 w-full">
                {user ? 'Задать вопрос по теме' : 'Войти к помощнику'}
              </Link>
            </section>
          )}
        </aside>
      </div>
      {user && (
        <TopicAssistant key={user.id} open={assistantTarget === 'topic' || Boolean(assistantTask)}
          topicTitle={topic.title} task={assistantTask} onDismiss={() => window.location.replace(`#${topicPath}`)} />
      )}
    </div>
  )
}
