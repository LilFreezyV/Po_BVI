import React from 'react'
import { AUDIENCE, STEPS } from '../data/site.js'
import { listOlympiads, listPlans, listSections, listTopics, listUniversities } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Chip, Icon, Link, navigate } from '../components/ui.jsx'

// Локальный заголовок секции для лендинга — серифовый, с «§»-пометкой вместо
// обычного eyebrow. Не трогаем общий SectionHeading из ui.jsx: он используется
// на других страницах, которые пока не редизайним.
function Heading({ eyebrow, title, text, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className="mb-3 font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-pen-500">
          § {eyebrow}
        </p>
      )}
      <h2 className="font-serif text-[30px] font-medium leading-[1.15] sm:text-[38px]">{title}</h2>
      {text && <p className="mt-4 text-[17px] leading-relaxed text-ink-500">{text}</p>}
    </div>
  )
}

function FormulaTexture() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="grid-paper absolute inset-0" />
      <svg
        className="absolute right-[8%] top-[14%] h-20 w-20 text-pen-200/70 sm:h-24 sm:w-24"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d="M6 46 Q 22 10 58 18" strokeLinecap="round" />
        <path d="M46 10 L58 18 L48 26" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="absolute left-[3%] top-[48%] hidden select-none font-serif text-[88px] italic leading-none text-pen-100/80 sm:block">
        ∫
      </span>
      <span className="absolute right-[6%] bottom-[10%] hidden select-none font-mono text-[15px] text-pen-300/80 sm:block">
        v² = v₀² + 2as
      </span>
      <span className="absolute left-[8%] bottom-[16%] select-none font-mono text-[13px] text-pen-300/70 sm:left-[18%]">
        §1.1
      </span>
    </div>
  )
}

