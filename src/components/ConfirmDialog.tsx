import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmColors =
    variant === 'danger'
      ? 'bg-danger hover:bg-red-600 text-white'
      : 'bg-warning hover:bg-amber-600 text-black';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-surface-700 border border-surface-500 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-danger/15 shrink-0">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div className="flex-1">
            <h2 id="dialog-title" className="text-base font-semibold text-gray-100 mb-1">
              {title}
            </h2>
            <p className="text-sm text-gray-400">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            id="dialog-cancel-btn"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg
              bg-surface-500 hover:bg-surface-400 text-gray-300 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="dialog-confirm-btn"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmColors}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
