import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, ChevronUp, X, ExternalLink } from 'lucide-react';
import { getNotifications, showHostNotification } from '../services/electronApi';
import type { NotificationItem } from '../types/device';

interface NotificationBannerOverlayProps {
  serial: string;
  onOpenNotificationsTab?: () => void;
}

interface BannerItem extends NotificationItem {
  bannerId: string;
  expanded?: boolean;
}

export function NotificationBannerOverlay({
  serial,
  onOpenNotificationsTab,
}: NotificationBannerOverlayProps) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef<boolean>(true);

  // Poll for incoming notifications periodically
  useEffect(() => {
    if (!serial) return;

    // Reset seen ref when device changes
    seenIdsRef.current = new Set();
    initialLoadRef.current = true;

    const checkNotifications = async () => {
      try {
        const res = await getNotifications(serial);
        if (res.success && res.data) {
          const currentItems = res.data;

          if (initialLoadRef.current) {
            // First load: populate seen IDs without triggering popups for existing ones
            currentItems.forEach((item) => seenIdsRef.current.add(item.id));
            initialLoadRef.current = false;
            return;
          }

          // Identify newly arrived notifications
          const newItems = currentItems.filter((item) => !seenIdsRef.current.has(item.id));

          if (newItems.length > 0) {
            newItems.forEach((item) => {
              seenIdsRef.current.add(item.id);

              // 1. Trigger Host (Laptop/Desktop) OS Notification
              showHostNotification(
                item.title,
                item.text || item.subText || 'New notification',
                item.appName
              ).catch(() => {});

              // 2. Add to in-app Banner stack
              const bannerItem: BannerItem = {
                ...item,
                bannerId: `${item.id}-${Date.now()}`,
                expanded: false,
              };

              setBanners((prev) => [bannerItem, ...prev].slice(0, 4));
            });
          }
        }
      } catch {
        // Silent catch for background poll
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 4000);
    return () => clearInterval(interval);
  }, [serial]);

  const dismissBanner = (bannerId: string) => {
    setBanners((prev) => prev.filter((b) => b.bannerId !== bannerId));
  };

  const toggleExpand = (bannerId: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.bannerId === bannerId ? { ...b, expanded: !b.expanded } : b))
    );
  };

  if (banners.length === 0) return null;

  return (
    <div className="fixed top-14 right-3 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none select-text">
      {banners.map((item) => {
        const isVeryLongText = item.text && item.text.length > 350;
        const displayText =
          isVeryLongText && !item.expanded ? `${item.text.slice(0, 350)}…` : item.text;

        return (
          <div
            key={item.bannerId}
            className="pointer-events-auto p-3.5 sm:p-4 rounded-2xl bg-surface-800/95 backdrop-blur-xl border border-accent/40 shadow-2xl shadow-black/80 flex flex-col gap-2 animate-bounce-in transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-accent/20 text-accent-light shrink-0">
                  <Bell size={14} />
                </div>
                <span className="text-[11px] font-bold text-accent-light uppercase tracking-wider truncate">
                  {item.appName}
                </span>
                <span className="text-[10px] text-gray-500 shrink-0">{item.timestamp}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onOpenNotificationsTab && (
                  <button
                    onClick={() => {
                      onOpenNotificationsTab();
                      dismissBanner(item.bannerId);
                    }}
                    className="p-1 text-gray-400 hover:text-accent-light rounded-lg hover:bg-surface-700 transition-colors"
                    title="View in Notification Center"
                  >
                    <ExternalLink size={13} />
                  </button>
                )}
                <button
                  onClick={() => dismissBanner(item.bannerId)}
                  className="p-1 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-surface-700 transition-colors"
                  title="Dismiss banner"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification Title & Body */}
            <div>
              <h4 className="text-xs font-bold text-gray-100 break-words">{item.title}</h4>
              {item.text && (
                <p className="text-xs text-gray-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                  {displayText}
                </p>
              )}
            </div>

            {/* "Show More" / "Show Less" Expand Button for extra long text */}
            {isVeryLongText && (
              <div className="pt-1 flex items-center justify-between border-t border-surface-700/60 mt-1">
                <button
                  onClick={() => toggleExpand(item.bannerId)}
                  className="flex items-center gap-1 text-[11px] font-bold text-accent-light hover:text-accent transition-colors"
                >
                  {item.expanded ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp size={13} />
                    </>
                  ) : (
                    <>
                      <span>Show More</span>
                      <ChevronDown size={13} />
                    </>
                  )}
                </button>

                <span className="text-[10px] text-gray-500">
                  {item.expanded ? `${item.text.length} chars` : 'Truncated'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
