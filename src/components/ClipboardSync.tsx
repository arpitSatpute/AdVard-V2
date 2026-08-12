import { useState } from 'react';
import { Clipboard, ArrowDownLeft, ArrowUpRight, Copy, Send, Check } from 'lucide-react';
import { getPhoneClipboard, sendPhoneClipboard } from '../services/electronApi';
import { useToast } from './Toast';

interface ClipboardSyncProps {
  serial: string;
}

export function ClipboardSync({ serial }: ClipboardSyncProps) {
  const [phoneText, setPhoneText] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const { showToast } = useToast();

  const handleCopyFromPhone = async () => {
    setIsCopying(true);
    try {
      const res = await getPhoneClipboard(serial);
      if (res.success && res.data !== undefined) {
        setPhoneText(res.data);
        if (res.data) {
          await navigator.clipboard.writeText(res.data);
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 2000);
          showToast('Copied phone clipboard to computer clipboard!', 'success');
        } else {
          showToast('Phone clipboard is empty', 'info');
        }
      } else {
        showToast(res.error ?? 'Failed to read phone clipboard', 'error');
      }
    } catch {
      showToast('Error reading phone clipboard', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleSendToPhone = async () => {
    if (!inputText.trim()) {
      showToast('Please enter text to send', 'error');
      return;
    }

    setIsSending(true);
    try {
      const res = await sendPhoneClipboard(serial, inputText.trim());
      if (res.success) {
        showToast('Sent text to phone clipboard!', 'success');
        setInputText('');
      } else {
        showToast(res.error ?? 'Failed to set phone clipboard', 'error');
      }
    } catch {
      showToast('Error sending to phone', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 bg-surface-800">
        <div className="flex items-center gap-2">
          <Clipboard size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Clipboard Synchronization
          </span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Phone -> Computer */}
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-3 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-300 mb-1">
              <ArrowDownLeft size={14} className="text-emerald-400" />
              Phone → Computer
            </div>
            <p className="text-[11px] text-gray-500">Read current phone clipboard and copy to PC.</p>
          </div>

          {phoneText && (
            <div className="p-2 rounded-lg bg-surface-900 border border-surface-600 font-mono text-xs text-emerald-300 max-h-20 overflow-y-auto break-all">
              {phoneText}
            </div>
          )}

          <button
            onClick={handleCopyFromPhone}
            disabled={isCopying}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            {copiedSuccess ? <Check size={13} /> : <Copy size={13} />}
            Copy Phone Clipboard
          </button>
        </div>

        {/* Computer -> Phone */}
        <div className="bg-surface-800 border border-surface-600 rounded-xl p-3 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-300 mb-1">
              <ArrowUpRight size={14} className="text-accent-light" />
              Computer → Phone
            </div>
            <p className="text-[11px] text-gray-500">Send custom text to phone clipboard.</p>
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type text to send to phone…"
            className="w-full bg-surface-900 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
          />

          <button
            onClick={handleSendToPhone}
            disabled={isSending}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-medium transition-all disabled:opacity-50"
          >
            <Send size={13} />
            Send to Phone Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
