import React from 'react'
import { AUDIENCE, STEPS } from '../data/site.js'
import { listOlympiads, listPlans, listSections, listTopics, listUniversities } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Chip, Icon, Link, ProgressBar, SectionHeading, navigate } from '../components/ui.jsx'

function Hero({ stats }) {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-paper pointer-events-none absolute inset-0 -z-10" />
      <div className="container-x grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-20">
        <div>
          <span className="chip border border-brand-100 bg-brand-50 text-brand-700">
            Физика и математика · 10–11 класс
          </span>

          <h1 className="mt-6 text-[38px] font-extrabold leading-[1.06] sm:text-[52px] lg:text-[58px]">
            База вузов — получи своё{' '}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">БВИ</span>
              <span className="absolute inset-x-0 bottom-1.5 z-0 h-3 bg-clay-100" />
            </span>{' '}
            в вуз мечты
          </h1>

          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-500">
            Перечневая олимпиада — самый короткий путь в МФТИ, ВШЭ или ИТМО: диплом призёра даёт поступление без
            вступительных испытаний. Мы показываем, какая олимпиада что даёт, и ведём по темам: конспект теории → задачи
            трёх уровней → прогресс.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary" onClick={() => navigate('/catalog')}>
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
                <dt className="text-[26px] font-extrabold leading-none text-brand-700">{s.value}</dt>
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
      <div className="card overflow-hidden shadow-lift">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Механика</p>
            <p className="mt-1 text-[17px] font-bold">Импульс и столкновения</p>
          </div>
          <Chip className="bg-brand-50 text-brand-700">Физтех · Росатом</Chip>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl bg-paper p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Конспект</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-700">
              Импульс сохраняется, когда внешние силы пренебрежимо малы за время удара. Приём олимпиад — перейти в
              систему центра масс: там суммарный импульс равен нулю.
            </p>
          </div>

          {[
            { title: 'Лёгкий', done: 2, total: 2, cls: 'bg-brand-500' },
            { title: 'Средний', done: 2, total: 2, cls: 'bg-amber-600' },
            { title: 'Сложный', done: 0, total: 2, cls: 'bg-clay-500' },
          ].map((lvl) => (
            <div key={lvl.title} className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-[13px] font-semibold text-ink-700">{lvl.title}</span>
              <ProgressBar value={(lvl.done / lvl.total) * 100} className={lvl.cls} />
              <span className="w-10 shrink-0 text-right text-[13px] tabular-nums text-ink-400">
                {lvl.done}/{lvl.total}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-paper px-5 py-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-700 text-white">
            <Icon name="spark" className="h-4 w-4" />
          </span>
          <p className="text-[13px] leading-snug text-ink-500">
            «Подбери 5 задач уровня отбора Физтеха» — ИИ-помощник соберёт подборку и проверит ваше решение
          </p>
        </div>
      </div>

      <div className="card mt-4 flex w-full items-center gap-3 p-4 sm:w-auto sm:self-start">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-clay-50 text-clay-500">
          <Icon name="target" />
        </span>
        <div>
          <p className="text-[13px] font-bold leading-tight">До отбора Физтеха</p>
          <p className="text-[13px] text-ink-400">74 дня · 9 тем в плане</p>
        </div>
      </div>
    </div>
  )
}

function Audience() {
  return (
    <section className="container-x py-16 lg:py-24">
      <SectionHeading
        eyebrow="Для кого это"
        title="Два пути к БВИ — и оба начинаются здесь"
        text="Неважно, решали вы олимпиадные задачи три года или открываете их впервые: структура одна, точка входа разная."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {AUDIENCE.map((a) => (
          <article key={a.id} className="card flex flex-col p-6 sm:p-8">
            <Chip className="self-start border border-line bg-paper text-ink-500">{a.tag}</Chip>
            <h3 className="mt-4 text-[22px] font-bold leading-snug">{a.title}</h3>

            <ul className="mt-5 space-y-3">
              {a.pains.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink-500">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex gap-3 rounded-xl bg-brand-50 p-4">
              <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <p className="text-[15px] leading-relaxed text-brand-800">{a.gets}</p>
            </div>

            <Link
              to="/catalog"
              className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-brand-700 hover:text-brand-900"
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
        <SectionHeading
          eyebrow="Как это работает"
          title="Никакого входного теста — понятный маршрут"
          text="Вы всегда видите, где находитесь: какая тема, какой уровень задач и сколько осталось до цели."
        />

        <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand-100 bg-brand-50 text-[13px] font-extrabold text-brand-700">
                  {step.n}
                </span>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-line lg:block" />}
              </div>
              <h3 className="mt-4 text-[17px] font-bold leading-snug">{step.title}</h3>
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
        <SectionHeading
          eyebrow="База олимпиад и вузов"
          title="Сначала цель, потом подготовка"
          text="Мы держим в одном месте, какие перечневые олимпиады существуют и какие льготы они дают в конкретных вузах."
        />
        <Link
          to="/base"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-brand-700 hover:text-brand-900"
        >
          Вся база
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {olympiads.slice(0, 3).map((o) => (
          <article key={o.id} className="card p-6 transition hover:shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[19px] font-bold">{o.title}</h3>
              <Chip className="bg-brand-50 text-brand-700">{o.level}</Chip>
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
          <article key={u.id} className="card flex items-start gap-4 p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-700 text-[13px] font-extrabold text-white">
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
    <section className="border-y border-line bg-brand-800 text-white">
      <div className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-300">ИИ-помощник</p>
          <h2 className="mt-3 text-[30px] font-extrabold leading-tight sm:text-[38px]">
            Спросить можно так же, как у репетитора
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-brand-100">
            Помощник знает каталог тем и задачи прошлых лет: соберёт подборку под ваш уровень, объяснит идею решения и
            найдёт шаг, на котором вы потеряли условие.
          </p>
          <button className="btn mt-8 bg-white text-brand-800 hover:bg-brand-50" onClick={() => navigate('/topic/kinematics')}>
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
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  m.me ? 'bg-brand-600 text-white' : 'bg-white text-ink-700'
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
      <SectionHeading
        align="center"
        eyebrow="Тарифы"
        title="Сориентироваться — бесплатно, готовиться — по подписке"
        text="База олимпиад и вузов открыта всегда: понять свой маршрут можно, ничего не оплачивая."
      />

      <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-7 sm:p-8 ${
              plan.accent ? 'border-brand-700 bg-white shadow-lift' : 'border-line bg-white shadow-card'
            }`}
          >
            {plan.accent && (
              <span className="absolute -top-3 left-7 rounded-full bg-brand-700 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                Популярный
              </span>
            )}
            <h3 className="text-[19px] font-bold">{plan.title}</h3>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-[38px] font-extrabold leading-none">{plan.price_display}</span>
              <span className="text-[15px] text-ink-400">{plan.period}</span>
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-500">{plan.summary}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                  <Icon name="check" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-600" strokeWidth={2.2} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              className={`mt-8 w-full ${plan.accent ? 'btn-primary' : 'btn-secondary'}`}
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
      <div className="card flex flex-col items-start gap-8 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">
            До отборочных этапов — меньше трёх месяцев
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
            {physics} разделов по физике и {math} по математике уже разложены по темам. Начните с той, которая западает
            сильнее всего.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button className="btn-primary" onClick={() => navigate('/catalog')}>
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
