'use client';

import React, { useState } from 'react';
import { X, KeyRound, Check, ShieldCheck, Eye, EyeOff, Sparkles, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Member } from '@/types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: Member;
  isFirstLogin?: boolean;
  onSavePassword: (newPassword: string) => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  currentMember,
  isFirstLogin = false,
  onSavePassword,
}: ChangePasswordModalProps) {
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // If not first login, verify current password
    if (!isFirstLogin && currentPassInput.trim() !== currentMember.password) {
      setErrorMsg('Current password does not match your account password.');
      return;
    }

    const trimmedNew = newPass.trim();
    const trimmedConfirm = confirmPass.trim();

    if (trimmedNew.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMsg('New passwords do not match. Please re-type carefully.');
      return;
    }

    if (trimmedNew === currentMember.password && isFirstLogin) {
      setErrorMsg('Please choose a new password different from your temporary default.');
      return;
    }

    // Success! Fire celebration confetti
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}

    onSavePassword(trimmedNew);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 touch-manipulation"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md flex-shrink-0">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isFirstLogin ? 'Set Your Personal Password' : 'Change Account Password'}
              </h3>
              {isFirstLogin && (
                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  First Login
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Account: <strong className="text-slate-800 dark:text-slate-200">{currentMember.name}</strong> (@{currentMember.loginId})
            </p>
          </div>
        </div>

        {/* First Login Welcome Notice */}
        {isFirstLogin && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 p-3.5 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>Welcome to the Trip Portal!</span>
            </p>
            <p className="text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-200/90">
              You just signed in using your initial temporary password. Please set a personal secret password so your account remains private and secure throughout the trip.
            </p>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current Password Field (only if not first login) */}
          {!isFirstLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Choose a new secret password (min 4 chars)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password *
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-type your new password"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            {isFirstLogin && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto flex-1 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all min-h-[44px] touch-manipulation"
              >
                Skip for Now
              </button>
            )}

            <button
              type="submit"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 min-h-[44px] touch-manipulation"
            >
              <Check className="h-4 w-4" />
              <span>{isFirstLogin ? 'Set My Password & Continue' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
