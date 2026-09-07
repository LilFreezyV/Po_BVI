import React from 'react'
import { Link, Logo } from './ui.jsx'

const COLUMNS = [
  {
    title: 'Продукт',
    links: [
      { label: 'Каталог тем', to: '/catalog' },
      { label: 'База олимпиад', to: '/base' },
      { label: 'База вузов', to: '/base' },
      { label: 'Личный кабинет', to: '/progress' },
    ],
  },
  {
    title: 'Предметы',
    links: [
      { label: 'Физика', to: '/catalog' },
      { label: 'Математика', to: '/catalog' },
      { label: 'Перечневые олимпиады', to: '/base' },
      { label: 'ВсОШ — обзорно', to: '/base' },
    ],
  },
  {
    title: 'Компания',
    links: [
      { label: 'О проекте', to: '/' },
      { label: 'Тарифы', to: '/#pricing' },
      { label: 'Блог', to: '/' },
      { label: 'Поддержка', to: '/' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-ink-500">
              Готовим к перечневым олимпиадам по физике и математике — чтобы поступить в вуз мечты без вступительных
              испытаний.
            </p>
            <p className="mt-5 text-sm text-ink-400">hello@bvi.ru · Telegram @bvi_school</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink-400">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-[15px] text-ink-700 transition hover:text-brand-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 «Без Вступительных». Прототип интерфейса, данные демонстрационные.</p>
          <div className="flex gap-5">
            <Link to="/" className="transition hover:text-ink-700">
              Оферта
            </Link>
            <Link to="/" className="transition hover:text-ink-700">
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
