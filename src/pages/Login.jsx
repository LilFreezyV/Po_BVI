import React, { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { navigate } from '../components/ui.jsx'

const MODES = [
  { id: 'login', label: 'Вход' },
  { id: 'register', label: 'Регистрация' },
]

const inputCls =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] outline-none transition placeholder:text-ink-300 focus:border-brand-400'

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{label}</span>
      <input className={inputCls} {...props} />
    </label>
  )
}

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [goal, setGoal] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({
          email,
          password,
          name,
          grade: grade || null,
          goal: goal || null,
          target: target || null,
        })
      }
      navigate('/progress')
    } catch (err) {
      setError(err.detail || err.message || 'Что-то пошло не так')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-md">
        <div className="inline-flex rounded-xl border border-line bg-white p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id)
                setError('')
              }}
              className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition ${
                mode === m.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6 sm:p-8">
          <h1 className="text-[22px] font-extrabold">
            {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
          </h1>

          <Field
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <Field
            label="Пароль"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 8 символов"
          />

          {mode === 'register' && (
            <>
              <Field
                label="Имя"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как к вам обращаться"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field
                  label="Класс"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="11 класс"
                />
                <Field
                  label="Вуз мечты"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="МФТИ · ФПМИ"
                />
                <Field
                  label="Целевые олимпиады"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Физтех, физика"
                />
              </div>
            </>
          )}

          {error && <p className="text-[14px] text-clay-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? 'Секунду…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  )
}
