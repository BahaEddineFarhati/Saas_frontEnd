import { useEffect } from 'react';
import ReactDOM from 'react-dom';

export default function SuspensionModal() {
  // Block Escape key
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', block, true);
    return () => document.removeEventListener('keydown', block, true);
  }, []);

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
      </div>
    </div>,
    document.body
  );
}
