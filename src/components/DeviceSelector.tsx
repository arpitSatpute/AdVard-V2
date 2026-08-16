import { useState } from 'react';
import {
  Smartphone,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Usb,
  Wifi,
  Plus,
  Unlink,
} from 'lucide-react';
import type { DeviceEntry } from '../types/device';
import { WirelessDeviceModal } from './WirelessDeviceModal';
import { disconnectWirelessDevice } from '../services/electronApi';
import { useToast } from './Toast';
import { formatDeviceSerial } from '../utils/deviceUtils';

interface DeviceSelectorProps {
  devices: DeviceEntry[];
  selectedSerial: string | null;
  onSelect: (serial: string) => void;
  onRefresh: () => void;
  onRestartAdb: () => void;
  isLoading: boolean;
  error: string | null;
  isAdbMissing?: boolean;
}

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
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [disconnectingSerial, setDisconnectingSerial] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleDisconnectWifi = async (e: React.MouseEvent, device: DeviceEntry) => {
    e.stopPropagation();
    if (!device.ip || !device.port) return;

    setDisconnectingSerial(device.serial);
    try {
      const res = await disconnectWirelessDevice({
        host: device.ip,
        port: device.port,
      });

      if (res.success) {
        showToast(`Disconnected ${device.serial}`, 'info');
        onRefresh();
      } else {
        showToast(res.error ?? 'Disconnect failed', 'error');
      }
    } catch {
      showToast('Disconnect failed', 'error');
    } finally {
      setDisconnectingSerial(null);
    }
  };

  return (
    <>
      <aside className="w-64 border-r border-surface-600 bg-surface-800 flex flex-col h-full shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-surface-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-accent-light" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Devices ({devices.length})
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="add-wireless-device-btn"
              onClick={() => setShowWirelessModal(true)}
              title="Add Wireless Device"
              className="p-1.5 rounded-lg text-accent-light bg-accent/15 hover:bg-accent/30 transition-colors"
            >
              <Plus size={13} />
            </button>

            <button
              id="refresh-devices-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh devices"
              className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-600 disabled:opacity-30 transition-colors"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Missing ADB Banner */}
        {isAdbMissing && (
          <div className="p-3 bg-danger/10 border-b border-danger/20 text-xs text-danger flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">ADB binary missing</p>
              <p className="mt-0.5 text-[11px] text-danger/80">
                Install Platform Tools or add `adb` to your PATH.
              </p>
            </div>
          </div>
        )}

        {/* Device list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {devices.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-xs text-gray-500 font-medium">No devices detected</p>
              <p className="text-[11px] text-gray-600 mt-1">
                Connect via USB or click + to pair via Wi-Fi.
              </p>
            </div>
          ) : (
            devices.map((device) => {
              const isSelected = device.serial === selectedSerial;
              const isWifi = device.connectionType === 'wifi';

              return (
                <div
                  key={device.serial}
                  id={`device-item-${device.serial}`}
                  onClick={() => onSelect(device.serial)}
                  className={`group relative w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-accent/15 border-accent/40 text-white'
                      : 'bg-surface-700/50 border-surface-600 hover:bg-surface-700 hover:border-surface-500 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                    {/* Connection Type Icon */}
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isWifi ? 'bg-indigo-500/15 text-indigo-400' : 'bg-surface-500 text-gray-400'
                      }`}
                    >
                      {isWifi ? <Wifi size={13} /> : <Usb size={13} />}
                    </div>

                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-medium truncate" title={device.serial}>
                          {formatDeviceSerial(device.serial, device.model)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {device.connectionType}
                        </span>
                        <span className="text-[10px] text-gray-500">•</span>
                        <span
                          className={`text-[10px] capitalize font-medium ${
                            device.status === 'device'
                              ? 'text-success'
                              : device.status === 'unauthorized'
                              ? 'text-warning'
                              : 'text-danger'
                          }`}
                        >
                          {device.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Wi-Fi Disconnect Action Button */}
                  {isWifi && (
                    <button
                      onClick={(e) => handleDisconnectWifi(e, device)}
                      disabled={disconnectingSerial === device.serial}
                      title="Disconnect Wireless ADB"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      {disconnectingSerial === device.serial ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Unlink size={12} />
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-surface-600 bg-surface-800/80 space-y-2">
          {error && (
            <p className="text-[11px] text-danger truncate px-1" title={error}>
              {error}
            </p>
          )}

          <button
            id="restart-adb-btn"
            onClick={onRestartAdb}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3
              rounded-lg bg-surface-700 hover:bg-surface-600 border border-surface-500
              text-xs text-gray-400 hover:text-gray-200 transition-all"
          >
            <RotateCcw size={11} />
            Restart ADB Server
          </button>
        </div>
      </aside>

      <WirelessDeviceModal
        isOpen={showWirelessModal}
        onClose={() => setShowWirelessModal(false)}
        onSuccess={onRefresh}
        usbDevices={devices.filter((d) => d.connectionType === 'usb' && d.status === 'device')}
      />
    </>
  );
}
