import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  UserPlus,
  DollarSign,
  Award,
  Info,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppNotification } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

export const NotificationDropdown: React.FC = () => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    setActiveModule,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: AppNotification) => {
    markNotificationAsRead(notification.id);
    if (notification.linkModule) {
      setActiveModule(notification.linkModule);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'LEAD':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <UserPlus size={16} />
          </div>
        );
      case 'PAYMENT':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={16} />
          </div>
        );
      case 'ENROLLMENT':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={16} />
          </div>
        );
      case 'SYSTEM':
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Info size={16} />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-hidden"
        title="Notificações do Sistema"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs animate-in fade-in duration-200">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Notificações</span>
              {unreadNotificationsCount > 0 ? (
                <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {unreadNotificationsCount} nova{unreadNotificationsCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-[11px] font-medium bg-slate-200/60 text-slate-600 rounded-full">
                  Em dia
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsAsRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={13} />
                  <span>Marcar lidas</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                  title="Limpar histórico"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                  <Bell size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700">Nenhuma notificação</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                  Inscrições recebidas de interessados e eventos importantes serão listados aqui.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                    !notif.read
                      ? 'bg-blue-50/40 hover:bg-blue-50/70 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {getNotificationIcon(notif.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !notif.read ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.linkModule && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-blue-600">
                        <span>Acessar {notif.linkModule === 'interessados' ? 'Funil' : notif.linkModule}</span>
                        <ArrowRight size={10} />
                      </div>
                    )}
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveModule('interessados');
                setIsOpen(false);
              }}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer"
            >
              <ExternalLink size={12} />
              <span>Ver Funil de Interessados</span>
            </button>
            <span className="text-[10px] text-slate-400">Total: {notifications.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};
