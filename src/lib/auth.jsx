import React, { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => api.getToken())
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setAuthLoading(false)
      return
    }
    let cancelled = false
    api
      .me(token)
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        if (!cancelled) {
          api.clearToken()
          setTokenState(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const login = async (email, password) => {
    const { access_token } = await api.login(email, password)
    api.setToken(access_token)
    setTokenState(access_token)
    const u = await api.me(access_token)
    setUser(u)
    return u
  }

  const register = async (payload) => {
    const { user: newUser, token: newToken } = await api.register(payload)
    api.setToken(newToken.access_token)
    setTokenState(newToken.access_token)
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    api.clearToken()
    setTokenState(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, authLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth должен использоваться внутри <AuthProvider>')
  return ctx
}