function MarkedWord({ children }) {
  return (
    <span className="relative whitespace-nowrap">
      <span className="relative z-10">{children}</span>
      <svg
        className="absolute inset-x-0 -bottom-1 h-[10px] w-full"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M1 6.5 Q 16 2 31 6 T 61 5.5 T 99 4.5"
          fill="none"
          stroke="#B23A2A"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

function Hero({ stats }) {
  return (
    <section className="relative overflow-hidden">
      <FormulaTexture />
      <div className="container-x grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <span className="chip border border-pen-100 bg-pen-50 font-mono text-[11px] font-medium text-pen-700">
            § Физика и математика · 10–11 класс
          </span>

          <h1 className="mt-6 font-serif text-[40px] font-medium leading-[1.08] sm:text-[54px] lg:text-[60px]">
            База вузов — получи своё <MarkedWord>БВИ</MarkedWord> в вуз мечты
          </h1>

          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-500">
            Перечневая олимпиада — самый короткий путь в МФТИ, ВШЭ или ИТМО: диплом призёра даёт поступление без
            вступительных испытаний. Мы показываем, какая олимпиада что даёт, и ведём по темам: конспект теории → задачи
            трёх уровней → прогресс.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary bg-pen-700 hover:bg-pen-800 active:bg-pen-900" onClick={() => navigate('/catalog')}>
              Начать подготовку
              <Icon name="arrow" className="h-[18px] w-[18px]" />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/base')}>
              Посмотреть базу вузов
            </button>
          </div>

          <p className="mt-4 text-sm text-ink-400">
            Без входного тестирования. База олимпиад и вузов доступна бесплатно.
          </p>

          <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-8 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-mono text-[26px] font-medium leading-none text-pen-700">{s.value}</dt>
                <dd className="mt-2 text-[13px] leading-snug text-ink-400">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroCard />
      </div>
    </section>
  )
}

function HeroCard() {
  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-400">§1.3 Механика</p>
            <p className="mt-1 font-serif text-[18px] font-medium">Импульс и столкновения</p>
          </div>
          <Chip className="bg-pen-50 text-pen-700">Физтех · Росатом</Chip>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-md bg-paper p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-400">Конспект</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-700">
              Импульс сохраняется, когда внешние силы пренебрежимо малы за время удара. Приём олимпиад — перейти в
              систему центра масс: там суммарный импульс равен нулю.
            </p>
          </div>

          {[
            { title: 'Лёгкий', done: 2, total: 2, cls: 'bg-pen-500' },
            { title: 'Средний', done: 2, total: 2, cls: 'bg-amber-600' },
            { title: 'Сложный', done: 0, total: 2, cls: 'bg-mark-500' },
          ].map((lvl) => (
            <div key={lvl.title} className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-[13px] font-semibold text-ink-700">{lvl.title}</span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/[0.07]">
                <div
                  className={`h-1.5 rounded-full ${lvl.cls}`}
                  style={{ width: `${(lvl.done / lvl.total) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-[13px] tabular-nums text-ink-400">
                {lvl.done}/{lvl.total}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-paper px-5 py-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-pen-700 text-white">
            <Icon name="spark" className="h-4 w-4" />
          </span>
          <p className="text-[13px] leading-snug text-ink-500">
            «Подбери 5 задач уровня отбора Физтеха» — ИИ-помощник соберёт подборку и проверит ваше решение
          </p>
        </div>
      </div>

      <div className="mt-4 flex w-full items-center gap-3 rounded-lg border border-line bg-white p-4 sm:w-auto sm:self-start">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-mark-50 text-mark-500">
          <Icon name="target" />
        </span>
        <div>
          <p className="text-[13px] font-bold leading-tight">До отбора Физтеха</p>
          <p className="font-mono text-[13px] text-ink-400">74 дня · 9 тем в плане</p>
        </div>
      </div>
    </div>
  )
}

function Audience() {
  return (
    <section className="container-x py-16 lg:py-24">
      <Heading
        eyebrow="Для кого это"
        title="Два пути к БВИ — и оба начинаются здесь"
        text="Неважно, решали вы олимпиадные задачи три года или открываете их впервые: структура одна, точка входа разная."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {AUDIENCE.map((a) => (
          <article key={a.id} className="flex flex-col rounded-lg border border-line bg-white p-6 sm:p-8">
            <Chip className="self-start border border-line bg-paper text-ink-500">{a.tag}</Chip>
            <h3 className="mt-4 font-serif text-[22px] font-medium leading-snug">{a.title}</h3>

            <ul className="mt-5 space-y-3">
              {a.pains.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink-500">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex gap-3 rounded-md bg-pen-50 p-4">
              <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-pen-600" />
              <p className="text-[15px] leading-relaxed text-pen-800">{a.gets}</p>
            </div>

            <Link
              to="/catalog"
              className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
            >
              Открыть каталог тем
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="border-y border-line bg-white">
      <div className="container-x py-16 lg:py-24">
        <Heading
          eyebrow="Как это работает"
          title="Никакого входного теста — понятный маршрут"
          text="Вы всегда видите, где находитесь: какая тема, какой уровень задач и сколько осталось до цели."
        />

        <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[15px] font-medium text-mark-500">{step.n}</span>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-line lg:block" />}
              </div>
              <h3 className="mt-3 font-serif text-[18px] font-medium leading-snug">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Bases({ olympiads, universities }) {
  return (
    <section className="container-x py-16 lg:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Heading
          eyebrow="База олимпиад и вузов"
          title="Сначала цель, потом подготовка"
          text="Мы держим в одном месте, какие перечневые олимпиады существуют и какие льготы они дают в конкретных вузах."
        />
        <Link
          to="/base"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
        >
          Вся база
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {olympiads.slice(0, 3).map((o) => (
          <article key={o.id} className="rounded-lg border border-line bg-white p-6 transition hover:shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[19px] font-bold">{o.title}</h3>
              <Chip className="bg-pen-50 text-pen-700">{o.level}</Chip>
            </div>
            <p className="mt-1.5 text-sm text-ink-400">{o.organizer}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-700">{o.perk}</p>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              {o.subjects.map((s) => (
                <Chip key={s} className="border border-line bg-paper text-ink-500">
                  {s === 'physics' ? 'Физика' : s === 'math' ? 'Математика' : s}
                </Chip>
              ))}
              <Chip className="border border-line bg-paper text-ink-500">{o.grades}</Chip>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {universities.slice(0, 3).map((u) => (
          <article key={u.id} className="flex items-start gap-4 rounded-lg border border-line bg-white p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-pen-700 font-mono text-[12px] font-medium text-white">
              {u.short}
            </span>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold leading-snug">{u.title}</h3>
              <p className="mt-1 text-sm text-ink-400">{u.city}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
                Принимает: {u.accepts.map((a) => a.title).join(' · ')}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Assistant() {
  return (
    <section className="border-y border-line bg-pen-900 text-white">
      <div className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-pen-300">§ ИИ-помощник</p>
          <h2 className="mt-3 font-serif text-[32px] font-medium leading-tight sm:text-[40px]">
            Спросить можно так же, как у репетитора
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-pen-100">
            Помощник знает каталог тем и задачи прошлых лет: соберёт подборку под ваш уровень, объяснит идею решения и
            найдёт шаг, на котором вы потеряли условие.
          </p>
          <button className="btn mt-8 bg-white text-pen-900 hover:bg-pen-50" onClick={() => navigate('/topic/kinematics')}>
            Посмотреть на примере темы
            <Icon name="arrow" className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { me: true, text: 'Подбери 5 задач по импульсу уровня отбора Физтеха' },
            {
              me: false,
              text: 'Собрала подборку: две на упругий удар, одна на центр масс и две на разрыв тела. Начните со второй — она ближе всего к формату Физтеха.',
            },
            { me: true, text: 'Проверь моё решение третьей задачи' },
            {
              me: false,
              text: 'Импульс записан верно, но в проекции на вертикальную ось потерян знак у скорости второго осколка — из-за этого ответ вдвое больше.',
            },
          ].map((m, i) => (
            <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] rounded-xl px-4 py-3 text-[15px] leading-relaxed ${
                  m.me ? 'bg-pen-600 text-white' : 'bg-white text-ink-700'
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing({ plans }) {
  return (
    <section id="pricing" className="container-x scroll-mt-24 py-16 lg:py-24">
      <Heading
        align="center"
        eyebrow="Тарифы"
        title="Сориентироваться — бесплатно, готовиться — по подписке"
        text="База олимпиад и вузов открыта всегда: понять свой маршрут можно, ничего не оплачивая."
      />

      <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex flex-col rounded-lg border p-7 sm:p-8 ${
              plan.accent ? 'border-pen-700 bg-white shadow-lift' : 'border-line bg-white shadow-card'
            }`}
          >
            {plan.accent && (
              <span className="absolute -top-3 left-7 rounded-full bg-pen-700 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                Популярный
              </span>
            )}
            <h3 className="text-[19px] font-bold">{plan.title}</h3>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-[34px] font-medium leading-none">{plan.price_display}</span>
              <span className="text-[15px] text-ink-400">{plan.period}</span>
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">{plan.summary}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                  <Icon name="check" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-pen-600" strokeWidth={2.2} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              className={`mt-8 w-full ${plan.accent ? 'btn-primary bg-pen-700 hover:bg-pen-800 active:bg-pen-900' : 'btn-secondary'}`}
              onClick={() => navigate(plan.accent ? '/progress' : '/catalog')}
            >
              {plan.cta}
            </button>
          </article>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-4xl text-center text-sm text-ink-400">
        Прототип: оплата не подключена, кнопки ведут внутрь продукта.
      </p>
    </section>
  )
}

function FinalCta({ sections }) {
  const physics = sections.filter((s) => s.subject === 'physics').length
  const math = sections.filter((s) => s.subject === 'math').length

  return (
    <section className="container-x pb-4">
      <div className="flex flex-col items-start gap-8 rounded-lg border border-line bg-white p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="font-serif text-[30px] font-medium leading-tight sm:text-[36px]">
            До отборочных этапов — меньше трёх месяцев
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
            {physics} разделов по физике и {math} по математике уже разложены по темам. Начните с той, которая западает
            сильнее всего.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button className="btn-primary bg-pen-700 hover:bg-pen-800 active:bg-pen-900" onClick={() => navigate('/catalog')}>
            Начать подготовку
            <Icon name="arrow" className="h-[18px] w-[18px]" />
          </button>
          <button className="btn-secondary" onClick={() => navigate('/progress')}>
            Посмотреть кабинет
          </button>
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const { data, loading } = useAsync(
    () => Promise.all([listTopics(), listOlympiads(), listUniversities(), listPlans(), listSections()]),
    []
  )
  const [topics, olympiads, universities, plans, sections] = data || [[], [], [], [], []]

  const stats = [
    { value: loading ? '—' : olympiads.length, label: 'перечневых олимпиад в базе' },
    { value: loading ? '—' : topics.length, label: 'тем по физике и математике' },
    { value: loading ? '—' : topics.length * 6, label: 'задач трёх уровней сложности' },
    { value: loading ? '—' : universities.length, label: 'вузов с разбором льгот' },
  ]

  return (
    <>
      <Hero stats={stats} />
      <Audience />
      <HowItWorks />
      {!loading && <Bases olympiads={olympiads} universities={universities} />}
      <Assistant />
      {!loading && plans.length > 0 && <Pricing plans={plans} />}
      {!loading && <FinalCta sections={sections} />}
    </>
  )
}
