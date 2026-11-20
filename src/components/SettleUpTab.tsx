'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, QrCode, Smartphone, Sparkles, Check } from 'lucide-react';
import { Trip, SettlementTransfer } from '@/types';
import { calculateMemberBalances, simplifyDebts } from '@/lib/calculations';
import { QRCodeModal } from '@/components/QRCodeModal';

interface SettleUpTabProps {
  trip: Trip;
  onUpdateSettlement: (updatedSettlements: SettlementTransfer[]) => void;
}

export function SettleUpTab({ trip, onUpdateSettlement }: SettleUpTabProps) {
  const [selectedPayment, setSelectedPayment] = useState<{
    payeeUpi: string;
    payeeName: string;
    amount: number;
    note: string;
  } | null>(null);

  const balances = calculateMemberBalances(trip);
  // Compute optimized transfers
  const transfers = simplifyDebts(balances);

  const handleMarkSettled = (transfer: SettlementTransfer) => {
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

  const isTransferSettled = (fromId: string, toId: string) => {
    return trip.settlements.some(
      (s) => s.fromMemberId === fromId && s.toMemberId === toId && s.status === 'settled'
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl border border-indigo-800/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                ✨ Min-Cash-Flow Algorithm
              </span>
              <span className="text-xs text-slate-300">
                10-Member Automatic Debt Simplifier
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black">Trip Settlement Dashboard</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              All 10 members spent money across different meals, hotels, fuel, and activities. The algorithm eliminated all intermediate cross-debts down to the minimum direct payments below:
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-md px-5 py-3 border border-white/10 text-right">
            <span className="text-xs text-slate-300">Direct Transfers Needed</span>
            <p className="text-3xl font-black text-emerald-400">
              {transfers.length} <span className="text-sm font-normal text-slate-300">transfers total</span>
            </p>
            <span className="text-[11px] text-slate-400">Reduced from 45 possible cross-debts</span>
          </div>
        </div>
      </div>

      {/* Simplified Transfers List */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <span>🎯</span> Recommended Direct Payments
        </h3>

        {transfers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-2" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              All 10 Friends Are 100% Settled!
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
                  <div className="flex items-center justify-between">
                    {/* From Member */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-sm ${fromMember.avatarColor}`}
                      >
                        {fromMember.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {fromMember.name}
                        </p>
                        <span className="text-[10px] text-red-500 font-semibold">Owes</span>
                      </div>
                    </div>

                    {/* Transfer Amount Center Arrow */}
                    <div className="flex flex-col items-center px-2">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        ₹{transfer.amount.toLocaleString('en-IN')}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <span className="h-0.5 w-6 bg-slate-300 dark:bg-slate-700"></span>
                        <ArrowRight className="h-4 w-4 text-emerald-500" />
                      </div>
                    </div>

                    {/* To Member */}
                    <div className="flex items-center gap-2.5 text-right">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {toMember.name}
                        </p>
                        <span className="text-[10px] text-emerald-600 font-semibold">Receives</span>
                      </div>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-sm ${toMember.avatarColor}`}
                      >
                        {toMember.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    {settled ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-4 w-4" /> Settled & Verified
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPayment({
                              payeeUpi: toMember.upiId || 'friend@upi',
                              payeeName: toMember.name,
                              amount: transfer.amount,
                              note: `TripSettlement_${fromMember.name.split(' ')[0]}`,
                            })
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Pay via UPI QR
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMarkSettled(transfer)}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 text-xs font-semibold transition-all"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          Mark Settled
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complete Individual Net Balances (All 10 members) */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <span>👥</span> Individual Member Financial Ledger (All 10 Friends)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {balances.map((b) => {
            const isOwed = b.netBalance > 0;
            const isDebt = b.netBalance < 0;
            const isZero = Math.abs(b.netBalance) <= 0.99;

            return (
              <div
                key={b.member.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-xs ${b.member.avatarColor}`}
                    >
                      {b.member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {b.member.name}
                        {b.member.isFinanceLead && (
                          <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">
                            Finance Lead
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">{b.member.upiId}</p>
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
                      {isOwed ? `+₹${b.netBalance.toLocaleString('en-IN')}` : isDebt ? `-₹${Math.abs(b.netBalance).toLocaleString('en-IN')}` : '₹0 (Settled)'}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {isOwed ? 'Gets back' : isDebt ? 'Owes to group' : 'Even'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Direct Spend:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ₹{b.totalDirectPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pot Deposit (QR):</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{b.totalDepositedToPot.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Share Consumed:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ₹{(b.totalDirectConsumption + b.totalPotConsumption).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
        />
      )}
    </div>
  );
}
