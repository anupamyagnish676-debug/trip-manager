'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Smartphone, Edit3 } from 'lucide-react';
import { generateUpiUrl } from '@/lib/calculations';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  payeeUpi: string;
  payeeName: string;
  amount?: number;
  note?: string;
  title?: string;
  customQrImage?: string;
  onSaveUpi?: (newUpi: string) => void;
}

export function QRCodeModal({
  isOpen,
  onClose,
  payeeUpi,
  payeeName,
  amount,
  note,
  title = 'Scan & Pay via UPI',
  customQrImage,
  onSaveUpi,
}: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [editedUpi, setEditedUpi] = useState(payeeUpi);

  useEffect(() => {
    setEditedUpi(payeeUpi);
  }, [payeeUpi]);

  const effectiveUpi = (isEditingUpi ? editedUpi : (editedUpi || payeeUpi)).trim();

  const isPlaceholderUpi = effectiveUpi === 'friend@upi' || !effectiveUpi;

  const upiUrl = generateUpiUrl({
    upiId: effectiveUpi,
    payeeName,
    amount,
    note: note || 'TripSplit Settlement',
  });

  useEffect(() => {
    if (isOpen && canvasRef.current && !customQrImage) {
      QRCode.toCanvas(canvasRef.current, upiUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    }
  }, [isOpen, upiUrl, customQrImage]);

  if (!isOpen) return null;

  const copyUpi = () => {
    navigator.clipboard.writeText(payeeUpi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-sm rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 touch-manipulation"
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

          {isPlaceholderUpi && !isEditingUpi && (
            <div className="my-2 rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-xs text-amber-800 dark:text-amber-200 text-left">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️</span> No real UPI ID set for {payeeName}
              </p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300 mt-0.5">
                Currently showing placeholder ({effectiveUpi}). Click <strong className="underline cursor-pointer" onClick={() => setIsEditingUpi(true)}>Change UPI</strong> below to enter their PhonePe, Google Pay, or BHIM ID.
              </p>
            </div>
          )}

          {/* QR Display Area */}
          <div className="my-4 flex justify-center">
            {customQrImage ? (
              <div className="rounded-2xl border-4 border-slate-100 dark:border-slate-800 p-2 bg-white shadow-inner max-w-[250px] max-h-[250px] flex items-center justify-center overflow-hidden">
                <img
                  src={customQrImage}
                  alt="Personal Bank QR Code"
                  className="rounded-lg max-h-[230px] object-contain"
                />
              </div>
            ) : (
              <div className="rounded-2xl border-4 border-slate-100 dark:border-slate-800 p-2 bg-white shadow-inner">
                <canvas ref={canvasRef} className="rounded-lg" />
              </div>
            )}
          </div>

          {/* UPI ID Box / Editor */}
          {isEditingUpi ? (
            <div className="rounded-xl bg-slate-50 p-3 border border-emerald-300 dark:bg-slate-800/80 dark:border-emerald-800 space-y-2 text-left">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Enter your real UPI ID (Google Pay / PhonePe / Paytm):
              </label>
              <input
                type="text"
                value={editedUpi}
                onChange={(e) => setEditedUpi(e.target.value)}
                placeholder="e.g. yourname@okaxis or 9876543210@ybl"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 sm:py-1.5 text-base sm:text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingUpi(false);
                    setEditedUpi(payeeUpi);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editedUpi.trim() && onSaveUpi) {
                      onSaveUpi(editedUpi.trim());
                    }
                    setIsEditingUpi(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm touch-manipulation min-h-[36px]"
                >
                  Save UPI ID
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700">
              <div className="text-left text-xs">
                <p className="text-slate-400">Receiving UPI ID</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {effectiveUpi}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingUpi(true)}
                  className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2 py-1 rounded-lg transition-all"
                  title="Change this UPI ID to a real Google Pay / PhonePe account"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Change UPI</span>
                </button>
                <button
                  type="button"
                  onClick={copyUpi}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-2 py-1"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

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
              *Scan with Google Pay, PhonePe, Paytm, or any UPI app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
