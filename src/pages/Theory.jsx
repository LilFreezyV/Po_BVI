import React from 'react'
import { motion } from 'framer-motion'
import { getLessonTheory } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Chip, Icon, Link, SkeletonLines, navigate } from '../components/ui.jsx'
import { EASE, Reveal, Stagger, staggerItem } from '../components/motion.jsx'
import TheoryFigure from '../components/TheoryFigure.jsx'

/* Конспект подтемы: объяснение + тезисы + анимация приёма.
   Задач здесь нет намеренно — решают в разделе «Задачи по темам» (#/program),
   отсюда туда ведёт кнопка. */

const gradesLabel = (grades) => (grades?.length ? `${grades.join(', ')} класс` : null)

export default function Theory({ lessonId }) {
  const { data, loading, error } = useAsync(() => getLessonTheory(lessonId), [lessonId])

  if (loading) {
    return (
      <div className="container-x py-10 lg:py-14">
        <SkeletonLines count={3} className="max-w-xl" />
        <div className="mt-8 h-[220px] rounded-lg bg-ink-900/[0.05]" />
        <SkeletonLines count={6} className="mt-8 max-w-2xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-ink-400">Конспект не найден.</p>
        <Link to="/catalog" className="mt-4 inline-block font-semibold text-pen-700">
          Ко всем темам
        </Link>
      </div>
    )
  }

  const empty = !data.summary

  return (
    <div className="container-x relative py-10 lg:py-14">
      <div className="ruled-paper pointer-events-none absolute inset-x-0 top-0 h-48 -z-10" />

      <nav className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-ink-400">
        <Link to="/catalog" className="hover:text-pen-700">
          Темы
        </Link>
        <span>/</span>
        <Link to={`/catalog#${data.module_id}`} className="hover:text-pen-700">
          {data.module_title}
        </Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="font-serif text-[30px] font-semibold leading-tight sm:text-[38px]"
          >
            {data.title}
          </motion.h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {gradesLabel(data.grades) && (
              <Chip className="border border-line bg-white text-ink-500">{gradesLabel(data.grades)}</Chip>
            )}
            <Chip className="bg-pen-50 text-pen-700">Конспект открыт всем</Chip>
          </div>

          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-500">{data.description}</p>

          {empty ? (
            <div className="card mt-8 border-dashed p-6">
              <p className="text-[15px] leading-relaxed text-ink-500">
                Конспект этой подтемы ещё пишется. Пока можно разобрать её по задачам — они уже
                разложены по программе.
              </p>
            </div>
          ) : (
            <>
              <Reveal className="mt-8">
                <p className="eyebrow mb-3">В чём суть</p>
                <p className="max-w-2xl text-[17px] leading-relaxed text-ink-900">{data.summary}</p>
              </Reveal>

              {data.points.length > 0 && (
                <section className="mt-10">
                  <p className="eyebrow mb-4">Что помнить</p>
                  <Stagger className="space-y-3">
                    {data.points.map((point, i) => (
                      <motion.div
                        key={i}
                        variants={staggerItem}
                        className="card flex gap-4 p-4 sm:p-5"
                      >
                        <span className="mt-0.5 font-mono text-[12px] text-ink-300">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="text-[15px] leading-relaxed text-ink-700">{point}</p>
                      </motion.div>
                    ))}
                  </Stagger>
                </section>
              )}
            </>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            {data.task_count > 0 && (
              <button className="btn-primary" onClick={() => navigate(`/topic/${data.topic_id}`)}>
                Решать задачи · {data.task_count}
              </button>
            )}
            {data.problem_count > 0 && (
              <button
                className="btn-secondary"
                onClick={() => navigate(`/program?lesson=${data.id}`)}
              >
                Задачи из сборника · {data.problem_count}
              </button>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
            {data.prev_id ? (
              <Link
                to={`/theory/${data.prev_id}`}
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
              >
                <Icon name="chevron" className="h-4 w-4 rotate-180" />
                Предыдущая
              </Link>
            ) : (
              <span />
            )}
            {data.next_id && (
              <Link
                to={`/theory/${data.next_id}`}
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
              >
                Следующая
                <Icon name="chevron" className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-[96px]">
          <TheoryFigure name={data.figure} />
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-300">
            § {data.module_title}
          </p>
        </aside>
      </div>
    </div>
  )
}
