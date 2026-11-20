'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  Bell,
  Smartphone,
  QrCode,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CollectionRound, Member, Trip, PaymentCapture } from '@/types';
import { generateUpiUrl } from '@/lib/calculations';
import { formatMoney, getCurrencySymbol } from '@/lib/currency';

interface CollectionRoundsTabProps {
  trip: Trip;
  canManage: boolean; // trip_manager or finance_manager
  currentMember?: Member;
  onAddRound: (round: CollectionRound) => void;
  onUpdateRoundStatus: (roundId: string, memberId: string, status: 'paid' | 'pending' | 'partial') => void;
  onOpenQR?: (payeeUpi: string, payeeName: string, amount: number, note: string) => void;
  onPaymentCaptured?: (payment: PaymentCapture) => void;
}

export function CollectionRoundsTab({
  trip,
  canManage,
  currentMember,
  onAddRound,
  onUpdateRoundStatus,
  onOpenQR,
  onPaymentCaptured,
}: CollectionRoundsTabProps) {
  const [showAddRound, setShowAddRound] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDue, setNewDue] = useState('');

  // Quick confirm state
  const [confirmRound, setConfirmRound] = useState<CollectionRound | null>(null);
  const [utr, setUtr] = useState('');

  const rounds = trip.collectionRounds || [];
  const financeLead = trip.members.find((m) => m.id === trip.financeLeadId) || trip.members[0];

  const handleCreate = () => {
    if (!newTitle.trim() || !newTarget) return;
    const memberStatus: Record<string, 'paid' | 'pending' | 'partial'> = {};
    trip.members.forEach((m) => {
      memberStatus[m.id] = 'pending';
    });
    const round: CollectionRound = {
      id: `round_${Date.now()}`,
      tripId: trip.id,
      title: newTitle.trim(),
      targetPerPerson: parseFloat(newTarget),
      dueDate: newDue || undefined,
      createdAt: new Date().toISOString(),
      memberStatus,
    };
    onAddRound(round);
    setNewTitle('');
    setNewTarget('');
    setNewDue('');
    setShowAddRound(false);
  };

  const handleSelfPaidConfirm = () => {
    if (!confirmRound || !currentMember) return;

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const newPayment: PaymentCapture = {
      id: `pay-${Date.now()}`,
      tripId: trip.id,
      senderName: currentMember.name,
      amount: confirmRound.targetPerPerson,
      utr: utr.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      timestamp: new Date().toISOString(),
      rawText: `Collection for ${confirmRound.title} by ${currentMember.name}`,
      matchedMemberId: currentMember.id,
      status: 'verified',
      addedToPot: true,
      collectionRoundId: confirmRound.id,
    };

    if (onPaymentCaptured) {
      onPaymentCaptured(newPayment);
    }

    onUpdateRoundStatus(confirmRound.id, currentMember.id, 'paid');
    setConfirmRound(null);
    setUtr('');
  };

  const paidCount = (round: CollectionRound) =>
    Object.values(round.memberStatus).filter((s) => s === 'paid').length;
  const totalCount = (round: CollectionRound) => trip.members.length;

  const generateWhatsApp = (round: CollectionRound) => {
    const pending = trip.members.filter((m) => round.memberStatus[m.id] !== 'paid');
    const lines = [
      `💰 *Collection Round: ${round.title}*`,
      `💵 Target per person: ${formatMoney(round.targetPerPerson, trip.currency)}`,
      round.dueDate ? `📅 Due by: ${round.dueDate}` : '',
      ``,
      `🔴 *Still Pending (${pending.length}):*`,
      ...pending.map(
        (m) => `• ${m.name}${round.memberStatus[m.id] === 'partial' ? ' (partial)' : ''}`
      ),
      ``,
      `Please deposit to Treasury UPI: ${financeLead.upiId || ''}`,
      `✨ _TripSplit Portal_`,
    ]
      .filter(Boolean)
      .join('\n');
    const encoded = encodeURIComponent(lines);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Collection Rounds
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Finance Manager raises advances (hotel deposit, bus booking, daily kitty) and tracks who paid
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowAddRound(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-md transition-all active:scale-95"
          >
            + Raise New Collection
          </button>
        )}
      </div>

      {/* Add Round Modal */}
      {showAddRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Raise Collection Round
              </h4>
              <button
                type="button"
                onClick={() => setShowAddRound(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Collection Title
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Hotel Advance, Bus Tickets, Rafting Kitty"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount per Member ({getCurrencySymbol(trip.currency)})
                </label>
                <input
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Due Date (Optional)
                </label>
                <input
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  type="date"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowAddRound(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-sm font-bold text-white shadow-md transition-all"
              >
                Raise Round
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rounds List */}
      {rounds.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 mb-3">
            <Bell className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            No collection rounds raised yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Finance Manager can click &quot;+ Raise New Collection&quot; to collect advances from the group.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {rounds.map((round) => {
            const paid = paidCount(round);
            const total = totalCount(round);
            const pct = total > 0 ? (paid / total) * 100 : 0;
            const totalCollected = paid * round.targetPerPerson;

            const myStatus = currentMember ? round.memberStatus[currentMember.id] : undefined;
            const isMyStatusPending = myStatus === 'pending' || myStatus === 'partial';

            const noteText = `${round.title.replace(/\s+/g, '_')}_${currentMember?.name || 'Member'}`;
            const upiUrl = financeLead.upiId
              ? generateUpiUrl({
                  upiId: financeLead.upiId,
                  payeeName: financeLead.name,
                  amount: round.targetPerPerson,
                  note: noteText,
                })
              : null;

            return (
              <div
                key={round.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4"
              >
                {/* Round Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {round.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-slate-500">
                      <span>Target: <strong>{formatMoney(round.targetPerPerson, trip.currency)}</strong> / person</span>
                      {round.dueDate && <span>• Due: <strong>{round.dueDate}</strong></span>}
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Total Pot Inflow: {formatMoney(totalCollected, trip.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenQR && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenQR(
                            financeLead.upiId || trip.paymentMethods?.upiId || 'treasury@upi',
                            financeLead.name,
                            round.targetPerPerson,
                            noteText
                          )
                        }
                        className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 text-xs font-bold transition-all"
                        title="Display Receiving QR for this collection"
                      >
                        <QrCode className="h-3.5 w-3.5 text-teal-500" />
                        Show QR
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => generateWhatsApp(round)}
                      className="flex items-center gap-1 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-1.5 text-xs font-bold transition-all"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Remind Group
                    </button>
                  </div>
                </div>

                {/* Individual Action Banner for Current User if Pending */}
                {currentMember && isMyStatusPending && (
                  <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        Your payment for this round is due ({formatMoney(round.targetPerPerson, trip.currency)})
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Recipient: {financeLead.name} ({financeLead.upiId || 'Treasurer'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {upiUrl && (
                        <a
                          href={upiUrl}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          Pay App
                        </a>
                      )}

                      {onOpenQR && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenQR(
                              financeLead.upiId || trip.paymentMethods?.upiId || 'treasury@upi',
                              financeLead.name,
                              round.targetPerPerson,
                              noteText
                            )
                          }
                          className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                        >
                          <QrCode className="h-3.5 w-3.5 text-teal-500" />
                          QR
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setConfirmRound(round)}
                        className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        I&apos;ve Paid
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <span>
                      {paid} of {total} friends deposited
                    </span>
                    <span>{pct.toFixed(0)}% Complete</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>

                {/* Member Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {trip.members.map((member) => {
                    const status = round.memberStatus[member.id] || 'pending';
                    const isMe = currentMember?.id === member.id;

                    return (
                      <div
                        key={member.id}
                        className={`rounded-2xl p-3 text-center border transition-all ${
                          status === 'paid'
                            ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                            : status === 'partial'
                            ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
                        } ${isMe ? 'ring-2 ring-emerald-500 shadow-sm' : ''}`}
                      >
                        <div
                          className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl text-white text-[11px] font-extrabold shadow-sm ${member.avatarColor}`}
                        >
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {member.name} {isMe ? '(You)' : ''}
                        </p>

                        <div className="mt-1">
                          {status === 'paid' ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Paid {formatMoney(round.targetPerPerson, trip.currency)}
                            </span>
                          ) : status === 'partial' ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3" /> Partial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-500">
                              <AlertCircle className="h-3 w-3" /> Due {formatMoney(round.targetPerPerson, trip.currency)}
                            </span>
                          )}
                        </div>

                        {/* Status override select for managers */}
                        {canManage && (
                          <select
                            value={status}
                            onChange={(e) =>
                              onUpdateRoundStatus(
                                round.id,
                                member.id,
                                e.target.value as 'paid' | 'pending' | 'partial'
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300 px-1 py-1 focus:outline-none"
                          >
                            <option value="paid">✅ Mark Paid</option>
                            <option value="partial">⚡ Partial</option>
                            <option value="pending">🔴 Pending</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Self-Paid Modal */}
      {confirmRound && currentMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Confirm Payment
              </h4>
              <button
                type="button"
                onClick={() => setConfirmRound(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Confirm your deposit of <strong>{formatMoney(confirmRound.targetPerPerson, trip.currency)}</strong> for{' '}
              <em>{confirmRound.title}</em> to {financeLead.name}.
            </p>

            <div className="mt-3.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional UPI Reference / UTR
              </label>
              <input
                type="text"
                placeholder="12-digit UPI Ref / UTR"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmRound(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSelfPaidConfirm}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
