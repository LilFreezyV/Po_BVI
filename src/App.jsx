import React, { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Landing from './pages/Landing.jsx'
import Catalog from './pages/Catalog.jsx'
import TopicPage from './pages/TopicPage.jsx'
import ProgressPage from './pages/Progress.jsx'
import Bvi from './pages/Bvi.jsx'
import Archive from './pages/Archive.jsx'
import Theory from './pages/Theory.jsx'
import Tiktok from './pages/Tiktok.jsx'
import Login from './pages/Login.jsx'
import Program from './pages/Program.jsx'

function Redirect({ to }) {
  useEffect(() => {
    window.location.replace(`#${to}`)
  }, [to])
  return null
}

function readHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [pathWithQuery, anchor] = raw.split('#')
  const [path, query] = (pathWithQuery || '/').split('?')
  return { path: path || '/', anchor: anchor || '', query: new URLSearchParams(query || '') }
}

export default function App() {
  const [{ path, anchor, query }, setLocation] = useState(readHash)

  useEffect(() => {
    const onHashChange = () => setLocation(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (anchor) {
      const el = document.getElementById(anchor)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [path, anchor])

  let page
  if (path.startsWith('/theory/')) {
    page = <Theory lessonId={path.slice('/theory/'.length)} />
  } else if (path === '/tiktok') {
    page = <Tiktok />
  } else if (path.startsWith('/topic/')) {
    page = <TopicPage topicId={path.slice('/topic/'.length)} />
  } else if (path === '/catalog') {
    page = <Catalog />
  } else if (path === '/progress') {
    page = <ProgressPage />
  } else if (path === '/base') {
    // Старая «База олимпиад и вузов» заменена навигатором — старые ссылки ведут туда.
    page = <Redirect to="/bvi" />
  } else if (path === '/bvi') {
    page = <Bvi />
  } else if (path === '/archive') {
    page = <Archive />
  } else if (path === '/program') {
    page = <Program focusLesson={query.get('lesson')} />
  } else if (path === '/login') {
    page = <Login next={query.get('next')} />
  } else {
    page = <Landing />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header route={path} />
      <main className="flex-1">{page}</main>
      <Footer />
    </div>
  )
}
