import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'
import { useTranslation } from '../i18n/I18nContext'
import LanguageToggleFloating from '../components/LanguageToggleFloating'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !validateEmail(email)) {
      setError(t('forgotPassword.invalidEmail'))
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setSubmitted(true)
        return
      }

      setError(t('forgotPassword.genericError'))
    } catch {
      setError(t('forgotPassword.genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <LanguageToggleFloating />
        <div className="w-full max-w-md">
          <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
            <h2 className="text-2xl font-semibold mb-4">{t('forgotPassword.sentTitle')}</h2>
            <p className="mb-6">{t('forgotPassword.sentMessage', { email })}</p>
            <Link to="/login" className="text-purple-400">{t('forgotPassword.backToLogin')}</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <LanguageToggleFloating />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src="/img/logolinkup.png" alt="Linkup" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
          <h1 className="text-3xl font-bold text-white mb-2">{t('forgotPassword.title')}</h1>
          <p className="text-gray-400 mb-6">{t('forgotPassword.subtitle')}</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('forgotPassword.emailLabel')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={`w-full px-4 py-3 bg-slate-800/60 border ${
                  error ? 'border-red-500' : 'border-purple-500/30'
                } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
              />
              {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
            </div>

            <div>
              <div className="mb-2">
                <Link to="/login" className="text-sm text-gray-400 underline">{t('forgotPassword.backToLogin')}</Link>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-60"
                >
                  {isLoading ? t('forgotPassword.sending') : t('forgotPassword.sendButton')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
