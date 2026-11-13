'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function Dialog({ isOpen, onClose, title, description, children, triggerRef }: DialogProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          triggerRef?.current?.focus();
        }

        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      triggerRef?.current?.focus();
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="presentation">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        aria-describedby={description ? 'ui-dialog-desc' : undefined}
        className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 id="ui-dialog-title" className="text-xl font-bold text-white">
              {title}
            </h2>
            {description && (
              <p id="ui-dialog-desc" className="text-xs text-slate-300 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-800"
            aria-label="Close dialog (Escape)"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div>{children}</div>
      </section>
    </div>
  );
}

