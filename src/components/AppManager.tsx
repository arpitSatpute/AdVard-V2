import { useState, useEffect, useCallback } from 'react';
import { Package, Play, Square, Eraser, Trash2, Upload, Search, RefreshCw, Loader2, X, Cpu, UserCheck } from 'lucide-react';
import { listPackages, launchApp, forceStopApp, clearAppData, uninstallApp, installApk } from '../services/electronApi';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import type { PackageEntry } from '../types/device';

interface AppManagerProps {
  serial: string;
}

type TabType = '3rdparty' | 'system' | 'all';

export function AppManager({ serial }: AppManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('3rdparty');
  const [packages, setPackages] = useState<PackageEntry[]>([]);
  const [filtered, setFiltered] = useState<PackageEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<string | null>(null);
  const [clearDataTarget, setClearDataTarget] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listPackages(serial, activeTab);
      if (result.success && result.data) {
        const sorted = [...result.data].sort((a, b) =>
          a.packageName.localeCompare(b.packageName)
        );
        setPackages(sorted);
      } else {
        showToast(result.error ?? 'Failed to load packages', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [serial, activeTab, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(packages);
    } else {
      const q = search.toLowerCase();
      setFiltered(packages.filter((p) => p.packageName.toLowerCase().includes(q)));
    }
  }, [search, packages]);

  const handleLaunch = async (packageName: string) => {
    setLoadingPackage(packageName);
    try {
      const result = await launchApp(serial, packageName);
      if (result.success) {
        showToast(`Launched ${packageName}`, 'success');
      } else {
        showToast(result.error ?? 'Launch failed', 'error');
      }
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleForceStop = async (packageName: string) => {
    setLoadingPackage(packageName);
    try {
      const result = await forceStopApp(serial, packageName);
      if (result.success) {
        showToast(`Force stopped ${packageName}`, 'info');
      } else {
        showToast(result.error ?? 'Force stop failed', 'error');
      }
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleClearData = async () => {
    if (!clearDataTarget) return;
    const pkg = clearDataTarget;
    setClearDataTarget(null);
    setLoadingPackage(pkg);
    try {
      const result = await clearAppData(serial, pkg);
      if (result.success) {
        showToast(`Cleared app data for ${pkg}`, 'success');
      } else {
        showToast(result.error ?? 'Clear data failed', 'error');
      }
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleUninstall = async () => {
    if (!uninstallTarget) return;
    const pkg = uninstallTarget;
    setUninstallTarget(null);
    setLoadingPackage(pkg);
    try {
      const result = await uninstallApp(serial, pkg);
      if (result.success) {
        showToast(`Uninstalled ${pkg}`, 'success');
        setPackages((prev) => prev.filter((p) => p.packageName !== pkg));
      } else {
        showToast(result.error ?? 'Uninstall failed', 'error');
      }
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const result = await installApk(serial);
      if (result.success) {
        showToast(`Installed ${result.data}`, 'success');
        load();
      } else if (result.error !== 'No file selected') {
        showToast(result.error ?? 'Install failed', 'error');
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-accent-light" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Application Manager & Remote Launcher
          </span>
          {packages.length > 0 && (
            <span className="text-xs text-gray-600">({packages.length})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            id="install-apk-btn"
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-accent/20 border border-accent/30 text-accent-light text-xs font-medium
              hover:bg-accent/30 disabled:opacity-50 transition-all"
          >
            {isInstalling ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
            Install APK
          </button>
          <button
            id="refresh-apps-btn"
            onClick={load}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-500
              disabled:opacity-30 transition-all"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-600 bg-surface-800/50 px-4 pt-2 gap-2">
        <button
          onClick={() => setActiveTab('3rdparty')}
          className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-all px-1 ${
            activeTab === '3rdparty'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <UserCheck size={12} />
          User Installed
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-all px-1 ${
            activeTab === 'system'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Cpu size={12} />
          System Apps
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-all px-1 ${
            activeTab === 'all'
              ? 'border-accent text-accent-light'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package size={12} />
          All Apps
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-surface-600">
        <div className="flex items-center gap-2 bg-surface-800 rounded-lg px-3 py-1.5">
          <Search size={13} className="text-gray-500 shrink-0" />
          <input
            id="app-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter packages…"
            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-500 hover:text-gray-300">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Package list */}
      <div className="overflow-y-auto max-h-64 divide-y divide-surface-600">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-gray-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-gray-600">
            {search ? 'No matching packages' : 'No packages found'}
          </div>
        ) : (
          filtered.map(({ packageName, isSystem }) => (
            <div
              key={packageName}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-600 transition-colors group"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-3">
                <span className="text-xs font-mono text-gray-300 truncate">
                  {packageName}
                </span>
                {isSystem && (
                  <span className="text-[10px] bg-surface-500 text-gray-400 px-1.5 py-0.5 rounded shrink-0">
                    System
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  id={`launch-${packageName}-btn`}
                  onClick={() => handleLaunch(packageName)}
                  disabled={loadingPackage === packageName}
                  title="Launch app"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-success hover:bg-success/10 transition-all"
                >
                  {loadingPackage === packageName ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Play size={12} />
                  )}
                </button>
                <button
                  id={`stop-${packageName}-btn`}
                  onClick={() => handleForceStop(packageName)}
                  disabled={loadingPackage === packageName}
                  title="Force Stop app"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-warning hover:bg-warning/10 transition-all"
                >
                  <Square size={12} />
                </button>
                <button
                  id={`clear-${packageName}-btn`}
                  onClick={() => setClearDataTarget(packageName)}
                  disabled={loadingPackage === packageName}
                  title="Clear App Data"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                >
                  <Eraser size={12} />
                </button>
                {!isSystem && (
                  <button
                    id={`uninstall-${packageName}-btn`}
                    onClick={() => setUninstallTarget(packageName)}
                    disabled={loadingPackage === packageName}
                    title="Uninstall app"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={!!clearDataTarget}
        title="Clear App Data?"
        message={`This will reset all app settings and data for "${clearDataTarget}".`}
        confirmLabel="Clear Data"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleClearData}
        onCancel={() => setClearDataTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!uninstallTarget}
        title="Uninstall App?"
        message={`This will uninstall "${uninstallTarget}" from the device.`}
        confirmLabel="Uninstall"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleUninstall}
        onCancel={() => setUninstallTarget(null)}
      />
    </div>
  );
}
