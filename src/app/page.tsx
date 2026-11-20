'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Receipt,
  Scale,
  QrCode,
  Users,
  Plus,
  Sparkles,
  Share2,
  Trash2,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  RotateCcw,
} from 'lucide-react';
import { Trip, Expense, PaymentCapture, SettlementTransfer, Category } from '@/types';
import { INITIAL_TRIP } from '@/lib/mockData';
import { PotCard } from '@/components/PotCard';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { PaymentCaptureModal } from '@/components/PaymentCaptureModal';
import { SettleUpTab } from '@/components/SettleUpTab';
import { QRCodeModal } from '@/components/QRCodeModal';
import { WhatsAppExportModal } from '@/components/WhatsAppExportModal';
import { calculatePotSummary, calculateMemberBalances } from '@/lib/calculations';

const CATEGORY_ICONS: Record<Category, string> = {
  food: '🍽️',
  stay: '🏨',
  travel: '🚕',
  fuel: '⛽',
  activities: '⛷️',
  drinks: '🍻',
  groceries: '🛒',
  misc: '✨',
};

export default function TripFinanceApp() {
  const [trip, setTrip] = useState<Trip>(INITIAL_TRIP);
  const [activeTab, setActiveTab] = useState<'expenses' | 'settle' | 'qr_capture' | 'members'>('expenses');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLeadQrOpen, setIsLeadQrOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(4000);
  const [customQrModal, setCustomQrModal] = useState<{
    payeeUpi: string;
    payeeName: string;
    amount?: number;
    note?: string;
  } | null>(null);

  // Load from LocalStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trip_split_data_v1');
      if (saved) {
        setTrip(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save to LocalStorage on changes
  const saveTripState = (updated: Trip) => {
    setTrip(updated);
    try {
      localStorage.setItem('trip_split_data_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const financeLead =
    trip.members.find((m) => m.id === trip.financeLeadId) || trip.members[0];
  const potSummary = calculatePotSummary(trip);
  const totalTripSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = (newExp: Expense) => {
    const updated: Trip = {
      ...trip,
      expenses: [newExp, ...trip.expenses],
    };
    saveTripState(updated);
  };

  const handleDeleteExpense = (id: string) => {
    const updated: Trip = {
      ...trip,
      expenses: trip.expenses.filter((e) => e.id !== id),
    };
    saveTripState(updated);
  };

  const handlePaymentCaptured = (newPay: PaymentCapture) => {
    const updated: Trip = {
      ...trip,
      payments: [newPay, ...trip.payments],
    };
    saveTripState(updated);
  };

  const handleUpdateSettlement = (updatedSettlements: SettlementTransfer[]) => {
    const updated: Trip = {
      ...trip,
      settlements: updatedSettlements,
    };
    saveTripState(updated);
  };

  const handleResetData = () => {
    if (confirm('Reset trip data back to original 10-member demo?')) {
      localStorage.removeItem('trip_split_data_v1');
      setTrip(INITIAL_TRIP);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md font-bold text-lg">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                  TripSplit UPI
                </h1>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Finance Lead Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-emerald-500" /> {trip.destination} • {trip.members.length} Friends
              </p>
            </div>
          </div>

          {/* Quick Header Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExportOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200"
              title="Export WhatsApp Summary"
            >
              <Share2 className="h-3.5 w-3.5" />
              WhatsApp
            </button>

            <button
              onClick={() => setIsCaptureOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-500" />
              <span className="hidden sm:inline">Auto-Capture</span> UPI
            </button>

            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {/* Treasury / Central Pot Card */}
        <PotCard
          trip={trip}
          onOpenQR={() => setIsLeadQrOpen(true)}
          onOpenCapture={() => setIsCaptureOpen(true)}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        />

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'expenses'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="h-4 w-4" />
              Expenses ({trip.expenses.length})
            </button>

            <button
              onClick={() => setActiveTab('settle')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'settle'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Scale className="h-4 w-4 text-emerald-500" />
              Settle Up & Who Pays Whom
            </button>

            <button
              onClick={() => setActiveTab('qr_capture')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'qr_capture'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <QrCode className="h-4 w-4 text-teal-500" />
              QR & Inbound Payments ({trip.payments.length})
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'members'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              10 Friends & Stats
            </button>
          </nav>

          <button
            onClick={handleResetData}
            title="Reset to Demo Data"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset Demo</span>
          </button>
        </div>

        {/* TAB 1: EXPENSES LIST */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Trip Expense Feed
                </h3>
                <p className="text-xs text-slate-500">
                  Total Trip Spending: <strong>₹{totalTripSpend.toLocaleString('en-IN')}</strong> across {trip.expenses.length} bills
                </p>
              </div>

              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Expense
              </button>
            </div>

            <div className="space-y-2.5">
              {trip.expenses.map((exp) => {
                const payer =
                  exp.paidBy === 'POT'
                    ? { name: 'Trip Pot (Kitty)', avatarColor: 'bg-emerald-600' }
                    : trip.members.find((m) => m.id === exp.paidBy) || {
                        name: 'Friend',
                        avatarColor: 'bg-slate-600',
                      };

                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800 shadow-inner">
                        {CATEGORY_ICONS[exp.category] || '💸'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {exp.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>
                            Paid by{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {payer.name}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>Split: {exp.splits.length} people (₹{(exp.amount / exp.splits.length).toFixed(0)}/head)</span>
                          {exp.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-400">{exp.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                        <p className="text-[10px] text-slate-400">{exp.paidAt}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-all"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SETTLE UP (WHO PAYS WHOM) */}
        {activeTab === 'settle' && (
          <SettleUpTab trip={trip} onUpdateSettlement={handleUpdateSettlement} />
        )}

        {/* TAB 3: QR CODE & INBOUND PAYMENTS */}
        {activeTab === 'qr_capture' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Finance Lead's QR Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 mb-2">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Finance Lead UPI QR
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Share this with your 10 friends to deposit funds into the Central Pot
              </p>

              <div className="my-4 flex items-center justify-center gap-2">
                <span className="text-xs text-slate-500">Preset Contribution:</span>
                <div className="flex gap-1.5">
                  {[2000, 3000, 4000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        depositAmount === amt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ₹{amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCustomQrModal({
                    payeeUpi: financeLead.upiId || 'anupam@okaxis',
                    payeeName: financeLead.name,
                    amount: depositAmount,
                    note: `TripPotDeposit_${depositAmount}`,
                  })
                }
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95"
              >
                <QrCode className="h-4 w-4" />
                Open QR for ₹{depositAmount.toLocaleString('en-IN')}
              </button>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-1">
                <p className="text-slate-400">Treasurer VPA:</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {financeLead.upiId}
                </p>
              </div>
            </div>

            {/* Right: Inbound Payment Log & Auto-Capture Feed */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                    Inbound QR Payment Feed
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live record of bank SMS / push notifications received on your phone
                  </p>
                </div>

                <button
                  onClick={() => setIsCaptureOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Test Simulator
                </button>
              </div>

              <div className="space-y-3">
                {trip.payments.map((p) => {
                  const matched = trip.members.find((m) => m.id === p.matchedMemberId);

                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-xs ${
                              matched ? matched.avatarColor : 'bg-slate-500'
                            }`}
                          >
                            {matched ? matched.name.slice(0, 2).toUpperCase() : '??'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {matched ? matched.name : p.senderName}
                              </h4>
                              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                                Credited to Pot
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">
                              UTR: {p.utr} • {new Date(p.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                            +₹{p.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {p.rawText && (
                        <div className="mt-2.5 rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/80 dark:border-slate-700/60">
                          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                            &quot;{p.rawText}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 10 FRIENDS & STATS */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                Trip Roster (10 Friends)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {trip.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-extrabold text-sm ${member.avatarColor}`}
                    >
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {member.name}
                        </h4>
                        {member.isFinanceLead && (
                          <span className="rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">
                            Finance Lead
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{member.upiId}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">📞 +91 {member.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Expense Category Breakdown
              </h3>
              <div className="space-y-3">
                {Object.entries(
                  trip.expenses.reduce((acc, curr) => {
                    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                    return acc;
                  }, {} as Record<Category, number>)
                ).map(([cat, amount]) => {
                  const pct = totalTripSpend > 0 ? (amount / totalTripSpend) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="capitalize flex items-center gap-1.5">
                          <span>{CATEGORY_ICONS[cat as Category] || '💸'}</span>
                          <span>{cat}</span>
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          ₹{amount.toLocaleString('en-IN')} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        members={trip.members}
        onAddExpense={handleAddExpense}
        potBalance={potSummary.balance}
      />

      <PaymentCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        members={trip.members}
        onPaymentCaptured={handlePaymentCaptured}
        financeLeadUpi={financeLead.upiId || 'anupam@okaxis'}
      />

      <WhatsAppExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        trip={trip}
      />

      <QRCodeModal
        isOpen={isLeadQrOpen}
        onClose={() => setIsLeadQrOpen(false)}
        payeeUpi={financeLead.upiId || 'anupam@okaxis'}
        payeeName={financeLead.name}
        amount={depositAmount}
        note="TripPotDeposit"
        title="Central Trip Pot Deposit QR"
      />

      {customQrModal && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setCustomQrModal(null)}
          payeeUpi={customQrModal.payeeUpi}
          payeeName={customQrModal.payeeName}
          amount={customQrModal.amount}
          note={customQrModal.note}
        />
      )}
    </div>
  );
}
