import { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { takeScreenshot, tapScreen, swipeScreen, openCastWindow } from '../services/electronApi';
import { useToast } from './Toast';

interface CastPhoneWindowProps {
  serial: string;
  resolution?: string;
  isStandalone?: boolean;
}

export function CastPhoneWindow({ serial, resolution = '1080x2400', isStandalone = false }: CastPhoneWindowProps) {
  const [frame, setFrame] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const frameCountRef = useRef<number>(0);
  const { showToast } = useToast();

  const [resW, resH] = resolution.includes('x')
    ? resolution.split('x').map((v) => parseInt(v, 10))
    : [1080, 2400];

  useEffect(() => {
    let active = true;
    let timerId: NodeJS.Timeout;

    const fpsInterval = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    const captureFrame = async () => {
      if (!active) return;
      try {
        const res = await takeScreenshot(serial);
        if (res.success && res.data) {
          setFrame(res.data);
          frameCountRef.current += 1;
        }
      } catch {
        // Suppress streaming error
      } finally {
        if (active) {
          timerId = setTimeout(captureFrame, 60); // Low-latency frame loop
        }
      }
    };

    captureFrame();

    return () => {
      active = false;
      clearTimeout(timerId);
      clearInterval(fpsInterval);
    };
  }, [serial]);

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

    if (dx < 10 && dy < 10) {
      try {
        await tapScreen(serial, end.x, end.y);
      } catch {
        showToast('Tap failed', 'error');
      }
    } else {
      try {
        await swipeScreen(serial, start.x, start.y, end.x, end.y, duration);
      } catch {
        showToast('Swipe gesture failed', 'error');
      }
    }
  };

  const handleOpenSeparateWindow = async () => {
    try {
      await openCastWindow(serial);
      showToast('Opened separate phone cast window!', 'success');
    } catch {
      showToast('Failed to open cast window', 'error');
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${isStandalone ? 'h-screen bg-[#090a0f] p-2' : 'w-full'}`}>
      {/* Phone Window Header Controls */}
      <div className="w-full max-w-[380px] flex items-center justify-between px-3 py-2 bg-surface-800 border border-surface-600 rounded-t-2xl text-xs">
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-accent-light" />
          <span className="font-semibold text-gray-300 truncate max-w-[140px]">
            {serial}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/20 text-success">
            {fps} FPS
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!isStandalone && (
            <button
              onClick={handleOpenSeparateWindow}
              className="p-1 rounded hover:bg-surface-600 text-gray-400 hover:text-gray-200"
              title="Open Separate Phone Window"
            >
              <ExternalLink size={13} />
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded hover:bg-surface-600 text-gray-400 hover:text-gray-200"
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Phone Screen Frame */}
      <div className="relative bg-black border-4 border-surface-600 rounded-b-3xl p-1 shadow-2xl overflow-hidden max-w-[380px] w-full flex items-center justify-center min-h-[520px]">
        {!frame ? (
          <div className="flex flex-col items-center gap-2 text-gray-500 text-xs py-20">
            <RefreshCw size={20} className="animate-spin text-accent-light" />
            Initializing Ultra-Low Latency Stream…
          </div>
        ) : (
          <img
            src={`data:image/png;base64,${frame}`}
            alt="Android Live Screen Stream"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            draggable={false}
            className={`w-full object-contain rounded-b-2xl cursor-pointer select-none ${
              isFullscreen ? 'max-h-screen' : 'max-h-[720px]'
            }`}
          />
        )}
      </div>
    </div>
  );
}
