import React, { useEffect, useRef, useState } from 'react'
import { Icon, Link, PageHeader, navigate } from '../components/ui.jsx'

/* Демо-раздел «Экономика» (ветка demo-economics) — черновик для показа преподавателю.
   В меню его нет, открывается только по прямой ссылке #/economics. Контент намеренно лежит
   здесь, а не в БД: бэкенд и миграции демо не трогает, удаляется вместе с этим файлом. */

const RAZBOR_URL = 'economics/razbor-zadacha-8-konspekt.html'

const TASK_8 = {
  id: 'task-8',
  title: '№ 8. Временной лаг в налогообложении',
  author: 'Максим Земцов',
  source: 'Очный интенсив по экономике, Казань, осень 2026',
  intro:
    'В закрытой экономике домохозяйства склонны потреблять три четверти от своего располагаемого дохода и в дополнение к ним ещё 40 д.е., образующих автономное потребление. Инвестиционные расходы в этой экономике постоянны и равны 100 д.е., а государственные закупки фиксированы на уровне 60 д.е. Аккордные налоги, как и трансфертные выплаты, отсутствуют. В каждом периоде госбюджет пополняется исключительно из подоходных налогов, но в силу невысокой эффективности государственного администрирования подоходные налоги регулярно взимаются по ставке t·100% от совокупного дохода не текущего, а предыдущего периода.',
  parts: [
    ['а', 'При каких значениях налоговой ставки в этой экономике будет существовать стабильное стационарное состояние?'],
    ['б', 'Пусть в качестве подоходного налога отчисляется 20% дохода. Найдите равновесный выпуск в стабильном стационарном состоянии.'],
    ['в', 'В 2022 году в экономике, изначально находящейся в стабильном стационарном состоянии, произошёл негативный шок инвестиций: из-за внешнеполитических действий руководства страны они просели на 20 д.е. Шок является перманентным: иначе говоря, инвестиции снизились раз и навсегда. Найдите равновесный ВВП по итогам 2022 года, по итогам 2023 года и в новом стабильном стационарном состоянии, которого экономика достигнет со временем.'],
    ['г', 'Ответьте на вопросы пункта в), если шок является временным и длится один период: инвестиции, опустившись в 2022 году на 20 д.е., в 2023 году навсегда возвращаются на свой исходный уровень.'],
  ],
  answers: [
    ['а', '0 ≤ t < 1/3'],
    ['б', 'Y* = 500'],
    ['в', 'Y(2022) = 420, Y(2023) = 468, новое равновесие 450'],
    ['г', 'Y(2022) = 420, Y(2023) = 548, равновесие снова 500'],
  ],
}

const TOPICS = [
  { id: 'keynes', title: 'Макроэкономика: модель кейнсианского креста, мультипликаторы' },
  { id: 'lags', title: 'Макроэкономика: динамика и лаги', task: TASK_8 },
  { id: 'micro', title: 'Микроэкономика: налоги и рынки' },
]

const LAGS_TITLE = TOPICS[1].title
const num = (n) => String(n).padStart(2, '0')

