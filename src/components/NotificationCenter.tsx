import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  RefreshCw,
  Smartphone,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Laptop,
  Filter,
  Sparkles,
  Send,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { getNotifications, showHostNotification } from '../services/electronApi';
import type { NotificationItem } from '../types/device';
import { UnlockModal } from './UnlockModal';
import { useToast } from './Toast';

interface NotificationCenterProps {
  serial: string;
}

export function NotificationCenter({ serial }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hostNotificationEnabled, setHostNotificationEnabled] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);

  const { showToast } = useToast();

  // Request browser/host notification permissions on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  const fetchNotifications = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await getNotifications(serial);
      if (res.success && res.data) {
        setNotifications(res.data);
        if (!quiet) {
          showToast(`Synced ${res.data.length} notifications`, 'info');
        }
      } else {
        if (!quiet) showToast(res.error ?? 'Failed to fetch notifications', 'error');
      }
    } catch {
      if (!quiet) showToast('Error loading notifications', 'error');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [serial]);

  // Periodic background auto-refresh
  useEffect(() => {
    if (!autoRefresh || !serial) return;
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [serial, autoRefresh]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyText = (item: NotificationItem) => {
    const fullContent = `${item.appName}: ${item.title}\n${item.text}`;
    navigator.clipboard.writeText(fullContent);
    setCopiedId(item.id);
    showToast('Notification copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDismissItem = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    showToast('Notification dismissed', 'info');
  };

  const handleClearAll = () => {
    setNotifications([]);
    setExpandedIds(new Set());
    showToast('All notifications cleared', 'info');
  };

  const handleTriggerHostTest = async (item?: NotificationItem) => {
    try {
      const title = item ? item.title : 'Test Desktop Notification';
      const body = item ? item.text || 'Device notification test' : 'AdVard is connected to your Android device.';
      const appName = item ? item.appName : 'AdVard';

      const res = await showHostNotification(title, body, appName);
      if (res.success) {
        showToast('Desktop notification sent to laptop/desktop!', 'success');
      } else {
        showToast(res.error || 'Failed to send host notification', 'error');
      }
    } catch {
      showToast('Error sending desktop notification', 'error');
    }
  };

  // Distinct app list for filter selector
  const availableApps = useMemo(() => {
    const apps = new Set<string>();
    notifications.forEach((item) => {
      if (item.appName) apps.add(item.appName);
    });
    return Array.from(apps).sort();
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesApp = selectedApp === 'all' || item.appName.toLowerCase() === selectedApp.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.text.toLowerCase().includes(query) ||
        item.appName.toLowerCase().includes(query) ||
        item.packageName.toLowerCase().includes(query);
      return matchesApp && matchesQuery;
    });
  }, [notifications, selectedApp, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-900 text-gray-200 overflow-hidden space-y-4 max-w-7xl mx-auto w-full">
      {/* Device PIN / Unlock Modal */}
      <UnlockModal
        serial={serial}
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
      />

      {/* Top Banner Header */}
      <div className="bg-surface-800 p-5 rounded-2xl border border-surface-600 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Bell size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-100">Android Notification Center</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/20 text-accent-light border border-accent/30">
                {notifications.length} Total
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Live stream and manager for all incoming Android notifications
            </p>
          </div>
        </div>

        {/* Header Action Controls - Sync and Clear buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchNotifications(false)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-dark disabled:opacity-40 transition-all shadow-md shadow-accent/20"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all shadow-sm"
              title="Clear all listed notifications"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-800 p-3 rounded-2xl border border-surface-600">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by app, title or content..."
            className="w-full pl-10 pr-4 py-2 bg-surface-900 border border-surface-600 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* App Filter Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter size={14} className="text-gray-400 shrink-0" />
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="px-3 py-2 bg-surface-900 border border-surface-600 rounded-xl text-xs font-semibold text-gray-200 focus:outline-none focus:border-accent transition-all"
          >
            <option value="all">All Apps ({notifications.length})</option>
            {availableApps.map((app) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications Cards Stream */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 text-xs gap-3">
            <RefreshCw size={24} className="animate-spin text-accent-light" />
            <span>Fetching system notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty / Hidden Content State with Unlock Option */
          <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-4 bg-surface-800/60 rounded-2xl border border-dashed border-surface-600">
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert size={36} />
            </div>

            <div className="max-w-md space-y-1.5">
              <h3 className="text-sm font-bold text-gray-200">
                No Visible Notifications
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                If the phone screen is locked or notification contents are hidden, unlock the device to view notifications.
              </p>
            </div>

            <button
              onClick={() => setIsUnlockModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-md"
            >
              <Unlock size={14} />
              <span>Unlock Device</span>
            </button>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isExpanded = expandedIds.has(item.id);

            // Clean title if placeholder e.g. "Message ..." or "Wireless..."
            let cleanTitle = item.title;
            if (!cleanTitle || /(\.\.\.|\u2026|\.\s*\.\s*\.)$/.test(cleanTitle.trim()) || /^(message|wireless|notification)\b/i.test(cleanTitle.trim())) {
              if (item.packageName.toLowerCase().includes('whatsapp')) {
                cleanTitle = 'WhatsApp Message';
              } else if (item.packageName.toLowerCase().includes('wireless') || item.packageName.toLowerCase().includes('android')) {
                cleanTitle = 'Wireless Debugging Service';
              } else {
                cleanTitle = `${item.appName} Notification`;
              }
            }

            // Clean text body
            let cleanBody = item.text;
            if (cleanBody && ( /(\.\.\.|\u2026|\.\s*\.\s*\.)$/.test(cleanBody.trim()) || /^(message|wireless|notification)\b/i.test(cleanBody.trim()) )) {
              if (item.subText && !/(\.\.\.|\u2026)$/.test(item.subText)) {
                cleanBody = item.subText;
              } else {
                cleanBody = `${item.appName} active notification`;
              }
            }

            // Render text fully by default; only offer collapse option for very long messages (> 400 chars)
            const isVeryLongText = cleanBody && cleanBody.length > 400;
            const displayText =
              isVeryLongText && !isExpanded ? `${cleanBody.slice(0, 400)}…` : cleanBody;

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4.5 rounded-2xl border transition-all ${
                  isExpanded
                    ? 'bg-surface-800 border-accent/40 shadow-lg'
                    : 'bg-surface-800/80 border-surface-600/80 hover:border-surface-500'
                }`}
              >
                {/* Header row - responsive layout */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <div className="px-2.5 py-1 rounded-xl bg-accent/20 border border-accent/30 text-accent-light text-[11px] font-bold uppercase tracking-wider truncate">
                      {item.appName}
                    </div>
                    {item.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700 text-gray-400 border border-surface-600">
                        {item.category}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500 font-mono truncate max-w-[150px] sm:max-w-none">
                      {item.packageName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-gray-400">{item.timestamp}</span>

                    <button
                      onClick={() => handleCopyText(item)}
                      className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-surface-700 rounded-lg transition-colors"
                      title="Copy notification text"
                    >
                      {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>

                    <button
                      onClick={() => handleTriggerHostTest(item)}
                      className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-surface-700 rounded-lg transition-colors"
                      title="Forward to Desktop Host notification"
                    >
                      <Laptop size={14} />
                    </button>

                    <button
                      onClick={() => handleDismissItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-surface-700 rounded-lg transition-colors"
                      title="Dismiss notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Title & Full Body Content */}
                <div className="mt-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-gray-100 break-words leading-snug">{cleanTitle}</h3>
                  {item.text ? (
                    <p className="text-xs text-gray-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                      {displayText}
                    </p>
                  ) : (
                    /* Content not visible / hidden prompt */
                    <div className="mt-2 p-2.5 rounded-xl bg-surface-900/90 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-xs text-amber-300">
                        <Lock size={14} className="shrink-0 text-amber-400" />
                        <span>Content restricted or screen locked</span>
                      </div>

                      <button
                        onClick={() => setIsUnlockModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                      >
                        <Unlock size={12} /> Unlock Device
                      </button>
                    </div>
                  )}
                  {item.subText && (
                    <p className="text-[11px] text-gray-400 italic mt-1">{item.subText}</p>
                  )}
                </div>

                {/* Optional Expand Toggle for Extra Long Text (> 400 chars) */}
                {isVeryLongText && (
                  <div className="mt-3 pt-2 border-t border-surface-700/60 flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-700/80 hover:bg-surface-700 text-accent-light text-xs font-bold transition-all border border-accent/20"
                    >
                      {isExpanded ? (
                        <>
                          <span>Show Less</span>
                          <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          <span>Show More</span>
                          <ChevronDown size={14} />
                        </>
                      )}
                    </button>

                    <span className="text-[10px] text-gray-500 font-mono">
                      {isExpanded ? `Full Text (${item.text.length} characters)` : 'Truncated'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
