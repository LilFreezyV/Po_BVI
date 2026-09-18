import React, { useEffect, useState } from 'react'
import { Icon, Link, Logo, navigate } from './ui.jsx'
import { useAuth } from '../lib/auth.jsx'

const NAV = [
  { to: '/program', label: 'Программа' },
  { to: '/catalog', label: 'Каталог тем' },
  { to: '/base', label: 'Олимпиады и вузы' },
  { to: '/progress', label: 'Мой прогресс' },
  { to: '/#pricing', label: 'Тарифы' },
]

export default function Header({ route }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [route])

  const isActive = (to) => (to === '/catalog' ? route.startsWith('/catalog') || route.startsWith('/topic') : route === to)

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled ? 'border-line bg-paper/85 backdrop-blur-md' : 'border-transparent bg-paper'
      }`}
    >
      <div className="container-x flex h-[68px] items-center justify-between gap-4">
        <Link to="/" aria-label="На главную" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-[15px] font-semibold transition ${
                isActive(item.to) ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-brand-50/60 hover:text-ink-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <button className="btn-ghost px-3 py-2 text-sm" onClick={() => navigate('/progress')}>
                {user.name.split(' ')[0]}
              </button>
              <button className="btn-secondary px-4 py-2.5 text-sm" onClick={() => { logout(); navigate('/') }}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost px-3 py-2 text-sm" onClick={() => navigate('/login')}>
                Войти
              </button>
              <button className="btn-primary px-4 py-2.5 text-sm" onClick={() => navigate('/catalog')}>
                Попробовать бесплатно
              </button>
            </>
          )}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-lg border border-line text-ink-700 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-paper lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-3 text-[15px] font-semibold ${
                  isActive(item.to) ? 'bg-brand-50 text-brand-700' : 'text-ink-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <button className="btn-secondary mt-2 w-full" onClick={() => { logout(); navigate('/') }}>
                Выйти ({user.name.split(' ')[0]})
              </button>
            ) : (
              <>
                <button className="btn-secondary mt-2 w-full" onClick={() => navigate('/login')}>
                  Войти
                </button>
                <button className="btn-primary mt-2 w-full" onClick={() => navigate('/catalog')}>
                  Попробовать бесплатно
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
