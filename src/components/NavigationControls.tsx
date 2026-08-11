import { useState } from 'react';
import { Home, ChevronLeft, LayoutGrid, Loader2 } from 'lucide-react';
import { pressHome, pressBack, pressRecent } from '../services/electronApi';
import { useToast } from './Toast';

interface NavigationControlsProps {
  serial: string;
}

type NavButton = 'home' | 'back' | 'recent' | null;

export function NavigationControls({ serial }: NavigationControlsProps) {
  const [loading, setLoading] = useState<NavButton>(null);
  const { showToast } = useToast();

  const handle = async (action: NavButton, fn: () => Promise<{ success: boolean; error?: string }>) => {
    if (loading) return;
    setLoading(action);
    try {
      const result = await fn();
      if (!result.success) {
        showToast(result.error ?? 'Command failed', 'error');
      }
    } catch {
      showToast('Command failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  const buttons = [
    {
      id: 'nav-home-btn',
      key: 'home' as const,
      label: 'Home',
      icon: <Home size={16} />,
      action: () => pressHome(serial),
    },
    {
      id: 'nav-back-btn',
      key: 'back' as const,
      label: 'Back',
      icon: <ChevronLeft size={16} />,
      action: () => pressBack(serial),
    },
    {
      id: 'nav-recent-btn',
      key: 'recent' as const,
      label: 'Recent',
      icon: <LayoutGrid size={16} />,
      action: () => pressRecent(serial),
    },
  ];

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        Navigation
      </h3>
      <div className="flex gap-2">
        {buttons.map(({ id, key, label, icon, action }) => (
          <button
            key={key}
            id={id}
            onClick={() => handle(key, action)}
            disabled={loading !== null}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl
              border transition-all text-sm font-medium
              ${loading === key
                ? 'bg-accent/20 border-accent/40 text-accent-light'
                : 'bg-surface-600 border-surface-500 text-gray-300 hover:bg-surface-500 hover:border-accent/30 hover:text-gray-100 active:scale-95'
              }
              disabled:cursor-not-allowed`}
          >
            {loading === key ? <Loader2 size={16} className="animate-spin" /> : icon}
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
