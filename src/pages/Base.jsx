import React, { useState } from 'react'
import { OLYMPIADS, UNIVERSITIES } from '../data/site.js'
import { Chip, Icon, navigate } from '../components/ui.jsx'

const TABS = [
  { id: 'olympiads', label: 'Олимпиады' },
  { id: 'universities', label: 'Вузы и льготы' },
]

function OlympiadCard({ o }) {
  return (
    <article className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[20px] font-bold">{o.title}</h3>
          <p className="mt-1 text-[14px] text-ink-400">{o.organizer}</p>
        </div>
        <Chip className={o.level === 'Всероссийская' ? 'bg-clay-50 text-clay-600' : 'bg-brand-50 text-brand-700'}>
          {o.level}
        </Chip>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-400">Предметы</dt>
          <dd className="mt-1 text-[15px]">{o.subjects.join(', ')}</dd>
        </div>
        <div>
          <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-400">Классы</dt>
          <dd className="mt-1 text-[15px]">{o.grades}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-400">Сроки</dt>
          <dd className="mt-1 text-[15px]">{o.dates}</dd>
        </div>
      </dl>

      <div className="mt-5 flex gap-3 rounded-xl bg-brand-50 p-4">
        <Icon name="target" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <p className="text-[15px] leading-relaxed text-brand-800">{o.perk}</p>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-ink-400">{o.note}</p>
    </article>
  )
}

function UniversityCard({ u }) {
  return (
    <article className="card p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-700 text-[13px] font-extrabold text-white">
          {u.short}
        </span>
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-snug">{u.title}</h3>
          <p className="mt-1 text-[14px] text-ink-400">
            {u.city} · {u.programs}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-400">Даёт БВИ по олимпиадам</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {u.accepts.map((a) => (
            <Chip key={a} className="border border-line bg-paper text-ink-700">
              {a}
            </Chip>
          ))}
        </div>
      </div>

      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[14px]">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-400">Условие подтверждения</dt>
          <dd className="text-right font-medium">{u.confirm}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-400">Для сравнения</dt>
          <dd className="text-right font-medium">{u.passing}</dd>
        </div>
      </dl>
    </article>
  )
}

export default function Base() {
  const [tab, setTab] = useState('olympiads')

  return (
    <div className="container-x py-10 lg:py-14">
      <div className="max-w-3xl">
        <p className="eyebrow mb-3">База олимпиад и вузов</p>
        <h1 className="text-[32px] font-extrabold leading-tight sm:text-[42px]">
          Какая олимпиада даёт БВИ в какой вуз
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
          Перечневые олимпиады дают льготы по правилам конкретного вуза, и эти правила меняются каждый год. Здесь они
          собраны в одном месте — раздел открыт бесплатно.
        </p>
      </div>

      <div className="mt-8 inline-flex rounded-xl border border-line bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
              tab === t.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {tab === 'olympiads'
          ? OLYMPIADS.map((o) => <OlympiadCard key={o.id} o={o} />)
          : UNIVERSITIES.map((u) => <UniversityCard key={u.id} u={u} />)}
      </div>

      <div className="card mt-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-[20px] font-bold">Цель понятна — что дальше?</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-500">
            Откройте каталог тем: он собран под требования перечневых олимпиад, а не под школьную программу.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => navigate('/catalog')}>
          Перейти к темам
          <Icon name="arrow" className="h-[18px] w-[18px]" />
        </button>
      </div>

      <p className="mt-6 text-[13px] text-ink-400">
        Данные приведены для демонстрации интерфейса и не являются официальной справкой о льготах.
      </p>
    </div>
  )
}
