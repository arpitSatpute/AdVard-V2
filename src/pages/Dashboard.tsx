import { useState } from 'react';
import { DeviceInfoPanel } from '../components/DeviceInfo';
import { NavigationControls } from '../components/NavigationControls';
import { DeviceActions } from '../components/DeviceActions';
import { ScreenMirror } from '../components/ScreenMirror';
import { PhoneCallManager } from '../components/PhoneCallManager';
import { MediaVolumeControls } from '../components/MediaVolumeControls';
import { ScreenshotViewer } from '../components/ScreenshotViewer';
import { ShellTerminal } from '../components/ShellTerminal';
import { AppManager } from '../components/AppManager';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { Smartphone } from 'lucide-react';

interface DashboardProps {
  serial: string;
}

export function Dashboard({ serial }: DashboardProps) {
  const { info, isLoading, error, refetch } = useDeviceInfo(serial);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      {/* Device Info */}
      <DeviceInfoPanel
        info={info}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
      />

      {/* Interactive Remote Screen Mirroring */}
      <ScreenMirror
        serial={serial}
        resolution={info?.resolution || '1080x2400'}
      />

      {/* Phone Call Manager */}
      <PhoneCallManager serial={serial} />

      {/* Controls & Security row */}
      <div className="grid grid-cols-2 gap-4">
        <NavigationControls serial={serial} />
        <DeviceActions serial={serial} onScreenshot={setScreenshot} />
      </div>

      {/* Media, Volume & Brightness Controls */}
      <MediaVolumeControls serial={serial} />

      {/* Screenshot viewer */}
      {screenshot && (
        <ScreenshotViewer base64={screenshot} onClear={() => setScreenshot(null)} />
      )}

      {/* Shell terminal */}
      <ShellTerminal serial={serial} />

      {/* Application Manager & Launcher */}
      <AppManager serial={serial} />
    </div>
  );
}

export function NothingSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-4">
      <div className="p-6 rounded-3xl bg-surface-700 border border-surface-500">
        <Smartphone size={40} className="text-gray-600" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-400 mb-1">No device selected</h2>
        <p className="text-sm text-gray-600 max-w-xs">
          Connect an Android phone via USB with USB debugging enabled, then select it from the sidebar.
        </p>
      </div>
    </div>
  );
}
