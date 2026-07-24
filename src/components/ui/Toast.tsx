import { X, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../lib/NotificationContext';
import { useTranslation } from '../../i18n/I18nContext';
import { formatNotification } from '../../lib/notificationUtils';

export function ToastViewport() {
  const { toasts, dismissToast, openNotification } = useNotifications();
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => {
        const formatted = formatNotification(toast.notification, t);
        return (
          <div
            key={toast.id}
            className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1C2236] p-4 shadow-2xl shadow-slate-900/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatted.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{formatted.message.split('.')[0]}.</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={t('common.dismiss')}
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
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-2 text-sm font-medium text-white dark:text-slate-900 transition hover:bg-slate-700 dark:hover:bg-slate-300"
              >
                {t('common.viewResults')}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
