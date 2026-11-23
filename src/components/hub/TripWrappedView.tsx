'use client';

import React, { useState } from 'react';
import { Trip } from '@/types';
import { formatMoney } from '@/lib/currency';
import { calculateMemberBalances } from '@/lib/calculations';
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
  Loader2,
  RotateCcw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import {
  getGeminiTripWrapped,
  TripWrappedResponse,
} from '@/lib/geminiService';

interface TripWrappedViewProps {
  trip: Trip;
}

export function TripWrappedView({ trip }: TripWrappedViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeStorySlide, setActiveStorySlide] = useState<number>(0);

  // Gemini Live Story State
  const [geminiStory, setGeminiStory] = useState<TripWrappedResponse | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [storyMode, setStoryMode] = useState<'gemini' | 'standard'>('gemini');

  // ── Financial Calculations ──
  const totalSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = trip.members.length || 1;
  const avgPerPerson = totalSpend / memberCount;

  // 1. Spender Ranking
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

  // 2. Biggest Single Bill
  let biggestBill = trip.expenses[0] || null;
  trip.expenses.forEach((e) => {
    if (!biggestBill || e.amount > biggestBill.amount) {
      biggestBill = e;
    }
  });
  const biggestBillPayer = biggestBill ? trip.members.find((m) => m.id === biggestBill.paidBy) : null;

  // 3. Category Dominance
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

  // 4. Peak Spending Day
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

  // 5. Standard Narrative Fallbacks
  const categoryFriendlyNames: Record<string, string> = {
    food: 'food, seafood & beachside dhabas',
    travel: 'highway cabs, trains & commute',
    fuel: 'highway petrol, tolls & parking',
    stay: 'hotel check-ins & stays',
    activities: 'temple tickets, boating & sports',
    shopping: 'handicrafts, Khaja sweets & souvenirs',
    other: 'miscellaneous group splurges',
  };

  const standardChapter1 = [
    `📊 Your group spent ${topCatPct}% of the budget on ${categoryFriendlyNames[topCategory] || topCategory} alone!`,
    peakDayTotal > 0
      ? `🔥 ${peakDayLabel} was your peak spending day (${formatMoney(peakDayTotal, trip.currency)} across ${peakDayCount} activities).`
      : `🔥 Spending remained steady across the entire vacation.`,
    biggestBill
      ? `💎 The biggest single check was "${biggestBill.title}" (${formatMoney(biggestBill.amount, trip.currency)}) fronted by ${biggestBillPayer?.name || 'the group'}.`
      : `💎 Group bills were distributed evenly across small stops.`,
  ];

  const standardChapter2 = [
    secondSpender && maxSpent > 0
      ? `👑 ${topSpender?.name} fronted the most upfront cash (${formatMoney(maxSpent, trip.currency)}), closely backed by ${secondSpender.name} (${formatMoney(secondSpent, trip.currency)})!`
      : `👑 ${topSpender?.name} acted as the chief banker fronting ${formatMoney(maxSpent, trip.currency)} for the team!`,
    `💳 Group UPI debt simplification reduced all possible arguments into seamless 1-tap settlements!`,
    `✨ 0 lost receipts, 100% transparency between all ${memberCount} friends!`,
  ];

  // ── Action: Generate Real Story with Gemini ──
  const handleGenerateGeminiStory = async () => {
    if (trip.expenses.length === 0) {
      alert('Log at least one bill to generate the Trip Wrapped story!');
      return;
    }

    setIsGeneratingStory(true);
    setStoryError(null);

    const balances = calculateMemberBalances(trip);
    const financialSummary = {
      totalSpend,
      currency: trip.currency || 'INR',
      expenseCount: trip.expenses.length,
      expenses: trip.expenses.map((e) => ({
        title: e.title,
        amount: e.amount,
        category: e.category,
        paidBy: trip.members.find((m) => m.id === e.paidBy)?.name || e.paidBy,
        date: e.paidAt,
      })),
      topCategories: Object.entries(categoryTotals).map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        pct: totalSpend > 0 ? Math.round((amt / totalSpend) * 100) : 0,
      })),
      balances: balances.map((b) => ({
        memberName: b.member.name,
        netBalance: b.netBalance,
        totalPaid: b.totalDirectPaid,
      })),
    };

    try {
      const story = await getGeminiTripWrapped({
        tripName: trip.name,
        destination: trip.destination,
        financialSummary,
      });
      setGeminiStory(story);
      setStoryMode('gemini');
      setActiveStorySlide(0);
    } catch (err: any) {
      setStoryError(err.message || 'Failed to generate story with Gemini. Please ensure GEMINI_API_KEY is configured in Vercel environment variables.');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // Prepare slides to display
  const slides =
    storyMode === 'gemini' && geminiStory
      ? geminiStory.chapters.map((ch) => ({
          title: ch.title,
          icon: ch.icon || '✨',
          story: ch.story,
          badges: ch.statBadges || [],
        }))
      : [
          {
            title: 'The Money Story',
            icon: '💸',
            story: standardChapter1.join('\n\n'),
            badges: standardChapter1,
          },
          {
            title: 'The Crew & Banker Dynamics',
            icon: '👑',
            story: standardChapter2.join('\n\n'),
            badges: standardChapter2,
          },
        ];

  const currentSlide = slides[activeStorySlide] || slides[0];

  // ── Copy WhatsApp Story ──
  const handleCopyStory = () => {
    let lines: string[] = [];

    if (storyMode === 'gemini' && geminiStory) {
      lines = [
        `✨ *${trip.name} - OFFICIAL GEMINI TRIP WRAPPED 2026* ✨`,
        `📍 Destination: ${trip.destination}`,
        `🎭 Group Vibe: *"${geminiStory.vibeTitle}"*`,
        `💬 *${geminiStory.catchphrase}*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ...geminiStory.chapters.map(
          (ch) =>
            `${ch.icon} *${ch.title.toUpperCase()}*\n${ch.story}\n${(ch.statBadges || [])
              .map((b) => `• ${b}`)
              .join('\n')}`
        ),
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `🏆 *MEMBER SUPERLATIVES*:`,
        ...(geminiStory.memberSuperlatives || []).map(
          (m) => `👑 *${m.memberName}*: "${m.awardTitle}" (${m.reason})`
        ),
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `💎 Total Spend: ${formatMoney(totalSpend, trip.currency)} across ${trip.expenses.length} bills`,
        `Generated with Google Gemini AI & Trip Manager 🚀`,
      ];
    } else {
      lines = [
        `✨ *${trip.name} - OFFICIAL TRIP WRAPPED 2026* ✨`,
        `📍 Destination: ${trip.destination}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `💎 *THE MONEY STORY*:`,
        ...standardChapter1.map((m) => `• ${m}`),
        `• *Total Spend*: ${formatMoney(totalSpend, trip.currency)} (Average: ${formatMoney(avgPerPerson, trip.currency)}/friend)`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `👥 *THE CREW DYNAMICS*:`,
        ...standardChapter2.map((c) => `• ${c}`),
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `❤️ ${trip.members.length} Friends • Infinite Memories • Zero Bill Disputes 🚀`,
        `Generated by Trip Manager & Splitwise UPI`,
      ];
    }

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

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 55, 'F');

    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(`${trip.name} - WRAPPED`, margin, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Destination: ${trip.destination} | Group Vibe: ${geminiStory?.vibeTitle || 'Trip Story'}`, margin, 34);
    doc.text(`Official AI Storyteller Summary by Google Gemini`, margin, 42);

    let y = 70;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('1. Group Spending Narrative', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (geminiStory) {
      doc.setFont('helvetica', 'bold');
      doc.text(`"${geminiStory.catchphrase}"`, margin + 4, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      geminiStory.chapters.forEach((ch) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${ch.title}`, margin + 4, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(ch.story, pageWidth - margin * 2 - 8);
        doc.text(splitText, margin + 6, y);
        y += splitText.length * 5 + 4;
      });
    } else {
      standardChapter1.forEach((line) => {
        const clean = line.replace(/[^a-zA-Z0-9\s₹%.,()\-:]/g, '');
        doc.text(`• ${clean}`, margin + 4, y);
        y += 6.5;
      });
    }

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('2. Financial Breakdown', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Group Spend: ${formatMoney(totalSpend, trip.currency)}`, margin + 4, y);
    y += 6;
    doc.text(`Average Share Per Person: ${formatMoney(avgPerPerson, trip.currency)}`, margin + 4, y);
    y += 6;
    doc.text(`Top Cash Frontline: ${topSpender?.name} (${formatMoney(maxSpent, trip.currency)})`, margin + 4, y);
    y += 8;

    if (geminiStory?.memberSuperlatives && geminiStory.memberSuperlatives.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('3. Gemini Member Superlatives', margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      geminiStory.memberSuperlatives.forEach((m) => {
        doc.text(`• ${m.memberName} - "${m.awardTitle}": ${m.reason}`, margin + 4, y);
        y += 6;
      });
    }

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated with Google Gemini AI on ${new Date().toLocaleDateString()}`, margin, 280);

    doc.save(`${trip.name.replace(/\s+/g, '_')}_Gemini_Wrapped_Story.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Trip Wrapped & AI Storyteller
            </h2>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-2xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Gemini AI Storyteller</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real Gemini narrative analyzing your bills, peak days, and payer habits into a Spotify Wrapped story
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={isGeneratingStory}
            onClick={handleGenerateGeminiStory}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white shadow-md shadow-indigo-500/25 min-h-[40px] touch-manipulation disabled:opacity-50"
          >
            {isGeneratingStory ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gemini is Analyzing Ledger...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{geminiStory ? 'Regenerate with Gemini' : 'Generate with Gemini AI'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyStory}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 min-h-[40px] touch-manipulation hover:bg-slate-50 shadow-xs"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'WhatsApp Story'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white min-h-[40px] touch-manipulation shadow-xs hover:from-rose-600 hover:to-amber-600"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {storyError && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {storyError}
        </div>
      )}

      {/* ── GEMINI VIBE BANNER (IF GENERATED) ── */}
      {geminiStory && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-rose-900/60 border border-purple-500/40 text-white flex items-center justify-between gap-3 flex-wrap shadow-lg">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-300">
              OFFICIAL GROUP VIBE
            </span>
            <h3 className="text-base sm:text-lg font-black mt-0.5">
              &quot;{geminiStory.vibeTitle}&quot;
            </h3>
            <p className="text-xs text-purple-200 italic mt-0.5">
              {geminiStory.catchphrase}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStoryMode(storyMode === 'gemini' ? 'standard' : 'gemini')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md"
            >
              {storyMode === 'gemini' ? 'View Standard Stats' : 'View Gemini Story'}
            </button>
          </div>
        </div>
      )}

      {/* ── AI STORY SLIDES CAROUSEL ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white p-5 sm:p-7 shadow-2xl border border-purple-800/40 space-y-5">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Slide Navigation Progress Bars */}
        <div className="flex items-center gap-2 relative z-10">
          {slides.map((_, idx) => (
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
                CHAPTER {activeStorySlide + 1} OF {slides.length}
              </span>
              <span className="text-2xl">{currentSlide.icon}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
              {currentSlide.title}
            </h3>
          </div>

          <div className="space-y-3 py-2">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-line bg-white/5 p-3.5 rounded-2xl border border-white/10">
              {currentSlide.story}
            </p>

            {currentSlide.badges && currentSlide.badges.length > 0 && (
              <div className="space-y-2">
                {currentSlide.badges.map((badge, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold leading-relaxed text-slate-100 flex items-start gap-2"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{badge}</span>
                  </div>
                ))}
              </div>
            )}
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
              {activeStorySlide + 1} / {slides.length}
            </span>

            <button
              type="button"
              onClick={() => setActiveStorySlide((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={activeStorySlide === slides.length - 1}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-opacity ${
                activeStorySlide === slides.length - 1
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

      {/* ── GEMINI MEMBER SUPERLATIVES & ROASTS ── */}
      {geminiStory?.memberSuperlatives && geminiStory.memberSuperlatives.length > 0 && (
        <div className="glass-card p-5 rounded-3xl border border-purple-200 dark:border-purple-900/60 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Gemini Group Hall of Fame & Roasts
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {geminiStory.memberSuperlatives.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {m.memberName}
                  </span>
                  <span className="text-base">👑</span>
                </div>
                <h5 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                  {m.awardTitle}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {m.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
