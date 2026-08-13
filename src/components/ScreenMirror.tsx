import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Smartphone, Touchpad } from 'lucide-react';
import { takeScreenshot, tapScreen, swipeScreen } from '../services/electronApi';
import { useToast } from './Toast';

interface ScreenMirrorProps {
  serial: string;
  resolution: string;
}

export function ScreenMirror({ serial, resolution }: ScreenMirrorProps) {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [frame, setFrame] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isStreamingRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const { showToast } = useToast();

  // Parse device resolution (e.g. "1080x2400")
  const [resW, resH] = resolution.includes('x')
    ? resolution.split('x').map((v) => parseInt(v, 10))
    : [1080, 2400];

  // High-frequency polling loop for live screen streaming
  useEffect(() => {
    isStreamingRef.current = isStreaming;
    if (!isStreaming) {
      setFrame(null);
      setFps(0);
      return;
    }

    let active = true;
    let timerId: NodeJS.Timeout;

    // FPS Counter Interval
    const fpsInterval = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    const captureFrame = async () => {
      if (!active || !isStreamingRef.current) return;
      try {
        const res = await takeScreenshot(serial);
        if (res.success && res.data) {
          setFrame(res.data);
          frameCountRef.current += 1;
        }
      } catch {
        // Suppress frame grab errors during high speed stream
      } finally {
        if (active && isStreamingRef.current) {
          // Poll next frame rapidly
          timerId = setTimeout(captureFrame, 100);
        }
      }
    };

    captureFrame();

    return () => {
      active = false;
      isStreamingRef.current = false;
      clearTimeout(timerId);
      clearInterval(fpsInterval);
    };
  }, [isStreaming, serial]);

  // Convert canvas element relative click to Android resolution touch coordinates
  const getCoordinates = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = resW / rect.width;
    const scaleY = resH / rect.height;

    return {
      x: clickX * scaleX,
      y: clickY * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const coords = getCoordinates(e);
    dragStartRef.current = {
      x: coords.x,
      y: coords.y,
      time: Date.now(),
    };
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragStartRef.current) return;
    const start = dragStartRef.current;
    dragStartRef.current = null;

    const end = getCoordinates(e);
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const duration = Math.max(100, Date.now() - start.time);

    // If mouse moved less than 10px, treat as Tap
    if (dx < 10 && dy < 10) {
      try {
        await tapScreen(serial, end.x, end.y);
      } catch {
        showToast('Tap failed', 'error');
      }
    } else {
      // Treat as Swipe gesture
      try {
        await swipeScreen(serial, start.x, start.y, end.x, end.y, duration);
      } catch {
        showToast('Swipe gesture failed', 'error');
      }
    }
  };

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 bg-surface-800">
        <div className="flex items-center gap-2">
          <Touchpad size={14} className="text-accent-light" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Interactive Remote Screen Mirror
          </span>
          {isStreaming && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-success/15 text-success">
              LIVE • {fps} FPS
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Navigation Toolbar */}
          <div className="flex items-center gap-1 bg-surface-900/80 p-1 rounded-xl border border-surface-600/80 mr-2">
            <button
              onClick={async () => {
                try {
                  const { pressHome } = await import('../services/electronApi');
                  await pressHome(serial);
                } catch {}
              }}
              title="Home Button"
              className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-300 hover:text-white transition-all active:scale-95"
            >
              <Smartphone size={13} />
            </button>
          </div>

          <button
            id="toggle-screen-mirror-btn"
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isStreaming
                ? 'bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30'
                : 'bg-accent/20 border border-accent/40 text-accent-light hover:bg-accent/30'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause size={12} /> Stop Mirroring
              </>
            ) : (
              <>
                <Play size={12} /> Start Screen Mirroring
              </>
            )}
          </button>
        </div>
      </div>

      {/* Screen Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 bg-surface-900 flex flex-col items-center justify-center p-4 min-h-[380px] relative select-none"
      >
        {!isStreaming ? (
          <div className="flex flex-col items-center justify-center text-center p-6 gap-3">
            <div className="p-4 rounded-2xl bg-surface-800 border border-surface-600">
              <Smartphone size={32} className="text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-300">Live Screen Mirroring Paused</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Click Start Screen Mirroring above to get real-time screen output and control your phone directly with your laptop mouse and gestures.
            </p>
          </div>
        ) : !frame ? (
          <div className="flex flex-col items-center gap-2 text-gray-400 text-xs">
            <RefreshCw size={20} className="animate-spin text-accent-light" />
            Connecting stream…
          </div>
        ) : (
          <div className="relative group cursor-pointer flex justify-center">
            <img
              src={`data:image/png;base64,${frame}`}
              alt="Android Interactive Remote Screen"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              draggable={false}
              className="rounded-xl shadow-2xl border border-surface-600 max-h-[460px] object-contain transition-transform"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] text-gray-300 pointer-events-none">
              Click to Tap • Drag to Swipe
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
