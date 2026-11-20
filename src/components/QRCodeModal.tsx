'use client';

import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Copy, ExternalLink, Check, Smartphone } from 'lucide-react';
import { generateUpiUrl } from '@/lib/calculations';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  payeeUpi: string;
  payeeName: string;
  amount?: number;
  note?: string;
  title?: string;
}

export function QRCodeModal({
  isOpen,
  onClose,
  payeeUpi,
  payeeName,
  amount,
  note,
  title = 'Scan & Pay via UPI',
}: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  const upiUrl = generateUpiUrl({
    upiId: payeeUpi,
    payeeName,
    amount,
    note: note || 'TripSplit Settlement',
  });

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, upiUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    }
  }, [isOpen, upiUrl]);

  if (!isOpen) return null;

  const copyUpi = () => {
    navigator.clipboard.writeText(payeeUpi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Paying to <span className="font-semibold text-emerald-600 dark:text-emerald-400">{payeeName}</span>
          </p>

          {amount && amount > 0 && (
            <div className="my-3 inline-block rounded-full bg-emerald-50 px-4 py-1.5 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                ₹{amount.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* QR Code Canvas */}
          <div className="my-4 flex justify-center">
            <div className="rounded-2xl border-4 border-slate-100 dark:border-slate-800 p-2 bg-white shadow-inner">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
          </div>

          {/* UPI ID Copy Box */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700">
            <div className="text-left text-xs">
              <p className="text-slate-400">UPI ID</p>
              <p className="font-mono font-medium text-slate-700 dark:text-slate-200">{payeeUpi}</p>
            </div>
            <button
              onClick={copyUpi}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Mobile Direct Pay Buttons */}
          <div className="mt-4 space-y-2">
            <a
              href={upiUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Smartphone className="h-4 w-4" />
              Open UPI App (GPay / PhonePe)
            </a>
            <p className="text-[11px] text-slate-400">
              *Tapping button opens installed UPI apps on your mobile device
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
