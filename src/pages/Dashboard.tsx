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
import { FileSharingSystem } from '../components/FileSharingSystem';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { Smartphone, FolderSync, SlidersHorizontal, Sparkles } from 'lucide-react';

interface DashboardProps {
  serial: string;
}

export function Dashboard({ serial }: DashboardProps) {
  const { info, isLoading, error, refetch } = useDeviceInfo(serial);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'controls'>('files');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-900">
      {/* Primary Top Tab Navigation */}
      <div className="px-6 py-3 bg-surface-900 border-b border-surface-600/80 flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/20 border border-accent/40 text-accent-light">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-100">Android Control & File Manager</h2>
            <p className="text-[11px] text-gray-400">Device serial: <span className="font-mono text-accent-light">{serial}</span></p>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-2 bg-surface-800 p-1.5 rounded-2xl border border-surface-600">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'files'
                ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-105'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/50'
            }`}
          >
            <FolderSync size={16} /> File Sharing & Explorer
          </button>

          <button
            onClick={() => setActiveTab('controls')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'controls'
                ? 'bg-accent text-white shadow-lg shadow-accent/20 scale-105'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/50'
            }`}
          >
            <SlidersHorizontal size={16} /> Remote Screen & Controls
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'files' ? (
          <FileSharingSystem serial={serial} />
        ) : (
          <div className="space-y-5 max-w-7xl mx-auto">
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
        )}
      </div>
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
