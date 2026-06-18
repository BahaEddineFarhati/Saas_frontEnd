import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed w-full bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src="/img/logolinkup.png" alt="Linkup" className="h-8 w-auto" />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">
                Welcome, <span className="font-semibold text-white">{user?.firstName}</span>
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 hover:border-red-500/50 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-12 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Dashboard</h1>
            <p className="text-gray-300 text-lg mb-8">Welcome to your Linkup dashboard!</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-white font-semibold mb-2">User Info</h3>
                <p className="text-gray-400 text-sm">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-gray-500 text-xs mt-2">{user?.email}</p>
              </div>

              <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Role</h3>
                <p className="text-gray-400 text-sm">{user?.role}</p>
              </div>

              <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Organisation ID</h3>
                <p className="text-gray-400 text-sm break-all">{user?.organisationId}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-12 px-8 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
