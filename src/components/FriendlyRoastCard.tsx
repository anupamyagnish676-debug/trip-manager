'use client';

import React, { useState } from 'react';
import { Sparkles, Dices, Share2, Flame, HeartHandshake } from 'lucide-react';
import { getRoastForMember, getWhatsAppRoastShareText } from '@/lib/roastService';
import { formatMoney } from '@/lib/currency';

interface FriendlyRoastCardProps {
  tripName: string;
  memberName: string;
  memberId: string;
  amountOwed: number;
  currency?: string;
  isSelf?: boolean;
}

export function FriendlyRoastCard({
  tripName,
  memberName,
  memberId,
  amountOwed,
  currency = 'INR',
  isSelf = false,
}: FriendlyRoastCardProps) {
  const [shuffleCount, setShuffleCount] = useState(0);

  const roast = getRoastForMember(memberId, memberName, amountOwed, shuffleCount);

  const handleShareWhatsApp = () => {
    const text = getWhatsAppRoastShareText(tripName, memberName, amountOwed, roast, currency);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 p-4 sm:p-5 shadow-md space-y-3.5 transition-all">
      {/* Background Decorative Emoji */}
      <div className="absolute -right-2 -bottom-4 text-7xl opacity-10 select-none pointer-events-none">
        {roast.emoji}
      </div>

      {/* Top Banner: Zero-Judgement Friendly Tag */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs">
          <Flame className="h-3.5 w-3.5" />
          <span>{isSelf ? 'Your Friendly Roadtrip Persona' : `Friendly Roast • ${memberName.split(' ')[0]}`}</span>
        </div>

        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
          <HeartHandshake className="h-3 w-3 text-emerald-600" />
          <span>Equal Split Homies</span>
        </span>
      </div>

      {/* Main Roast Header */}
      <div className="flex items-start gap-3">
        <div className="text-3xl p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/80 shadow-xs shrink-0">
          {roast.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
            {roast.title}
          </h4>
          <p className="text-xs text-amber-900 dark:text-amber-200/90 font-mono font-bold mt-0.5">
            Pending: {formatMoney(amountOwed, currency)}
          </p>
        </div>
      </div>

      {/* Dialogue & Punchline Box */}
      <div className="space-y-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs">
        <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="text-base select-none shrink-0">💬</span>
          <p className="italic font-medium leading-relaxed">
            {roast.dialogue}
          </p>
        </div>

        <div className="flex items-start gap-1.5 text-slate-900 dark:text-slate-100 pt-1.5 border-t border-amber-100 dark:border-slate-800">
          <span className="text-base select-none shrink-0">💡</span>
          <p className="font-bold leading-relaxed">
            {roast.punchline}
          </p>
        </div>
      </div>

      {/* Equality & Friendship Guarantee Disclaimer */}
      <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold leading-tight">
        <span className="text-sm shrink-0">🤝</span>
        <span>
          <strong>Zero Judgement Zone:</strong> We all share equally at the end of the trip! This is 100% affectionate fun between friends.
        </span>
      </div>

      {/* Actions: Shuffle Roast & WhatsApp Share */}
      <div className="flex items-center gap-2 pt-0.5 flex-wrap">
        <button
          type="button"
          onClick={() => setShuffleCount((c) => c + 1)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all touch-manipulation min-h-[38px] shadow-2xs active:scale-98"
        >
          <Dices className="h-3.5 w-3.5 text-amber-500" />
          <span>Shuffle Roast 😂</span>
        </button>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all touch-manipulation min-h-[38px] shadow-xs active:scale-98"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Roast on WhatsApp 📢</span>
        </button>
      </div>
    </div>
  );
}
