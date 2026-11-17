import React, { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getCollectionAsset } from '../lib/api.js'
import { navigate } from '../components/ui.jsx'

GlobalWorkerOptions.workerSrc = workerUrl

export default function CollectionPdf({ chapter, chapterControl, anchor, path, token }) {
  const reader = useRef(null)
  const sheet = useRef(null)
  const canvas = useRef(null)
  const [file, setFile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [pageError, setPageError] = useState('')
  const [width, setWidth] = useState(0)
  const { asset, first, last, name } = chapter.pdf
  const target = Number(anchor?.match(/^page-(\d+)$/)?.[1])
  const number = target >= first && target <= last ? target : first

  useEffect(() => {
    const controller = new AbortController()
    let loading, url
    setFile(null)
    setLoadError('')
    async function load() {
      try {
        const blob = await getCollectionAsset(asset, token, controller.signal)
        const data = await blob.arrayBuffer()
        if (controller.signal.aborted) return
        url = URL.createObjectURL(blob)
        loading = getDocument({ data, isEvalSupported: false, enableXfa: false })
        const pdf = await loading.promise
        if (!controller.signal.aborted) setFile({ pdf, url, asset })
      } catch {
        if (!controller.signal.aborted) setLoadError('Не удалось открыть PDF.')
      }
    }
    load()
    return () => {
      controller.abort()
      loading?.destroy().catch(() => {})
      if (url) URL.revokeObjectURL(url)
    }
  }, [asset, token])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(sheet.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (anchor) reader.current.scrollIntoView({ block: 'start' })
  }, [anchor])

  useEffect(() => {
    if (!file || file.asset !== asset || !width) return undefined
    let stopped = false
    let rendering
    setPageError('')
    async function render() {
      try {
        const page = await file.pdf.getPage(number)
        if (stopped) return
        const original = page.getViewport({ scale: 1 })
        const view = page.getViewport({ scale: width / original.width })
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        const target = canvas.current
        target.width = Math.ceil(view.width * ratio)
        target.height = Math.ceil(view.height * ratio)
        rendering = page.render({ canvas: target, viewport: view, transform: [ratio, 0, 0, ratio, 0, 0] })
        await rendering.promise
      } catch {
        if (!stopped) setPageError('Страница не отобразилась. Можно открыть оригинал PDF.')
      }
    }
    render()
    return () => {
      stopped = true
      rendering?.cancel()
    }
  }, [file, asset, number, width])

  const go = (page) => navigate(`${path}?at=page-${page}`)
  return (
    <>
      <div className="collection-toolbar mb-6 flex flex-wrap items-center justify-between gap-4">
        {chapterControl}
        {file?.asset === asset && <a className="collection-action" href={`${file.url}#page=${number}`}
          target="_blank" rel="noopener noreferrer">Открыть PDF</a>}
        {file?.asset === asset && <a className="collection-action" href={file.url} download={name}>Скачать PDF</a>}
      </div>
      <div ref={reader} className="collection-content collection-pdf-reader">
        <nav aria-label="Страницы главы" className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="collection-action" disabled={number === first}
            onClick={() => go(number - 1)}>← Назад</button>
          <span className="text-sm text-ink-500">Страница {number} из {chapter.pdf.total}</span>
          <button type="button" className="collection-action" disabled={number === last}
            onClick={() => go(number + 1)}>Дальше →</button>
        </nav>
        <div ref={sheet} className="collection-pdf-sheet">
          {loadError || pageError ? <p role="alert">{loadError || pageError}</p> :
            !file && <p role="status">Загружаем PDF…</p>}
          <canvas ref={canvas} hidden={!file || !!pageError} role="img" aria-label={`Страница ${number}, ${chapter.title}`} />
        </div>
      </div>
    </>
  )
}
