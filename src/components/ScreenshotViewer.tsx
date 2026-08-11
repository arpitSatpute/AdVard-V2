import { useState } from 'react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { saveScreenshot } from '../services/electronApi';
import { useToast } from './Toast';

interface ScreenshotViewerProps {
  base64: string | null;
  onClear: () => void;
}

export function ScreenshotViewer({ base64, onClear }: ScreenshotViewerProps) {
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { showToast } = useToast();

  if (!base64) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveScreenshot(base64);
      if (result.success) {
        showToast(`Saved to ${result.data}`, 'success');
      } else if (result.error !== 'Save cancelled') {
        showToast(result.error ?? 'Save failed', 'error');
      }
    } catch {
      showToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface-700 rounded-2xl border border-surface-500 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Screenshot
        </span>
        <div className="flex items-center gap-1">
          <button
            id="zoom-out-btn"
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            title="Zoom out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-500 transition-all"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            id="zoom-in-btn"
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            title="Zoom in"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-500 transition-all"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-4 bg-surface-500 mx-1" />
          <button
            id="save-screenshot-btn"
            onClick={handleSave}
            disabled={saving}
            title="Save screenshot"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-accent/20 border border-accent/30 text-accent-light text-xs font-medium
              hover:bg-accent/30 disabled:opacity-50 transition-all"
          >
            <Download size={12} />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            id="close-screenshot-btn"
            onClick={onClear}
            title="Close screenshot"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-500 transition-all ml-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div className="overflow-auto bg-surface-900 flex justify-center p-4 max-h-96">
        <img
          src={`data:image/png;base64,${base64}`}
          alt="Android device screenshot"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}
          className="rounded-lg shadow-2xl max-w-full"
        />
      </div>
    </div>
  );
}
