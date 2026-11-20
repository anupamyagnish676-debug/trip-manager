'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { Trip } from '@/types';
import { generateWhatsAppSummary } from '@/lib/calculations';

interface WhatsAppExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

export function WhatsAppExportModal({
  isOpen,
  onClose,
  trip,
}: WhatsAppExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const summaryText = generateWhatsAppSummary(trip);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const encoded = encodeURIComponent(summaryText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 touch-manipulation"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 pr-8">
          <span>💬</span> Export WhatsApp Group Summary
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ready-to-paste message with complete breakdown of expenses and settlements
        </p>

        <div className="mt-4">
          <textarea
            readOnly
            rows={10}
            value={summaryText}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 text-xs font-bold text-slate-900 dark:text-white transition-all active:scale-95 min-h-[44px] touch-manipulation"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Summary'}
          </button>

          <button
            type="button"
            onClick={shareToWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white shadow-md transition-all active:scale-95 min-h-[44px] touch-manipulation"
          >
            <Share2 className="h-4 w-4" />
            Share to WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
