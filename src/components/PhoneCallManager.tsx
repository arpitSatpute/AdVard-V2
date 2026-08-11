import React, { useState } from 'react';
import { Phone, PhoneOff, PhoneCall, Loader2 } from 'lucide-react';
import { makeCall, answerCall, endCall } from '../services/electronApi';
import { useToast } from './Toast';

interface PhoneCallManagerProps {
  serial: string;
}

export function PhoneCallManager({ serial }: PhoneCallManagerProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleMakeCall = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber.trim()) return;

    setLoadingAction('make');
    try {
      const res = await makeCall(serial, phoneNumber.trim());
      if (res.success) {
        showToast(`Dialing ${phoneNumber}…`, 'success');
      } else {
        showToast(res.error ?? 'Failed to initiate call', 'error');
      }
    } catch {
      showToast('Failed to initiate call', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAnswerCall = async () => {
    setLoadingAction('answer');
    try {
      const res = await answerCall(serial);
      if (res.success) {
        showToast('Answered incoming call', 'success');
      } else {
        showToast(res.error ?? 'Failed to answer call', 'error');
      }
    } catch {
      showToast('Failed to answer call', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEndCall = async () => {
    setLoadingAction('end');
    try {
      const res = await endCall(serial);
      if (res.success) {
        showToast('Call ended', 'info');
      } else {
        showToast(res.error ?? 'Failed to end call', 'error');
      }
    } catch {
      showToast('Failed to end call', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <PhoneCall size={14} className="text-accent-light" />
        Phone Call Manager
      </h3>

      <div className="flex gap-2">
        <form onSubmit={handleMakeCall} className="flex-1 flex gap-2">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number to dial…"
            className="flex-1 bg-surface-800 border border-surface-500 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-600 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!phoneNumber.trim() || loadingAction !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success/20 border border-success/40 text-success text-xs font-medium hover:bg-success/30 disabled:opacity-40 transition-all"
          >
            {loadingAction === 'make' ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
            Call
          </button>
        </form>

        <button
          onClick={handleAnswerCall}
          disabled={loadingAction !== null}
          title="Answer Incoming Call"
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-40 transition-all"
        >
          {loadingAction === 'answer' ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
          Answer
        </button>

        <button
          onClick={handleEndCall}
          disabled={loadingAction !== null}
          title="End / Reject Call"
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-danger/20 border border-danger/40 text-danger text-xs font-medium hover:bg-danger/30 disabled:opacity-40 transition-all"
        >
          {loadingAction === 'end' ? <Loader2 size={13} className="animate-spin" /> : <PhoneOff size={13} />}
          End Call
        </button>
      </div>
    </div>
  );
}
