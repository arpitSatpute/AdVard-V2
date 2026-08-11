import { useState, useEffect, useCallback } from 'react';
import {
  Volume2,
  Volume1,
  VolumeX,
  Play,
  SkipBack,
  SkipForward,
  Sun,
  Loader2,
} from 'lucide-react';
import {
  volumeUp,
  volumeDown,
  volumeMute,
  mediaPlayPause,
  mediaNext,
  mediaPrev,
  getBrightness,
  setBrightness,
} from '../services/electronApi';
import { useToast } from './Toast';

interface MediaVolumeControlsProps {
  serial: string;
}

export function MediaVolumeControls({ serial }: MediaVolumeControlsProps) {
  const [brightness, setBrightnessVal] = useState<number>(128);
  const [isFetchingBrightness, setIsFetchingBrightness] = useState<boolean>(false);
  const [isSettingBrightness, setIsSettingBrightness] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchBrightness = useCallback(async () => {
    setIsFetchingBrightness(true);
    try {
      const res = await getBrightness(serial);
      if (res.success && typeof res.data === 'number') {
        setBrightnessVal(res.data);
      }
    } catch {
      // Ignore initial brightness fetch error silently
    } finally {
      setIsFetchingBrightness(false);
    }
  }, [serial]);

  useEffect(() => {
    fetchBrightness();
  }, [fetchBrightness]);

  const handleAction = async (
    actionId: string,
    actionFn: () => Promise<{ success: boolean; error?: string }>
  ) => {
    setActiveAction(actionId);
    try {
      const res = await actionFn();
      if (!res.success) {
        showToast(res.error ?? 'Action failed', 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const handleBrightnessChange = async (val: number) => {
    setBrightnessVal(val);
    setIsSettingBrightness(true);
    try {
      const res = await setBrightness(serial, val);
      if (!res.success) {
        showToast(res.error ?? 'Failed to set brightness', 'error');
      }
    } catch {
      showToast('Failed to set brightness', 'error');
    } finally {
      setIsSettingBrightness(false);
    }
  };

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 p-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
        Volume, Playback & Brightness
      </h3>

      {/* Volume & Playback Controls Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Volume section */}
        <div className="bg-surface-600 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-300">Volume</span>
          <div className="flex items-center gap-1.5">
            <button
              id="vol-down-btn"
              onClick={() => handleAction('vdown', () => volumeDown(serial))}
              disabled={activeAction !== null}
              title="Volume Down"
              className="p-2 rounded-lg bg-surface-500 hover:bg-surface-400 text-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {activeAction === 'vdown' ? <Loader2 size={14} className="animate-spin" /> : <Volume1 size={14} />}
            </button>
            <button
              id="vol-up-btn"
              onClick={() => handleAction('vup', () => volumeUp(serial))}
              disabled={activeAction !== null}
              title="Volume Up"
              className="p-2 rounded-lg bg-surface-500 hover:bg-surface-400 text-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {activeAction === 'vup' ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
            </button>
            <button
              id="vol-mute-btn"
              onClick={() => handleAction('vmute', () => volumeMute(serial))}
              disabled={activeAction !== null}
              title="Mute / Unmute"
              className="p-2 rounded-lg bg-surface-500 hover:bg-surface-400 text-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {activeAction === 'vmute' ? <Loader2 size={14} className="animate-spin" /> : <VolumeX size={14} />}
            </button>
          </div>
        </div>

        {/* Media Playback section */}
        <div className="bg-surface-600 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-300">Playback</span>
          <div className="flex items-center gap-1.5">
            <button
              id="media-prev-btn"
              onClick={() => handleAction('mprev', () => mediaPrev(serial))}
              disabled={activeAction !== null}
              title="Previous Track"
              className="p-2 rounded-lg bg-surface-500 hover:bg-surface-400 text-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {activeAction === 'mprev' ? <Loader2 size={14} className="animate-spin" /> : <SkipBack size={14} />}
            </button>
            <button
              id="media-playpause-btn"
              onClick={() => handleAction('mplay', () => mediaPlayPause(serial))}
              disabled={activeAction !== null}
              title="Play / Pause"
              className="p-2 rounded-lg bg-accent/20 border border-accent/40 hover:bg-accent/30 text-accent-light transition-all active:scale-95 disabled:opacity-50"
            >
              {activeAction === 'mplay' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            </button>
            <button
              id="media-next-btn"
              onClick={() => handleAction('mnext', () => mediaNext(serial))}
              disabled={activeAction !== null}
              title="Next Track"
              className="p-2 rounded-lg bg-surface-500 hover:bg-surface-400 text-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {activeAction === 'mnext' ? <Loader2 size={14} className="animate-spin" /> : <SkipForward size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Brightness Slider */}
      <div className="bg-surface-600 rounded-xl p-3 flex items-center gap-3">
        <Sun size={16} className="text-warning shrink-0" />
        <span className="text-xs font-medium text-gray-300 shrink-0">Brightness</span>
        <input
          id="brightness-slider"
          type="range"
          min="0"
          max="255"
          value={brightness}
          onChange={(e) => handleBrightnessChange(Number(e.target.value))}
          disabled={isFetchingBrightness || isSettingBrightness}
          className="flex-1 accent-indigo-500 cursor-pointer"
        />
        <span className="text-xs font-mono text-gray-400 w-12 text-right shrink-0">
          {Math.round((brightness / 255) * 100)}%
        </span>
      </div>
    </div>
  );
}
