import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'

export default function ForgotPassword() {
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
      setError("Veuillez saisir une adresse email valide.")
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

      setError("Une erreur s'est produite. Veuillez réessayer.")
    } catch (err) {
      setError("Une erreur s'est produite. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-md">
            <h2 className="text-2xl font-semibold mb-4">Demande envoyée</h2>
            <p className="mb-6">Si un compte existe avec l'adresse {email}, vous recevrez un email dans quelques instants. Pensez à vérifier vos spams.</p>
            <Link to="/login" className="text-purple-400">Retour à la connexion</Link>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-white mb-2">Mot de passe oublié ?</h1>
          <p className="text-gray-400 mb-6">Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
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
                <Link to="/login" className="text-sm text-gray-400 underline">Retour à la connexion</Link>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-60"
                >
                  {isLoading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
