import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:3001/api/v1'

interface FormState {
  organisationName: string
  firstName: string
  lastName: string
  email: string
  password: string
  passwordConfirmation: string
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}

  if (!form.organisationName.trim())
    errors.organisationName = 'Organisation name is required'

  if (!form.firstName.trim())
    errors.firstName = 'First name is required'

  if (!form.lastName.trim())
    errors.lastName = 'Last name is required'

  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address'
  }

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

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({
    organisationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
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
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationName: form.organisationName,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        }),
      })

      const data = await res.json()

      if (res.status === 201) {
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        localStorage.setItem('userRole', data.user.role)
        navigate('/dashboard')
        return
      }

      if (res.status === 409 && data.error?.code === 'AUTH_EMAIL_TAKEN') {
        setErrors({ email: 'This email is already in use' })
        return
      }

      setErrors({ general: data.error?.message ?? 'Registration failed. Please try again.' })
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  function field(
    label: string,
    name: keyof FormState,
    type: string,
    placeholder: string,
  ) {
    const error = errors[name]
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <input
          type={type}
          name={name}
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          autoComplete={type === 'password' ? 'new-password' : undefined}
          className={`w-full px-4 py-3 bg-slate-800/60 border ${
            error ? 'border-red-500' : 'border-purple-500/30'
          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src="/img/logolinkup.png" alt="Linkup" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-gray-400 mb-8">Start your free trial today</p>

          {errors.general && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {field('Organisation name', 'organisationName', 'text', 'Acme Corp')}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {field('First name', 'firstName', 'text', 'Jane')}
              {field('Last name', 'lastName', 'text', 'Smith')}
            </div>

            {field('Work email', 'email', 'email', 'jane@acme.com')}
            {field('Password', 'password', 'password', 'Min. 8 chars, 1 uppercase, 1 number')}
            {field('Confirm password', 'passwordConfirmation', 'password', 'Re-enter your password')}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-8 py-3 mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
