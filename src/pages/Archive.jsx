import React, { useState } from 'react'
import { Icon, Link } from '../components/ui.jsx'
import { getBvi } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { LEVEL_LABEL } from '../lib/olympiadLevels.js'
import { organizerArchive, seasons, seasonPath, taskCount } from '../data/archive/index.js'
import { archiveSeasonPath, loadArchiveIndex } from '../data/archive/imported.js'
import { ARCHIVE_LEVELS, ARCHIVE_STATUSES } from '../data/archive/levels.js'
import cardMetadata from '../data/archive/cardMetadata.json'
import './archive.css'

const order = ['vsosh', 'mosh', 'rosatom', 'inzhenernaya', 'kurchatov', 'fizteh']
const fizteh = {
  id: 'fizteh',
  ...cardMetadata.fizteh,
  archive_url: organizerArchive,
}
const catalogIds = {
  iosh: 'inzhenernaya', spbgu: 'spbgu-olymp', spb: 'spb-fizika',
  shag: 'shag-v-buduschee', internet: 'internet-fizika', vedomstv: 'vedomstvennye',
  nadezhda: 'nadezhda-energetiki', vsesib: 'vsesibirskaya',
}
const normalize = (text = '') => text.toLowerCase().replaceAll('ё', 'е')
const filters = [['all', 'Все'], ['I', 'I уровень'], ['II', 'II уровень'], ['III', 'III уровень'], ['unranked', 'Без уровня']]
const countFormat = new Intl.NumberFormat('ru-RU')
const plural = new Intl.PluralRules('ru')
const taskWord = { one: 'задача', few: 'задачи', many: 'задач', other: 'задач' }

function ArchiveCard({ item }) {
  const hasYears = item.groupId || item.id === 'fizteh'
  const years = item.years ?? seasons
  const total = item.total ?? (item.id === 'fizteh' ? taskCount : null)
  const archiveUrl = item.archive_url || item.site_url
  const label = ARCHIVE_STATUSES[item.id] ?? item.status ?? 'Уровень не указан'
  const showStatus = item.id === 'granit' || (!item.level && item.id !== 'vsosh')
  const meta = [item.organizer, item.grades].filter(Boolean).join(' · ')
  const archiveAction = (title, icon) => (
    <>
      <Icon name="book" className="olymp-card-book" />
      <span className="olymp-archive-label">
        {title}
        {hasYears && total != null && <small>{countFormat.format(total)} {taskWord[plural.select(total)]}</small>}
      </span>
      {icon && <Icon name={icon} className="olymp-card-arrow" />}
    </>
  )

  return <article className="olymp-card" aria-label={item.title}>
    <header className="olymp-card-head">
      <div className="olymp-card-title">
        <h3>{item.title}</h3>
        {item.level && <span className="olymp-level">{LEVEL_LABEL[item.level]}</span>}
      </div>
      {showStatus && <p className="olymp-card-status">{label}</p>}
      {meta && <p className="olymp-card-meta">{meta}</p>}
    </header>
    {hasYears ? <details className="olymp-card-archive">
      <summary className="olymp-archive-action">{archiveAction('Задания по годам', 'chevronDown')}</summary>
      <div className="olymp-years">
        {years.map((season) => <Link key={season} to={item.groupId
          ? archiveSeasonPath(item.groupId, season) : seasonPath(season)}>{season}</Link>)}
      </div>
    </details> : archiveUrl ? (
      <a className="olymp-archive-action" href={archiveUrl} target="_blank" rel="noreferrer">
        {archiveAction(item.archive_url ? 'Официальный архив' : 'К материалам олимпиады', 'arrow')}
      </a>
    ) : <div className="olymp-archive-action olymp-archive-unavailable">{archiveAction('Архив готовится')}</div>}
    {(item.site_url || item.chat_url) && <footer className="olymp-card-links">
      {item.site_url && <a href={item.site_url} target="_blank" rel="noreferrer">Сайт олимпиады</a>}
      {item.chat_url && <a href={item.chat_url} target="_blank" rel="noreferrer">Канал</a>}
    </footer>}
  </article>
}

export default function Archive() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('all')
  const { data, loading, error } = useAsync(() => getBvi(), [])
  const { data: archive, loading: archiveLoading, error: archiveError } = useAsync(loadArchiveIndex, [])
  const query = normalize(search.trim())
  const listed = data?.olympiads ?? []
  const olympiads = listed.some((item) => item.id === fizteh.id) ? [...listed] : [...listed, fizteh]
  for (const group of archive ?? []) {
    const id = catalogIds[group.id] ?? group.id
    const index = olympiads.findIndex((item) => item.id === id)
    const years = [...new Set(group.variants.map((variant) => variant.season))]
      .sort((a, b) => b.localeCompare(a, 'ru', { numeric: true }))
    const imported = { groupId: group.id, years, total: group.variants.reduce((count, variant) => count + variant.tasks.length, 0) }
    if (index < 0) olympiads.push({ id, title: group.title, ...cardMetadata[id], ...imported })
    else olympiads[index] = { ...olympiads[index], ...imported }
  }
  const priority = (item) => {
    const index = order.indexOf(item.id)
    return index === -1 ? order.length : index
  }
  const filtered = olympiads
    .map((item) => {
      const archiveLevel = ARCHIVE_LEVELS[item.id] ?? item.level
      return { ...item, level: ['I', 'II', 'III'].includes(archiveLevel) ? archiveLevel : null,
        status: LEVEL_LABEL[archiveLevel] }
    })
    .sort((a, b) => priority(a) - priority(b))
    .filter((item) => (level === 'all' || level === (item.level ?? 'unranked'))
      && normalize([item.title, item.organizer, item.short].filter(Boolean).join(' ')).includes(query))

  return <div className="olymp-archive olymp-catalog">
    <h1>Олимпиады по физике</h1>
    <p className="olymp-lead">Задания по годам, этапам и классам. Уровни указаны по перечню на 2026/27 учебный год.</p>
    <nav className="olymp-tabs" aria-label="Разделы заданий">
      <Link to="/catalog">По темам</Link>
      <Link to="/archive" aria-current="page">По олимпиадам</Link>
    </nav>
    <div className="olymp-catalog-tools">
      <div className="olymp-catalog-filters" role="group" aria-label="Фильтр по уровню">
        {filters.map(([id, label]) => <button key={id} type="button" aria-pressed={level === id}
          onClick={() => setLevel(id)}>{label}</button>)}
      </div>
      <input type="search" className="olymp-search" aria-label="Найти олимпиаду"
        placeholder="Найти олимпиаду" value={search} onChange={(event) => setSearch(event.target.value)} />
    </div>
    <div className="olymp-grid">
      {filtered.map((item) => <ArchiveCard key={item.id} item={item} />)}
    </div>
    {(archiveLoading || (loading && !archive)) && <p role="status">Загружаем олимпиады…</p>}
    {error && archiveError && <p role="status">Другие олимпиады сейчас недоступны.</p>}
    {!archiveLoading && !loading && !filtered.length && <p role="status">Олимпиады не найдены.</p>}
  </div>
}
