import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../hooks/useAuth';

export default function SuspensionModal() {
  const { logout } = useAuth();

  // Block Escape key
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', block, true);
    return () => document.removeEventListener('keydown', block, true);
  }, []);

  const handleLogout = async () => {
    await logout();
    // After logout, AuthContext clears everything and isOrgSuspended resets,
    // so the user lands on /login. If they log back in, the middleware will
    // return ORG_SUSPENDED again and the popup reappears.
  };

  return ReactDOM.createPortal(
    <div
      style={{ zIndex: 9999 }}
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 px-10 py-12 max-w-md w-full mx-4 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="../img/logoLinkUP.png"
            alt="LinkUp"
            className="h-12 w-auto"
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Organisation suspendue
        </h2>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          Votre organisation a été suspendue. Veuillez contacter
          l'administration LinkUp pour régulariser votre situation.
        </p>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-3">
          {/* Contact */}
          <a
            href="mailto:contact@linkup.tn"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition transform hover:scale-[1.02]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            contact@linkup.tn
          </a>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
