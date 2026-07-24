import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../config/api'
import { useTranslation } from '../i18n/I18nContext'
import LanguageToggleFloating from '../components/LanguageToggleFloating'

interface FormState {
  firstName: string
  lastName: string
  password: string
  passwordConfirmation: string
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>

export default function AcceptInvitePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const logoutTriggered = useRef(false)

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    password: '',
    passwordConfirmation: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  function validate(formData: FormState): FieldErrors {
    const errs: FieldErrors = {}

    if (!formData.firstName.trim()) errs.firstName = t('validation.firstNameRequired')
    if (!formData.lastName.trim()) errs.lastName = t('validation.lastNameRequired')

    if (!formData.password) {
      errs.password = t('validation.passwordRequired')
    } else if (formData.password.length < 8) {
      errs.password = t('validation.passwordMinLength')
    } else if (!/[A-Z]/.test(formData.password)) {
      errs.password = t('validation.passwordUppercase')
    } else if (!/[0-9]/.test(formData.password)) {
      errs.password = t('validation.passwordNumber')
    }

    if (!formData.passwordConfirmation) {
      errs.passwordConfirmation = t('validation.confirmPasswordRequired')
    } else if (formData.password !== formData.passwordConfirmation) {
      errs.passwordConfirmation = t('validation.passwordsDoNotMatch')
    }

    return errs
  }

  // If the user is already authenticated, auto-logout first so they can
  // use the invite link to create a fresh account in the new org.
  useEffect(() => {
    if (!authLoading && isAuthenticated && !logoutTriggered.current) {
      logoutTriggered.current = true
      setIsLoggingOut(true)
      logout().finally(() => {
        setIsLoggingOut(false)
      })
    }
  }, [authLoading, isAuthenticated, logout])

  useEffect(() => {
    if (!token) {
      setErrors({ general: t('acceptInvite.invalidToken') })
    }
  }, [token, t])

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
      const res = await fetch(`${API_BASE_URL}/auth/accept-invite`, {
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

      setErrors({ general: data.error?.message ?? t('acceptInvite.acceptFailed') })
    } catch {
      setErrors({ general: t('acceptInvite.unexpectedError') })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (field: keyof FormState) =>
    `w-full px-4 py-3 bg-slate-800/60 border ${
      errors[field] ? 'border-red-500' : 'border-purple-500/30'
    } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`

  // Show loading while auto-logout is in progress or auth state is loading
  if (authLoading || isLoggingOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 border-4 border-gray-300 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400">{t('acceptInvite.preparingInvitation')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <LanguageToggleFloating />
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/img/logolinkup.png" alt="Linkup" className="h-10 w-auto" />
        </div>

        <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
          <h1 className="text-3xl font-bold text-white mb-2">{t('acceptInvite.title')}</h1>
          <p className="text-gray-400 mb-8">{t('acceptInvite.subtitle')}</p>

          {errors.general && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.general}</p>
            </div>
          )}

          {token ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('acceptInvite.firstNameLabel')}</label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder={t('acceptInvite.firstNamePlaceholder')}
                    className={inputClass('firstName')}
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('acceptInvite.lastNameLabel')}</label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder={t('acceptInvite.lastNamePlaceholder')}
                    className={inputClass('lastName')}
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('acceptInvite.passwordLabel')}</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t('acceptInvite.passwordPlaceholder')}
                  autoComplete="new-password"
                  className={inputClass('password')}
                />
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('acceptInvite.confirmPasswordLabel')}</label>
                <input
                  type="password"
                  name="passwordConfirmation"
                  value={form.passwordConfirmation}
                  onChange={handleChange}
                  placeholder={t('acceptInvite.confirmPasswordPlaceholder')}
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
                {isLoading ? t('acceptInvite.creating') : t('acceptInvite.submitButton')}
              </button>
            </form>
          ) : (
            <p className="text-center text-gray-400">
              {t('acceptInvite.invalidLink')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
