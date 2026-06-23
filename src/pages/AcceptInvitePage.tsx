import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API_BASE = 'http://localhost:3001/api/v1'

interface FormState {
  firstName: string
  lastName: string
  password: string
  passwordConfirmation: string
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}

  if (!form.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required'

  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = 'Password must contain at least one uppercase letter'
  } else if (!/[0-9]/.test(form.password)) {
    errors.password = 'Password must contain at least one number'
  }

  if (!form.passwordConfirmation) {
    errors.passwordConfirmation = 'Please confirm your password'
  } else if (form.password !== form.passwordConfirmation) {
    errors.passwordConfirmation = 'Passwords do not match'
  }

  return errors
}

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    password: '',
    passwordConfirmation: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrors({ general: 'Invalid invitation link. No token provided.' })
    }
  }, [token])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const res = await fetch(`${API_BASE}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
        }),
      })

      const data = await res.json()

      if (res.status === 201 && data.success) {
        localStorage.setItem('accessToken', data.data.accessToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        localStorage.setItem('userRole', data.data.user.role)
        localStorage.setItem('userFirstName', data.data.user.firstName)
        localStorage.setItem('userLastName', data.data.user.lastName)
        localStorage.setItem('userEmail', data.data.user.email)
        localStorage.setItem('userFullName', `${data.data.user.firstName} ${data.data.user.lastName}`)
        navigate('/dashboard')
        return
      }

      setErrors({ general: data.error?.message ?? 'Failed to accept invitation. Please try again.' })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (field: keyof FormState) =>
    `w-full px-4 py-3 bg-slate-800/60 border ${
      errors[field] ? 'border-red-500' : 'border-purple-500/30'
    } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/img/logolinkup.png" alt="Linkup" className="h-10 w-auto" />
        </div>

        <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
          <h1 className="text-3xl font-bold text-white mb-2">Complete your account</h1>
          <p className="text-gray-400 mb-8">You've been invited to join a team on LinkUp</p>

          {errors.general && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.general}</p>
            </div>
          )}

          {token ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">First name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Jane"
                    className={inputClass('firstName')}
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Last name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className={inputClass('lastName')}
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  className={inputClass('password')}
                />
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
                <input
                  type="password"
                  name="passwordConfirmation"
                  value={form.passwordConfirmation}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={inputClass('passwordConfirmation')}
                />
                {errors.passwordConfirmation && (
                  <p className="mt-1 text-sm text-red-400">{errors.passwordConfirmation}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-8 py-3 mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
              >
                {isLoading ? 'Creating account…' : 'Accept Invitation & Create Account'}
              </button>
            </form>
          ) : (
            <p className="text-center text-gray-400">
              This invitation link is invalid. Please contact your administrator for a new invite.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
