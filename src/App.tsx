import { Usb, Circle } from 'lucide-react';
import { DeviceSelector } from './components/DeviceSelector';
import { Dashboard, NothingSelected } from './pages/Dashboard';
import { ToastProvider } from './components/Toast';
import { useDevices } from './hooks/useDevices';
import { restartAdb } from './services/electronApi';
import { useToast } from './components/Toast';

function AppContent() {
  const {
    devices,
    selectedSerial,
    setSelectedSerial,
    isLoading,
    error,
    isAdbMissing,
    refresh,
  } = useDevices();

  const { showToast } = useToast();

  const connectedCount = devices.filter((d) => d.status === 'device').length;

  const handleRestartAdb = async () => {
    try {
      const result = await restartAdb();
      if (result.success) {
        showToast('ADB server restarted', 'success');
        refresh();
      } else {
        showToast(result.error ?? 'Failed to restart ADB', 'error');
      }
    } catch {
      showToast('Failed to restart ADB', 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-900 text-gray-200 overflow-hidden select-none">
      {/* Title bar / header */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b border-surface-600 bg-surface-800 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* macOS traffic lights space */}
        <div className="w-20 shrink-0" />

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/20">
            <Usb size={14} className="text-accent-light" />
          </div>
          <h1 className="text-sm font-semibold text-gray-200 tracking-wide">
            AdVard
          </h1>
        </div>

        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Circle
            size={7}
            className={connectedCount > 0 ? 'fill-success text-success' : 'fill-gray-600 text-gray-600'}
          />
          <span className={connectedCount > 0 ? 'text-success' : 'text-gray-500'}>
            {connectedCount > 0
              ? `${connectedCount} device${connectedCount > 1 ? 's' : ''} connected`
              : 'No USB devices'}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <DeviceSelector
          devices={devices}
          selectedSerial={selectedSerial}
          onSelect={setSelectedSerial}
          onRefresh={refresh}
          onRestartAdb={handleRestartAdb}
          isLoading={isLoading}
          error={error}
          isAdbMissing={isAdbMissing}
        />

        <main className="flex-1 flex overflow-hidden">
          {selectedSerial ? (
            <Dashboard serial={selectedSerial} />
          ) : (
            <NothingSelected />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
