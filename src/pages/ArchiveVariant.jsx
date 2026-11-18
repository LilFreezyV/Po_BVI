import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { Link } from '../components/ui.jsx'
import ArchiveTaskFigure from '../components/ArchiveTaskFigure.jsx'
import { organizerArchive, seasonPath, variantPath } from '../data/archive/index.js'
import { archiveSeasonPath } from '../data/archive/imported.js'

function FormulaText({ text }) {
  return text.split(/(\\\([\s\S]*?\\\))/).map((part, i) => part.startsWith('\\(') && part.endsWith('\\)')
    ? <span key={i} className="inline-block max-w-full overflow-x-auto align-middle"
      dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2, -2), { throwOnError: false, strict: 'ignore' }) }} />
    : <React.Fragment key={i}>{part}</React.Fragment>)
}

function RichText({ html }) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  const rendered = html.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g, (_, inline, display) => {
    const formula = (inline ?? display).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (match, name) => entities[name])
    return katex.renderToString(formula, { displayMode: display !== undefined, throwOnError: false, strict: 'ignore' })
  })
  // Imported markup uses the allowed tags and local image paths from the importer.
  return <div className="olymp-prose" dangerouslySetInnerHTML={{ __html: rendered }} />
}

function Task({ task, variant }) {
  const path = variant.path ?? variantPath(variant)
  if (task.rich) return <article className="card scroll-mt-24 p-5 sm:p-6" id={'task-' + task.number}>
    <h2 className="mb-4 font-serif text-2xl font-semibold">
      <Link to={path + '/' + task.number}>{task.number}. {task.title}</Link>
    </h2>
    {task.rich.statement ? <RichText html={task.rich.statement} /> : <p>Текст условия отсутствует в выгрузке.</p>}
    <div className="mt-4 grid gap-2">
      {[['hint', 'Подсказка'], ['answer', 'Ответ'], ['solution', 'Решение']].map(([field, label]) => task.rich[field] &&
        <details key={field} className="card p-4">
          <summary className="cursor-pointer font-semibold text-pen-700">{label}</summary>
          <div className="mt-3"><RichText html={task.rich[field]} /></div>
        </details>)}
    </div>
  </article>
  return <article className="card scroll-mt-24 p-5 sm:p-6" id={'task-' + task.number}>
    <h2 className="mb-4 font-serif text-2xl font-semibold">
      <Link to={variantPath(variant) + '/' + task.number}>{task.number}. {task.title}</Link>
    </h2>
    <div className="whitespace-pre-line leading-relaxed"><FormulaText text={task.statement || task.overview} /></div>
    {task.figure && <ArchiveTaskFigure kind={task.figure} />}
    {!task.statement && <p className="mt-3"><a className="text-pen-700 underline" href={organizerArchive}
      target="_blank" rel="noreferrer">Полное условие у организаторов ↗</a></p>}
    <div className="mt-4 grid gap-2">
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold text-pen-700">Подсказка</summary>
        <p className="mt-3"><FormulaText text={task.hint} /></p>
      </details>
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold text-pen-700">Ответ</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          {task.answer.map((answer, i) => <li key={i}><FormulaText text={answer} /></li>)}
        </ol>
      </details>
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold text-pen-700">Решение</summary>
        {task.solution
          ? <p className="mt-3 whitespace-pre-line"><FormulaText text={task.solution} /></p>
          : <a className="mt-3 block text-pen-700 underline" href={organizerArchive} target="_blank" rel="noreferrer">
            Решения у организаторов ↗</a>}
      </details>
    </div>
  </article>
}

export default function ArchiveVariant({ variant, number }) {
  const task = number ? variant.tasks.find((item) => String(item.number) === number) : null
  const path = variant.path ?? variantPath(variant)
  return <div className="container-x py-10">
    <nav className="mb-4 flex flex-wrap gap-2 text-sm text-pen-700" aria-label="Путь в архиве">
      <Link to="/archive">По олимпиадам</Link><span>/</span>
      <Link to={variant.olympiad ? archiveSeasonPath(variant.olympiad, variant.season) : seasonPath(variant.season)}>
        {variant.olympiadTitle ?? 'Физтех'} {variant.season}
      </Link>
      {task && <><span>/</span><Link to={path}>Весь вариант</Link></>}
    </nav>
    <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
      {task ? task.title : number ? 'Задача не найдена' : variant.heading ?? variant.label}
    </h1>
    {variant.official.length > 0 && <div className="mt-4 flex flex-wrap gap-3">
      {variant.official.map(([label, url]) => <a key={url} href={url}
        target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-2 text-sm">PDF · {label}</a>)}
    </div>}
    <nav className="my-5 flex flex-wrap gap-2" aria-label="Задачи варианта">
      {variant.tasks.map((item) => <Link key={item.id}
        to={task ? path + '/' + item.number : path + '#task-' + item.number}
        aria-current={task === item ? 'page' : undefined}
        className="rounded-lg border border-line px-3 py-2 font-semibold">{item.number}</Link>)}
    </nav>
    {task ? <Task key={task.id} variant={variant} task={task} /> : !number && <div className="space-y-5">
      {variant.tasks.map((item) => <Task key={item.id} variant={variant} task={item} />)}
      {variant.tasks.length === 0 && <a href={organizerArchive} target="_blank" rel="noreferrer">Материалы организаторов ↗</a>}
    </div>}
  </div>
}
