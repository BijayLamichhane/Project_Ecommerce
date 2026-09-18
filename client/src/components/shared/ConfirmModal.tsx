import React, { ReactNode, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
  children?: ReactNode;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
  children,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#211E1B]/75"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-md border border-[#5E574F] bg-[#F7F3EA] shadow-xl shadow-black/20 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#C8C0B3]">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center ${danger ? "bg-[#F3DFDB] text-[#A23B2E]" : "bg-[#F1E0C8] text-[#C17817]"}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="confirm-modal-title" className="text-base font-extrabold text-[#211E1B]">
                {title}
              </h2>
              <p id="confirm-modal-message" className="text-sm text-[#6F685F] leading-relaxed mt-2">
                {message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
            className="p-2 rounded-lg text-[#8B8377] hover:text-[#211E1B] hover:bg-[#E8E1D5] transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children && <div className="px-6 pt-5">{children}</div>}

        <div className="flex justify-end gap-3 p-5 bg-[#E8E1D5]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-[#B8B0A3] text-[#514B44] hover:bg-[#F1ECE1] text-sm font-semibold transition disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 ${danger ? "bg-[#A23B2E] hover:bg-[#8F3328]" : "bg-[#C17817] hover:bg-[#A66314]"}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
