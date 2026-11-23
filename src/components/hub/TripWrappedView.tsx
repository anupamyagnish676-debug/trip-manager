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
} from 'lucide-react';
import jsPDF from 'jspdf';

interface TripWrappedViewProps {
  trip: Trip;
}

export function TripWrappedView({ trip }: TripWrappedViewProps) {
  const [copied, setCopied] = useState(false);

  // Financial Stats
  const totalSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = trip.members.length || 1;
  const avgPerPerson = totalSpend / memberCount;

  // Spender ranking
  const spendByMember: Record<string, number> = {};
  trip.expenses.forEach((e) => {
    spendByMember[e.paidBy] = (spendByMember[e.paidBy] || 0) + e.amount;
  });

  let topSpenderId = '';
  let maxSpent = 0;
  Object.entries(spendByMember).forEach(([mId, amt]) => {
    if (amt > maxSpent) {
      maxSpent = amt;
      topSpenderId = mId;
    }
  });
  const topSpender = trip.members.find((m) => m.id === topSpenderId) || trip.members[0];

  // Biggest Single Bill
  let biggestBill = trip.expenses[0] || null;
  trip.expenses.forEach((e) => {
    if (!biggestBill || e.amount > biggestBill.amount) {
      biggestBill = e;
    }
  });
  const biggestBillPayer = biggestBill ? trip.members.find((m) => m.id === biggestBill.paidBy) : null;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  trip.expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  // Top Category
  let topCategory = 'food';
  let topCatAmount = 0;
  Object.entries(categoryTotals).forEach(([cat, amt]) => {
    if (amt > topCatAmount) {
      topCatAmount = amt;
      topCategory = cat;
    }
  });

  // Awards Winners
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

  // Copy WhatsApp Story
  const handleCopyStory = () => {
    const lines = [
      `✨ *${trip.name} - TRIP WRAPPED 2026* ✨`,
      `📍 Destination: ${trip.destination}`,
      `📅 Dates: ${trip.startDate || 'Dec 2026'} - ${trip.endDate || 'Jan 2027'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💎 *Total Trip Spend*: ${formatMoney(totalSpend, trip.currency)}`,
      `👥 *Per Person Average*: ${formatMoney(avgPerPerson, trip.currency)}`,
      `👑 *Top Trip Banker*: ${topSpender?.name} (${formatMoney(maxSpent, trip.currency)})`,
      biggestBill
        ? `🔥 *Biggest Single Bill*: ${biggestBill.title} (${formatMoney(biggestBill.amount, trip.currency)})`
        : '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏆 *OFFICIAL TRIP AWARDS & SUPERLATIVES*:`,
      ...awardWinners.map((w) => `${w.icon} *${w.awardTitle}*: ${w.winnerName} (${w.votes} votes)`),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `❤️ Cherishing every moment with all 7 friends!`,
      `Logged & Split on Trip Manager 🚀`,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Download PDF Summary
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;

    // Background header banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 55, 'F');

    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(`${trip.name} - WRAPPED`, margin, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Destination: ${trip.destination} | Dates: ${trip.startDate} - ${trip.endDate}`, margin, 34);
    doc.text(`Official Group Vacation Summary & Hall of Fame`, margin, 42);

    let y = 70;

    // Financial Metrics
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('1. Group Financial Highlights', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Group Spend: ${formatMoney(totalSpend, trip.currency)}`, margin + 4, y);
    y += 7;
    doc.text(`Average Share Per Friend: ${formatMoney(avgPerPerson, trip.currency)}`, margin + 4, y);
    y += 7;
    doc.text(`Top Investor / Group Banker: ${topSpender?.name} (${formatMoney(maxSpent, trip.currency)})`, margin + 4, y);
    y += 7;
    if (biggestBill) {
      doc.text(`Biggest Single Bill: ${biggestBill.title} - ${formatMoney(biggestBill.amount, trip.currency)} (Paid by ${biggestBillPayer?.name || 'Friend'})`, margin + 4, y);
      y += 7;
    }
    y += 6;

    // Awards Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('2. Hall of Fame - Official Trip Awards', margin, y);
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
    // Group Roster
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('3. Traveling Friends', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const memberNames = trip.members.map((m) => m.name).join(', ');
    const splitNames = doc.splitTextToSize(memberNames, pageWidth - margin * 2 - 8);
    doc.text(splitNames, margin + 4, y);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by Trip Manager & UPI Split on ${new Date().toLocaleDateString()}`, margin, 280);

    doc.save(`${trip.name.replace(/\s+/g, '_')}_Wrapped_Summary.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Trip Wrapped & Highlights Reel
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Spotify Style</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Story-ready infographic card capturing your trip memories, biggest spenders, and award champions
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
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Hero Wrapped Visual Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white p-5 sm:p-7 shadow-2xl border border-purple-800/40 space-y-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Story Title & Badge */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2.5 py-1 rounded-full">
              ANNUAL TRIP EDITION 2026
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {trip.name}
            </h1>
            <p className="text-xs text-purple-200 mt-0.5">
              {trip.destination} • {trip.startDate || 'Dec 2026'} - {trip.endDate || 'Jan 2027'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-xs font-bold text-amber-300 block">CREW</span>
            <span className="text-xl font-black">{memberCount}</span>
            <span className="text-[9px] text-purple-200 block">Friends</span>
          </div>
        </div>

        {/* 4 Big Highlight Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Total Spend</span>
            <div className="text-lg sm:text-xl font-black text-white">
              {formatMoney(totalSpend, trip.currency)}
            </div>
            <span className="text-[10px] text-slate-300 block">All trip bills</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Average Share</span>
            <div className="text-lg sm:text-xl font-black text-white">
              {formatMoney(avgPerPerson, trip.currency)}
            </div>
            <span className="text-[10px] text-slate-300 block">Per person</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">Top Spender</span>
            <div className="text-sm sm:text-base font-black text-white truncate">
              {topSpender?.name}
            </div>
            <span className="text-[10px] text-slate-300 block font-mono">
              {formatMoney(maxSpent, trip.currency)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-300 block">Biggest Bill</span>
            <div className="text-sm sm:text-base font-black text-white truncate">
              {biggestBill ? biggestBill.title : 'None yet'}
            </div>
            <span className="text-[10px] text-slate-300 block font-mono">
              {biggestBill ? formatMoney(biggestBill.amount, trip.currency) : '₹0'}
            </span>
          </div>
        </div>

        {/* Official Awards Hall of Fame */}
        <div className="space-y-3 relative z-10 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-2 text-amber-300">
              <Trophy className="h-4 w-4" />
              <span>Hall of Fame - Superlative Champions</span>
            </h3>
            <span className="text-[10px] text-purple-200">Official Group Votes</span>
          </div>

          {awardWinners.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center text-xs text-slate-300">
              No official winners crowned yet. Head to the <strong>Awards</strong> tab to vote!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {awardWinners.map((w) => (
                <div
                  key={w.awardTitle}
                  className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl p-1.5 rounded-xl bg-amber-400/20 border border-amber-300/30 shrink-0">
                      {w.icon}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-white truncate">{w.awardTitle}</h4>
                      <span className="text-[11px] font-bold text-amber-300 truncate block">
                        👑 {w.winnerName}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0">
                    {w.votes} {w.votes === 1 ? 'vote' : 'votes'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Friends Roster */}
        <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-purple-200 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white">Friends:</span>
            {trip.members.map((m) => (
              <span
                key={m.id}
                className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white"
              >
                {m.name}
              </span>
            ))}
          </div>

          <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
            <span>Memories forever</span>
          </div>
        </div>
      </div>
    </div>
  );
}
