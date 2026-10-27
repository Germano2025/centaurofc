import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const styles = {
    success: 'bg-emerald-600 text-white shadow-emerald-600/30',
    error: 'bg-rose-600 text-white shadow-rose-600/30',
    info: 'bg-slate-900 text-white shadow-slate-900/30',
  };

  const icons = {
    success: <CheckCircle2 size={16} className="text-white shrink-0" />,
    error: <AlertTriangle size={16} className="text-white shrink-0" />,
    info: <Info size={16} className="text-blue-300 shrink-0" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold max-w-md ${styles[type]}`}
      >
        {icons[type]}
        <span className="flex-1">{message}</span>
        {onClose && (
          <button onClick={onClose} className="p-0.5 hover:opacity-80 cursor-pointer">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
