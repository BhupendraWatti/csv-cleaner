import React from 'react';

export interface ToastMessage {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
}

interface ToastBannerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastBanner({ toasts, onDismiss }: ToastBannerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map(toast => {
        const bg =
          toast.type === 'error'
            ? 'bg-[#ffdad6] dark:bg-[#450a0a] border-[#ba1a1a] dark:border-[#f87171] text-[#410002] dark:text-[#fca5a5]'
            : toast.type === 'warning'
            ? 'bg-[#ffdcc4] dark:bg-[#451a03] border-[#5f2f00] dark:border-[#f59e0b] text-[#3f1d00] dark:text-[#fcd34d]'
            : toast.type === 'success'
            ? 'bg-[#c1ecd4] dark:bg-[#0e2019] border-[#012d1d] dark:border-[#34d399] text-[#002114] dark:text-[#34d399]'
            : 'bg-[#e2e9ec] dark:bg-[#162f25] border-[#414844] dark:border-[#1b3b2f] text-[#161d1f] dark:text-[#f0fdf4]';

        const icon =
          toast.type === 'error'
            ? 'error'
            : toast.type === 'warning'
            ? 'warning'
            : toast.type === 'success'
            ? 'check_circle'
            : 'info';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${bg}`}
          >
            <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">{icon}</span>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold font-display leading-tight">{toast.title}</h5>
              <p className="text-[11px] leading-snug opacity-90 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="opacity-60 hover:opacity-100 p-0.5 shrink-0"
              aria-label="Dismiss toast"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
