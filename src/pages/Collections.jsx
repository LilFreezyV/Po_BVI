import React, { useEffect, useRef, useState } from 'react'
import 'katex/dist/katex.min.css'
import './collections.css'
import { Link, PageHeader, navigate } from '../components/ui.jsx'
import { getCollectionAsset, getCollectionChapter, listCollectionBooks, searchCollectionTasks } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { expandTaskLabels, formatCollectionText, searchSnippet } from '../lib/collectionMath.js'
import { useAsync } from '../lib/useAsync.js'

function chapterPath(book, number, anchor) {
  return `/collections/${book}/${number}${anchor ? '?at=' + encodeURIComponent(anchor) : ''}`
}

function SearchExcerpt({ text }) {
  const excerpt = useRef(null)
  useEffect(() => {
    excerpt.current.textContent = searchSnippet(text)
    formatCollectionText(excerpt.current)
  }, [text])
  return <p className="collection-excerpt mt-1 text-sm text-ink-500" ref={excerpt} />
}

function TaskSearch({ books, book, token }) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const { data, error, loading } = useAsync(
    () => query ? searchCollectionTasks(query, book, offset, token) : Promise.resolve(null),
    [query, book, offset, token],
  )
  return (
    <div className="mb-8">
      <form className="flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault()
        setOffset(0)
        setQuery(input.trim())
      }}>
        <input
          type="search" maxLength={160} value={input}
          className="collection-control min-w-0 flex-1 px-3 py-2"
          placeholder="Номер или слова из условия" aria-label="Поиск задачи"
          onChange={(event) => {
            setInput(event.target.value)
            if (!event.target.value) {
              setQuery('')
              setOffset(0)
            }
          }}
        />
        <button className="btn-primary" type="submit">Найти</button>
      </form>
      {query && <div className="mt-4" aria-live="polite">
        {loading ? <p>Ищем задачи…</p> : error ? <p>{error.message}</p> : data?.items.length ? (
          <>
            <ul className="divide-y divide-line border-y border-line">
              {data.items.map((item) => (
                <li key={`${item.book}/${item.chapter}/${item.anchor}`}>
                  <Link to={chapterPath(item.book, item.chapter, item.anchor)} className="block py-3 hover:text-pen-700">
                    <strong>Задача {item.number} · {books.find((entry) => entry.slug === item.book)?.title}</strong>
                    <SearchExcerpt text={item.excerpt} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-3">
              {offset > 0 && <button className="btn-secondary" onClick={() => setOffset(offset - 40)}>Назад</button>}
              {data.has_more && <button className="btn-secondary" onClick={() => setOffset(offset + 40)}>Дальше</button>}
            </div>
          </>
        ) : <p>Задачи не найдены.</p>}
      </div>}
    </div>
  )
}

function Contents({ book }) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {book.chapters.map(({ number, title, sections }) => (
        <li key={number} className="py-4">
          <Link className="font-semibold text-pen-700 hover:underline" to={chapterPath(book.slug, number)}>{title}</Link>
          {sections.length > 0 && <ul className="mt-2 space-y-2 pl-4 text-sm">
            {sections.map((section) => (
              <li key={section.anchor}>
                <Link className="hover:underline" to={chapterPath(book.slug, number, section.anchor)}>{section.title}</Link>
              </li>
            ))}
          </ul>}
        </li>
      ))}
    </ol>
  )
}

function ChapterBody({ html, anchor, path, token, chapterControl }) {
  const root = useRef(null)
  const downloads = useRef(null)
  const [message, setMessage] = useState('')
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const container = root.current
    const controller = new AbortController()
    const urls = new Set()
    const images = new Map()
    function loadImage(target) {
      if (!images.has(target)) {
        const image = getCollectionAsset(target.dataset.asset, token, controller.signal).then(async (blob) => {
          if (controller.signal.aborted) return
          const url = URL.createObjectURL(blob)
          urls.add(url)
          target.loading = 'eager'
          target.src = url
          await target.decode()
        }).catch(() => {
          if (!controller.signal.aborted) target.alt = `${target.alt || 'Рисунок'} — файл недоступен`
        })
        images.set(target, image)
      }
      return images.get(target)
    }
    downloads.current = { urls, signal: controller.signal, loadImage }
    const observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue
        observer.unobserve(target)
        loadImage(target)
      }
    }, { rootMargin: '300px' })
    container.querySelectorAll('img[data-asset]').forEach((img) => observer.observe(img))
    container.querySelectorAll('a[data-asset]').forEach((link) => link.setAttribute('href', '#'))
    container.querySelectorAll('a.pnum[href^="https://botay.pro/"]').forEach((link) => {
      const task = link.closest('article[id]')
      if (!task) return
      link.href = `#${path}?at=${encodeURIComponent(task.id)}`
      link.removeAttribute('target')
      link.removeAttribute('rel')
    })
    formatCollectionText(container)
    return () => {
      controller.abort()
      observer.disconnect()
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [html, path, token])

  useEffect(() => {
    if (!anchor) return
    const target = [...root.current.querySelectorAll('[id]')].find((node) => node.id === anchor)
    if (target) {
      const details = target.closest('details')
      if (details) details.open = true
      target.scrollIntoView({ block: 'start' })
    }
  }, [anchor, html])

  async function printChapter() {
    const session = downloads.current
    setPrinting(true)
    try {
      const images = [...root.current.querySelectorAll('img[data-asset]')].filter((img) => {
        const details = img.closest('details')
        return !details || details.open
      })
      for (let i = 0; i < images.length && !session.signal.aborted; i += 8) {
        await Promise.all(images.slice(i, i + 8).map((image) => session.loadImage(image)))
      }
      if (!session.signal.aborted) window.print()
    } finally {
      if (!session.signal.aborted) setPrinting(false)
    }
  }

  async function follow(event) {
    const link = event.target.closest('a')
    if (!link) return
    const asset = link.dataset.asset
    if (asset) {
      event.preventDefault()
      const session = downloads.current
      setMessage('')
      try {
        const blob = await getCollectionAsset(asset, token, session.signal)
        if (session.signal.aborted) return
        const url = URL.createObjectURL(blob)
        session.urls.add(url)
        const file = document.createElement('a')
        file.href = url
        file.download = link.dataset.name || 'collection-file'
        file.click()
      } catch {
        if (!session.signal.aborted) setMessage('Файл недоступен.')
      }
      return
    }
    const href = link.getAttribute('href')
    if (href?.startsWith('#') && !href.startsWith('#/')) {
      event.preventDefault()
      const id = href.slice(1)
      if (id && id !== 'top') navigate(`${path}?at=${encodeURIComponent(id)}`)
      else window.scrollTo(0, 0)
    }
  }

  return <>
    <div className="collection-toolbar mb-6 flex flex-wrap items-end justify-between gap-4">
      {chapterControl}
      <div className="flex flex-wrap items-center gap-2">
        <button className="collection-action" onClick={() => root.current.querySelectorAll('details').forEach((node) => { node.open = true })}>Раскрыть решения</button>
        <button className="collection-action" onClick={() => root.current.querySelectorAll('details').forEach((node) => { node.open = false })}>Свернуть</button>
        <button className="collection-action" onClick={printChapter} disabled={printing}>{printing ? 'Загружаем рисунки…' : 'Печать'}</button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
    <div className="collection-content" ref={root} onClick={follow} dangerouslySetInnerHTML={{ __html: html }} />
  </>
}

