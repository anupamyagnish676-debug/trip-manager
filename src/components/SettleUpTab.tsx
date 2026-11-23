'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, QrCode, Smartphone, Sparkles, Check, RotateCcw, Clock } from 'lucide-react';
import { Trip, SettlementTransfer, Member } from '@/types';
import { calculateMemberBalances, simplifyDebts } from '@/lib/calculations';
import { formatMoney } from '@/lib/currency';
import { QRCodeModal } from '@/components/QRCodeModal';
import { RequestUpiModal } from '@/components/RequestUpiModal';
import { FriendlyRoastCard } from '@/components/FriendlyRoastCard';

interface SettleUpTabProps {
  trip: Trip;
  currentMember?: Member | null;
  onUpdateSettlement: (updatedSettlements: SettlementTransfer[]) => void;
  onUpdateMemberUpi?: (memberName: string, newUpi: string) => void;
}

export function SettleUpTab({ trip, currentMember, onUpdateSettlement, onUpdateMemberUpi }: SettleUpTabProps) {
  const [selectedPayment, setSelectedPayment] = useState<{
    payeeUpi: string;
    payeeName: string;
    amount: number;
    note: string;
  } | null>(null);

  const [requestUpiTarget, setRequestUpiTarget] = useState<{
    toMember: Member;
    fromMember: Member;
    amount: number;
  } | null>(null);

  const isOrganizer = Boolean(
    !currentMember ||
    currentMember.id === trip.financeLeadId ||
    currentMember.isFinanceLead ||
    currentMember.role === 'finance_manager' ||
    currentMember.role === 'trip_manager' ||
    trip.members[0]?.id === currentMember.id
  );

  const balances = calculateMemberBalances(trip);
  // Compute optimized transfers
  const transfers = simplifyDebts(balances);

  const visibleBalances = isOrganizer
    ? balances
    : balances.filter((b) => b.member.id === currentMember?.id);

  const handleMarkSettled = (transfer: SettlementTransfer) => {
    // Only the entitled receiver can verify and mark as settled
    if (currentMember?.id !== transfer.toMemberId) {
      const receiver = trip.members.find((m) => m.id === transfer.toMemberId);
      alert(`Only ${receiver?.name || 'the recipient'} can confirm receipt of this payment.`);
      return;
    }

    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const existing = [...trip.settlements];
    existing.push({
      ...transfer,
      status: 'settled',
      settledAt: new Date().toISOString(),
    });

    onUpdateSettlement(existing);
  };

  const handleUnmarkSettled = (fromId: string, toId: string) => {
    if (currentMember?.id !== toId) {
      alert('Only the recipient can undo this settlement.');
      return;
    }

    if (confirm('Reopen this settlement as pending / unpaid?')) {
      const existing = trip.settlements.filter(
        (s) => !(s.fromMemberId === fromId && s.toMemberId === toId && s.status === 'settled')
      );
      onUpdateSettlement(existing);
    }
  };

  const isTransferSettled = (fromId: string, toId: string) => {
    return trip.settlements.some(
      (s) => s.fromMemberId === fromId && s.toMemberId === toId && s.status === 'settled'
    );
  };

  // Identify members who have pending transfers to make
  const pendingDebtorIds = Array.from(
    new Set(
      transfers
        .filter((t) => !isTransferSettled(t.fromMemberId, t.toMemberId))
        .map((t) => t.fromMemberId)
    )
  );

  const pendingDebtors = pendingDebtorIds
    .map((id) => {
      const member = trip.members.find((m) => m.id === id);
      const totalOwed = transfers
        .filter((t) => t.fromMemberId === id && !isTransferSettled(t.fromMemberId, t.toMemberId))
        .reduce((sum, t) => sum + t.amount, 0);
      return { member, totalOwed };
    })
    .filter((d): d is { member: Member; totalOwed: number } => Boolean(d.member && d.totalOwed > 0));

  const handleInitiatePayment = (transfer: SettlementTransfer, fromMember: Member, toMember: Member) => {
    const upi = toMember.upiId?.trim();
    if (!upi) {
      // Receiving UPI is not set! Do NOT show dummy UPI ID. Open Request UPI prompt!
      setRequestUpiTarget({
        toMember,
        fromMember,
        amount: transfer.amount,
      });
      return;
    }

    setSelectedPayment({
      payeeUpi: upi,
      payeeName: toMember.name,
      amount: transfer.amount,
      note: `TripSettlement_${fromMember.name.split(' ')[0]}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-4 sm:p-6 text-white shadow-xl border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="rounded-lg bg-indigo-500/20 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold text-indigo-300 border border-indigo-500/30">
                ✨ Min-Cash-Flow Algorithm
              </span>
              <span className="text-[11px] sm:text-xs text-slate-300">
                {trip.members.length}-Member Debt Simplifier
              </span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-black">Trip Settlement Dashboard</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              All {trip.members.length} members spent money across different meals, hotels, fuel, and activities. The algorithm eliminated all intermediate cross-debts down to the minimum direct payments below:
            </p>
          </div>

          <div className="w-full sm:w-auto rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 border border-white/10 text-left sm:text-right">
            <span className="text-xs text-slate-300 block">Direct Transfers Needed</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">
              {transfers.length} <span className="text-xs sm:text-sm font-normal text-slate-300">transfers total</span>
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block">
              Reduced from {Math.round((trip.members.length * (trip.members.length - 1)) / 2)} possible cross-debts
            </span>
          </div>
        </div>
      </div>

      {/* ── FRIENDLY DUES ROAST BOARD (ZERO JUDGEMENT BANTER) ── */}
      {pendingDebtors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xl select-none">🍿</span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>The Friendly Dues Roast Board</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Friendly Banter
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Affectionate inside jokes for friends with pending dues. <strong>Zero judgement: We all split equally in the end!</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingDebtors.map(({ member, totalOwed }) => (
              <FriendlyRoastCard
                key={member.id}
                tripName={trip.name}
                memberName={member.name}
                memberId={member.id}
                amountOwed={totalOwed}
                currency={trip.currency}
                isSelf={currentMember?.id === member.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Simplified Transfers List */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <span>🎯</span> Recommended Direct Payments
        </h3>

        {transfers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-2" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              All {trip.members.length} Members Are 100% Settled!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nobody owes anyone anything. The trip finances are completely squared away.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transfers.map((transfer, idx) => {
              const fromMember = trip.members.find((m) => m.id === transfer.fromMemberId);
              const toMember = trip.members.find((m) => m.id === transfer.toMemberId);
              const settled = isTransferSettled(transfer.fromMemberId, transfer.toMemberId);

              if (!fromMember || !toMember) return null;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 transition-all ${
                    settled
                      ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 opacity-70'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* From Member */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-xs sm:text-sm shadow-xs ${fromMember.avatarColor}`}
                      >
                        {fromMember.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {fromMember.name}
                        </p>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">Owes</span>
                      </div>
                    </div>

                    {/* Transfer Amount Center Arrow */}
                    <div className="flex flex-col items-center shrink-0 px-1 sm:px-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white whitespace-nowrap font-mono">
                        {formatMoney(transfer.amount, trip.currency)}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <span className="h-0.5 w-3 sm:w-6 bg-slate-300 dark:bg-slate-700"></span>
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                      </div>
                    </div>

                    {/* To Member */}
                    <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {toMember.name}
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Receives</span>
                      </div>
                      <div
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-xs sm:text-sm shadow-xs ${toMember.avatarColor}`}
                      >
                        {toMember.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    {settled ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-4 w-4" /> Settled & Verified
                        </span>
                        {currentMember?.id === transfer.toMemberId && (
                          <button
                            type="button"
                            onClick={() => handleUnmarkSettled(transfer.fromMemberId, transfer.toMemberId)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:underline"
                            title="Undo this settlement if not actually received"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Undo / Mark Unpaid</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {currentMember?.id === transfer.toMemberId ? (
                          /* 1. Receiver view: Only receiver can confirm receipt */
                          <button
                            type="button"
                            onClick={() => handleMarkSettled(transfer)}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-emerald-600/20 transition-all active:scale-95 min-h-[40px] touch-manipulation"
                          >
                            <Check className="h-4 w-4" />
                            <span>Confirm Received ({formatMoney(transfer.amount, trip.currency)})</span>
                          </button>
                        ) : currentMember?.id === transfer.fromMemberId ? (
                          /* 2. Debtor view: ONLY the person who has to pay sees the ACTIVE Pay via UPI QR button! */
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleInitiatePayment(transfer, fromMember, toMember)}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-emerald-600/25 transition-all active:scale-95 min-h-[42px] touch-manipulation"
                            >
                              <QrCode className="h-4 w-4" />
                              <span>Pay {toMember.name.split(' ')[0]} via UPI QR</span>
                            </button>

                            <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl text-center">
                              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span>Awaiting {toMember.name.split(' ')[0]}&apos;s verification</span>
                            </span>
                          </div>
                        ) : (
                          /* 3. Observer view: All direct payments remain visible to everyone, but Pay button is NOT activated */
                          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 px-3 py-2 rounded-xl text-center">
                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Pending transfer: {fromMember.name.split(' ')[0]} → {toMember.name.split(' ')[0]}</span>
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Net Balances: Full Ledger for Organizer, Personal Summary for Members */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>👥</span> {isOrganizer ? `Individual Member Financial Ledger (${balances.length} Friends)` : 'My Financial Summary'}
          </h3>
          {isOrganizer ? (
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span>🛡️</span> Organizer View • Full Group Ledger
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Your personal spending & consumption in {trip.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleBalances.map((b) => {
            const isOwed = b.netBalance > 0;
            const isDebt = b.netBalance < 0;
            const isZero = Math.abs(b.netBalance) <= 0.99;
            const isMe = b.member.id === currentMember?.id;

            return (
              <div
                key={b.member.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
                  isMe
                    ? 'border-emerald-500/50 dark:border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-xs ${b.member.avatarColor}`}
                    >
                      {b.member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{b.member.name}</span>
                        {isMe && (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.2">
                            You
                          </span>
                        )}
                      </h4>
                      <p className={`text-[10px] font-mono ${b.member.upiId ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                        {b.member.upiId ? `UPI: ${b.member.upiId}` : 'No UPI set'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-black ${
                        isOwed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDebt
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {isOwed ? `+${formatMoney(b.netBalance, trip.currency)}` : isDebt ? `-${formatMoney(Math.abs(b.netBalance), trip.currency)}` : `${formatMoney(0, trip.currency)} (Settled)`}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {isOwed ? 'Gets back' : isDebt ? 'Owes to group' : 'Even'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Paid for Bills:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatMoney(b.totalDirectPaid, trip.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Share Consumed:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatMoney(b.totalDirectConsumption, trip.currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isOrganizer && (
          <div className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span>
              The full group financial ledger for all {balances.length} friends is only visible to the trip organizer.
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Payment QR Modal */}
      {selectedPayment && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
          payeeUpi={selectedPayment.payeeUpi}
          payeeName={selectedPayment.payeeName}
          amount={selectedPayment.amount}
          note={selectedPayment.note}
          onSaveUpi={(newUpi) => {
            if (onUpdateMemberUpi) {
              onUpdateMemberUpi(selectedPayment.payeeName, newUpi);
            }
            setSelectedPayment({ ...selectedPayment, payeeUpi: newUpi });
          }}
        />
      )}

      {/* Request UPI Modal when receiving UPI is not set */}
      {requestUpiTarget && currentMember && (
        <RequestUpiModal
          isOpen={true}
          onClose={() => setRequestUpiTarget(null)}
          toMember={requestUpiTarget.toMember}
          fromMember={requestUpiTarget.fromMember}
          amount={requestUpiTarget.amount}
          trip={trip}
          onSaveUpi={onUpdateMemberUpi}
          onUpiSaved={(savedUpi) => {
            setSelectedPayment({
              payeeUpi: savedUpi,
              payeeName: requestUpiTarget.toMember.name,
              amount: requestUpiTarget.amount,
              note: `TripSettlement_${requestUpiTarget.fromMember.name.split(' ')[0]}`,
            });
          }}
        />
      )}
    </div>
  );
}
