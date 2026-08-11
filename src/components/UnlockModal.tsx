import React, { useState } from 'react';
import { Lock, Unlock, X, Loader2 } from 'lucide-react';
import { unlockDevice } from '../services/electronApi';
import { useToast } from './Toast';

interface UnlockModalProps {
  serial: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UnlockModal({ serial, isOpen, onClose }: UnlockModalProps) {
  const [pin, setPin] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUnlocking(true);
    try {
      const res = await unlockDevice(serial, pin);
      if (res.success) {
        showToast('Unlock command sent', 'success');
        onClose();
      } else {
        showToast(res.error ?? 'Unlock failed', 'error');
      }
    } catch {
      showToast('Unlock failed', 'error');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-700 border border-surface-500 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent/20 text-accent-light">
              <Lock size={18} />
            </div>
            <h2 className="text-base font-semibold text-gray-100">Unlock Device</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Sends wake up, swipe up gesture, and optional PIN to unlock your Android screen.
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Device PIN / Password (Optional)
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN if required…"
              className="w-full bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-surface-600 hover:bg-surface-500 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUnlocking}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-accent hover:bg-accent-dark text-white disabled:opacity-50"
            >
              {isUnlocking ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
              Unlock Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
