import { X, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../lib/NotificationContext';

export function ToastViewport() {
  const { toasts, dismissToast, openNotification } = useNotifications();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{toast.notification.title}</p>
              <p className="mt-1 text-sm text-slate-600">{toast.notification.message.split('.')[0]}.</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                dismissToast(toast.id);
                void openNotification(toast.notification);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Voir les résultats
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