function EconomicsSection() {
  return (
    <div className="container-x py-10 lg:py-14">
      <PageHeader
        eyebrow="Черновик раздела"
        title="Экономика"
        text="Олимпиадная экономика: задачи ВсОШ и интенсивов с пошаговыми разборами"
      />

      <div className="mt-10 max-w-3xl space-y-3">
        {TOPICS.map((topic, i) => (
          <section key={topic.id} className="card overflow-hidden">
            <div className="flex items-start gap-5 px-5 py-4 sm:px-6">
              <span className="font-mono text-[22px] font-semibold leading-none text-ink-300">{num(i + 1)}</span>
              <h2 className="min-w-0 flex-1 font-serif text-[20px] font-semibold leading-snug">{topic.title}</h2>
              {!topic.task && <span className="mt-1 shrink-0 font-mono text-[11px] text-ink-300">скоро</span>}
            </div>
            {topic.task && (
              <Link
                to={`/economics/${topic.task.id}`}
                className="group flex items-start gap-4 border-t border-line px-5 py-3.5 transition-colors hover:bg-pen-50/40 sm:px-6"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug group-hover:text-pen-700">
                    {topic.task.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-400">
                    {topic.task.author} · {topic.task.source}
                  </span>
                </span>
                <Icon name="arrow" className="mt-0.5 h-4 w-4 shrink-0 text-pen-400 transition group-hover:text-pen-700" />
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

/* Разбор — самостоятельная страница, встроена как есть. На широком экране у неё свой макет
   на всю высоту, поэтому высота рамки фиксирована. На узком (≤ 1000 пикселей, как в самом файле)
   страница растёт по содержимому — подгоняем рамку, чтобы не было второй прокрутки. */
function Razbor() {
  const frameRef = useRef(null)
  const observerRef = useRef(null)

  const onLoad = () => {
    const frame = frameRef.current
    const body = frame?.contentDocument?.body
    if (!body) return
    const fit = () => {
      const border = frame.offsetHeight - frame.clientHeight
      frame.style.height = frame.clientWidth > 1000 ? '' : `${body.offsetHeight + border}px`
    }
    observerRef.current?.disconnect()
    observerRef.current = new ResizeObserver(fit)
    observerRef.current.observe(body)
    observerRef.current.observe(frame)
    fit()
  }

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return (
    <iframe
      ref={frameRef}
      src={RAZBOR_URL}
      title="Пошаговый разбор задачи № 8"
      onLoad={onLoad}
      className="mt-4 block h-[760px] w-full rounded-lg border border-line bg-white"
    />
  )
}

function EconomicsTask({ task }) {
  const [answersOpen, setAnswersOpen] = useState(false)

  return (
    <div className="container-x py-8 lg:py-12">
      <nav className="flex flex-wrap items-center gap-2 text-[14px] text-ink-400">
        <Link to="/economics" className="hover:text-ink-700">
          Экономика
        </Link>
        <Icon name="chevron" className="h-3.5 w-3.5" />
        <span className="text-ink-700">{LAGS_TITLE}</span>
      </nav>

      <h1 className="mt-5 max-w-3xl font-serif text-[32px] font-semibold leading-tight sm:text-[40px]">{task.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
        Автор — {task.author} ({task.source})
      </p>

      <section className="card mt-8 max-w-3xl p-5 sm:p-6">
        <h2 className="text-[24px] font-extrabold">Условие</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-900">{task.intro}</p>
        <ol className="mt-4 space-y-3">
          {task.parts.map(([letter, text]) => (
            <li key={letter} className="flex gap-3 text-[15px] leading-relaxed text-ink-900">
              <span className="shrink-0 font-mono font-semibold text-pen-700">{letter})</span>
              <span className="min-w-0">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[24px] font-extrabold">Пошаговый разбор</h2>
          <a
            href={RAZBOR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-pen-700 hover:text-pen-900"
          >
            Открыть на весь экран
            <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>
        <Razbor />
      </section>

      <section className="card mt-10 max-w-3xl p-5 sm:p-6">
        <button
          onClick={() => setAnswersOpen((v) => !v)}
          aria-expanded={answersOpen}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-[24px] font-extrabold">Ответы</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-pen-700">
            {answersOpen ? 'Скрыть' : 'Показать'}
            <Icon name="chevronDown" className={`h-4 w-4 transition ${answersOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {answersOpen && (
          <ul className="mt-4 space-y-2 rounded-lg bg-paper p-4">
            {task.answers.map(([letter, text]) => (
              <li key={letter} className="flex gap-3 text-[15px] leading-relaxed text-ink-900">
                <span className="shrink-0 font-mono font-semibold text-pen-700">{letter})</span>
                <span className="min-w-0 font-mono text-[14px]">{text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-[14px] text-ink-400">Задача и разбор: {task.author}</p>
    </div>
  )
}

export default function Economics({ taskId }) {
  if (!taskId) return <EconomicsSection />
  if (taskId === TASK_8.id) return <EconomicsTask task={TASK_8} />
  return (
    <div className="container-x py-24 text-center">
      <p className="text-[18px] font-bold">Задача не найдена</p>
      <button className="btn-primary mt-6" onClick={() => navigate('/economics')}>
        Вернуться к разделу
      </button>
    </div>
  )
}
