import { RefreshCw, Smartphone, AlertCircle, Wifi, WifiOff, ShieldAlert } from 'lucide-react';
import type { DeviceEntry } from '../types/device';

interface DeviceSelectorProps {
  devices: DeviceEntry[];
  selectedSerial: string | null;
  onSelect: (serial: string) => void;
  onRefresh: () => void;
  onRestartAdb: () => void;
  isLoading: boolean;
  error: string | null;
  isAdbMissing: boolean;
}

const STATUS_CONFIG = {
  device: {
    dot: 'bg-success',
    label: 'Connected',
    textColor: 'text-success',
  },
  unauthorized: {
    dot: 'bg-warning animate-pulse',
    label: 'Unauthorized',
    textColor: 'text-warning',
  },
  offline: {
    dot: 'bg-danger',
    label: 'Offline',
    textColor: 'text-danger',
  },
  unknown: {
    dot: 'bg-gray-500',
    label: 'Unknown',
    textColor: 'text-gray-400',
  },
} as const;

export function DeviceSelector({
  devices,
  selectedSerial,
  onSelect,
  onRefresh,
  onRestartAdb,
  isLoading,
  error,
  isAdbMissing,
}: DeviceSelectorProps) {
  return (
    <aside className="w-64 shrink-0 flex flex-col bg-surface-800 border-r border-surface-600 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-600">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-accent-light" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
            Devices
          </span>
        </div>
        <button
          id="refresh-devices-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh devices"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-500
            disabled:opacity-40 transition-all"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isAdbMissing ? (
          <AdbMissingState onRestartAdb={onRestartAdb} />
        ) : error ? (
          <ErrorState error={error} onRestartAdb={onRestartAdb} />
        ) : isLoading && devices.length === 0 ? (
          <LoadingState />
        ) : devices.length === 0 ? (
          <EmptyState />
        ) : (
          devices.map((device) => (
            <DeviceCard
              key={device.serial}
              device={device}
              isSelected={selectedSerial === device.serial}
              onSelect={() => onSelect(device.serial)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-surface-600">
        <button
          id="restart-adb-btn"
          onClick={onRestartAdb}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-500 transition-all"
        >
          <RefreshCw size={12} />
          Restart ADB Server
        </button>
      </div>
    </aside>
  );
}

function DeviceCard({
  device,
  isSelected,
  onSelect,
}: {
  device: DeviceEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = STATUS_CONFIG[device.status];

  return (
    <button
      id={`device-card-${device.serial}`}
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-xl border transition-all group
        ${isSelected
          ? 'bg-accent/15 border-accent/40 text-gray-100'
          : 'bg-surface-700 border-surface-500 hover:border-accent/30 hover:bg-surface-600 text-gray-300'
        }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
        <span className="text-sm font-medium truncate">{device.serial}</span>
      </div>
      <div className={`text-xs ml-4 ${config.textColor}`}>{config.label}</div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-2">
      <div className="p-3 rounded-2xl bg-surface-600 mb-3">
        <WifiOff size={20} className="text-gray-500" />
      </div>
      <p className="text-xs font-medium text-gray-400 mb-1">No devices connected</p>
      <p className="text-xs text-gray-500">
        Connect an Android phone via USB with USB debugging enabled
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-surface-600 animate-pulse" />
      ))}
    </div>
  );
}

function ErrorState({ error, onRestartAdb }: { error: string; onRestartAdb: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-2 gap-3">
      <div className="p-3 rounded-2xl bg-danger/10">
        <AlertCircle size={20} className="text-danger" />
      </div>
      <p className="text-xs text-gray-400">{error}</p>
      <button
        onClick={onRestartAdb}
        className="text-xs text-accent-light hover:underline"
      >
        Restart ADB Server
      </button>
    </div>
  );
}

function AdbMissingState({ onRestartAdb }: { onRestartAdb: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-2 gap-3">
      <div className="p-3 rounded-2xl bg-warning/10">
        <ShieldAlert size={20} className="text-warning" />
      </div>
      <p className="text-xs font-medium text-gray-300">ADB Not Found</p>
      <p className="text-xs text-gray-500">
        Install Android Platform Tools or add ADB to your PATH
      </p>
      <a
        href="https://developer.android.com/tools/releases/platform-tools"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-accent-light hover:underline"
      >
        Download Platform Tools ↗
      </a>
    </div>
  );
}
