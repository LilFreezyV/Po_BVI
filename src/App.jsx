import React, { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Landing from './pages/Landing.jsx'
import Catalog from './pages/Catalog.jsx'
import TopicPage from './pages/TopicPage.jsx'
import ProgressPage from './pages/Progress.jsx'
import Base from './pages/Base.jsx'

function readHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, anchor] = raw.split('#')
  return { path: path || '/', anchor: anchor || '' }
}

export default function App() {
  const [{ path, anchor }, setLocation] = useState(readHash)

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
  if (path.startsWith('/topic/')) {
    page = <TopicPage topicId={path.slice('/topic/'.length)} />
  } else if (path === '/catalog') {
    page = <Catalog />
  } else if (path === '/progress') {
    page = <ProgressPage />
  } else if (path === '/base') {
    page = <Base />
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
