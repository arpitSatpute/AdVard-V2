import { useState, useEffect } from 'react';
import { Bell, RefreshCw, Smartphone } from 'lucide-react';
import { getNotifications } from '../services/electronApi';
import type { NotificationItem } from '../types/device';
import { useToast } from './Toast';

interface NotificationCenterProps {
  serial: string;
}

export function NotificationCenter({ serial }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await getNotifications(serial);
      if (res.success && res.data) {
        setNotifications(res.data);
      } else {
        showToast(res.error ?? 'Failed to fetch notifications', 'error');
      }
    } catch {
      showToast('Error loading notifications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [serial]);

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 overflow-hidden flex flex-col h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 bg-surface-800">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Android Notification Center ({notifications.length})
          </span>
        </div>
        <button
          onClick={fetchNotifications}
          disabled={isLoading}
          className="p-1 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-300 disabled:opacity-30"
          title="Refresh Notifications"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
            <RefreshCw size={18} className="animate-spin text-accent-light" />
            Fetching system notifications…
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
            <Smartphone size={24} className="text-gray-600" />
            No active system notifications detected.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-surface-800 border border-surface-600 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-accent-light uppercase tracking-wider">
                  {item.appName}
                </span>
                <span className="text-[10px] text-gray-500">{item.timestamp}</span>
              </div>
              <p className="text-xs font-semibold text-gray-200">{item.title}</p>
              {item.text && <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
