import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('fp_token')
    if (!token) { setLoading(false); return }
    try {
      const data = await api.get('/auth/me')
      setUser(data)
    } catch {
      localStorage.removeItem('fp_token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    localStorage.setItem('fp_token', data.token)
    setUser(data)
    return data
  }

  const register = async (formData) => {
    const data = await api.post('/auth/register', formData)
    localStorage.setItem('fp_token', data.token)
    setUser(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem('fp_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
