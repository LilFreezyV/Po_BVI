import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { getBvi } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Chip, Icon, Link, PageHeader, SkeletonCards } from '../components/ui.jsx'
import { Reveal, Stagger, staggerItem } from '../components/motion.jsx'

/* Архив прошлых лет: куда идти за условиями и разборами каждой олимпиады.

   Своих текстов заданий здесь нет и не будет без разрешения правообладателей — условия
   олимпиад принадлежат их составителям. Поэтому страница устроена как указатель:
   карточка олимпиады → официальный раздел с заданиями. Адреса собраны обходом сайтов,
   см. ARCHIVES в backend/scripts/bvi_data.py. */

const LEVEL_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'I', label: 'I уровень' },
  { id: 'II', label: 'II уровень' },
  { id: 'III', label: 'III уровень' },
  { id: 'off', label: 'Вне перечня' },
]

const LEVEL_LABEL = { I: 'I уровень', II: 'II уровень', III: 'III уровень', off: 'вне перечня' }

const LEVEL_CHIP = {
  I: 'bg-pen-700 text-white',
  II: 'bg-pen-100 text-pen-700',
  III: 'border border-line bg-paper text-ink-500',
  off: 'border border-dashed border-line text-ink-400',
}

function ArchiveCard({ o }) {
  const has = Boolean(o.archive_url)

  return (
    <motion.article
      variants={staggerItem}
      className={`card flex h-full flex-col p-5 ${has ? '' : 'border-dashed'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="max-w-[24ch] text-[16px] font-bold leading-snug">{o.title}</h3>
        <Chip className={`shrink-0 ${LEVEL_CHIP[o.level]}`}>{LEVEL_LABEL[o.level]}</Chip>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
        {o.organizer} · {o.grades}
      </p>

      <div className="mt-4 flex-1 border-t border-line pt-4">
        {has ? (
          <a
            href={o.archive_url}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex items-start gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
          >
            <Icon name="book" className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
            <span>
              {o.archive_note}
              <span className="mt-0.5 block font-mono text-[11px] font-normal text-ink-300">
                {new URL(o.archive_url).hostname.replace(/^www\./, '')}
              </span>
            </span>
          </a>
        ) : (
          <p className="text-[14px] leading-relaxed text-ink-400">
            Отдельного раздела с заданиями на сайте нет — смотрите материалы на главной или
            в канале олимпиады.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 text-[13px] font-semibold">
        {o.site_url && (
          <a
            href={o.site_url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-ink-500 hover:text-ink-900"
          >
            Сайт
          </a>
        )}
        {o.chat_url && (
          <a
            href={o.chat_url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-ink-400 hover:text-ink-900"
          >
            Канал
          </a>
        )}
        <Link to="/bvi" className="ml-auto text-pen-700 hover:text-pen-900">
          Что даёт диплом →
        </Link>
      </div>
    </motion.article>
  )
}

export default function Archive() {
  const [level, setLevel] = useState('all')
  const [query, setQuery] = useState('')
  const { data, loading, error } = useAsync(() => getBvi(), [])

  const olympiads = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.olympiads.filter(
      (o) =>
        (level === 'all' || o.level === level) &&
        (!q || o.title.toLowerCase().includes(q) || o.organizer.toLowerCase().includes(q))
    )
  }, [data, level, query])

  const withArchive = data ? data.olympiads.filter((o) => o.archive_url).length : 0

  return (
    <div className="container-x py-10 lg:py-14">
      <PageHeader
        eyebrow="Архив прошлых лет"
        title="Где лежат задания и разборы каждой олимпиады"
        text="Указатель на официальные архивы: условия, решения и критерии оценивания — на сайтах самих олимпиад. Так вы читаете первоисточник, а не чей-то пересказ."
      >
        {data && (
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[12px] text-ink-400">
            <span>
              <span className="text-[15px] font-semibold text-ink-900">{data.olympiads.length}</span>{' '}
              олимпиад
            </span>
            <span>
              <span className="text-[15px] font-semibold text-ink-900">{withArchive}</span> с архивом
              заданий
            </span>
            <span>ссылки проверены {new Date(data.updated_on).toLocaleDateString('ru-RU')}</span>
          </div>
        )}
      </PageHeader>

      <div className="sticky top-[68px] z-30 -mx-5 mt-8 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {LEVEL_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setLevel(f.id)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
                  level === f.id
                    ? 'bg-ink-900 text-white'
                    : 'border border-line bg-white text-ink-500 hover:text-ink-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: Физтех, Курчатов…"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-pen-400 sm:w-64"
          />
        </div>
      </div>

      {loading && (
        <div className="pt-10">
          <SkeletonCards count={6} />
        </div>
      )}
      {error && !loading && (
        <p className="py-16 text-center text-ink-400">
          Не удалось загрузить данные. Проверьте, что бэкенд запущен.
        </p>
      )}
      {data && !loading && olympiads.length === 0 && (
        <p className="py-16 text-center text-ink-400">Ничего не нашлось. Попробуйте другой запрос.</p>
      )}

      {data && !loading && olympiads.length > 0 && (
        <>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {olympiads.map((o) => (
              <ArchiveCard key={o.id} o={o} />
            ))}
          </Stagger>

          <Reveal className="mt-14 border-t border-line pt-8">
            <p className="eyebrow mb-3">Почему так</p>
            <p className="max-w-3xl text-[15px] leading-relaxed text-ink-500">
              Условия олимпиадных заданий — авторский текст их составителей, поэтому мы не
              выкладываем их у себя и не перепечатываем разборы. Зато у нас открыты задачи из
              сборника Савченко — Балдина: он под свободной лицензией GNU FDL и разобран по
              подтемам программы.
            </p>
            <Link
              to="/program"
              className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-pen-700 hover:text-pen-900"
            >
              Задачи сборника по темам программы
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Reveal>
        </>
      )}
    </div>
  )
}
