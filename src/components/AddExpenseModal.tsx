'use client';

import React, { useState } from 'react';
import { X, Plus, Users, Wallet, Tag } from 'lucide-react';
import { Member, Category, Expense, SplitType } from '@/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onAddExpense: (expense: Expense) => void;
  potBalance: number;
}

const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'Food & Meals', value: 'food', icon: '🍽️' },
  { label: 'Stay / Hotel', value: 'stay', icon: '🏨' },
  { label: 'Travel / Cab', value: 'travel', icon: '🚕' },
  { label: 'Fuel & Tolls', value: 'fuel', icon: '⛽' },
  { label: 'Activities & Sports', value: 'activities', icon: '⛷️' },
  { label: 'Drinks & Party', value: 'drinks', icon: '🍻' },
  { label: 'Groceries', value: 'groceries', icon: '🛒' },
  { label: 'Misc', value: 'misc', icon: '✨' },
];

export function AddExpenseModal({
  isOpen,
  onClose,
  members,
  onAddExpense,
  potBalance,
}: AddExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [paidBy, setPaidBy] = useState<string>('POT'); // 'POT' or memberId
  const [splitMode, setSplitMode] = useState<'all' | 'subset' | 'custom'>('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const totalAmount = parseFloat(amount) || 0;

  const toggleMemberSelection = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleCustomAmountChange = (memberId: string, val: string) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [memberId]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0 || !title.trim()) return;

    let splits: { memberId: string; amount: number }[] = [];
    let splitType: SplitType = 'equal';

    if (splitMode === 'all') {
      const perHead = Math.round((totalAmount / members.length) * 100) / 100;
      splits = members.map((m) => ({ memberId: m.id, amount: perHead }));
    } else if (splitMode === 'subset') {
      const perHead = Math.round((totalAmount / selectedMemberIds.length) * 100) / 100;
      splits = selectedMemberIds.map((id) => ({ memberId: id, amount: perHead }));
    } else {
      splitType = 'exact';
      splits = members
        .map((m) => ({
          memberId: m.id,
          amount: parseFloat(customAmounts[m.id] || '0') || 0,
        }))
        .filter((s) => s.amount > 0);
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      tripId: 'manali-winter-2026',
      title: title.trim(),
      amount: totalAmount,
      category,
      paidBy,
      paidAt: new Date().toISOString().split('T')[0],
      splitType,
      splits,
      notes: notes.trim() || undefined,
    };

    onAddExpense(newExpense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>➕</span> Log New Trip Expense
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Record any expense paid by the pot or any of the 10 members
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Description / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Riverside Cafe Lunch"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs border transition-all ${
                    category === cat.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="truncate w-full text-center mt-1 text-[11px]">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paid By Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Who Paid for This?
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="POT">
                🏦 Central Trip Pot (Available: ₹{potBalance.toLocaleString('en-IN')})
              </option>
              <optgroup label="Or Paid by an Individual Friend:">
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    👤 {m.name} {m.isFinanceLead ? '(Finance Lead)' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Split Mode Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              How to Split?
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSplitMode('all')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold border transition-all ${
                  splitMode === 'all'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                All 10 Members Equal
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('subset')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold border transition-all ${
                  splitMode === 'subset'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Selected Friends Only
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold border transition-all ${
                  splitMode === 'custom'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Exact Amounts
              </button>
            </div>
          </div>

          {/* Conditional Split Pickers */}
          {splitMode === 'all' && totalAmount > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300 flex justify-between items-center">
              <span>Split across all {members.length} members:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{(totalAmount / members.length).toFixed(2)} / person
              </span>
            </div>
          )}

          {splitMode === 'subset' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 max-h-40 overflow-y-auto space-y-1.5">
              <p className="text-[11px] text-slate-400 mb-2">Check the friends who participated:</p>
              <div className="grid grid-cols-2 gap-2">
                {members.map((m) => {
                  const isChecked = selectedMemberIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2 rounded-lg p-2 text-xs cursor-pointer border ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-slate-900 dark:text-white font-medium'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMemberSelection(m.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="truncate">{m.name}</span>
                    </label>
                  );
                })}
              </div>
              {selectedMemberIds.length > 0 && totalAmount > 0 && (
                <div className="mt-2 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{(totalAmount / selectedMemberIds.length).toFixed(2)} per participant
                </div>
              )}
            </div>
          )}

          {splitMode === 'custom' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 max-h-48 overflow-y-auto space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-700 dark:text-slate-300 truncate w-36">{m.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={customAmounts[m.id] || ''}
                      onChange={(e) => handleCustomAmountChange(m.id, e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-right text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bill paid via Rohan GPay, receipt attached"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={totalAmount <= 0 || !title.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-98"
            >
              <Plus className="h-4 w-4" />
              Save Expense & Update Balances
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
