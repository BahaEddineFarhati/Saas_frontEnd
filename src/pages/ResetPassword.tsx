import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:3001/api/v1'

export default function ResetPassword() {
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
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
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
      else setError("Une erreur s'est produite. Veuillez réessayer.")
    } catch (err) {
      setError("Une erreur s'est produite. Veuillez réessayer.")
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
              <h2 className="text-xl font-semibold mb-4">Ce lien est invalide</h2>
              <p className="mb-6">Ce lien de réinitialisation est invalide. Veuillez retourner à la page de connexion.</p>
              <Link to="/login" className="text-purple-400">Retour à la connexion</Link>
            </div>
          )}

          {status === 'expired' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Lien expiré</h2>
              <p className="mb-6">Ce lien a expiré (valable 1 heure). Veuillez faire une nouvelle demande.</p>
              <Link to="/forgot-password" className="text-purple-400">Mot de passe oublié ?</Link>
            </div>
          )}

          {status === 'used' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Lien déjà utilisé</h2>
              <p className="mb-6">Ce lien a déjà été utilisé. Si vous avez besoin de réinitialiser à nouveau votre mot de passe, faites une nouvelle demande.</p>
              <Link to="/forgot-password" className="text-purple-400">Mot de passe oublié ?</Link>
            </div>
          )}

          {status === 'success' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Mot de passe réinitialisé</h2>
              <p className="mb-6">Votre mot de passe a été réinitialisé avec succès.</p>
              <button onClick={() => navigate('/login')} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">Se connecter</button>
            </div>
          )}

          {status === 'form' && (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Réinitialiser le mot de passe</h1>
              <p className="text-gray-400 mb-6">Entrez votre nouveau mot de passe.</p>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-800/60 border ${error ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
                    />
                    <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-3 top-3 text-sm text-gray-400">{showNew ? 'Hide' : 'Show'}</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirmer le nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-800/60 border ${error ? 'border-red-500' : 'border-purple-500/30'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`}
                      onBlur={() => {
                        if (confirmNewPassword && confirmNewPassword !== newPassword) setError('Les mots de passe ne correspondent pas.')
                        else setError('')
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-3 text-sm text-gray-400">{showConfirm ? 'Hide' : 'Show'}</button>
                  </div>
                </div>

                {error && <p className="mt-1 text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-8 py-3 mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-60"
                >
                  {isLoading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
