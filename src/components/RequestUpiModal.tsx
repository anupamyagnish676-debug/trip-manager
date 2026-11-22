'use client';

import React, { useState } from 'react';
import { X, Mail, AlertTriangle, Send, CheckCircle2, MessageCircle, Loader2, Edit3, ArrowRight } from 'lucide-react';
import { Member, Trip } from '@/types';
import { formatMoney } from '@/lib/currency';

interface RequestUpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  toMember: Member;
  fromMember: Member;
  amount: number;
  trip: Trip;
  onSaveUpi?: (memberName: string, newUpi: string) => void;
  onUpiSaved?: (savedUpi: string) => void;
}

export function RequestUpiModal({
  isOpen,
  onClose,
  toMember,
  fromMember,
  amount,
  trip,
  onSaveUpi,
  onUpiSaved,
}: RequestUpiModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(toMember.email || '');
  const [isSending, setIsSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Manual fallback input if debtor already knows friend's UPI ID
  const [manualUpi, setManualUpi] = useState('');
  const [isSavingManualUpi, setIsSavingManualUpi] = useState(false);

  if (!isOpen) return null;

  const handleSendEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailStatus({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    setIsSending(true);
    setEmailStatus(null);

    try {
      const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}?trip=${trip.id}` : undefined;
      const res = await fetch('/api/request-upi-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toName: toMember.name,
          toEmail: recipientEmail.trim(),
          fromName: fromMember.name,
          amount,
          currency: trip.currency || 'INR',
          tripName: trip.name,
          portalUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus({
          success: true,
          message: `Request email sent successfully to ${recipientEmail}! ${toMember.name.split(' ')[0]} has been notified to enter their UPI ID.`,
        });
      } else {
        setEmailStatus({
          success: false,
          message: data.error || data.message || 'Failed to dispatch email notification.',
        });
      }
    } catch {
      setEmailStatus({
        success: false,
        message: 'Network error: could not send email. Try WhatsApp or enter their UPI ID manually.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveKnownUpi = () => {
    const trimmed = manualUpi.trim();
    if (!trimmed || !trimmed.includes('@')) {
      alert('Please enter a valid UPI ID (e.g. name@okaxis or 9876543210@ybl).');
      return;
    }

    setIsSavingManualUpi(true);
    if (onSaveUpi) {
      onSaveUpi(toMember.name, trimmed);
    }
    if (onUpiSaved) {
      onUpiSaved(trimmed);
    }
    setIsSavingManualUpi(false);
    onClose();
  };

  const waText = encodeURIComponent(
    `Hey ${toMember.name}, I want to send you ${formatMoney(amount, trip.currency)} for our ${trip.name} trip settlement, but your receiving UPI ID is not set on the portal. Please log into the portal and add your PhonePe/Google Pay UPI ID so I can scan and pay you!`
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 touch-manipulation"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Alert */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="pr-6">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              Receiving UPI Not Set
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
              No dummy UPI ID allowed for settlements
            </p>
          </div>
        </div>

        {/* Transfer Detail Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {fromMember.name.split(' ')[0]}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {toMember.name.split(' ')[0]}
              </span>
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {formatMoney(amount, trip.currency)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            <strong>{toMember.name}</strong> has not configured a receiving UPI ID (Google Pay, PhonePe, or Paytm). A QR code cannot be generated without their real payment handle.
          </p>
        </div>

        {/* ── OPTION 1: SEND EMAIL REQUEST ── */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider mb-2">
            <Mail className="h-3.5 w-3.5 text-sky-500" />
            <span>Send Email Request to {toMember.name.split(' ')[0]}</span>
          </h4>

          {emailStatus && (
            <div
              className={`p-3 rounded-xl mb-3 text-xs flex items-start gap-2 ${
                emailStatus.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold'
                  : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {emailStatus.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{emailStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSendEmailRequest} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Recipient Email Address *
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. friend@gmail.com"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 min-h-[38px] touch-manipulation"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Dispatching Email Request...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send UPI Request Email</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── OPTION 2: WHATSAPP DIRECT MESSAGE ── */}
        <div className="mt-3.5">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 min-h-[38px] touch-manipulation"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Send WhatsApp Reminder to {toMember.name.split(' ')[0]}</span>
          </a>
        </div>

        {/* ── OPTION 3: ENTER UPI IF ALREADY KNOWN ── */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Edit3 className="h-3.5 w-3.5 text-slate-400" />
              <span>Know their UPI ID right now?</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualUpi}
              onChange={(e) => setManualUpi(e.target.value)}
              placeholder="e.g. friend@okaxis"
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveKnownUpi}
              disabled={isSavingManualUpi || !manualUpi.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-50 touch-manipulation min-h-[36px]"
            >
              Save & Open QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
