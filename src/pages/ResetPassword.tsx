import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'
import { useTranslation } from '../i18n/I18nContext'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'form'|'success'|'invalid'|'expired'|'used'>('form')

  useEffect(() => {
    if (!token) setStatus('invalid')
  }, [token])

  function validatePassword(pw: string) {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!validatePassword(newPassword)) {
      setError(t('resetPassword.passwordValidation'))
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError(t('resetPassword.passwordMismatch'))
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmNewPassword }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setStatus('success')
        return
      }

      const code = data?.error?.code
      if (code === 'RESET_TOKEN_INVALID') setStatus('invalid')
      else if (code === 'RESET_TOKEN_EXPIRED') setStatus('expired')
      else if (code === 'RESET_TOKEN_ALREADY_USED') setStatus('used')
      else setError(t('resetPassword.genericError'))
    } catch {
      setError(t('resetPassword.genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src="/img/logolinkup.png" alt="Linkup" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
          {status === 'invalid' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('resetPassword.invalidLink.title')}</h2>
              <p className="mb-6">{t('resetPassword.invalidLink.message')}</p>
              <Link to="/login" className="text-purple-400">{t('resetPassword.invalidLink.backToLogin')}</Link>
            </div>
          )}

          {status === 'expired' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('resetPassword.expiredLink.title')}</h2>
              <p className="mb-6">{t('resetPassword.expiredLink.message')}</p>
              <Link to="/forgot-password" className="text-purple-400">{t('resetPassword.expiredLink.forgotPassword')}</Link>
            </div>
          )}

          {status === 'used' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('resetPassword.usedLink.title')}</h2>
              <p className="mb-6">{t('resetPassword.usedLink.message')}</p>
              <Link to="/forgot-password" className="text-purple-400">{t('resetPassword.usedLink.forgotPassword')}</Link>
            </div>
          )}

          {status === 'success' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('resetPassword.success.title')}</h2>
              <p className="mb-6">{t('resetPassword.success.message')}</p>
              <button onClick={() => navigate('/login')} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">{t('resetPassword.success.loginButton')}</button>
            </div>
          )}

          {status === 'form' && (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">{t('resetPassword.title')}</h1>
              <p className="text-gray-400 mb-6">{t('resetPassword.subtitle')}</p>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('resetPassword.newPasswordLabel')}</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-800/60 border ${error ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
                    />
                    <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-3 top-3 text-sm text-gray-400">{showNew ? t('common.hide') : t('common.show')}</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('resetPassword.confirmLabel')}</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-800/60 border ${error ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
                      onBlur={() => {
                        if (confirmNewPassword && confirmNewPassword !== newPassword) setError(t('resetPassword.passwordMismatch'))
                        else setError('')
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-3 text-sm text-gray-400">{showConfirm ? t('common.hide') : t('common.show')}</button>
                  </div>
                </div>

                {error && <p className="mt-1 text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-8 py-3 mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-60"
                >
                  {isLoading ? t('resetPassword.resetting') : t('resetPassword.resetButton')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
