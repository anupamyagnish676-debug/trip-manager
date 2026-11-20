'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, Smartphone, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Member, PaymentCapture } from '@/types';
import { parseSmsPayment } from '@/lib/calculations';

interface PaymentCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onPaymentCaptured: (payment: PaymentCapture) => void;
  financeLeadUpi: string;
}

const SAMPLE_SMS = [
  {
    bank: 'SBI Bank',
    text: 'Dear UPI user, A/C *1234 credited by Rs. 4,000.00 on 25-Dec-26 by Vikram Singh UPI Ref 492019482019.',
  },
  {
    bank: 'HDFC Bank',
    text: 'Rs 5,000.00 credited to HDFC Bank A/C *4821 on 25-Dec-26 from Aman Gupta UPI Ref 849201849201.',
  },
  {
    bank: 'ICICI Bank',
    text: 'Dear customer, your A/C *9012 has been credited with INR 3,500.00 by Tanvi Roy on 25-Dec. Ref 739201948271.',
  },
  {
    bank: 'GPay / PhonePe',
    text: 'Received ₹4,500 from Priya Nair via UPI. Transaction ID: T2612251039482910384.',
  },
];

export function PaymentCaptureModal({
  isOpen,
  onClose,
  members,
  onPaymentCaptured,
  financeLeadUpi,
}: PaymentCaptureModalProps) {
  const [smsText, setSmsText] = useState(SAMPLE_SMS[0].text);
  const [activeTab, setActiveTab] = useState<'simulator' | 'phone_setup'>('simulator');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  if (!isOpen) return null;

  // Live parse the SMS text
  const parsed = parseSmsPayment(smsText, members);
  const effectiveMemberId = selectedMemberId || parsed.matchedMemberId;
  const matchedMember = members.find((m) => m.id === effectiveMemberId);

  const handleConfirm = () => {
    if (!parsed.amount || parsed.amount <= 0) return;

    const newPayment: PaymentCapture = {
      id: `pay-${Date.now()}`,
      tripId: 'manali-winter-2026',
      senderName: parsed.senderName || 'Friend via UPI',
      amount: parsed.amount,
      utr: parsed.utr || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      timestamp: new Date().toISOString(),
      rawText: smsText,
      matchedMemberId: effectiveMemberId,
      status: 'verified',
      addedToPot: true,
    };

    onPaymentCaptured(newPayment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              UPI Payment Capture Hub
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Captures money paid into your QR and credits the Trip Kitty automatically
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="mt-5 flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-1 text-xs font-bold transition-all ${
              activeTab === 'simulator'
                ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            ⚡ Test Payment Simulator
          </button>
          <button
            onClick={() => setActiveTab('phone_setup')}
            className={`pb-1 text-xs font-bold transition-all ${
              activeTab === 'phone_setup'
                ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            📱 Auto Phone Webhook Setup
          </button>
        </div>

        {activeTab === 'simulator' ? (
          <div className="mt-4 space-y-4">
            {/* Sample Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Quick Preset Examples (Click to test):
              </label>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SMS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSmsText(sample.text);
                      setSelectedMemberId('');
                    }}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all"
                  >
                    {sample.bank}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Text Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bank SMS or Payment Notification Content:
              </label>
              <textarea
                rows={3}
                value={smsText}
                onChange={(e) => {
                  setSmsText(e.target.value);
                  setSelectedMemberId('');
                }}
                placeholder="Paste any bank SMS or payment notification here..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Live Extracted Card */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Auto-Parsed Data
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded-full">
                  Real-time Detection
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Detected Amount:</span>
                  <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {parsed.amount ? `₹${parsed.amount.toLocaleString('en-IN')}` : '⚠️ Not detected'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">UPI Ref (UTR):</span>
                  <p className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-1 truncate">
                    {parsed.utr || 'Auto-generated'}
                  </p>
                </div>
              </div>

              {/* Matched Member Selection */}
              <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Linked Member:
                  </span>
                  {matchedMember ? (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Matched
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Select Friend
                    </span>
                  )}
                </div>

                <select
                  value={effectiveMemberId || ''}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="" disabled>
                    -- Choose which friend sent this --
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.isFinanceLead ? '(Finance Lead)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Confirm & Credit Button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!parsed.amount || parsed.amount <= 0 || !effectiveMemberId}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-98"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Credit ₹{parsed.amount ? parsed.amount.toLocaleString('en-IN') : '0'} to Pot
            </button>
          </div>
        ) : (
          /* Phone Setup Guide Tab */
          <div className="mt-4 space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                How to automate from your phone in 2 minutes:
              </h4>
              <p className="mt-1 text-slate-500">
                Whenever anyone pays your personal UPI QR, your phone gets an instant SMS or notification. A free background tool forwards it to this app automatically.
              </p>

              <ol className="mt-3 list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                <li>
                  Install <strong>MacroDroid</strong> (Free on Android Play Store).
                </li>
                <li>
                  Add a <strong>Trigger</strong>: <em>Notification Received</em> (Select Google Pay, PhonePe, or your Bank SMS app).
                </li>
                <li>
                  Add an <strong>Action</strong>: <em>HTTP Request</em> (Method: <code>POST</code>).
                </li>
                <li>
                  Target URL: <code>https://your-domain.com/api/webhooks/upi</code>
                </li>
                <li>
                  Body Content:
                  <pre className="mt-1.5 rounded-lg bg-slate-950 p-2 text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`{
  "rawMessage": "[notification_text]",
  "sender": "[notification_title]"
}`}
                  </pre>
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                💡 Zero manual math on the trip!
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Friends scan your QR $\rightarrow$ Bank sends SMS $\rightarrow$ Phone forwards to app $\rightarrow$ Kitty balance and that friend&apos;s contribution update on everyone&apos;s screen within 3 seconds.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
