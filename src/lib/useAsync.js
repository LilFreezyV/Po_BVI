import { useEffect, useState } from 'react'

// Общий паттерн загрузки данных с сервера: дёргает fn при изменении deps,
// игнорирует результат, если компонент размонтирован или deps успели поменяться
// раньше, чем пришёл ответ (защита от гонки).
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    fn()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
