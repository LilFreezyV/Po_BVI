import React, { useState } from 'react'
import { Link } from '../components/ui.jsx'
import { seasons, seasonPath, organizerArchive, variants, variantPath } from '../data/archive/index.js'
import { archiveSeasonPath, loadArchiveIndex, loadArchiveTasks } from '../data/archive/imported.js'
import { useAsync } from '../lib/useAsync.js'
import ArchiveVariant from './ArchiveVariant.jsx'
import './archive.css'

const stages = [['final', 'Заключительный этап'], ['selection', 'Отборочный этап']]
const showLatest = seasons[0]

function VariantCard({ variant }) {
  const local = variant.tasks.length > 0
  const tiles = local ? variant.tasks : variant.preview
  const path = variant.path ?? variantPath(variant)
  return <article className="olymp-ticket">
    <h3>{variant.label}</h3>
    <div className="olymp-actions">
      {local && <Link to={path} className="olymp-button olymp-primary">Задачи на сайте</Link>}
      {variant.official.map(([label, url]) => (
        <a key={label} className="olymp-button" href={url} target="_blank" rel="noreferrer">PDF · {label}</a>
      ))}
      {!variant.official.length && !variant.path && <a className="olymp-button" href={organizerArchive}
        target="_blank" rel="noreferrer">Материалы организаторов ↗</a>}
    </div>
    {tiles.length > 0 && <ol className="olymp-tiles">
      {tiles.map((task) => {
        const content = <><b>{task.number}</b><span>{task.title}</span>{task.rating != null && <strong>{task.rating}<small>/10</small></strong>}</>
        return <li key={task.number}>{local
          ? <Link to={path + '/' + task.number}>{content}</Link>
          : <div>{content}</div>}</li>
      })}
    </ol>}
  </article>
}

function Stage({ id, label, items }) {
  const grades = [...new Set(items.map((item) => item.grade))].sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10))
  const [grade, setGrade] = useState(grades[0])
  return <section className="olymp-stage" aria-labelledby={'stage-' + id}>
    <h2 id={'stage-' + id}>{label}</h2>
    {grades.some(Boolean) && <div className="olymp-tabs olymp-grades" aria-label={label + ': классы'}>
      {grades.map((value) => <button type="button" key={value} aria-pressed={value === grade}
        onClick={() => setGrade(value)}>{value ? value + ' класс' : 'Без указания класса'}</button>)}
    </div>}
    <div className="olymp-tickets">
      {items.filter((item) => item.grade === grade).map((variant) => <VariantCard key={variant.id} variant={variant} />)}
    </div>
  </section>
}

function ImportedVariant({ variant, number }) {
  const { data, loading, error } = useAsync(() => loadArchiveTasks(variant.filename), [variant.filename])
  if (loading) return <div className="olymp-archive" role="status">Загружаем задачи…</div>
  if (error) return <div className="olymp-archive" role="alert">Не удалось загрузить задачи.</div>
  return <ArchiveVariant variant={{ ...variant, tasks: data }} number={number} />
}

function ImportedArchive({ group, slug, number }) {
  const available = [...new Set(group.variants.map((variant) => variant.season))]
    .sort((a, b) => b.localeCompare(a, 'ru', { numeric: true }))
  const items = group.variants.map((variant) => ({
    ...variant,
    olympiad: group.id,
    olympiadTitle: group.title,
    path: '/archive/' + group.id + '/' + variant.id,
    label: group.id === 'fizteh'
      ? variants.find((legacy) => legacy.id === variant.id)?.label ?? variant.heading
      : variant.heading,
  }))
  const variant = items.find((item) => item.id === slug)
  if (variant) return <ImportedVariant key={variant.id} variant={variant} number={number} />
  const season = slug ? slug.replace('-', '/') : available[0]
  const inSeason = number ? [] : items.filter((item) => item.season === season)
  if (!inSeason.length) return <ArchiveNotFound />
  const sections = [...new Set(inSeason.map((item) => item.stage ?? 'Варианты'))]
  return <div className="olymp-archive olymp-season">
    <nav className="olymp-crumbs" aria-label="Путь в архиве">
      <Link to="/archive">По олимпиадам</Link> / <Link to={'/archive/' + group.id}>{group.title}</Link>
    </nav>
    <h1>{group.title} {season}</h1>
    <nav className="olymp-years" aria-label="Годы олимпиады">
      {available.map((value) => <Link key={value} to={archiveSeasonPath(group.id, value)} aria-current={value === season ? 'page' : undefined}>
        {value}
      </Link>)}
    </nav>
    {sections.map((label, index) => <Stage key={season + label} id={index}
      label={label[0].toUpperCase() + label.slice(1)}
      items={inSeason.filter((item) => (item.stage ?? 'Варианты') === label)} />)}
  </div>
}

function ArchiveNotFound() {
  return <div className="olymp-archive">
    <h1>Страница архива не найдена</h1><Link to="/archive">К олимпиадам</Link>
  </div>
}

export default function ArchiveSeason({ olympiad, slug, number }) {
  const { data, loading } = useAsync(loadArchiveIndex, [])
  const group = data?.find((item) => item.id === olympiad)
  if (group) return <ImportedArchive group={group} slug={slug} number={number} />
  if (loading) return <div className="olymp-archive" role="status">Загружаем архив…</div>
  if (olympiad !== 'fizteh') return <ArchiveNotFound />
  const variant = variants.find((item) => item.id === slug)
  if (variant) return <ArchiveVariant key={variant.id} variant={variant} number={number} />
  const season = slug ? slug.replace('-', '/') : showLatest
  const items = number ? [] : variants.filter((item) => item.season === season)
  if (!items.length) return <ArchiveNotFound />

  return <div className="olymp-archive olymp-season">
    <nav className="olymp-crumbs" aria-label="Путь в архиве">
      <Link to="/archive">По олимпиадам</Link> / <Link to="/archive/fizteh">Физтех</Link>
    </nav>
    <h1>Физтех {season}</h1>
    <nav className="olymp-years" aria-label="Годы олимпиады">
      {seasons.map((value) => <Link key={value} to={seasonPath(value)} aria-current={value === season ? 'page' : undefined}>
        {value}
      </Link>)}
    </nav>
    {stages.map(([id, label]) => {
      const stageItems = items.filter((item) => item.stage === id)
      return stageItems.length ? <Stage key={season + id} id={id} label={label} items={stageItems} /> : null
    })}
  </div>
}
