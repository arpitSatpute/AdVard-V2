import { Battery, Monitor, Cpu, Layers, Ruler, RefreshCw } from 'lucide-react';
import type { DeviceInfo } from '../types/device';

interface DeviceInfoProps {
  info: DeviceInfo | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function DeviceInfoPanel({ info, isLoading, error, onRefresh }: DeviceInfoProps) {
  if (isLoading) return <DeviceInfoSkeleton />;
  if (error) return <DeviceInfoError error={error} onRefresh={onRefresh} />;
  if (!info) return null;

  const batteryColor =
    info.batteryLevel === null
      ? 'text-gray-400'
      : info.batteryLevel > 50
      ? 'text-success'
      : info.batteryLevel > 20
      ? 'text-warning'
      : 'text-danger';

  const fields = [
    {
      icon: <Monitor size={14} />,
      label: 'Model',
      value: `${info.manufacturer} ${info.model}`,
    },
    {
      icon: <Layers size={14} />,
      label: 'Android',
      value: `${info.androidVersion} (SDK ${info.sdkVersion})`,
    },
    {
      icon: <Battery size={14} />,
      label: 'Battery',
      value: info.batteryLevel !== null ? `${info.batteryLevel}%` : 'Unknown',
      valueClass: batteryColor,
    },
    {
      icon: <Ruler size={14} />,
      label: 'Resolution',
      value: info.resolution,
    },
    {
      icon: <Cpu size={14} />,
      label: 'Density',
      value: info.density ? `${info.density} dpi` : 'Unknown',
    },
  ];

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-100">
            {info.manufacturer} {info.model}
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{info.serial}</p>
        </div>
        <button
          id="refresh-device-info-btn"
          onClick={onRefresh}
          title="Refresh device info"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-500 transition-all"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {fields.map(({ icon, label, value, valueClass }) => (
          <div
            key={label}
            className="flex items-start gap-2 bg-surface-600 rounded-xl px-3 py-2.5"
          >
            <span className="text-gray-500 mt-0.5 shrink-0">{icon}</span>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className={`text-sm font-medium text-gray-200 ${valueClass ?? ''}`}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceInfoSkeleton() {
  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 p-4 animate-pulse">
      <div className="h-5 bg-surface-500 rounded w-48 mb-2" />
      <div className="h-3 bg-surface-500 rounded w-32 mb-4" />
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-surface-600 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function DeviceInfoError({ error, onRefresh }: { error: string; onRefresh: () => void }) {
  return (
    <div className="bg-surface-700 rounded-2xl border border-danger/20 p-4 text-center">
      <p className="text-sm text-danger mb-2">Failed to load device info</p>
      <p className="text-xs text-gray-500 mb-3">{error}</p>
      <button
        onClick={onRefresh}
        className="text-xs text-accent-light hover:underline"
      >
        Retry
      </button>
    </div>
  );
}
