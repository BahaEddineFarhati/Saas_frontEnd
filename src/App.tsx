import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Register from './pages/Register'
import GuestRoute from './components/GuestRoute'
import { ProtectedRoute } from './components/ProtectedRoute'
function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed w-full bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src="/img/logolinkup.png" alt="Linkup" className="h-8 w-auto" />
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden md:flex gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#benefits" className="text-gray-300 hover:text-white transition">Benefits</a>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Transform Your
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent"> Recruitment Process</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-300 mb-8 leading-relaxed">
            An AI-powered recruitment SaaS that helps HR teams instantly analyze, rank, and generate interview questions from CVs based on a job description.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-lg hover:shadow-xl hover:shadow-purple-500/50 transition transform hover:scale-105"
            >
              Start Free Trial
            </button>
            <button className="px-8 py-4 border-2 border-purple-500 text-purple-300 text-lg font-semibold rounded-lg hover:bg-purple-500/10 transition">
              Watch Demo
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-gray-300">⚡ Instant CV Analysis</p>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-gray-300">🎯 Smart Ranking</p>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-gray-300">💡 Interview Questions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-16 text-center">Powerful Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: 'CV Analysis',
                description: 'Advanced AI algorithms analyze CVs instantly to extract key information and skills',
              },
              {
                title: 'Candidate Ranking',
                description: 'Automatically rank candidates based on job requirements and qualifications',
              },
              {
                title: 'Interview Questions',
                description: 'Generate customized interview questions tailored to specific candidates and roles',
              },
              {
                title: 'Job Matching',
                description: 'Intelligent matching between candidates and job descriptions in real-time',
              },
            ].map((feature, index) => (
              <div key={index} className="p-6 bg-slate-900/60 border border-purple-500/20 rounded-lg hover:border-purple-500/50 transition">
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to revolutionize your hiring?</h2>
          <p className="text-xl text-gray-300 mb-8">Join hundreds of HR teams already using Linkup to find the best talent</p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-lg hover:shadow-xl hover:shadow-purple-500/50 transition transform hover:scale-105"
          >
            Start Your Free Trial Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-purple-500/20 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/img/logolinkup.png" alt="Linkup" className="h-6 w-auto" />
            </div>
            <p className="text-gray-400 text-center">© 2024 Linkup. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        {/* /dashboard is a future route; redirect here after login/register */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <p className="text-white text-2xl font-bold">Dashboard coming soon</p>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
