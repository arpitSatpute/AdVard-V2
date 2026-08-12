import React, { useState, useEffect } from 'react';
import { Wifi, KeyRound, Link2, Zap, QrCode, X, Loader2, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { pairWirelessDevice, connectWirelessDevice, enableUsbTcpip, generateQrCode } from '../services/electronApi';
import type { DeviceEntry, QrSessionData } from '../types/device';
import { useToast } from './Toast';

interface WirelessDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usbDevices?: DeviceEntry[];
}

type TabMode = 'quick-usb' | 'pair' | 'qr' | 'connect';

export function WirelessDeviceModal({ isOpen, onClose, onSuccess, usbDevices = [] }: WirelessDeviceModalProps) {
  const [mode, setMode] = useState<TabMode>(usbDevices.length > 0 ? 'quick-usb' : 'pair');

  // QR Code state
  const [qrData, setQrData] = useState<QrSessionData | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Quick USB switch state
  const [selectedUsbSerial, setSelectedUsbSerial] = useState<string>(usbDevices[0]?.serial || '');
  const [isEnablingTcpip, setIsEnablingTcpip] = useState(false);

  // Pair form state
  const [pairHost, setPairHost] = useState('');
  const [pairPort, setPairPort] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  // Connect form state
  const [connectHost, setConnectHost] = useState('');
  const [connectPort, setConnectPort] = useState('5555');
  const [isConnecting, setIsConnecting] = useState(false);

  const { showToast } = useToast();

  const loadQrCode = async () => {
    setIsGeneratingQr(true);
    try {
      const res = await generateQrCode();
      if (res.success && res.data) {
        setQrData(res.data);
      } else {
        showToast(res.error ?? 'Failed to generate QR Code.', 'error');
      }
    } catch {
      showToast('Failed to generate QR Code.', 'error');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  useEffect(() => {
    if (isOpen && mode === 'qr' && !qrData) {
      loadQrCode();
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleQuickUsbSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsbSerial) {
      showToast('Please select a USB device to switch.', 'error');
      return;
    }

    setIsEnablingTcpip(true);
    try {
      const res = await enableUsbTcpip(selectedUsbSerial, 5555);
      if (res.success && res.data) {
        showToast('Switched USB to Wireless Mode (port 5555)!', 'success');

        const ip = res.data.ip;
        if (ip) {
          showToast(`Connecting to ${ip}:5555…`, 'info');
          const connRes = await connectWirelessDevice({ host: ip, port: 5555 });
          if (connRes.success) {
            showToast(`Connected wirelessly to ${ip}:5555! You can unplug the USB cable now.`, 'success');
            onSuccess();
            onClose();
            return;
          }
        }

        if (ip) setConnectHost(ip);
        setConnectPort('5555');
        setMode('connect');
      } else {
        showToast(res.error ?? 'Failed to switch to Wireless Mode.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Quick switch failed.', 'error');
    } finally {
      setIsEnablingTcpip(false);
    }
  };

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(pairPort.trim(), 10);

    if (!pairHost.trim() || isNaN(portNum) || !pairCode.trim()) {
      showToast('Please fill in all pairing fields correctly.', 'error');
      return;
    }

    setIsPairing(true);
    try {
      const res = await pairWirelessDevice({
        host: pairHost.trim(),
        pairingPort: portNum,
        pairingCode: pairCode.trim(),
      });

      if (res.success) {
        showToast('Successfully paired wireless device!', 'success');
        setConnectHost(pairHost.trim());
        setMode('connect');
      } else {
        showToast(res.error ?? 'Wireless pairing failed.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Pairing failed.', 'error');
    } finally {
      setIsPairing(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(connectPort.trim(), 10);

    if (!connectHost.trim() || isNaN(portNum)) {
      showToast('Please fill in valid IP address and connection port.', 'error');
      return;
    }

    setIsConnecting(true);
    try {
      const res = await connectWirelessDevice({
        host: connectHost.trim(),
        port: portNum,
      });

      if (res.success) {
        showToast(`Connected to ${connectHost.trim()}:${portNum}`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast(res.error ?? 'Could not connect to wireless device.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Connection failed.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-700 border border-surface-500 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent/20 text-accent-light">
              <Wifi size={18} />
            </div>
            <h2 className="text-base font-semibold text-gray-100">Add Wireless Device</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-surface-600 mb-4 overflow-x-auto">
          {usbDevices.length > 0 && (
            <button
              type="button"
              onClick={() => setMode('quick-usb')}
              className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-all px-2.5 shrink-0 ${
                mode === 'quick-usb'
                  ? 'border-accent text-accent-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Zap size={13} className="text-amber-400" />
              1-Click USB
            </button>
          )}

          <button
            type="button"
            onClick={() => setMode('pair')}
            className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-all px-2.5 shrink-0 ${
              mode === 'pair'
                ? 'border-accent text-accent-light'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound size={13} />
            Pair Code (6-Digit)
          </button>

          <button
            type="button"
            onClick={() => setMode('qr')}
            className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-all px-2.5 shrink-0 ${
              mode === 'qr'
                ? 'border-accent text-accent-light'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <QrCode size={13} className="text-success" />
            Scan QR Code
          </button>

          <button
            type="button"
            onClick={() => setMode('connect')}
            className={`flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 transition-all px-2.5 shrink-0 ${
              mode === 'connect'
                ? 'border-accent text-accent-light'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Link2 size={13} />
            Direct Connect
          </button>
        </div>

        {/* Mode 1: Quick USB to Wi-Fi */}
        {mode === 'quick-usb' && usbDevices.length > 0 && (
          <form onSubmit={handleQuickUsbSwitch} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
                <Zap size={13} />
                Recommended: Instant 1-Click Switch
              </div>
              <p>Since your phone is plugged in via USB, AdVard will run `adb tcpip 5555` to switch your phone to wireless mode instantly.</p>
              <p className="pt-1 font-medium text-amber-300">No pairing codes or QR code timeouts!</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Select Connected USB Device
              </label>
              <select
                value={selectedUsbSerial}
                onChange={(e) => setSelectedUsbSerial(e.target.value)}
                className="w-full bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 outline-none focus:border-accent"
              >
                {usbDevices.map((d) => (
                  <option key={d.serial} value={d.serial}>
                    {d.serial} ({d.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-surface-600 hover:bg-surface-500 text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEnablingTcpip}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold disabled:opacity-50"
              >
                {isEnablingTcpip ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                Switch to Wireless Now
              </button>
            </div>
          </form>
        )}

        {/* Mode 2: Pair Code */}
        {mode === 'pair' && (
          <form onSubmit={handlePair} className="space-y-4">
            <div className="bg-surface-800 border border-surface-600 rounded-xl p-3 text-xs text-gray-400 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-gray-300 mb-1">
                <Info size={13} className="text-accent-light" />
                Setup Guide (Android 11+):
              </div>
              <p>1. Open Settings → Developer Options → <b>Wireless Debugging</b>.</p>
              <p>2. Tap <b>"Pair device with pairing code"</b>.</p>
              <p>3. Enter displayed IP, Pairing Port, and 6-Digit Code below:</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={pairHost}
                onChange={(e) => setPairHost(e.target.value)}
                placeholder="e.g. 192.168.1.20"
                className="w-full bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Pairing Port
                </label>
                <input
                  type="text"
                  value={pairPort}
                  onChange={(e) => setPairPort(e.target.value)}
                  placeholder="e.g. 37123"
                  className="w-full bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  6-Digit Pairing Code
                </label>
                <input
                  type="text"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value)}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="w-full bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-surface-600 hover:bg-surface-500 text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPairing}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-accent hover:bg-accent-dark text-white disabled:opacity-50"
              >
                {isPairing ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                Pair Device
              </button>
            </div>
          </form>
        )}

        {/* Mode 3: Scan QR Code */}
        {mode === 'qr' && (
          <div className="space-y-4 text-center">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 text-left space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
                <AlertCircle size={13} />
                Android System Note:
              </div>
              <p>Android stock QR scanner looks for local mDNS broadcast. If your Android phone gets stuck spinning on QR scan, use the <b>Pair Code (6-Digit)</b> tab or <b>1-Click USB</b> tab instead.</p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-surface-500 shadow-inner min-h-[220px]">
              {isGeneratingQr ? (
                <div className="flex flex-col items-center gap-2 text-gray-600 text-xs">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  Generating Pairing QR Code…
                </div>
              ) : qrData ? (
                <img
                  src={qrData.qrDataUrl}
                  alt="Android Wireless Debugging Pairing QR Code"
                  className="w-52 h-52 object-contain rounded-lg"
                />
              ) : (
                <button
                  onClick={loadQrCode}
                  className="flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
                >
                  <RefreshCw size={14} /> Retry QR Code
                </button>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setMode('pair')}
                className="text-xs text-accent hover:underline font-medium"
              >
                ← Switch to 6-Digit Pair Code
              </button>
              <button
                type="button"
                onClick={() => setMode('connect')}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-accent hover:bg-accent-dark text-white"
              >
                Next: Connect Device →
              </button>
            </div>
          </div>
        )}

        {/* Mode 4: Connect */}
        {mode === 'connect' && (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="bg-surface-800 border border-surface-600 rounded-xl p-3 text-xs text-gray-400">
              Enter your phone's Wi-Fi IP address and Connection Port (Default for TCP mode is <b>5555</b>, or check your phone's Wireless Debugging main screen).
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Device IP Address
              </label>
              <input
                type="text"
                value={connectHost}
                onChange={(e) => setConnectHost(e.target.value)}
                placeholder="e.g. 192.168.1.20"
                className="w-full bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                ADB Connection Port
              </label>
              <input
                type="text"
                value={connectPort}
                onChange={(e) => setConnectPort(e.target.value)}
                placeholder="e.g. 5555"
                className="w-full bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-surface-600 hover:bg-surface-500 text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnecting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-accent hover:bg-accent-dark text-white disabled:opacity-50"
              >
                {isConnecting ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                Connect Device
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
