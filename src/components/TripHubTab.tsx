'use strict';
'use client';

import React, { useState } from 'react';
import {
  Trip,
  Member,
  ItineraryDay,
  ItineraryActivity,
  TransportTicket,
  CabRentalLogistics,
  TripAward,
} from '@/types';
import {
  getDefaultItineraryDays,
  getDefaultTransportTickets,
  getDefaultCabLogistics,
  getDefaultAwards,
} from '@/lib/defaultHubData';
import { downloadTripAwardCertificate } from '@/lib/pdfReceipt';
import {
  Calendar,
  Car,
  Trophy,
  Navigation,
  CheckCircle2,
  Clock,
  CircleDot,
  Plus,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Edit2,
  Trash2,
  Award,
  UserCheck,
  X,
  Share2,
} from 'lucide-react';

interface TripHubTabProps {
  trip: Trip;
  currentMember: Member;
  isTripManager: boolean;
  onUpdateTrip: (updated: Trip) => void;
}

export function TripHubTab({
  trip,
  currentMember,
  isTripManager,
  onUpdateTrip,
}: TripHubTabProps) {
  // Active sub-tab inside Trip Hub
  const [activeSubTab, setActiveSubTab] = useState<'itinerary' | 'transport' | 'awards'>('itinerary');

  // Initialize data if not yet present
  const itineraryDays: ItineraryDay[] =
    trip.itineraryDays && trip.itineraryDays.length > 0
      ? trip.itineraryDays
      : getDefaultItineraryDays(trip.members);

  const transportTickets: TransportTicket[] =
    trip.transportTickets && trip.transportTickets.length > 0
      ? trip.transportTickets
      : getDefaultTransportTickets();

  const cabLogistics: CabRentalLogistics =
    trip.cabLogistics || getDefaultCabLogistics();

  const awards: TripAward[] =
    trip.awards && trip.awards.length > 0
      ? trip.awards
      : getDefaultAwards();

  // Active selected day in itinerary
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const currentDay = itineraryDays.find((d) => d.dayNumber === selectedDayNumber) || itineraryDays[0];

  // Email dispatch status
  const [emailStatus, setEmailStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // Modals state
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isEditCabOpen, setIsEditCabOpen] = useState(false);
  const [isAddAwardOpen, setIsAddAwardOpen] = useState(false);

  // Form states
  const [newActivityTime, setNewActivityTime] = useState('09:00 AM');
  const setNewActivityTimeWrapper = (val: string) => setNewActivityTime(val);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityLocation, setNewActivityLocation] = useState('');
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [newActivityLead, setNewActivityLead] = useState(currentMember.id);

  const [newDayTitle, setNewDayTitle] = useState('');
  const [newDayDate, setNewDayDate] = useState('');

  const [newTicketMode, setNewTicketMode] = useState<'train' | 'flight' | 'bus' | 'cab'>('train');
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketPnr, setNewTicketPnr] = useState('');
  const [newTicketDepStation, setNewTicketDepStation] = useState('');
  const [newTicketArrStation, setNewTicketArrStation] = useState('');
  const [newTicketDepTime, setNewTicketDepTime] = useState('');
  const [newTicketArrTime, setNewTicketArrTime] = useState('');
  const [newTicketSeats, setNewTicketSeats] = useState('');
  const [newTicketLiveUrl, setNewTicketLiveUrl] = useState('');

  const [cabForm, setCabForm] = useState<CabRentalLogistics>(cabLogistics);

  const [newAwardTitle, setNewAwardTitle] = useState('');
  const [newAwardIcon, setNewAwardIcon] = useState('🌟');
  const [newAwardDesc, setNewAwardDesc] = useState('');

  // Copy feedback state
  const [copiedPnrId, setCopiedPnrId] = useState<string | null>(null);

  const handleCopyPnr = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPnrId(id);
    setTimeout(() => setCopiedPnrId(null), 2000);
  };

  // ── Helper to save Hub updates ──
  const updateHubData = (updates: {
    itineraryDays?: ItineraryDay[];
    transportTickets?: TransportTicket[];
    cabLogistics?: CabRentalLogistics;
    awards?: TripAward[];
  }) => {
    const updatedTrip: Trip = {
      ...trip,
      itineraryDays: updates.itineraryDays !== undefined ? updates.itineraryDays : itineraryDays,
      transportTickets: updates.transportTickets !== undefined ? updates.transportTickets : transportTickets,
      cabLogistics: updates.cabLogistics !== undefined ? updates.cabLogistics : cabLogistics,
      awards: updates.awards !== undefined ? updates.awards : awards,
    };
    onUpdateTrip(updatedTrip);
  };

  // ── Activity Status Toggle (upcoming -> in_progress -> completed -> upcoming) ──
  const handleToggleActivityStatus = (dayNum: number, actId: string) => {
    const updatedDays = itineraryDays.map((d) => {
      if (d.dayNumber !== dayNum) return d;
      return {
        ...d,
        activities: d.activities.map((act) => {
          if (act.id !== actId) return act;
          const nextStatus: 'upcoming' | 'in_progress' | 'completed' =
            act.status === 'upcoming'
              ? 'in_progress'
              : act.status === 'in_progress'
              ? 'completed'
              : 'upcoming';
          return { ...act, status: nextStatus };
        }),
      };
    });
    updateHubData({ itineraryDays: updatedDays });
  };

  // ── Activity Lead Change ──
  const handleAssignLead = (dayNum: number, actId: string, leadId: string) => {
    const updatedDays = itineraryDays.map((d) => {
      if (d.dayNumber !== dayNum) return d;
      return {
        ...d,
        activities: d.activities.map((act) =>
          act.id === actId ? { ...act, leadMemberId: leadId } : act
        ),
      };
    });
    updateHubData({ itineraryDays: updatedDays });
  };

  // ── Delete Activity ──
  const handleDeleteActivity = (dayNum: number, actId: string) => {
    const updatedDays = itineraryDays.map((d) => {
      if (d.dayNumber !== dayNum) return d;
      return {
        ...d,
        activities: d.activities.filter((act) => act.id !== actId),
      };
    });
    updateHubData({ itineraryDays: updatedDays });
  };

  // ── Add Activity ──
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim() || !newActivityLocation.trim()) return;

    const newAct: ItineraryActivity = {
      id: `act-${Date.now()}`,
      time: newActivityTime.trim() || '10:00 AM',
      title: newActivityTitle.trim(),
      location: newActivityLocation.trim(),
      notes: newActivityNotes.trim() || undefined,
      status: 'upcoming',
      leadMemberId: newActivityLead,
    };

    const updatedDays = itineraryDays.map((d) => {
      if (d.dayNumber !== currentDay.dayNumber) return d;
      return {
        ...d,
        activities: [...d.activities, newAct],
      };
    });

    updateHubData({ itineraryDays: updatedDays });
    setNewActivityTitle('');
    setNewActivityLocation('');
    setNewActivityNotes('');
    setIsAddActivityOpen(false);
  };

  // ── Add Day ──
  const handleAddDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayTitle.trim()) return;

    const nextDayNum = itineraryDays.length + 1;
    const newDay: ItineraryDay = {
      dayNumber: nextDayNum,
      date: newDayDate.trim() || new Date().toISOString().split('T')[0],
      title: newDayTitle.trim(),
      activities: [],
    };

    const updated = [...itineraryDays, newDay];
    updateHubData({ itineraryDays: updated });
    setSelectedDayNumber(nextDayNum);
    setNewDayTitle('');
    setNewDayDate('');
    setIsAddDayOpen(false);
  };

  // ── Add Ticket ──
  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketDepStation.trim()) return;

    const newTicket: TransportTicket = {
      id: `tkt-${Date.now()}`,
      mode: newTicketMode,
      title: newTicketTitle.trim(),
      pnr: newTicketPnr.trim() || undefined,
      departureStation: newTicketDepStation.trim(),
      arrivalStation: newTicketArrStation.trim(),
      departureTime: newTicketDepTime.trim() || '08:00 AM',
      arrivalTime: newTicketArrTime.trim() || undefined,
      seatsOrBerths: newTicketSeats.trim() || 'General / Unreserved',
      liveStatusUrl: newTicketLiveUrl.trim() || undefined,
    };

    const updated = [...transportTickets, newTicket];
    updateHubData({ transportTickets: updated });
    setNewTicketTitle('');
    setNewTicketPnr('');
    setNewTicketDepStation('');
    setNewTicketArrStation('');
    setNewTicketDepTime('');
    setNewTicketArrTime('');
    setNewTicketSeats('');
    setNewTicketLiveUrl('');
    setIsAddTicketOpen(false);
  };

  // ── Delete Ticket ──
  const handleDeleteTicket = (ticketId: string) => {
    const updated = transportTickets.filter((t) => t.id !== ticketId);
    updateHubData({ transportTickets: updated });
  };

  // ── Save Cab Logistics ──
  const handleSaveCabLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    updateHubData({ cabLogistics: cabForm });
    setIsEditCabOpen(false);
  };

  // ── Voting on Awards ──
  const handleVote = (awardId: string, candidateId: string) => {
    const updatedAwards = awards.map((aw) => {
      if (aw.id !== awardId) return aw;
      const currentVotes = { ...(aw.votes || {}) };
      currentVotes[currentMember.id] = candidateId;
      return { ...aw, votes: currentVotes };
    });
    updateHubData({ awards: updatedAwards });
  };

  // ── Add Custom Award ──
  const handleAddAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAwardTitle.trim()) return;

    const newAw: TripAward = {
      id: `award-${Date.now()}`,
      title: newAwardTitle.trim(),
      icon: newAwardIcon.trim() || '🏆',
      description: newAwardDesc.trim() || 'Voted by fellow travelers.',
      votes: {},
    };

    const updated = [...awards, newAw];
    updateHubData({ awards: updated });
    setNewAwardTitle('');
    setNewAwardDesc('');
    setIsAddAwardOpen(false);
  };

  // ── Email Dispatch Handlers ──
  const handleSendEmail = async (type: 'itinerary' | 'transport' | 'awards') => {
    setEmailStatus({ loading: true });

    // Collect all recipient emails from trip members
    const recipients = trip.members
      .map((m) => m.email)
      .filter((e): e is string => Boolean(e && e.includes('@')));

    try {
      let payload: any = {
        hubType: type,
        tripName: trip.name,
        destination: trip.destination,
        recipients,
      };

      if (type === 'itinerary') {
        payload = {
          ...payload,
          dayNumber: currentDay.dayNumber,
          dayTitle: currentDay.title,
          date: currentDay.date,
          activities: currentDay.activities,
        };
      } else if (type === 'transport') {
        payload = {
          ...payload,
          tickets: transportTickets,
          cabLogistics,
        };
      } else if (type === 'awards') {
        const awardsSummary = awards.map((aw) => {
          const voteCounts: Record<string, number> = {};
          Object.values(aw.votes || {}).forEach((candId) => {
            voteCounts[candId] = (voteCounts[candId] || 0) + 1;
          });
          let maxVotes = 0;
          let winnerId = '';
          Object.entries(voteCounts).forEach(([candId, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              winnerId = candId;
            }
          });
          const winner = trip.members.find((m) => m.id === winnerId);
          return {
            title: aw.title,
            icon: aw.icon,
            winnerName: winner?.name || 'Nomination in progress',
            voteCount: maxVotes,
            description: aw.description,
          };
        });

        payload = {
          ...payload,
          awardsSummary,
        };
      }

      const res = await fetch('/api/send-hub-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setEmailStatus({
          loading: false,
          success: true,
          message: `Email successfully dispatched to ${data.recipientCount} group member(s)!`,
        });
      } else {
        setEmailStatus({
          loading: false,
          success: false,
          message: data.message || data.error || 'Failed to dispatch email. Please check credentials.',
        });
      }
    } catch (err: any) {
      setEmailStatus({
        loading: false,
        success: false,
        message: err.message || 'Network error while dispatching email.',
      });
    }

    setTimeout(() => {
      setEmailStatus({ loading: false });
    }, 4500);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── SUB-NAVIGATION PILLS (OPTIMIZED FOR MOBILE & DESKTOP) ── */}
      <div className="glass-card p-1.5 sm:p-2 rounded-2xl flex items-center justify-between gap-1 shadow-sm border border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('itinerary')}
          className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'itinerary'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate">📅 Day Itinerary</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transport')}
          className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'transport'
              ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Car className="h-4 w-4 shrink-0" />
          <span className="truncate">🚗 Transport & Logistics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('awards')}
          className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'awards'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="h-4 w-4 shrink-0" />
          <span className="truncate">🏆 Trip Awards</span>
        </button>
      </div>

      {/* ── EMAIL FEEDBACK BANNER ── */}
      {emailStatus.message && (
        <div
          className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between animate-fadeIn ${
            emailStatus.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {emailStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Mail className="h-4 w-4 shrink-0" />}
            <span>{emailStatus.message}</span>
          </div>
          <button
            onClick={() => setEmailStatus({ loading: false })}
            className="text-xs opacity-75 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-MODULE 1: DAY-BY-DAY INTERACTIVE ITINERARY ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'itinerary' && (
        <div className="space-y-4">
          {/* Day Selector Pills & Top Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Horizontal Swipeable Day Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {itineraryDays.map((d) => {
                const isSelected = d.dayNumber === currentDay.dayNumber;
                const completedCount = d.activities.filter((a) => a.status === 'completed').length;
                return (
                  <button
                    key={d.dayNumber}
                    onClick={() => setSelectedDayNumber(d.dayNumber)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/40'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <span>Day {d.dayNumber}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-emerald-700/80 text-emerald-100'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {completedCount}/{d.activities.length}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setIsAddDayOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 shrink-0 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Day</span>
              </button>
            </div>

            {/* Email Day Schedule Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={emailStatus.loading}
                onClick={() => handleSendEmail('itinerary')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-xs"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{emailStatus.loading ? 'Dispatching...' : 'Email Day Schedule'}</span>
              </button>

              <button
                onClick={() => setIsAddActivityOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>

          {/* Current Day Header Card */}
          <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Day {currentDay.dayNumber} Timeline
                  </span>
                  {currentDay.date && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      • {currentDay.date}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {currentDay.title}
                </h2>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {currentDay.activities.length} planned spots & activities
              </div>
            </div>
          </div>

          {/* Activities List */}
          {currentDay.activities.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center border border-dashed border-slate-300 dark:border-slate-700">
              <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No activities planned for Day {currentDay.dayNumber} yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Add sunrise spots, temple visits, food joints, or evening shows!
              </p>
              <button
                onClick={() => setIsAddActivityOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Activity</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDay.activities.map((act) => {
                const leadMember = trip.members.find((m) => m.id === act.leadMemberId);
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`;

                return (
                  <div
                    key={act.id}
                    className={`glass-card p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      act.status === 'completed'
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : act.status === 'in_progress'
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/25 dark:bg-amber-950/15 ring-1 ring-amber-400/30'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left: Time & Activity Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Time Badge */}
                          <div className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{act.time}</span>
                          </div>

                          {/* Status Toggle Button */}
                          <button
                            onClick={() => handleToggleActivityStatus(currentDay.dayNumber, act.id)}
                            title="Click to cycle status: Upcoming ➔ In Progress ➔ Completed"
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                              act.status === 'completed'
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : act.status === 'in_progress'
                                ? 'bg-amber-400 text-amber-950 animate-pulse'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                            }`}
                          >
                            {act.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                            {act.status === 'in_progress' && <CircleDot className="h-3 w-3 animate-spin" />}
                            {act.status === 'upcoming' && <Clock className="h-3 w-3" />}
                            <span className="capitalize">
                              {act.status === 'completed'
                                ? 'Completed ✅'
                                : act.status === 'in_progress'
                                ? 'In Progress ⏳'
                                : 'Upcoming'}
                            </span>
                          </button>
                        </div>

                        {/* Title & Location */}
                        <h3
                          className={`text-sm sm:text-base font-extrabold ${
                            act.status === 'completed'
                              ? 'text-slate-600 dark:text-slate-400 line-through'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {act.title}
                        </h3>

                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <span className="shrink-0">📍</span>
                          <span className="truncate">{act.location}</span>
                        </div>

                        {/* Notes / Dress Code / Reminder */}
                        {act.notes && (
                          <div className="text-xs bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                            💡 {act.notes}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions, Navigation & Lead Assignee */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-1 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800">
                        {/* 1-Click Google Maps Navigation Button */}
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          <span>Navigate</span>
                        </a>

                        {/* Lead Assignee Dropdown */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">
                            Lead:
                          </span>
                          <select
                            value={act.leadMemberId || ''}
                            onChange={(e) =>
                              handleAssignLead(currentDay.dayNumber, act.id, e.target.value)
                            }
                            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                          >
                            <option value="">No lead assigned</option>
                            {trip.members.map((m) => (
                              <option key={m.id} value={m.id}>
                                👤 {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Delete Activity Button */}
                        <button
                          onClick={() => handleDeleteActivity(currentDay.dayNumber, act.id)}
                          title="Remove activity"
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-MODULE 2: TRANSPORT & LOGISTICS HUB ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'transport' && (
        <div className="space-y-4">
          {/* Top Actions Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Transport & Commute Logistics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PNR status, berth & seat numbers, live rail/flight tracker, and cab rental
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={emailStatus.loading}
                onClick={() => handleSendEmail('transport')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors shadow-xs"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{emailStatus.loading ? 'Dispatching...' : 'Email Travel Details'}</span>
              </button>

              <button
                onClick={() => setIsAddTicketOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Ticket</span>
              </button>
            </div>
          </div>

          {/* Tickets Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {transportTickets.map((t) => {
              const isFlight = t.mode === 'flight';
              const isTrain = t.mode === 'train';

              return (
                <div
                  key={t.id}
                  className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 relative overflow-hidden"
                >
                  {/* Decorative top color bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isFlight
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500'
                        : isTrain
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}
                  />

                  {/* Header: Mode & Title */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{isFlight ? '✈️' : isTrain ? '🚆' : '🚌'}</span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                          {t.title}
                        </h3>
                      </div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-sky-600 dark:text-sky-400">
                        {t.mode}
                      </span>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteTicket(t.id)}
                      title="Delete ticket"
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* PNR Badge with 1-Click Copy */}
                  {t.pnr && (
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block leading-tight">
                          PNR / Booking Ref
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-slate-900 dark:text-white">
                          {t.pnr}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyPnr(t.id, t.pnr || '')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        {copiedPnrId === t.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Station & Timing Route */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/40 dark:border-slate-700/40 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>{t.departureStation}</span>
                      <span className="text-slate-400">➔</span>
                      <span>{t.arrivalStation}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Dep: {t.departureTime}</span>
                      {t.arrivalTime && <span>Arr: {t.arrivalTime}</span>}
                    </div>
                  </div>

                  {/* Seats & Berths */}
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 flex items-center gap-1.5">
                    <span>🪑</span>
                    <span className="truncate">{t.seatsOrBerths}</span>
                  </div>

                  {/* 1-Click Live Status Tracking Button */}
                  {t.liveStatusUrl && (
                    <a
                      href={t.liveStatusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Live Train / Flight Status ↗</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cab & Rental Logistics Section */}
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/15 dark:bg-amber-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚕</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Cab & Private Vehicle Rental Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Driver contact, vehicle number, and fuel/contract tracker
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setCabForm(cabLogistics);
                  setIsEditCabOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-amber-500 transition-colors shadow-xs"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {/* Vehicle & Plate */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Vehicle Model & Plate
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">
                  {cabLogistics.vehicleModel}
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {cabLogistics.plateNumber}
                </span>
              </div>

              {/* Driver & 1-Tap Call */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Driver Name & Contact
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">
                    {cabLogistics.driverName}
                  </span>
                </div>
                <a
                  href={`tel:${cabLogistics.driverPhone.replace(/\s+/g, '')}`}
                  className="mt-2 inline-flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  <span>Call {cabLogistics.driverPhone}</span>
                </a>
              </div>

              {/* Pickup Location & Time */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Pickup Location & Time
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5 truncate">
                  {cabLogistics.pickupLocation}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  ⏰ {cabLogistics.pickupTime}
                </span>
              </div>

              {/* Contract & Fuel Reading Notes */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Contract / Fuel Notes
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 block mt-0.5 line-clamp-3">
                  {cabLogistics.notes || 'No special terms noted.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-MODULE 3: TRIP AWARDS & SUPERLATIVES ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'awards' && (
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Trip Awards & Superlatives
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Democratic Voting
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vote for funny titles, see live leaderboards, and download official honor certificates!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={emailStatus.loading}
                onClick={() => handleSendEmail('awards')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{emailStatus.loading ? 'Dispatching...' : 'Email Awards to Friends'}</span>
              </button>

              <button
                onClick={() => setIsAddAwardOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Award</span>
              </button>
            </div>
          </div>

          {/* Awards Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {awards.map((aw) => {
              // Calculate vote tallies
              const voteCounts: Record<string, number> = {};
              const totalVotes = Object.keys(aw.votes || {}).length;

              Object.values(aw.votes || {}).forEach((candId) => {
                voteCounts[candId] = (voteCounts[candId] || 0) + 1;
              });

              // Find current winner/leader
              let leaderId = '';
              let maxVotes = 0;
              Object.entries(voteCounts).forEach(([candId, count]) => {
                if (count > maxVotes) {
                  maxVotes = count;
                  leaderId = candId;
                }
              });

              const leaderMember = trip.members.find((m) => m.id === leaderId);
              const myVoteCandidateId = aw.votes?.[currentMember.id];
              const myVoteMember = trip.members.find((m) => m.id === myVoteCandidateId);

              return (
                <div
                  key={aw.id}
                  className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5"
                >
                  {/* Top Bar: Icon, Title & Leader Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="text-2xl sm:text-3xl p-2 rounded-2xl bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center shrink-0">
                        {aw.icon}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {aw.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          "{aw.description}"
                        </p>
                      </div>
                    </div>

                    {/* Current Leader Badge */}
                    {leaderMember ? (
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-400/90 text-amber-950 shadow-xs">
                          👑 {leaderMember.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {maxVotes} vote{maxVotes === 1 ? '' : 's'} ({totalVotes > 0 ? Math.round((maxVotes / totalVotes) * 100) : 0}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                        Awaiting votes
                      </span>
                    )}
                  </div>

                  {/* Live Vote Progress Bars for Top Nominees */}
                  {totalVotes > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Live Standings ({totalVotes} total votes)
                      </span>
                      {Object.entries(voteCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([candId, count]) => {
                          const candMember = trip.members.find((m) => m.id === candId);
                          const pct = Math.round((count / totalVotes) * 100);
                          return (
                            <div key={candId} className="space-y-0.5">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <span className="flex items-center gap-1">
                                  <span>{candMember?.name || 'Friend'}</span>
                                  {candId === myVoteCandidateId && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                                      (Your vote)
                                    </span>
                                  )}
                                </span>
                                <span className="text-slate-500 font-mono text-[11px]">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Voting Picker Row */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Cast your vote:
                      </span>
                      <select
                        value={myVoteCandidateId || ''}
                        onChange={(e) => handleVote(aw.id, e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                      >
                        <option value="">Choose a friend...</option>
                        {trip.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Download Certificate PDF Button */}
                    <button
                      onClick={() => {
                        const winnerToHonor = leaderMember || trip.members[0];
                        downloadTripAwardCertificate(
                          trip,
                          aw.title,
                          aw.icon,
                          winnerToHonor.name,
                          aw.description,
                          maxVotes || 1,
                          totalVotes || 1
                        );
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs shrink-0"
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>Download Certificate (PDF)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MODALS (ADD ACTIVITY, ADD DAY, ADD TICKET, EDIT CAB, ADD AWARD) ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}

      {/* Modal: Add Activity */}
      {isAddActivityOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-500" />
                <span>Add Activity to Day {currentDay.dayNumber}</span>
              </h3>
              <button
                onClick={() => setIsAddActivityOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Time (e.g. 07:00 AM, 02:30 PM) *
                </label>
                <input
                  type="text"
                  required
                  value={newActivityTime}
                  onChange={(e) => setNewActivityTime(e.target.value)}
                  placeholder="07:00 AM"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  required
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                  placeholder="Sunrise at Golden Beach / Temple Darshan"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Location (for 1-Click Google Maps Navigation) *
                </label>
                <input
                  type="text"
                  required
                  value={newActivityLocation}
                  onChange={(e) => setNewActivityLocation(e.target.value)}
                  placeholder="Golden Beach, Puri / Konark Sun Temple"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lead Friend In Charge
                </label>
                <select
                  value={newActivityLead}
                  onChange={(e) => setNewActivityLead(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {trip.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / Reminders (Optional)
                </label>
                <input
                  type="text"
                  value={newActivityNotes}
                  onChange={(e) => setNewActivityNotes(e.target.value)}
                  placeholder="Traditional dress code, buy entry tickets online, etc."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Day */}
      {isAddDayOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Add Day {itineraryDays.length + 1}
              </h3>
              <button
                onClick={() => setIsAddDayOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDay} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Day Title / Focus *
                </label>
                <input
                  type="text"
                  required
                  value={newDayTitle}
                  onChange={(e) => setNewDayTitle(e.target.value)}
                  placeholder="e.g. Chilika Dolphins & Seafood Safari"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date (Optional)
                </label>
                <input
                  type="date"
                  value={newDayDate}
                  onChange={(e) => setNewDayDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDayOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Create Day
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Transport Ticket */}
      {isAddTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="h-4 w-4 text-sky-500" />
                <span>Add Travel Ticket / Reservation</span>
              </h3>
              <button
                onClick={() => setIsAddTicketOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTicket} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mode of Travel *
                  </label>
                  <select
                    value={newTicketMode}
                    onChange={(e: any) => setNewTicketMode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="train">🚆 Train</option>
                    <option value="flight">✈️ Flight</option>
                    <option value="bus">🚌 Bus</option>
                    <option value="cab">🚕 Cab</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    PNR / Ref #
                  </label>
                  <input
                    type="text"
                    value={newTicketPnr}
                    onChange={(e) => setNewTicketPnr(e.target.value)}
                    placeholder="245-8971203 / W8Q4KZ"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Carrier / Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="Purushottam Express / IndiGo 6E-5212"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Departure Station *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTicketDepStation}
                    onChange={(e) => setNewTicketDepStation(e.target.value)}
                    placeholder="KGP / NDLS / BBI"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Arrival Station *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTicketArrStation}
                    onChange={(e) => setNewTicketArrStation(e.target.value)}
                    placeholder="PURI / DEL"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Departure Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTicketDepTime}
                    onChange={(e) => setNewTicketDepTime(e.target.value)}
                    placeholder="06:15 AM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Arrival Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTicketArrTime}
                    onChange={(e) => setNewTicketArrTime(e.target.value)}
                    placeholder="01:45 PM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Seats / Berths (e.g. Coach B3, Berths 21, 22, 23) *
                </label>
                <input
                  type="text"
                  required
                  value={newTicketSeats}
                  onChange={(e) => setNewTicketSeats(e.target.value)}
                  placeholder="Coach B3, Berths 21, 22, 23"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Official Live Tracking Link (Optional)
                </label>
                <input
                  type="url"
                  value={newTicketLiveUrl}
                  onChange={(e) => setNewTicketLiveUrl(e.target.value)}
                  placeholder="https://www.railyatri.in/... / https://goindigo.in/..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTicketOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Save Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Cab Rental Logistics */}
      {isEditCabOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-500" />
                <span>Edit Cab & Rental Logistics</span>
              </h3>
              <button
                onClick={() => setIsEditCabOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCabLogistics} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Vehicle Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={cabForm.vehicleModel}
                    onChange={(e) => setCabForm({ ...cabForm, vehicleModel: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Plate Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={cabForm.plateNumber}
                    onChange={(e) => setCabForm({ ...cabForm, plateNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={cabForm.driverName}
                    onChange={(e) => setCabForm({ ...cabForm, driverName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Driver Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={cabForm.driverPhone}
                    onChange={(e) => setCabForm({ ...cabForm, driverPhone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pickup Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={cabForm.pickupLocation}
                    onChange={(e) => setCabForm({ ...cabForm, pickupLocation: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pickup Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={cabForm.pickupTime}
                    onChange={(e) => setCabForm({ ...cabForm, pickupTime: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Contract / Fuel Notes (Odometer, daily allowance)
                </label>
                <textarea
                  rows={2}
                  value={cabForm.notes || ''}
                  onChange={(e) => setCabForm({ ...cabForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditCabOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Save Logistics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Award */}
      {isAddAwardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Propose Trip Award</span>
              </h3>
              <button
                onClick={() => setIsAddAwardOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAward} className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Icon
                  </label>
                  <input
                    type="text"
                    value={newAwardIcon}
                    onChange={(e) => setNewAwardIcon(e.target.value)}
                    className="w-full text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-base outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Award Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAwardTitle}
                    onChange={(e) => setNewAwardTitle(e.target.value)}
                    placeholder="e.g. Master Chai Drinker"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Funny Citation *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newAwardDesc}
                  onChange={(e) => setNewAwardDesc(e.target.value)}
                  placeholder="Had 8 cups of tea every single day and stopped at every roadside stall."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAwardOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Add Award
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