function Chapter({ book, number, anchor, path, token }) {
  const chapter = book.chapters.find((entry) => entry.number === number)
  const { data, error, loading } = useAsync(
    () => chapter ? getCollectionChapter(book.slug, number, token) : Promise.resolve(null),
    [book.slug, number, token],
  )
  if (!chapter) return <p>Глава не найдена.</p>
  if (loading) return <p role="status">Загружаем главу…</p>
  if (error) return <p role="alert">{error.message}</p>
  const chapterControl = (
    <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-700">
      Глава
      <select className="collection-control min-w-0 max-w-full px-3 py-2 text-ink-900"
        value={number} onChange={(event) => navigate(chapterPath(book.slug, event.target.value))}>
        {book.chapters.map((entry) => <option value={entry.number} key={entry.number}>{entry.title}</option>)}
      </select>
    </label>
  )
  return <ChapterBody html={data.html} anchor={anchor} path={path} token={token} chapterControl={chapterControl} />
}

export default function Collections({ path, bookSlug, chapterNumber, anchor }) {
  const { token, user, authLoading } = useAuth()
  const { data: books, error, loading } = useAsync(
    () => user ? listCollectionBooks(token) : Promise.resolve(null), [user, token],
  )
  const book = books?.find((entry) => entry.slug === bookSlug)
  const next = anchor ? `${path}?at=${encodeURIComponent(anchor)}` : path
  useEffect(() => {
    if (!chapterNumber) return undefined
    document.body.classList.add('printing-collection')
    return () => document.body.classList.remove('printing-collection')
  }, [chapterNumber])
  return (
    <>
      <div className="container-x min-w-0 pt-8 sm:pt-12">
        <PageHeader title={book?.title || 'Сборники по физике'}
          text={expandTaskLabels(book?.intro || book?.description || 'Задачники с оглавлениями, рисунками и разборами.')} />
      </div>
      <section className="collection-page container-x min-w-0 pb-12 pt-6 sm:pt-8">
        {authLoading ? <p>Проверяем вход…</p> : !user ? (
          <Link className="btn-primary" to={`/login?next=${encodeURIComponent(next)}`}>Войти, чтобы открыть сборники</Link>
        ) : loading ? <p>Загружаем сборники…</p> : error ? <p role="alert">{error.message}</p> : (
          <>
            {bookSlug && <div className="mb-5 flex flex-wrap gap-4 text-sm">
              <Link className="text-pen-700 hover:underline" to="/collections">← Все сборники</Link>
              {book && chapterNumber > 0 && <Link className="text-pen-700 hover:underline" to={`/collections/${book.slug}`}>Оглавление</Link>}
            </div>}
            <TaskSearch books={books || []} book={bookSlug} token={token} />
            {bookSlug ? !book ? <p>Сборник не найден.</p> : (
              <>
                <p className="mb-4 text-sm leading-relaxed text-ink-500">
                  {expandTaskLabels((book.stats?.length ? book.stats : [book.count]).join(' · '))}
                </p>
                {chapterNumber ? <Chapter book={book} number={chapterNumber} anchor={anchor} path={path} token={token} /> : <Contents book={book} />}
              </>
            ) : books?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {books.map((entry) => (
                  <Link key={entry.slug} to={`/collections/${entry.slug}`} className="collection-book">
                    <p className="text-xs font-semibold text-pen-700">{entry.eyebrow}</p>
                    <h2 className="mt-2 font-serif text-2xl">{entry.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-500">{expandTaskLabels(entry.description)}</p>
                    <p className="mt-4 font-mono text-sm text-ink-500">{entry.count}</p>
                  </Link>
                ))}
              </div>
            ) : <p>Сборники ещё не загружены.</p>}
          </>
        )}
      </section>
    </>
  )
}
