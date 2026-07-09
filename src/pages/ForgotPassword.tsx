import { useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3001/api/v1'

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
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
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
      <div className="max-w-md mx-auto mt-12">
        <h2 className="text-2xl font-semibold mb-4">Demande envoyée</h2>
        <p className="mb-6">Si un compte existe avec l'adresse {email}, vous recevrez un email dans quelques instants. Pensez à vérifier vos spams.</p>
        <Link to="/login" className="text-purple-400">Retour à la connexion</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h2 className="text-2xl font-semibold mb-2">Mot de passe oublié ?</h2>
      <p className="text-gray-400 mb-6">Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/60 border border-purple-500/30 rounded-lg text-white"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between">
          <Link to="/login" className="text-sm text-gray-400 underline">Retour à la connexion</Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg disabled:opacity-60"
          >
            {isLoading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
          </button>
        </div>
      </form>
    </div>
  )
}
