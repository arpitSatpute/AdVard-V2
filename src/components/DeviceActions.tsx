import { useState } from 'react';
import { Camera, RotateCcw, Power, Unlock, Loader2 } from 'lucide-react';
import { takeScreenshot, rebootDevice, pressPower } from '../services/electronApi';
import { ConfirmDialog } from './ConfirmDialog';
import { UnlockModal } from './UnlockModal';
import { useToast } from './Toast';

interface DeviceActionsProps {
  serial: string;
  onScreenshot: (base64: string) => void;
}

export function DeviceActions({ serial, onScreenshot }: DeviceActionsProps) {
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [rebootLoading, setRebootLoading] = useState(false);
  const [powerLoading, setPowerLoading] = useState(false);
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const { showToast } = useToast();

  const handlePower = async () => {
    setPowerLoading(true);
    try {
      const result = await pressPower(serial);
      if (!result.success) {
        showToast(result.error ?? 'Power button command failed', 'error');
      }
    } catch {
      showToast('Power button command failed', 'error');
    } finally {
      setPowerLoading(false);
    }
  };

  const handleScreenshot = async () => {
    setScreenshotLoading(true);
    try {
      const result = await takeScreenshot(serial);
      if (result.success && result.data) {
        onScreenshot(result.data);
        showToast('Screenshot captured', 'success');
      } else {
        showToast(result.error ?? 'Screenshot failed', 'error');
      }
    } catch {
      showToast('Screenshot failed', 'error');
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleReboot = async () => {
    setShowRebootConfirm(false);
    setRebootLoading(true);
    try {
      const result = await rebootDevice(serial);
      if (result.success) {
        showToast('Device rebooting…', 'info');
      } else {
        showToast(result.error ?? 'Reboot failed', 'error');
      }
    } catch {
      showToast('Reboot failed', 'error');
    } finally {
      setRebootLoading(false);
    }
  };

  return (
    <>
      <div className="bg-surface-700 rounded-2xl border border-surface-500 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Actions & Security
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <button
            id="power-btn"
            onClick={handlePower}
            disabled={powerLoading}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2
              rounded-xl border border-surface-500 bg-surface-600
              text-xs font-medium text-gray-300
              hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400
              active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {powerLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Power size={14} />
            )}
            Power
          </button>

          <button
            id="unlock-btn"
            onClick={() => setShowUnlockModal(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2
              rounded-xl border border-surface-500 bg-surface-600
              text-xs font-medium text-gray-300
              hover:bg-accent/10 hover:border-accent/30 hover:text-accent-light
              active:scale-95 transition-all"
          >
            <Unlock size={14} />
            Unlock
          </button>

          <button
            id="screenshot-btn"
            onClick={handleScreenshot}
            disabled={screenshotLoading}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2
              rounded-xl border border-surface-500 bg-surface-600
              text-xs font-medium text-gray-300
              hover:bg-surface-500 hover:border-accent/30 hover:text-gray-100
              active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {screenshotLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Camera size={14} />
            )}
            Screenshot
          </button>

          <button
            id="reboot-btn"
            onClick={() => setShowRebootConfirm(true)}
            disabled={rebootLoading}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2
              rounded-xl border border-surface-500 bg-surface-600
              text-xs font-medium text-gray-300
              hover:bg-danger/10 hover:border-danger/30 hover:text-danger
              active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {rebootLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            Reboot
          </button>
        </div>
      </div>

      <UnlockModal
        serial={serial}
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
      />

      <ConfirmDialog
        isOpen={showRebootConfirm}
        title="Reboot Device?"
        message="The selected Android device will restart. Any unsaved work may be lost."
        confirmLabel="Reboot"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleReboot}
        onCancel={() => setShowRebootConfirm(false)}
      />
    </>
  );
}
