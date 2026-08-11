import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Play, Trash2, Copy, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { runShell } from '../services/electronApi';
import { useToast } from './Toast';
import type { ShellHistoryEntry } from '../types/device';

interface ShellTerminalProps {
  serial: string;
}

export function ShellTerminal({ serial }: ShellTerminalProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<ShellHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const runCommand = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd || isRunning) return;

    setCommandHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)].slice(0, 100));
    setHistoryIndex(-1);
    setCommand('');
    setIsRunning(true);

    const entry: ShellHistoryEntry = {
      id: Math.random().toString(36).slice(2),
      command: cmd,
      stdout: '',
      stderr: '',
      code: 0,
      timestamp: new Date(),
    };

    try {
      const result = await runShell(serial, cmd);
      if (result.success && result.data) {
        entry.stdout = result.data.stdout;
        entry.stderr = result.data.stderr;
        entry.code = result.data.code;
      } else {
        entry.stderr = result.error ?? 'Command failed';
        entry.code = -1;
      }
    } catch (err: unknown) {
      entry.stderr = err instanceof Error ? err.message : 'Unknown error';
      entry.code = -1;
    } finally {
      setIsRunning(false);
    }

    setHistory((prev) => [...prev, entry]);
    inputRef.current?.focus();
  }, [command, isRunning, serial]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      if (commandHistory[newIndex]) setCommand(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setCommand(newIndex === -1 ? '' : commandHistory[newIndex]);
    }
  };

  const handleClear = () => {
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleCopyAll = () => {
    const text = history
      .map((h) => `$ ${h.command}\n${h.stdout}${h.stderr ? `[stderr] ${h.stderr}` : ''}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    showToast('Output copied to clipboard', 'success');
  };

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 bg-surface-800">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-accent-light" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            ADB Shell
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-accent-light">
              <Loader2 size={10} className="animate-spin" /> Running…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            id="shell-copy-btn"
            onClick={handleCopyAll}
            disabled={history.length === 0}
            title="Copy all output"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-600
              disabled:opacity-30 transition-all"
          >
            <Copy size={13} />
          </button>
          <button
            id="shell-clear-btn"
            onClick={handleClear}
            disabled={history.length === 0}
            title="Clear terminal"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-surface-600
              disabled:opacity-30 transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-4 bg-surface-900 min-h-48 max-h-80"
      >
        {history.length === 0 ? (
          <div className="text-gray-600 select-none">
            <p>ADB Shell — type a command below and press Enter or Run</p>
            <p className="mt-1">Example: <span className="text-gray-400">getprop ro.product.model</span></p>
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id}>
              {/* Command line */}
              <div className="flex items-center gap-2 text-accent-light">
                <span className="text-gray-600 select-none">$</span>
                <span>{entry.command}</span>
                {entry.code !== 0 && (
                  <span className="ml-auto text-danger text-xs font-mono px-1.5 py-0.5 rounded bg-danger/10">
                    exit {entry.code}
                  </span>
                )}
              </div>
              {/* stdout */}
              {entry.stdout && (
                <pre className="text-gray-300 mt-1 whitespace-pre-wrap break-all leading-relaxed">
                  {entry.stdout}
                </pre>
              )}
              {/* stderr */}
              {entry.stderr && (
                <pre className="text-danger/80 mt-1 whitespace-pre-wrap break-all leading-relaxed">
                  {entry.stderr}
                </pre>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-surface-600 bg-surface-800">
        <span className="text-gray-600 font-mono text-xs select-none shrink-0">$</span>
        <input
          ref={inputRef}
          id="shell-input"
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter ADB shell command…"
          autoComplete="off"
          spellCheck={false}
          disabled={isRunning}
          className="flex-1 bg-transparent text-xs font-mono text-gray-200 placeholder-gray-600
            outline-none disabled:opacity-50"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            id="shell-history-up-btn"
            onClick={() => {
              const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
              setHistoryIndex(newIndex);
              if (commandHistory[newIndex]) setCommand(commandHistory[newIndex]);
            }}
            disabled={commandHistory.length === 0}
            title="Previous command"
            className="p-1 rounded text-gray-600 hover:text-gray-400 disabled:opacity-30 transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            id="shell-history-down-btn"
            onClick={() => {
              const newIndex = Math.max(historyIndex - 1, -1);
              setHistoryIndex(newIndex);
              setCommand(newIndex === -1 ? '' : commandHistory[newIndex]);
            }}
            disabled={historyIndex <= 0}
            title="Next command"
            className="p-1 rounded text-gray-600 hover:text-gray-400 disabled:opacity-30 transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button
            id="shell-run-btn"
            onClick={runCommand}
            disabled={!command.trim() || isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-accent hover:bg-accent-dark text-white text-xs font-medium
              disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isRunning ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Play size={12} />
            )}
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
