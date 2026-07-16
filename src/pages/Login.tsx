import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../config/api'

interface FormState {
  email: string
  password: string
}

type FieldErrors = Partial<Record<keyof FormState | 'credentials' | 'general', string>>

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}

  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!form.password) {
    errors.password = 'Password is required'
  }

  return errors
}

export default function Login() {
  const navigate = useNavigate()
  const { setUser, setAccessToken } = useAuth()
  const [form, setForm] = useState<FormState>({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name as keyof FieldErrors]
      delete next.credentials
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })

      const data = await res.json()

      if (res.status === 200 && data.success) {
        // Store in localStorage for persistence
        localStorage.setItem('accessToken', data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        localStorage.setItem('userRole', data.data.user.role)
        localStorage.setItem('userFirstName', data.data.user.firstName)
        localStorage.setItem('userLastName', data.data.user.lastName)
        localStorage.setItem('userEmail', data.data.user.email)
        localStorage.setItem('userFullName', `${data.data.user.firstName} ${data.data.user.lastName}`)

        // Update AuthContext so ProtectedRoute sees isAuthenticated=true
        setAccessToken(data.data.accessToken)
        setUser({
          id: data.data.user.id || '',
          fullName: `${data.data.user.firstName} ${data.data.user.lastName}`,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          role: data.data.user.role,
        })

        // Route super admin to the admin dashboard
        if (data.data.user.role === 'SUPER_ADMIN') {
          navigate('/admin/dashboard')
        } else {
          navigate('/dashboard')
        }
        return
      }

      if (res.status === 401 && data.error?.code === 'INVALID_CREDENTIALS') {
        setErrors({ credentials: 'Incorrect email or password' })
        return
      }

      setErrors({ general: data.error?.message ?? 'Login failed. Please try again.' })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src="/img/logolinkup.png" alt="Linkup" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-gray-400 mb-8">Sign in to your account</p>

          {/* Single credentials / general error banner */}
          {(errors.credentials || errors.general) && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.credentials ?? errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                autoComplete="email"
                className={`w-full px-4 py-3 bg-slate-800/60 border ${
                  errors.email ? 'border-red-500' : 'border-purple-500/30'
                } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                autoComplete="current-password"
                className={`w-full px-4 py-3 bg-slate-800/60 border ${
                  errors.password ? 'border-red-500' : 'border-purple-500/30'
                } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
              />
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-sm text-gray-400 underline">Mot de passe oublié ?</Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-8 py-3 mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
