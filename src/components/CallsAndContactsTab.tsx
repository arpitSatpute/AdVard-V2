import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Search,
  User,
  Delete,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Users,
  Volume2,
} from 'lucide-react';
import { makeCall, answerCall, endCall, getContacts, getCallState } from '../services/electronApi';
import { useToast } from './Toast';
import { ContactItem, CallStateInfo } from '../types/device';

interface CallsAndContactsTabProps {
  serial: string;
}

export function CallsAndContactsTab({ serial }: CallsAndContactsTabProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallStateInfo>({ state: 'IDLE' });
  const [callDuration, setCallDuration] = useState<number>(0);
  const { showToast } = useToast();

  // Load contacts
  const fetchContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const res = await getContacts(serial);
      if (res.success && res.data) {
        setContacts(res.data);
      } else {
        showToast(res.error || 'Failed to fetch contacts from phone', 'error');
      }
    } catch {
      showToast('Failed to fetch contacts from phone', 'error');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (serial) {
      fetchContacts();
    }
  }, [serial]);

  // Poll call state
  useEffect(() => {
    if (!serial) return;
    const checkState = async () => {
      try {
        const res = await getCallState(serial);
        if (res.success && res.data) {
          setCallState(res.data);
        }
      } catch {}
    };
    checkState();
    const interval = setInterval(checkState, 2000);
    return () => clearInterval(interval);
  }, [serial]);

  // Duration ticker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState.state === 'OFFHOOK') {
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState.state]);

  const handleMakeCall = async (numToCall?: string) => {
    const targetNumber = numToCall || phoneNumber.trim();
    if (!targetNumber) return;

    setActionLoading('make');
    try {
      const res = await makeCall(serial, targetNumber);
      if (res.success) {
        showToast(`Dialing ${targetNumber}…`, 'success');
      } else {
        showToast(res.error || 'Failed to initiate call', 'error');
      }
    } catch {
      showToast('Failed to initiate call', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAnswerCall = async () => {
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

  const handleEndCall = async () => {
    setActionLoading('end');
    try {
      const res = await endCall(serial);
      if (res.success) {
        showToast('Call Disconnected', 'info');
      } else {
        showToast(res.error || 'Failed to end call', 'error');
      }
    } catch {
      showToast('Failed to end call', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    showToast('Phone number copied', 'info');
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.number.includes(q)
    );
  }, [contacts, searchQuery]);

  const activeCallerMatch = useMemo(() => {
    if (!callState.number || contacts.length === 0) return null;
    const cleanTarget = callState.number.replace(/\D/g, '');
    return contacts.find((c) => {
      const cleanC = c.number.replace(/\D/g, '');
      return cleanC && (cleanC.endsWith(cleanTarget) || cleanTarget.endsWith(cleanC));
    });
  }, [callState.number, contacts]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const appendDigit = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const backspaceDigit = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner for Ongoing / Incoming Call */}
      {callState.state !== 'IDLE' && (
        <div className={`p-5 rounded-2xl border shadow-xl flex items-center justify-between transition-all ${
          callState.state === 'RINGING'
            ? 'bg-emerald-950/80 border-emerald-500/50 shadow-emerald-950/40 animate-pulse'
            : 'bg-surface-800 border-accent/40 shadow-accent/10'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl flex items-center justify-center ${
              callState.state === 'RINGING' ? 'bg-emerald-500 text-white animate-bounce' : 'bg-accent/20 text-accent-light'
            }`}>
              <PhoneCall size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                  callState.state === 'RINGING' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-accent/20 text-accent-light border border-accent/40'
                }`}>
                  {callState.state === 'RINGING' ? 'Incoming Phone Call' : `In Call • ${formatTime(callDuration)}`}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-100 mt-1">
                {activeCallerMatch ? activeCallerMatch.name : callState.number || 'Unknown Caller'}
              </h3>
              {callState.number && activeCallerMatch && (
                <p className="text-xs font-mono text-gray-400">{callState.number}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {callState.state === 'RINGING' && (
              <button
                onClick={handleAnswerCall}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {actionLoading === 'answer' ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                Answer Call
              </button>
            )}

            <button
              onClick={handleEndCall}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
            >
              {actionLoading === 'end' ? <Loader2 size={16} className="animate-spin" /> : <PhoneOff size={16} />}
              {callState.state === 'RINGING' ? 'Decline' : 'Disconnect'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dialpad & Quick Controls */}
        <div className="bg-surface-800/90 rounded-2xl border border-surface-600/80 p-5 shadow-lg flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Phone size={16} className="text-accent-light" /> Phone Keypad & Dialpad
            </h3>

            {/* Display Number Input */}
            <div className="relative mb-6">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter number..."
                className="w-full bg-surface-900 border border-surface-500 rounded-xl px-4 py-3 text-lg font-mono text-center font-bold text-gray-100 placeholder-gray-600 outline-none focus:border-accent"
              />
              {phoneNumber && (
                <button
                  onClick={backspaceDigit}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-surface-700 transition-colors"
                  title="Backspace"
                >
                  <Delete size={18} />
                </button>
              )}
            </div>

            {/* Dialpad Buttons Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
              {[
                { digit: '1', sub: '' },
                { digit: '2', sub: 'ABC' },
                { digit: '3', sub: 'DEF' },
                { digit: '4', sub: 'GHI' },
                { digit: '5', sub: 'JKL' },
                { digit: '6', sub: 'MNO' },
                { digit: '7', sub: 'PQRS' },
                { digit: '8', sub: 'TUV' },
                { digit: '9', sub: 'WXYZ' },
                { digit: '*', sub: '' },
                { digit: '0', sub: '+' },
                { digit: '#', sub: '' },
              ].map((btn) => (
                <button
                  key={btn.digit}
                  onClick={() => appendDigit(btn.digit)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-surface-700/60 hover:bg-surface-600/90 border border-surface-500/50 text-gray-100 hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  <span className="text-xl font-bold font-mono">{btn.digit}</span>
                  {btn.sub && <span className="text-[9px] text-gray-400 font-medium tracking-widest">{btn.sub}</span>}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleMakeCall()}
                disabled={!phoneNumber.trim() || actionLoading !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 border border-emerald-400/30 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition-all"
              >
                {actionLoading === 'make' ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
                Call Number
              </button>

              <button
                onClick={handleEndCall}
                disabled={actionLoading !== null}
                className="p-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/30 disabled:opacity-40 transition-all"
                title="Disconnect Current Call"
              >
                <PhoneOff size={18} />
              </button>
            </div>
          </div>

          <div className="bg-surface-900/60 rounded-xl p-3.5 border border-surface-600/50 text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Volume2 size={14} className="text-accent-light" /> Desktop Audio Notice
            </p>
            <p>
              Calls are initiated through your connected mobile device. You can speak and answer calls using your desktop or connected Bluetooth headset.
            </p>
          </div>
        </div>

        {/* Right Column: Contacts List */}
        <div className="lg:col-span-2 bg-surface-800/90 rounded-2xl border border-surface-600/80 p-5 shadow-lg flex flex-col h-[560px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-600/80">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent/20 text-accent-light">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-100">Phone Contacts Directory</h3>
                <p className="text-[11px] text-gray-400">
                  {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} available on phone
                </p>
              </div>
            </div>

            <button
              onClick={fetchContacts}
              disabled={isLoadingContacts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-500 text-xs text-gray-300 font-medium transition-all"
            >
              <RefreshCw size={13} className={isLoadingContacts ? 'animate-spin' : ''} />
              Sync Contacts
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name or phone number..."
              className="w-full bg-surface-900 border border-surface-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-accent"
            />
          </div>

          {/* Contacts Directory List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoadingContacts ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <Loader2 size={24} className="animate-spin text-accent-light" />
                <span className="text-xs">Fetching contacts from Android device…</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                <User size={32} />
                <span className="text-xs font-medium">No contacts found</span>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-700/40 hover:bg-surface-700 border border-surface-600/40 hover:border-accent/40 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 text-accent-light flex items-center justify-center font-bold text-sm shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-200 truncate group-hover:text-accent-light transition-colors">
                        {contact.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-gray-400">{contact.number}</span>
                        {contact.type && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-800 text-gray-400 border border-surface-600">
                            {contact.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100">
                    <button
                      onClick={() => copyToClipboard(contact.number)}
                      className="p-2 rounded-xl bg-surface-800 hover:bg-surface-600 text-gray-400 hover:text-gray-200 border border-surface-600 transition-colors"
                      title="Copy Number"
                    >
                      {copiedNumber === contact.number ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>

                    <button
                      onClick={() => {
                        setPhoneNumber(contact.number);
                        handleMakeCall(contact.number);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all"
                    >
                      <Phone size={13} />
                      Call
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
