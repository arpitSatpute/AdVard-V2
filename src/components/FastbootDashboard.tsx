import { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  RefreshCw,
  Power,
  RotateCcw,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
} from 'lucide-react';
import type { FastbootVariables } from '../types/device';
import {
  fastbootGetVariables,
  fastbootReboot,
  fastbootRebootRecovery,
  fastbootRebootFastbootd,
  fastbootPowerOff,
} from '../services/electronApi';
import { useToast } from './Toast';

interface FastbootDashboardProps {
  serial: string;
  initialMode?: 'bootloader' | 'fastbootd' | 'unknown';
}

export function FastbootDashboard({ serial, initialMode = 'bootloader' }: FastbootDashboardProps) {
  const [variables, setVariables] = useState<FastbootVariables | null>(null);
  const [isLoadingVars, setIsLoadingVars] = useState(false);
  const [showRawVars, setShowRawVars] = useState(false);
  const [mode, setMode] = useState<'bootloader' | 'fastbootd' | 'unknown'>(initialMode);
  const [showPowerOffModal, setShowPowerOffModal] = useState(false);

  // Action states
  const [actionStatus, setActionStatus] = useState<{
    state: 'idle' | 'executing' | 'success' | 'failed';
    message?: string;
  }>({ state: 'idle' });

  const { showToast } = useToast();

  const loadVariables = useCallback(async () => {
    setIsLoadingVars(true);
    setActionStatus({ state: 'idle' });

    try {
      const res = await fastbootGetVariables(serial);
      if (res.success && res.data) {
        setVariables(res.data);
        if (res.data.isUserspace === 'yes' || res.data.isUserspace === 'true') {
          setMode('fastbootd');
        }
      } else {
        showToast(res.error || 'Failed to fetch fastboot variables', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsLoadingVars(false);
    }
  }, [serial, showToast]);

  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

  const handleReboot = async (target: 'system' | 'recovery' | 'fastbootd') => {
    const targetLabel =
      target === 'system'
        ? 'System'
        : target === 'recovery'
        ? 'Recovery'
        : 'Fastbootd';

    setActionStatus({
      state: 'executing',
      message: `Rebooting to ${targetLabel}...`,
    });

    try {
      let res;
      if (target === 'recovery') {
        res = await fastbootRebootRecovery(serial);
      } else if (target === 'fastbootd') {
        res = await fastbootRebootFastbootd(serial);
      } else {
        res = await fastbootReboot(serial);
      }

      if (res.success) {
        setActionStatus({
          state: 'success',
          message: `✓ Reboot command sent (${targetLabel})`,
        });
        showToast(`Rebooting device to ${targetLabel}...`, 'success');
        if (target === 'fastbootd') {
          setMode('fastbootd');
          setTimeout(() => loadVariables(), 2000);
        }
      } else {
        setActionStatus({
          state: 'failed',
          message: `✕ Failed to reboot device: ${res.error || 'Unknown error'}`,
        });
        showToast(res.error || `Failed to reboot to ${targetLabel}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionStatus({
        state: 'failed',
        message: `✕ ${msg}`,
      });
      showToast(msg, 'error');
    }
  };

  const handleConfirmPowerOff = async () => {
    setShowPowerOffModal(false);
    setActionStatus({
      state: 'executing',
      message: 'Powering off device...',
    });

    try {
      const res = await fastbootPowerOff(serial);
      if (res.success) {
        setActionStatus({
          state: 'success',
          message: '✓ Power off command sent',
        });
        showToast('Power off command sent', 'success');
      } else {
        setActionStatus({
          state: 'failed',
          message: `✕ ${res.error || 'Power off failed'}`,
        });
        showToast(res.error || 'Power off is not supported by this device in Fastboot mode.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionStatus({
        state: 'failed',
        message: `✕ ${msg}`,
      });
      showToast(msg, 'error');
    }
  };

  const valOrFallback = (val?: string) => {
    if (!val || val.trim() === '' || val === 'null' || val === 'undefined') {
      return <span className="text-gray-500 italic">Not available</span>;
    }
    return <span className="text-gray-200 font-mono font-medium">{val}</span>;
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-surface-900 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Cpu size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-gray-100 tracking-wide">
                {variables?.product ? `Fastboot Mode — ${variables.product}` : 'Fastboot Device'}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  mode === 'fastbootd'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {mode === 'fastbootd' ? 'Fastbootd' : 'Bootloader'}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-success font-medium">● Connected</span>
              </div>
              <span>•</span>
              <div>
                Serial: <span className="font-mono text-gray-300 font-semibold">{serial}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadVariables}
            disabled={isLoadingVars}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-xs font-semibold text-gray-200 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoadingVars ? 'animate-spin' : ''} />
            {isLoadingVars ? 'Getting info...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Execution Action Status Banner */}
      {actionStatus.state !== 'idle' && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
            actionStatus.state === 'executing'
              ? 'bg-accent/15 border-accent/30 text-accent-light'
              : actionStatus.state === 'success'
              ? 'bg-success/15 border-success/30 text-success'
              : 'bg-danger/15 border-danger/30 text-danger'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionStatus.state === 'executing' && <RefreshCw size={16} className="animate-spin" />}
            {actionStatus.state === 'success' && <CheckCircle2 size={16} />}
            {actionStatus.state === 'failed' && <AlertCircle size={16} />}
            <span>{actionStatus.message}</span>
          </div>

          <button
            onClick={() => setActionStatus({ state: 'idle' })}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Information Card (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-600">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 uppercase tracking-wider">
                <Info size={16} className="text-accent-light" />
                Device Information
              </div>
              <button
                onClick={loadVariables}
                disabled={isLoadingVars}
                className="text-xs text-accent-light hover:underline font-medium"
              >
                {isLoadingVars ? 'Loading...' : 'Get Variables'}
              </button>
            </div>

            {/* Structured Variables Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Product */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <span className="text-gray-400 font-medium">Product</span>
                {valOrFallback(variables?.product)}
              </div>

              {/* Variant */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <span className="text-gray-400 font-medium">Variant</span>
                {valOrFallback(variables?.variant)}
              </div>

              {/* Bootloader Version */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <span className="text-gray-400 font-medium">Bootloader</span>
                {valOrFallback(variables?.bootloaderVersion)}
              </div>

              {/* Fastboot / Version */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <span className="text-gray-400 font-medium">Version</span>
                {valOrFallback(variables?.fastbootVersion)}
              </div>

              {/* Secure Boot */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Shield size={13} className="text-indigo-400" />
                  Secure Boot
                </div>
                {valOrFallback(variables?.secureBoot)}
              </div>

              {/* Unlocked State */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Shield size={13} className="text-amber-400" />
                  Unlocked State
                </div>
                {valOrFallback(variables?.unlocked)}
              </div>

              {/* Current Slot */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Layers size={13} className="text-teal-400" />
                  Current Slot
                </div>
                {valOrFallback(variables?.currentSlot)}
              </div>

              {/* Slot Count */}
              <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                  <Layers size={13} className="text-teal-400" />
                  Slot Count
                </div>
                {valOrFallback(variables?.slotCount)}
              </div>

              {/* Battery Voltage */}
              {variables?.batteryVoltage && (
                <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <Zap size={13} className="text-yellow-400" />
                    Battery Voltage
                  </div>
                  {valOrFallback(variables.batteryVoltage)}
                </div>
              )}

              {/* Battery SOC */}
              {variables?.batterySoc && (
                <div className="p-3 bg-surface-700/50 rounded-xl border border-surface-600 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <Zap size={13} className="text-yellow-400" />
                    Battery SOC
                  </div>
                  {valOrFallback(variables.batterySoc)}
                </div>
              )}
            </div>

            {/* Expandable Raw Variables Section */}
            <div className="mt-6 pt-4 border-t border-surface-600">
              <button
                onClick={() => setShowRawVars(!showRawVars)}
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-200 py-1 font-medium transition-colors"
              >
                <span>Raw Fastboot Variables ({variables?.raw ? Object.keys(variables.raw).length : 0})</span>
                <span className="flex items-center gap-1 text-[11px] text-accent-light">
                  {showRawVars ? 'Hide' : 'Show'}
                  {showRawVars ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              {showRawVars && (
                <div className="mt-3 p-4 bg-surface-900 border border-surface-600 rounded-xl max-h-60 overflow-y-auto font-mono text-[11px] space-y-1">
                  {variables?.raw && Object.keys(variables.raw).length > 0 ? (
                    Object.entries(variables.raw).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 border-b border-surface-700/50">
                        <span className="text-gray-400">{k}</span>
                        <span className="text-accent-light font-medium">{v}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No variables loaded yet. Click Get Variables.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Card (1 col) */}
        <div className="space-y-6">
          <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 shadow-md flex flex-col justify-between h-full">
            <div>
              <div className="pb-4 mb-4 border-b border-surface-600 flex items-center gap-2 text-sm font-semibold text-gray-200 uppercase tracking-wider">
                <RotateCcw size={16} className="text-amber-400" />
                Fastboot Actions
              </div>

              <div className="space-y-3">
                {/* Reboot System */}
                <button
                  onClick={() => handleReboot('system')}
                  disabled={actionStatus.state === 'executing'}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-xs font-bold text-gray-100 transition-all shadow-sm hover:border-accent/40"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw size={15} className="text-accent-light" />
                    Reboot System
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Reboots to Android</span>
                </button>

                {/* Reboot Recovery */}
                <button
                  onClick={() => handleReboot('recovery')}
                  disabled={actionStatus.state === 'executing'}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-xs font-bold text-gray-100 transition-all shadow-sm hover:border-amber-400/40"
                >
                  <span className="flex items-center gap-2">
                    <Cpu size={15} className="text-amber-400" />
                    Reboot Recovery
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Reboots to Recovery</span>
                </button>

                {/* Reboot Fastbootd */}
                <button
                  onClick={() => handleReboot('fastbootd')}
                  disabled={actionStatus.state === 'executing'}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-xs font-bold text-gray-100 transition-all shadow-sm hover:border-purple-400/40"
                >
                  <span className="flex items-center gap-2">
                    <Layers size={15} className="text-purple-400" />
                    Reboot Fastbootd
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Userspace Fastboot</span>
                </button>
              </div>
            </div>

            {/* Power Off Button */}
            <div className="mt-8 pt-4 border-t border-surface-600">
              <button
                onClick={() => setShowPowerOffModal(true)}
                disabled={actionStatus.state === 'executing'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-danger/15 hover:bg-danger/25 border border-danger/40 text-xs font-bold text-danger transition-all shadow-sm"
              >
                <Power size={15} />
                Power Off Device
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Confirmation Modal for Power Off */}
      {showPowerOffModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface-800 border border-surface-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-danger">
              <div className="p-2.5 rounded-xl bg-danger/20 border border-danger/30">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-100">Power Off Device?</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              The connected phone will be shut down. You will need to manually press the power button on the phone to turn it back on.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPowerOffModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-xs font-semibold text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPowerOff}
                className="px-4 py-2 rounded-xl bg-danger hover:bg-danger/90 text-xs font-bold text-white shadow-lg shadow-danger/20 transition-all"
              >
                Power Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
