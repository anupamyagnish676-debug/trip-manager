'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  Download,
  Mail,
  Share2,
  FileText,
  DollarSign,
  CreditCard,
  Building2,
  Coins,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trip, Member, PaymentCapture, CollectionRound } from '@/types';
import { parseSmsPayment, calculatePotSummary } from '@/lib/calculations';
import { formatMoney, getCurrencySymbol } from '@/lib/currency';
import { downloadPaymentReceipt, getReceiptNotificationPayload, ReceiptData } from '@/lib/pdfReceipt';

interface PaymentCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onPaymentCaptured: (payment: PaymentCapture) => void;
  financeLeadUpi?: string;
}

const PAYMENT_MODES = [
  { id: 'upi', label: 'UPI / QR', icon: '⚡' },
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { id: 'paypal', label: 'PayPal', icon: '🅿️' },
  { id: 'venmo', label: 'Venmo', icon: '📱' },
  { id: 'other', label: 'Other', icon: '🌐' },
] as const;

export function PaymentCaptureModal({
  isOpen,
  onClose,
  trip,
  onPaymentCaptured,
}: PaymentCaptureModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'sms_parser'>('manual');

  // Form Fields
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<typeof PAYMENT_MODES[number]['id']>('upi');
  const [referenceOrUtr, setReferenceOrUtr] = useState<string>('');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [memberEmail, setMemberEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [smsText, setSmsText] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');

  const members = trip.members || [];
  const financeLead =
    members.find((m) => m.name.toLowerCase().includes('yagnish')) ||
    members.find((m) => m.id === trip.financeLeadId) ||
    members.find((m) => m.isFinanceLead) ||
    members[0] ||
    { name: 'Yagnish Anupam' };
  const potSummary = calculatePotSummary(trip);

  // Auto-generate a clean receipt reference on modal open
  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setReceiptNumber(`REC-${year}-${randNum}`);

      // Default select first regular member if available
      if (!selectedMemberId && members.length > 0) {
        const firstPayer = members.find((m) => m.id !== trip.financeLeadId) || members[0];
        setSelectedMemberId(firstPayer.id);
        setMemberEmail(firstPayer.email || '');
      }

      // Default to first active collection round if any
      if (!selectedRoundId && trip.collectionRounds && trip.collectionRounds.length > 0) {
        setSelectedRoundId(trip.collectionRounds[0].id);
        setAmountStr(trip.collectionRounds[0].targetPerPerson.toString());
      }
    }
  }, [isOpen, trip]);

  // When selected member changes, update email
  const handleMemberChange = (id: string) => {
    setSelectedMemberId(id);
    const m = members.find((mem) => mem.id === id);
    if (m) {
      setMemberEmail(m.email || '');
    }
  };

  // When round changes, update suggested amount
  const handleRoundChange = (roundId: string) => {
    setSelectedRoundId(roundId);
    if (roundId) {
      const r = trip.collectionRounds?.find((round) => round.id === roundId);
      if (r && !amountStr) {
        setAmountStr(r.targetPerPerson.toString());
      }
    }
  };

  if (!isOpen) return null;

  const currentPayer = members.find((m) => m.id === selectedMemberId);
  const amount = parseFloat(amountStr) || 0;
  const targetRound = trip.collectionRounds?.find((r) => r.id === selectedRoundId);
  const newProjectedPotBalance = potSummary.balance + amount;

  // Build the receipt object
  const receiptData: ReceiptData = {
    receiptNumber: receiptNumber || `REC-${Date.now()}`,
    tripName: trip.name,
    destination: trip.destination,
    currency: trip.currency || 'INR',
    memberName: currentPayer?.name || 'Group Member',
    memberEmail: memberEmail || currentPayer?.email,
    memberPhone: currentPayer?.phone,
    amount: amount,
    paymentMode: paymentMode,
    referenceOrUtr: referenceOrUtr.trim() || `${paymentMode.toUpperCase()}-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    financeLeadName: financeLead.name,
    collectionRoundTitle: targetRound?.title || 'Group Treasury Deposit',
    potBalanceAfter: newProjectedPotBalance,
    notes: notes.trim() || undefined,
  };

  const notificationPayload = getReceiptNotificationPayload(receiptData);

  // Submit Handler
  const handleRecordPayment = (andDownloadPdf: boolean = true) => {
    if (amount <= 0 || !selectedMemberId) return;

    const newPayment: PaymentCapture = {
      id: `pay-${Date.now()}`,
      tripId: trip.id,
      senderName: currentPayer?.name || 'Member',
      amount: amount,
      utr: receiptData.referenceOrUtr,
      timestamp: new Date().toISOString(),
      matchedMemberId: selectedMemberId,
      status: 'verified',
      addedToPot: true,
      collectionRoundId: selectedRoundId || undefined,
      paymentMode: paymentMode,
      receiptNumber: receiptData.receiptNumber,
      memberEmail: memberEmail.trim() || undefined,
      notes: notes.trim() || undefined,
      verifiedBy: financeLead.name,
    };

    onPaymentCaptured(newPayment);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    if (andDownloadPdf) {
      downloadPaymentReceipt(receiptData);
    }

    onClose();
  };

  // SMS Parser logic
  const handleParseSms = (text: string) => {
    setSmsText(text);
    const parsed = parseSmsPayment(text, members);
    if (parsed.amount) {
      setAmountStr(parsed.amount.toString());
    }
    if (parsed.utr) {
      setReferenceOrUtr(parsed.utr);
    }
    if (parsed.matchedMemberId) {
      handleMemberChange(parsed.matchedMemberId);
    }
    setPaymentMode('upi');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-inner">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Record Payment & Issue Official Slip
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credits the Central Treasury and generates an official verified PDF receipt for the member.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-1 text-xs font-bold transition-all ${
              activeTab === 'manual'
                ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            📝 Payment Details & Receipt Slip
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms_parser')}
            className={`pb-1 text-xs font-bold transition-all ${
              activeTab === 'sms_parser'
                ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            ⚡ Quick Bank SMS / UPI Parser
          </button>
        </div>

        {activeTab === 'manual' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Member Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Received From (Member) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="" disabled>-- Choose group member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === trip.financeLeadId ? '(Finance Lead)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Received ({getCurrencySymbol(trip.currency)}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    {getCurrencySymbol(trip.currency)}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="e.g. 4000"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-3 py-2.5 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PAYMENT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === mode.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base mb-0.5">{mode.icon}</span>
                    <span className="text-[10px] truncate">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Collection Round */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Round / Purpose
                </label>
                <select
                  value={selectedRoundId}
                  onChange={(e) => handleRoundChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">General Group Treasury Pot</option>
                  {(trip.collectionRounds || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({formatMoney(r.targetPerPerson, trip.currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference / UTR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Ref / UTR / Check #
                </label>
                <input
                  type="text"
                  value={referenceOrUtr}
                  onChange={(e) => setReferenceOrUtr(e.target.value)}
                  placeholder="e.g. UPI-492019482019 or CASH-01"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Member Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Member Email (for PDF Slip Notification)
                </label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received at airport check-in"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Receipt Preview Card */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Official Receipt Slip Preview
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {receiptNumber}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Payer: </span>
                  <strong className="text-slate-900 dark:text-white">{currentPayer?.name || 'Selected Friend'}</strong>
                  {targetRound && <span className="ml-2 text-slate-500">• {targetRound.title}</span>}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Amount: </span>
                  <strong className="text-base text-emerald-700 dark:text-emerald-300 font-black">
                    {formatMoney(amount, trip.currency)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 rounded-xl p-2 border border-emerald-100 dark:border-emerald-900/40">
                <span>Central Treasury Update:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatMoney(potSummary.balance, trip.currency)} ➔{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatMoney(newProjectedPotBalance, trip.currency)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleRecordPayment(true)}
                disabled={amount <= 0 || !selectedMemberId}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-50 transition-all active:scale-98"
              >
                <Download className="h-4 w-4" />
                Record & Download Official PDF Slip
              </button>

              <a
                href={notificationPayload.mailtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleRecordPayment(false)}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all ${
                  amount <= 0 || !selectedMemberId ? 'pointer-events-none opacity-50' : ''
                }`}
                title="Send pre-formatted official receipt to member's email"
              >
                <Mail className="h-4 w-4 text-sky-500" />
                <span>Send Email</span>
              </a>

              <a
                href={notificationPayload.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleRecordPayment(false)}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 px-4 py-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 transition-all ${
                  amount <= 0 || !selectedMemberId ? 'pointer-events-none opacity-50' : ''
                }`}
                title="Share formatted receipt on WhatsApp"
              >
                <Share2 className="h-4 w-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        ) : (
          /* SMS Parser Tab */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Paste Bank SMS or UPI Notification Text:
              </label>
              <textarea
                rows={4}
                value={smsText}
                onChange={(e) => handleParseSms(e.target.value)}
                placeholder="e.g. Rs 4,000.00 credited to HDFC Bank A/C *4821 on 25-Dec-26 from Vikram Singh UPI Ref 849201849201..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] text-slate-400 self-center">Quick tests:</span>
              <button
                type="button"
                onClick={() =>
                  handleParseSms(
                    `Received Rs. 4,000.00 from ${members[0]?.name || 'Friend'} via UPI Ref 948201849201`
                  )
                }
                className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Test UPI Credit
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow"
            >
              <ArrowRight className="h-4 w-4" />
              Review Parsed Data & Issue Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
