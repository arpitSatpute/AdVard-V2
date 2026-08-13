import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  User,
  X,
  Mic,
  MicOff,
  Bluetooth,
  Smartphone,
  Grid,
  VolumeX,
} from 'lucide-react';
import {
  getCallState,
  answerCall,
  endCall,
  getContacts,
  setAudioRoute,
  toggleMuteMic,
  sendDtmfTone,
} from '../services/electronApi';
import { useToast } from './Toast';
import { CallStateInfo, ContactItem } from '../types/device';

interface CallServiceOverlayProps {
  serial: string;
}

export function CallServiceOverlay({ serial }: CallServiceOverlayProps) {
  const [callState, setCallState] = useState<CallStateInfo>({ state: 'IDLE' });
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [callerName, setCallerName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // In-call active audio controls
  const [audioSource, setAudioSource] = useState<'desktop' | 'speaker' | 'phone' | 'bluetooth'>('desktop');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showKeypad, setShowKeypad] = useState<boolean>(false);

  const { showToast } = useToast();

  // Poll call status periodically
  useEffect(() => {
    if (!serial) return;

    const checkCall = async () => {
      try {
        const res = await getCallState(serial);
        if (res.success && res.data) {
          const newState = res.data;
          setCallState((prev) => {
            if (prev.state !== newState.state || prev.number !== newState.number) {
              if (newState.state === 'RINGING' || newState.state === 'OFFHOOK') {
                setDismissed(false);
              }
            }
            return newState;
          });
        }
      } catch (err) {
        // Silent catch for background poll
      }
    };

    checkCall();
    const interval = setInterval(checkCall, 2500);
    return () => clearInterval(interval);
  }, [serial]);

  // Load contacts once to resolve caller names
  useEffect(() => {
    if (!serial) return;
    getContacts(serial).then((res) => {
      if (res.success && res.data) {
        setContacts(res.data);
      }
    }).catch(() => {});
  }, [serial]);

  // Match caller name when number is available
  useEffect(() => {
    if (callState.number && contacts.length > 0) {
      const cleanTarget = callState.number.replace(/\D/g, '');
      const matched = contacts.find((c) => {
        const cleanC = c.number.replace(/\D/g, '');
        return cleanC && (cleanC.endsWith(cleanTarget) || cleanTarget.endsWith(cleanC));
      });
      if (matched) {
        setCallerName(matched.name);
      } else {
        setCallerName(null);
      }
    } else {
      setCallerName(null);
    }
  }, [callState.number, contacts]);

  // Call duration counter when active
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState.state === 'OFFHOOK') {
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      setCallDuration(0);
      setIsMuted(false);
      setShowKeypad(false);
      setAudioSource('desktop');
    }
    return () => clearInterval(timer);
  }, [callState.state]);

  const handleAnswer = async () => {
    setActionLoading('answer');
    try {
      const res = await answerCall(serial);
      if (res.success) {
        showToast('Call Answered', 'success');
      } else {
        showToast(res.error || 'Failed to answer call', 'error');
      }
    } catch {
      showToast('Failed to answer call', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnd = async () => {
    setActionLoading('end');
    try {
      const res = await endCall(serial);
      if (res.success) {
        showToast('Call Ended', 'info');
      } else {
        showToast(res.error || 'Failed to disconnect call', 'error');
      }
    } catch {
      showToast('Failed to disconnect call', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwitchAudio = async (route: 'desktop' | 'speaker' | 'phone' | 'bluetooth') => {
    setAudioSource(route);
    try {
      let adbRoute: 'speaker' | 'earpiece' | 'bluetooth' | 'headset' = 'speaker';
      if (route === 'speaker') adbRoute = 'speaker';
      if (route === 'phone') adbRoute = 'earpiece';
      if (route === 'bluetooth') adbRoute = 'bluetooth';
      if (route === 'desktop') adbRoute = 'speaker';

      await setAudioRoute(serial, adbRoute);
      showToast(`Audio output routed to ${route.toUpperCase()}`, 'info');
    } catch {
      showToast(`Failed to route audio to ${route}`, 'error');
    }
  };

  const handleToggleMute = async () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    try {
      await toggleMuteMic(serial, nextMute);
      showToast(nextMute ? 'Microphone Muted' : 'Microphone Unmuted', 'info');
    } catch {
      showToast('Failed to toggle mute state', 'error');
    }
  };

  const handleSendDtmf = async (digit: string) => {
    try {
      await sendDtmfTone(serial, digit);
    } catch {}
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Strictly show popup ONLY when an active call process is ongoing (RINGING or OFFHOOK)
  const isCallActive = callState.state === 'RINGING' || callState.state === 'OFFHOOK';
  if (!isCallActive || dismissed) {
    return null;
  }

  const isRinging = callState.state === 'RINGING';

  return (
    <div className="fixed top-5 right-6 z-50 animate-bounce-in max-w-lg w-full">
      <div className={`p-4.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all ${
        isRinging
          ? 'bg-emerald-950/95 border-emerald-500/50 shadow-emerald-900/40 ring-2 ring-emerald-500/30'
          : 'bg-surface-800/95 border-surface-500 shadow-black/70'
      }`}>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`relative p-3 rounded-2xl flex items-center justify-center shrink-0 ${
              isRinging ? 'bg-emerald-500 text-white animate-pulse' : 'bg-accent/20 text-accent-light border border-accent/40'
            }`}>
              {isRinging ? <PhoneCall size={22} className="animate-bounce" /> : <Volume2 size={22} />}
              {isRinging && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isRinging ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-accent/20 text-accent-light'
                }`}>
                  {isRinging ? 'Incoming Call' : `Active Call • ${formatTime(callDuration)}`}
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-100 truncate mt-0.5 flex items-center gap-1.5">
                {callerName ? (
                  <>
                    <User size={14} className="text-gray-400 shrink-0" />
                    <span>{callerName}</span>
                  </>
                ) : (
                  <span>{callState.number || 'Unknown Caller'}</span>
                )}
              </h4>
              {callerName && callState.number && (
                <p className="text-xs text-gray-400 font-mono truncate">{callState.number}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isRinging && (
              <button
                onClick={handleAnswer}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
              >
                <Phone size={14} />
                Answer
              </button>
            )}

            <button
              onClick={handleEnd}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-600/25 disabled:opacity-50"
            >
              <PhoneOff size={14} />
              {isRinging ? 'Decline' : 'Disconnect'}
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-surface-700 transition-colors"
              title="Dismiss overlay"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Audio Route Selector & Essential In-call Control Bar (When Call Active) */}
        {!isRinging && (
          <div className="mt-3.5 pt-3 border-t border-surface-600/60 space-y-3">
            {/* Audio Source Switcher */}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                Call Audio Output:
              </span>
              <div className="grid grid-cols-4 gap-1.5 bg-surface-900/80 p-1 rounded-xl border border-surface-600">
                <button
                  onClick={() => handleSwitchAudio('desktop')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    audioSource === 'desktop' ? 'bg-accent text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Volume2 size={13} /> Desktop
                </button>
                <button
                  onClick={() => handleSwitchAudio('speaker')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    audioSource === 'speaker' ? 'bg-accent text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <VolumeX size={13} /> Speaker
                </button>
                <button
                  onClick={() => handleSwitchAudio('phone')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    audioSource === 'phone' ? 'bg-accent text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Smartphone size={13} /> Earpiece
                </button>
                <button
                  onClick={() => handleSwitchAudio('bluetooth')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                    audioSource === 'bluetooth' ? 'bg-accent text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Bluetooth size={13} /> Bluetooth
                </button>
              </div>
            </div>

            {/* Microphones Mute & DTMF Keypad Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-surface-700 text-gray-200 border-surface-500 hover:bg-surface-600'
                }`}
              >
                {isMuted ? <MicOff size={14} className="text-rose-400" /> : <Mic size={14} />}
                {isMuted ? 'Muted' : 'Mute Mic'}
              </button>

              <button
                onClick={() => setShowKeypad(!showKeypad)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                  showKeypad
                    ? 'bg-accent/20 text-accent-light border-accent/40'
                    : 'bg-surface-700 text-gray-200 border-surface-500 hover:bg-surface-600'
                }`}
              >
                <Grid size={14} /> Keypad Tones
              </button>
            </div>

            {/* In-Call Keypad (DTMF Dialing) */}
            {showKeypad && (
              <div className="grid grid-cols-3 gap-1.5 bg-surface-900/90 p-2 rounded-xl border border-surface-600">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleSendDtmf(digit)}
                    className="py-1.5 text-center font-mono font-bold text-xs text-gray-200 hover:bg-surface-700 active:bg-accent active:text-white rounded-lg border border-surface-700 transition-all"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
