import React, { useEffect, useMemo, useRef } from 'react'
import { getConspectHtml } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { useAsync } from '../lib/useAsync.js'
import { Icon, Link, navigate } from '../components/ui.jsx'

/* Большой интерактивный конспект темы — самостоятельная HTML-страница из базы, показывается
   как есть во весь экран, сверху только тонкая плашка «назад на сайт».

   Страница живёт в iframe с srcdoc и sandbox без allow-same-origin: у неё свои скрипты
   (KaTeX, чертежи, спойлеры), а к localStorage сайта с токеном она доступа не получает.
   У srcdoc-документа адрес — адрес нашего сайта, поэтому ссылки внутри приходится
   перехватывать (скрипт BRIDGE ниже): «#s3» прокручиваем сами, ссылки оглавления на соседние
   файлы («02 Теория чисел.html») передаём сюда через postMessage и открываем роутером. */

const pad = (n) => String(n).padStart(2, '0')

export const conspectPath = (subject, number, section) =>
  `/conspect/${subject}${number ? `/${pad(number)}` : ''}${section ? `?s=${section}` : ''}`

const BRIDGE = (section) => `<script>
(function () {
  var start = ${JSON.stringify(section || '')};
  function go(id) {
    var el = id && document.getElementById(id);
    if (el) el.scrollIntoView({ block: 'start' });
    return !!el;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    var href = a.getAttribute('href');
    var file = href.match(/^(\\d{2})[^\\/#?]*\\.html(?:#(.*))?$/);
    if (file) {
      e.preventDefault();
      parent.postMessage({ type: 'bvi-conspect', number: +file[1], section: file[2] || '' }, '*');
    } else if (href.charAt(0) === '#') {
      e.preventDefault();
      go(decodeURIComponent(href.slice(1)));
    } else if (/^https?:/.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  }, true);
  if (start) {
    // Шрифты и формулы меняют высоту страницы — повторяем прокрутку, пока всё дорисовывается.
    var tries = 0;
    var timer = setInterval(function () { go(start); if (++tries > 6) clearInterval(timer); }, 250);
    window.addEventListener('load', function () { go(start); });
  }
})();
</script>`

function withBridge(html, section) {
  const bridge = BRIDGE(section)
  const at = html.lastIndexOf('</body>')
  return at === -1 ? html + bridge : html.slice(0, at) + bridge + html.slice(at)
}

function Bar({ subject, number, title }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-paper px-4 text-[14px] sm:px-6">
      <Link
        to="/catalog"
        className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-pen-700 hover:text-pen-900"
      >
        <Icon name="chevron" className="h-4 w-4 rotate-180" />
        <span className="hidden sm:inline">Без Вступительных · Темы</span>
        <span className="sm:hidden">На сайт</span>
      </Link>
      <span className="min-w-0 flex-1 truncate text-center font-mono text-[12px] text-ink-400">
        {title}
      </span>
      {number > 0 ? (
        <Link to={conspectPath(subject, 0)} className="shrink-0 font-semibold text-pen-700 hover:text-pen-900">
          Оглавление
        </Link>
      ) : (
        <span className="w-[86px] shrink-0" />
      )}
    </div>
  )
}

export default function Conspect({ subject, number, section }) {
  const { token, authLoading } = useAuth()
  const frame = useRef(null)
  const locked = number > 0 && !token
  const here = conspectPath(subject, number, section)

  // Гость открыл конспект темы — на вход и обратно сюда же (оглавление открыто всем).
  useEffect(() => {
    if (!authLoading && locked) {
      window.location.replace(`#/login?next=${encodeURIComponent(here)}`)
    }
  }, [authLoading, locked, here])

  const { data, loading, error } = useAsync(
    () => (authLoading || locked ? new Promise(() => {}) : getConspectHtml(subject, number, token)),
    [subject, number, token, authLoading, locked]
  )

  // Токен протух — тоже на вход.
  useEffect(() => {
    if (error?.status === 401) window.location.replace(`#/login?next=${encodeURIComponent(here)}`)
  }, [error, here])

  useEffect(() => {
    const onMessage = (e) => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== 'bvi-conspect') return
      const n = Number(e.data.number)
      if (Number.isInteger(n) && n >= 0) navigate(conspectPath(subject, n, e.data.section || null))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [subject])

  const srcDoc = useMemo(() => (data ? withBridge(data, section) : null), [data, section])
  const title = useMemo(() => {
    const m = data && data.match(/<title>([^<]*)<\/title>/)
    return m ? (number ? `${pad(number)} · ${m[1]}` : m[1]) : ''
  }, [data, number])

  useEffect(() => {
    if (title) document.title = `${title} — Без Вступительных`
  }, [title])
  useEffect(() => {
    const before = document.title
    return () => {
      document.title = before
    }
  }, [])

  return (
    <div className="flex h-[100dvh] flex-col bg-paper">
      <Bar subject={subject} number={number} title={title} />
      {srcDoc ? (
        <iframe
          ref={frame}
          key={`${number}-${section || ''}`}
          title={title || 'Конспект'}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className="w-full flex-1 border-0 bg-white"
        />
      ) : (
        <div className="grid flex-1 place-items-center px-6 text-center">
          {error && error.status !== 401 ? (
            <div>
              <p className="text-ink-400">
                {error.status === 404 ? 'Такого конспекта нет.' : error.message}
              </p>
              <Link to="/catalog" className="mt-4 inline-block font-semibold text-pen-700">
                Ко всем темам
              </Link>
            </div>
          ) : (
            <p className="font-mono text-[12px] text-ink-400">{loading ? 'Открываем конспект…' : ''}</p>
          )}
        </div>
      )}
    </div>
  )
}
