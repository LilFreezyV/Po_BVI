import React, { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { Icon, navigate } from './ui.jsx'

// Стили статусов задачи — общие для карточек задач и кнопок.
export const ATTEMPT_CARD = {
  solved: 'border-brand-200 bg-brand-50/40',
  question: 'border-amber-100 bg-amber-50/50',
}

const BUTTONS = [
  { id: 'solved', label: 'Решена', icon: 'check', active: 'border-brand-600 bg-brand-600 text-white' },
  { id: 'question', label: 'Есть вопросы', icon: 'spark', active: 'border-amber-600 bg-amber-600 text-white' },
]

function goToLogin() {
  const current = window.location.hash.replace(/^#/, '') || '/'
  navigate(`/login?next=${encodeURIComponent(current)}`)
}

// Один статус на задачу; повторное нажатие активной кнопки снимает отметку.
// onChange(status) должен вернуть промис — пока он выполняется, кнопки заблокированы.
export default function AttemptButtons({ status, onChange }) {
  const { token } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const click = async (id) => {
    if (!token) {
      goToLogin()
      return
    }
    setBusy(true)
    setError('')
    try {
      await onChange(status === id ? null : id)
    } catch {
      setError('Не сохранилось, попробуйте ещё раз')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {BUTTONS.map((b) => {
        const active = status === b.id
        return (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            aria-pressed={active}
            onClick={() => click(b.id)}
            title={!token ? 'Войдите, чтобы сохранять прогресс' : active ? 'Нажмите ещё раз, чтобы снять отметку' : ''}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition disabled:opacity-60 ${
              active ? b.active : 'border-line bg-white text-ink-500 hover:border-ink-300 hover:text-ink-900'
            }`}
          >
            <Icon name={b.icon} className="h-3.5 w-3.5" strokeWidth={2} />
            {b.label}
          </button>
        )
      })}
      {error && <span className="text-[12px] text-clay-600">{error}</span>}
    </div>
  )
}
