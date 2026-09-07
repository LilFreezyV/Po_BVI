import React from 'react'

/* ——— Навигация по хэшу (лёгкая замена роутеру в прототипе) ——— */

export function navigate(path) {
  window.location.hash = path
}

export function Link({ to, className = '', children, ...rest }) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        // Позволяем открыть в новой вкладке, но обычный клик обрабатываем сами
        if (e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}

/* ——— Иконки ——— */

const PATHS = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M4 12.5l5 5L20 7',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  spark: 'M12 3l1.9 5.4L19 10.3l-5.1 1.9L12 18l-1.9-5.8L5 10.3l5.1-1.9zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  chart: 'M4 20h16M7 20v-6M12 20V7M17 20v-9',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  building: 'M4 21h16M6 21V6l7-3v18M13 21V9l5 2v10M9 8h1M9 12h1M9 16h1',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.7 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name] || PATHS.arrow} />
    </svg>
  )
}

/* ——— Мелкие примитивы ——— */

export function Chip({ children, className = '' }) {
  return <span className={`chip ${className}`}>{children}</span>
}

export function SectionHeading({ eyebrow, title, text, align = 'left', className = '' }) {
  return (
    <div className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-[28px] font-extrabold leading-[1.15] sm:text-[36px]">{title}</h2>
      {text && <p className="mt-4 text-[17px] leading-relaxed text-ink-500">{text}</p>}
    </div>
  )
}

export function ProgressBar({ value, className = 'bg-brand-500', height = 'h-1.5' }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-ink-900/[0.07] ${height}`}>
      <div
        className={`${height} rounded-full ${className} transition-[width] duration-500`}
        style={{ width: `${Math.max(value, 0)}%` }}
      />
    </div>
  )
}

export function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-[10px] bg-brand-700 text-white">
        <span className="text-[15px] font-extrabold leading-none tracking-tight">БВ</span>
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-paper bg-clay-400" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-tight">Без Вступительных</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            физика · математика
          </span>
        </span>
      )}
    </span>
  )
}
