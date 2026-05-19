import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setPanelOpen,
} from '../../store/notificationsSlice';

const PRIORITY_DOT = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
};

const POLL_MS = 30000;

const NotificationBell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 64, right: 16 });

  const { items, unreadCount, loading } = useSelector((s) => s.notifications);

  const refresh = useCallback(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const updateCoords = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    dispatch(setPanelOpen(open));
  }, [open, dispatch]);

  useEffect(() => {
    if (!open) return undefined;

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);

    const onDocClick = (e) => {
      if (anchorRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open, updateCoords]);

  const handleClick = async (n) => {
    if (!n.read) {
      await dispatch(markNotificationRead(n.id));
    }
    setOpen(false);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  const btnCls =
    'relative rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200';

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[100] w-[min(100vw-1rem,22rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"
          style={{ top: coords.top, right: coords.right }}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                onClick={() => dispatch(markAllNotificationsRead())}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(20rem,calc(100vh-6rem))] overflow-y-auto">
            {loading && !items.length ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
                No notifications yet
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left transition hover:bg-gray-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50',
                    !n.read && 'bg-primary-50/40 dark:bg-primary-900/10'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      PRIORITY_DOT[n.priority] || PRIORITY_DOT.medium
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={btnCls}
        title="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) refresh();
            return next;
          });
        }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 text-[9px] font-bold bg-violet-600 text-white rounded-full flex items-center justify-center
">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  );
};

export default NotificationBell;
