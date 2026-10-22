import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Chip, Icon, Link, PageHeader } from '../components/ui.jsx'
import { EASE, Reveal } from '../components/motion.jsx'

/* «Задачи из тиктока» — раздел под задачи из роликов: номер, условие, разбор.

   Пока заглушка по решению 2026-10-22: структуры данных и таблиц ещё нет, сначала
   смотрим, как раздел выглядит. Когда появятся сами задачи — заводим таблицу по образцу
   lesson_problems и подключаем сюда; макет карточки ниже показывает, что в ней будет. */

const PREVIEW = [
  { number: '001', topic: 'Кинематика', teaser: 'Два поезда и муха между ними' },
  { number: '002', topic: 'Статика', teaser: 'Почему лестница скользит именно так' },
  { number: '003', topic: 'Термодинамика', teaser: 'Лёд в стакане: уровень поднимется?' },
]

export default function Tiktok() {
  const reduce = useReducedMotion()

  return (
    <div className="container-x relative py-10 lg:py-14">
      <div className="ruled-paper pointer-events-none absolute inset-x-0 top-0 h-48 -z-10" />

      <PageHeader
        eyebrow="Задачи из тиктока"
        title="Разборы коротких роликов — по номерам"
        text="Задачи, которые разбираем в видео: условие, разбор и ответ в одном месте. Чтобы не искать нужный ролик в ленте — просто находите номер."
      >
        <div className="mt-6">
          <Chip className="border border-mark-100 bg-mark-50 text-mark-600">Раздел готовится</Chip>
        </div>
      </PageHeader>

      <Reveal className="mt-10">
        <div className="card relative overflow-hidden p-6 sm:p-8">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[22px] font-semibold leading-tight sm:text-[26px]">
              Как это будет устроено
            </h2>
            <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-ink-500">
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-[12px] text-ink-300">01</span>
                У каждой задачи свой номер — тот же, что звучит в ролике.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-[12px] text-ink-300">02</span>
                Условие текстом, чтобы можно было решать не отвлекаясь на видео.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-[12px] text-ink-300">03</span>
                Разбор и ответ — под спойлером, плюс ссылка на сам ролик.
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-[12px] text-ink-300">04</span>
                Фильтр по теме: задачи привязаны к темам программы.
              </li>
            </ul>
          </div>

          {/* Декоративная «лента» — намёк на вертикальный формат роликов. */}
          <div className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 gap-3 lg:flex">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-40 w-24 rounded-xl border border-line bg-paper"
                initial={reduce ? false : { y: 0, opacity: 0.5 }}
                animate={reduce ? {} : { y: [0, -14, 0], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: EASE, delay: i * 0.5 }}
              />
            ))}
          </div>
        </div>
      </Reveal>

      <section className="mt-12">
        <p className="eyebrow mb-4">Так будут выглядеть карточки</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {PREVIEW.map((item, i) => (
            <motion.article
              key={item.number}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
              className="card border-dashed p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold text-mark-500">
                  № {item.number}
                </span>
                <Chip className="border border-line bg-paper text-[11px] text-ink-400">
                  {item.topic}
                </Chip>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-snug text-ink-700">
                {item.teaser}
              </p>
              <p className="mt-2 text-[13px] text-ink-300">условие и разбор появятся здесь</p>
            </motion.article>
          ))}
        </div>
      </section>

      <Reveal className="mt-12 border-t border-line pt-8">
        <p className="max-w-3xl text-[15px] leading-relaxed text-ink-500">
          Пока раздел пустой — задачи добавим, когда наберётся первая партия роликов. А решать
          уже сейчас есть что: задачи разложены по темам программы.
        </p>
        <Link
          to="/program"
          className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
        >
          Задачи по темам
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </Reveal>
    </div>
  )
}
