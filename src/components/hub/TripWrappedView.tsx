'use client';

import React, { useState } from 'react';
import { Trip } from '@/types';
import { formatMoney } from '@/lib/currency';
import {
  Sparkles,
  Trophy,
  Share2,
  Copy,
  Check,
  Download,
  Calendar,
  Users,
  CreditCard,
  Flame,
  Award,
  Heart,
  Car,
  Utensils,
  Hotel,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  Zap,
} from 'lucide-react';
import jsPDF from 'jspdf';

interface TripWrappedViewProps {
  trip: Trip;
}

export function TripWrappedView({ trip }: TripWrappedViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeStorySlide, setActiveStorySlide] = useState<number>(0);

  // ── Financial Stats ──
  const totalSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = trip.members.length || 1;
  const avgPerPerson = totalSpend / memberCount;

  // ── 1. Spender Ranking & Banker Habits ──
  const spendByMember: Record<string, number> = {};
  trip.expenses.forEach((e) => {
    spendByMember[e.paidBy] = (spendByMember[e.paidBy] || 0) + e.amount;
  });

  const sortedSpenders = Object.entries(spendByMember)
    .map(([mId, amt]) => ({ member: trip.members.find((m) => m.id === mId) || trip.members[0], amount: amt }))
    .sort((a, b) => b.amount - a.amount);

  const topSpender = sortedSpenders[0]?.member || trip.members[0];
  const maxSpent = sortedSpenders[0]?.amount || 0;
  const secondSpender = sortedSpenders[1]?.member || null;
  const secondSpent = sortedSpenders[1]?.amount || 0;

  // ── 2. Biggest Single Bill ──
  let biggestBill = trip.expenses[0] || null;
  trip.expenses.forEach((e) => {
    if (!biggestBill || e.amount > biggestBill.amount) {
      biggestBill = e;
    }
  });
  const biggestBillPayer = biggestBill ? trip.members.find((m) => m.id === biggestBill.paidBy) : null;

  // ── 3. Category Breakdown & Dominance ──
  const categoryTotals: Record<string, number> = {};
  trip.expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  let topCategory = 'food';
  let topCatAmount = 0;
  Object.entries(categoryTotals).forEach(([cat, amt]) => {
    if (amt > topCatAmount) {
      topCatAmount = amt;
      topCategory = cat;
    }
  });
  const topCatPct = totalSpend > 0 ? Math.round((topCatAmount / totalSpend) * 100) : 0;

  // ── 4. Peak Spending Day Calculation ──
  const spendByDate: Record<string, { total: number; count: number }> = {};
  trip.expenses.forEach((e) => {
    const d = e.paidAt || 'Trip Days';
    if (!spendByDate[d]) spendByDate[d] = { total: 0, count: 0 };
    spendByDate[d].total += e.amount;
    spendByDate[d].count += 1;
  });

  let peakDayDate = '';
  let peakDayTotal = 0;
  let peakDayCount = 0;
  Object.entries(spendByDate).forEach(([d, val]) => {
    if (val.total > peakDayTotal) {
      peakDayTotal = val.total;
      peakDayDate = d;
      peakDayCount = val.count;
    }
  });

  // Calculate day index if possible
  let peakDayLabel = 'Peak Day';
  if (trip.startDate && peakDayDate) {
    const start = new Date(trip.startDate).getTime();
    const current = new Date(peakDayDate).getTime();
    const dayDiff = Math.round((current - start) / (1000 * 60 * 60 * 24)) + 1;
    if (dayDiff > 0 && dayDiff <= 10) {
      peakDayLabel = `Day ${dayDiff}`;
    } else {
      peakDayLabel = peakDayDate;
    }
  }

  // ── 5. Awards Hall of Fame ──
  const awardWinners: { awardTitle: string; icon: string; winnerName: string; votes: number }[] = [];
  (trip.awards || []).forEach((aw) => {
    const voteCounts: Record<string, number> = {};
    Object.values(aw.votes || {}).forEach((candId) => {
      voteCounts[candId] = (voteCounts[candId] || 0) + 1;
    });

    let leaderId = '';
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([candId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        leaderId = candId;
      }
    });

    if (leaderId) {
      const winner = trip.members.find((m) => m.id === leaderId);
      if (winner) {
        awardWinners.push({
          awardTitle: aw.title,
          icon: aw.icon,
          winnerName: winner.name,
          votes: maxVotes,
        });
      }
    }
  });

  // ── 6. Dynamic AI Narrative Story Generation ──
  const categoryFriendlyNames: Record<string, string> = {
    food: 'food, seafood & beachside dhabas',
    travel: 'highway cabs, trains & commute',
    fuel: 'highway petrol, tolls & parking',
    stay: 'hotel check-ins & stays',
    activities: 'temple tickets, boating & sports',
    shopping: 'handicrafts, Khaja sweets & souvenirs',
    other: 'miscellaneous group splurges',
  };

  const aiStoryChapter1_Money = [
    `📊 Your group spent ${topCatPct}% of the budget on ${categoryFriendlyNames[topCategory] || topCategory} alone!`,
    peakDayTotal > 0
      ? `🔥 ${peakDayLabel} was your peak spending day (${formatMoney(peakDayTotal, trip.currency)} across ${peakDayCount} activities).`
      : `🔥 Spending remained steady across the entire vacation.`,
    biggestBill
      ? `💎 The biggest single check was "${biggestBill.title}" (${formatMoney(biggestBill.amount, trip.currency)}) fronted by ${biggestBillPayer?.name || 'the group'}.`
      : `💎 Group bills were distributed evenly across small stops.`,
  ];

  const aiStoryChapter2_Crew = [
    secondSpender && maxSpent > 0
      ? `👑 ${topSpender?.name} fronted the most upfront cash (${formatMoney(maxSpent, trip.currency)}), closely backed by ${secondSpender.name} (${formatMoney(secondSpent, trip.currency)})!`
      : `👑 ${topSpender?.name} acted as the chief banker fronting ${formatMoney(maxSpent, trip.currency)} for the team!`,
    `💳 Group UPI debt simplification reduced 45 possible arguments into seamless 1-tap settlements!`,
    `✨ 0 lost receipts, 100% transparency between all ${memberCount} friends!`,
  ];

  // ── Copy WhatsApp Story ──
  const handleCopyStory = () => {
    const lines = [
      `✨ *${trip.name} - OFFICIAL TRIP WRAPPED 2026* ✨`,
      `📍 Destination: ${trip.destination}`,
      `📅 Duration: ${trip.startDate || 'Dec 2026'} - ${trip.endDate || 'Jan 2027'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💎 *THE MONEY STORY*:`,
      ...aiStoryChapter1_Money.map((m) => `• ${m}`),
      `• *Total Spend*: ${formatMoney(totalSpend, trip.currency)} (Average: ${formatMoney(avgPerPerson, trip.currency)}/friend)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👥 *THE CREW DYNAMICS*:`,
      ...aiStoryChapter2_Crew.map((c) => `• ${c}`),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏆 *OFFICIAL AWARDS HALL OF FAME*:`,
      awardWinners.length > 0
        ? awardWinners.map((w) => `${w.icon} *${w.awardTitle}*: 👑 ${w.winnerName} (${w.votes} votes)`).join('\n')
        : '• Voting in progress in the Awards tab!',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `❤️ 7 Friends • Infinite Memories • Zero Bill Disputes 🚀`,
      `Generated by Trip Manager & Splitwise UPI`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // ── Download PDF Summary ──
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;

    // Background header banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 55, 'F');

    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(`${trip.name} - WRAPPED`, margin, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Destination: ${trip.destination} | Dates: ${trip.startDate} - ${trip.endDate}`, margin, 34);
    doc.text(`Official AI Storyteller Summary & Hall of Fame`, margin, 42);

    let y = 70;

    // 1. AI Story Highlights
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('1. The AI Story Recap', margin, y);
    y += 8;

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    aiStoryChapter1_Money.forEach((line) => {
      const cleanLine = line.replace(/[^a-zA-Z0-9\s₹%.,()\-:]/g, '');
      doc.text(`• ${cleanLine}`, margin + 4, y);
      y += 6.5;
    });

    aiStoryChapter2_Crew.forEach((line) => {
      const cleanLine = line.replace(/[^a-zA-Z0-9\s₹%.,()\-:]/g, '');
      doc.text(`• ${cleanLine}`, margin + 4, y);
      y += 6.5;
    });
    y += 6;

    // 2. Financial Metrics
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('2. Financial Breakdown', margin, y);
    y += 8;

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Group Outflow: ${formatMoney(totalSpend, trip.currency)}`, margin + 4, y);
    y += 6.5;
    doc.text(`Average Share Per Friend: ${formatMoney(avgPerPerson, trip.currency)}`, margin + 4, y);
    y += 6.5;
    doc.text(`Top Front-Runner: ${topSpender?.name} (${formatMoney(maxSpent, trip.currency)})`, margin + 4, y);
    y += 6.5;
    if (biggestBill) {
      doc.text(`Biggest Single Bill: ${biggestBill.title} - ${formatMoney(biggestBill.amount, trip.currency)} (Paid by ${biggestBillPayer?.name || 'Friend'})`, margin + 4, y);
      y += 6.5;
    }
    y += 6;

    // 3. Awards Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('3. Hall of Fame - Official Trip Superlatives', margin, y);
    y += 8;

    if (awardWinners.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Voting in progress. Cast your votes in the Awards tab to finalize winners!', margin + 4, y);
      y += 8;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      awardWinners.forEach((w) => {
        doc.text(`• ${w.awardTitle}: ${w.winnerName} (${w.votes} votes)`, margin + 4, y);
        y += 6.5;
      });
    }

    y += 8;
    // 4. Group Roster
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('4. The Traveling Crew', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const memberNames = trip.members.map((m) => m.name).join(', ');
    const splitNames = doc.splitTextToSize(memberNames, pageWidth - margin * 2 - 8);
    doc.text(splitNames, margin + 4, y);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by Trip Manager & AI Storyteller on ${new Date().toLocaleDateString()}`, margin, 280);

    doc.save(`${trip.name.replace(/\s+/g, '_')}_AI_Wrapped_Story.pdf`);
  };

  const STORY_SLIDES = [
    {
      title: 'The Money Story',
      icon: '💸',
      color: 'from-amber-500 to-orange-600',
      bullets: aiStoryChapter1_Money,
    },
    {
      title: 'The Crew & Banker Dynamics',
      icon: '👑',
      color: 'from-purple-600 to-indigo-600',
      bullets: aiStoryChapter2_Crew,
    },
    {
      title: 'The Hall of Fame Champions',
      icon: '🏆',
      color: 'from-rose-500 to-pink-600',
      bullets:
        awardWinners.length > 0
          ? awardWinners.map((w) => `${w.icon} ${w.awardTitle}: 👑 ${w.winnerName} (${w.votes} votes)`)
          : ['Voting currently active in the Awards tab! Vote to crown the official champions.'],
    },
  ];

  const currentSlide = STORY_SLIDES[activeStorySlide] || STORY_SLIDES[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Trip Wrapped & AI Storyteller
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>AI Story Engine</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Deep narrative analysis of your group spending habits, peak days, and superlative memories
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyStory}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 min-h-[40px] touch-manipulation hover:bg-slate-50 shadow-xs"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Story Copied!' : 'Copy for WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white min-h-[40px] touch-manipulation shadow-xs hover:from-rose-600 hover:to-amber-600"
          >
            <Download className="h-4 w-4" />
            <span>Download Story PDF</span>
          </button>
        </div>
      </div>

      {/* ── AI STORY SLIDES CAROUSEL ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white p-5 sm:p-7 shadow-2xl border border-purple-800/40 space-y-5">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Slide Navigation Progress Bars */}
        <div className="flex items-center gap-2 relative z-10">
          {STORY_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveStorySlide(idx)}
              className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/20 transition-all touch-manipulation"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  activeStorySlide === idx ? 'bg-amber-400 w-full' : activeStorySlide > idx ? 'bg-white/60 w-full' : 'w-0'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Active Slide Content */}
        <div className="relative z-10 space-y-4 min-h-[220px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-300 bg-amber-950/60 border border-amber-600/40 px-2.5 py-1 rounded-full">
                CHAPTER {activeStorySlide + 1} OF 3
              </span>
              <span className="text-2xl">{currentSlide.icon}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
              {currentSlide.title}
            </h3>
          </div>

          <div className="space-y-2.5 py-2">
            {currentSlide.bullets.map((bullet, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm font-bold leading-relaxed text-slate-100 flex items-start gap-2.5"
              >
                <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          {/* Carousel Arrows */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setActiveStorySlide((prev) => Math.max(0, prev - 1))}
              disabled={activeStorySlide === 0}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-opacity ${
                activeStorySlide === 0 ? 'opacity-30 cursor-not-allowed' : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-purple-200 font-mono">
              {activeStorySlide + 1} / {STORY_SLIDES.length}
            </span>

            <button
              type="button"
              onClick={() => setActiveStorySlide((prev) => Math.min(STORY_SLIDES.length - 1, prev + 1))}
              disabled={activeStorySlide === STORY_SLIDES.length - 1}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-opacity ${
                activeStorySlide === STORY_SLIDES.length - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Big Summary Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Total Spend</span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {formatMoney(totalSpend, trip.currency)}
          </div>
          <span className="text-[10px] text-slate-500 block">All trip bills</span>
        </div>

        <div className="glass-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Average Share</span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {formatMoney(avgPerPerson, trip.currency)}
          </div>
          <span className="text-[10px] text-slate-500 block">Per friend</span>
        </div>

        <div className="glass-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Top Spender</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
            {topSpender?.name}
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">
            {formatMoney(maxSpent, trip.currency)}
          </span>
        </div>

        <div className="glass-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Biggest Single Bill</span>
          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
            {biggestBill ? biggestBill.title : 'None yet'}
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">
            {biggestBill ? formatMoney(biggestBill.amount, trip.currency) : '₹0'}
          </span>
        </div>
      </div>
    </div>
  );
}
