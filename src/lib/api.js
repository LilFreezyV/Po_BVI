const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const TOKEN_KEY = 'bvi_token'

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Ошибка API (${status})`)
    this.status = status
    this.detail = detail
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — сессия просто не переживёт перезагрузку
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // см. выше
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.')
  }

  if (!response.ok) {
    let detail = `Ошибка запроса (${response.status})`
    try {
      const data = await response.json()
      if (data?.detail) detail = data.detail
    } catch {
      // тело ответа не JSON — оставляем сообщение по умолчанию
    }
    throw new ApiError(response.status, detail)
  }

  if (response.status === 204) return null
  return response.json()
}

async function requestForm(path, formData) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, { method: 'POST', body: formData })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.')
  }
  if (!response.ok) {
    let detail = `Ошибка запроса (${response.status})`
    try {
      const data = await response.json()
      if (data?.detail) detail = data.detail
    } catch {
      // не JSON
    }
    throw new ApiError(response.status, detail)
  }
  return response.json()
}

/* ——— Контент ——— */

export const listSubjects = () => request('/subjects')
export const listSections = (subject) => request(`/sections${subject ? `?subject=${subject}` : ''}`)
export const listTopics = (token) => request('/topics', { token })
export const getTopic = (id, token) => request(`/topics/${id}`, { token })
export const listOlympiads = () => request('/olympiads')
export const listUniversities = () => request('/universities')
export const listPlans = () => request('/plans')

/* ——— Авторизация ——— */

export const register = (payload) => request('/auth/register', { method: 'POST', body: payload })
export const me = (token) => request('/auth/me', { token })

export function login(email, password) {
  const form = new URLSearchParams()
  form.set('username', email)
  form.set('password', password)
  return requestForm('/auth/login', form)
}

/* ——— Прогресс ——— */

export const progressTopics = (token) => request('/progress/topics', { token })
export const progressSubjects = (token) => request('/progress/subjects', { token })
export const progressOverview = (token) => request('/progress/overview', { token })
export const progressContinue = (token) => request('/progress/continue', { token })
export const progressWeakSpots = (token) => request('/progress/weak-spots', { token })
export const recordAttempt = (token, taskId, solved = true) =>
  request('/progress/attempts', { method: 'POST', token, body: { task_id: taskId, solved } })
