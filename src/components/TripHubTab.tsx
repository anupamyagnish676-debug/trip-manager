'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import {
  Trip,
  Member,
  ItineraryDay,
  ItineraryActivity,
  TransportTicket,
  CabRentalLogistics,
  TripAward,
} from '@/types';
import { getDefaultAwards } from '@/lib/defaultHubData';
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
  X,
  RotateCcw,
  FileText,
  Upload,
} from 'lucide-react';

interface TripHubTabProps {
  trip: Trip;
  currentMember: Member;
  isTripManager: boolean;
  onUpdateTrip: (updated: Trip) => void;
}

/**
 * Smart helper to extract clean location text and valid navigation URL
 * even if the user pasted a raw Google Search or Maps URL.
 */
function formatLocationDisplay(loc: string): { display: string; url: string } {
  if (!loc) return { display: 'Location not specified', url: '' };
  const trimmed = loc.trim();
  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');

  if (isUrl) {
    try {
      const urlObj = new URL(trimmed);
      const q =
        urlObj.searchParams.get('q') ||
        urlObj.searchParams.get('query') ||
        urlObj.searchParams.get('destination');
      if (q) {
        return { display: decodeURIComponent(q), url: trimmed };
      }
      return { display: 'Saved Map Link ↗', url: trimmed };
    } catch {
      return { display: 'Saved Map Link ↗', url: trimmed };
    }
  }

  return {
    display: trimmed,
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`,
  };
}

export function TripHubTab({
  trip,
  currentMember,
  isTripManager,
  onUpdateTrip,
}: TripHubTabProps) {
  // Active sub-tab inside Trip Hub
  const [activeSubTab, setActiveSubTab] = useState<'itinerary' | 'transport' | 'awards'>('itinerary');

  // Filter out any dummy preseeded info so the user starts with clean data
  const DUMMY_IDS = new Set([
    'act-1-1', 'act-1-2', 'act-1-3', 'act-1-4',
    'act-2-1', 'act-2-2', 'act-2-3',
    'act-3-1', 'act-3-2', 'act-3-3',
  ]);
  const rawDays = trip.itineraryDays || [];
  const hasDummyPreseedDays = rawDays.some((d) =>
    d.activities?.some((a) => DUMMY_IDS.has(a.id))
  );
  const itineraryDays: ItineraryDay[] = hasDummyPreseedDays ? [] : rawDays;

  const rawTickets = trip.transportTickets || [];
  const hasDummyTickets = rawTickets.some((t) => t.id === 'ticket-1' || t.id === 'ticket-2');
  const transportTickets: TransportTicket[] = hasDummyTickets ? [] : rawTickets;

  const rawCab = trip.cabLogistics;
  const hasDummyCab = rawCab?.plateNumber === 'OD 02 AB 1234' && rawCab?.driverName === 'Ramesh Pradhan';
  const cabLogistics: CabRentalLogistics | null = hasDummyCab ? null : (rawCab || null);

  const awards: TripAward[] =
    trip.awards && trip.awards.length > 0
      ? trip.awards
      : getDefaultAwards();

  // Active selected day in itinerary
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const currentDay = itineraryDays.find((d) => d.dayNumber === selectedDayNumber) || itineraryDays[0] || null;

  // Automatically sync cleaned data if dummy was detected
  useEffect(() => {
    if (hasDummyPreseedDays || hasDummyTickets || hasDummyCab) {
      const cleanedTrip: Trip = {
        ...trip,
        itineraryDays: hasDummyPreseedDays ? [] : trip.itineraryDays,
        transportTickets: hasDummyTickets ? [] : trip.transportTickets,
        cabLogistics: hasDummyCab ? undefined : trip.cabLogistics,
      };
      onUpdateTrip(cleanedTrip);
    }
  }, [hasDummyPreseedDays, hasDummyTickets, hasDummyCab]);

  // Email dispatch status
  const [emailStatus, setEmailStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // ── Modals State ──
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [isEditDayOpen, setIsEditDayOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ dayNumber: number; activity: ItineraryActivity } | null>(null);

  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TransportTicket | null>(null);

  const [isEditCabOpen, setIsEditCabOpen] = useState(false);
  const [isAddAwardOpen, setIsAddAwardOpen] = useState(false);

  // ── Form States: Activity ──
  const [newActivityTime, setNewActivityTime] = useState('09:00 AM');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityLocation, setNewActivityLocation] = useState('');
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [newActivityLead, setNewActivityLead] = useState(currentMember.id);

  // Edit Activity form
  const [editActTime, setEditActTime] = useState('');
  const [editActTitle, setEditActTitle] = useState('');
  const [editActLocation, setEditActLocation] = useState('');
  const [editActNotes, setEditActNotes] = useState('');
  const [editActLead, setEditActLead] = useState('');
  const [editActStatus, setEditActStatus] = useState<'upcoming' | 'in_progress' | 'completed'>('upcoming');

  // ── Form States: Day ──
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newDayDate, setNewDayDate] = useState('');

  const [editDayTitle, setEditDayTitle] = useState('');
  const [editDayDate, setEditDayDate] = useState('');

  // ── Form States: Ticket ──
  const [newTicketMode, setNewTicketMode] = useState<'train' | 'flight' | 'bus' | 'cab'>('train');
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketPnr, setNewTicketPnr] = useState('');
  const [newTicketDepStation, setNewTicketDepStation] = useState('');
  const [newTicketArrStation, setNewTicketArrStation] = useState('');
  const [newTicketDepTime, setNewTicketDepTime] = useState('');
  const [newTicketArrTime, setNewTicketArrTime] = useState('');
  const [newTicketSeats, setNewTicketSeats] = useState('');
  const [newTicketLiveUrl, setNewTicketLiveUrl] = useState('');
  const [newTicketPdfUrl, setNewTicketPdfUrl] = useState<string | undefined>(undefined);
  const [newTicketPdfName, setNewTicketPdfName] = useState<string | undefined>(undefined);

  // Edit Ticket form
  const [editTicketMode, setEditTicketMode] = useState<'train' | 'flight' | 'bus' | 'cab'>('train');
  const [editTicketTitle, setEditTicketTitle] = useState('');
  const [editTicketPnr, setEditTicketPnr] = useState('');
  const [editTicketDepStation, setEditTicketDepStation] = useState('');
  const [editTicketArrStation, setEditTicketArrStation] = useState('');
  const [editTicketDepTime, setEditTicketDepTime] = useState('');
  const [editTicketArrTime, setEditTicketArrTime] = useState('');
  const [editTicketSeats, setEditTicketSeats] = useState('');
  const [editTicketLiveUrl, setEditTicketLiveUrl] = useState('');
  const [editTicketPdfUrl, setEditTicketPdfUrl] = useState<string | undefined>(undefined);
  const [editTicketPdfName, setEditTicketPdfName] = useState<string | undefined>(undefined);

  // ── Form States: Cab ──
  const [cabForm, setCabForm] = useState<CabRentalLogistics>(
    cabLogistics || {
      vehicleModel: '',
      plateNumber: '',
      driverName: '',
      driverPhone: '',
      pickupLocation: '',
      pickupTime: '',
      notes: '',
    }
  );

  // ── Form States: Awards ──
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

  // Helper to save Hub updates
  const updateHubData = (updates: {
    itineraryDays?: ItineraryDay[];
    transportTickets?: TransportTicket[];
    cabLogistics?: CabRentalLogistics | null;
    awards?: TripAward[];
  }) => {
    const updatedTrip: Trip = {
      ...trip,
      itineraryDays: updates.itineraryDays !== undefined ? updates.itineraryDays : itineraryDays,
      transportTickets: updates.transportTickets !== undefined ? updates.transportTickets : transportTickets,
      cabLogistics: updates.cabLogistics !== undefined ? (updates.cabLogistics || undefined) : (cabLogistics || undefined),
      awards: updates.awards !== undefined ? updates.awards : awards,
    };
    onUpdateTrip(updatedTrip);
  };

  // ── Helper to handle Ticket PDF file upload ──
  const handlePdfUpload = (file: File, isEdit: boolean) => {
    if (file.size > 6 * 1024 * 1024) {
      alert('Ticket document must be smaller than 6MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (isEdit) {
        setEditTicketPdfUrl(dataUrl);
        setEditTicketPdfName(file.name);
      } else {
        setNewTicketPdfUrl(dataUrl);
        setNewTicketPdfName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Activity Status Toggle ──
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
    if (!confirm('Are you sure you want to delete this activity?')) return;
    const updatedDays = itineraryDays.map((d) => {
      if (d.dayNumber !== dayNum) return d;
      return {
        ...d,
        activities: d.activities.filter((act) => act.id !== actId),
      };
    });
    updateHubData({ itineraryDays: updatedDays });
  };

  // ── Open Edit Activity Modal ──
  const handleOpenEditActivity = (dayNum: number, act: ItineraryActivity) => {
    setEditingActivity({ dayNumber: dayNum, activity: act });
    setEditActTime(act.time);
    setEditActTitle(act.title);
    setEditActLocation(act.location);
    setEditActNotes(act.notes || '');
    setEditActLead(act.leadMemberId || '');
    setEditActStatus(act.status);
  };

  // ── Save Edited Activity ──
  const handleSaveEditActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    if (!editActTitle.trim() || !editActLocation.trim()) return;

    const updatedDays = itineraryDays.map((d) => {
      if (d.dayNumber !== editingActivity.dayNumber) return d;
      return {
        ...d,
        activities: d.activities.map((act) => {
          if (act.id !== editingActivity.activity.id) return act;
          return {
            ...act,
            time: editActTime.trim() || '10:00 AM',
            title: editActTitle.trim(),
            location: editActLocation.trim(),
            notes: editActNotes.trim() || undefined,
            leadMemberId: editActLead || undefined,
            status: editActStatus,
          };
        }),
      };
    });

    updateHubData({ itineraryDays: updatedDays });
    setEditingActivity(null);
  };

  // ── Add Activity ──
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDay) return;
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

    const nextDayNum = itineraryDays.length > 0 ? Math.max(...itineraryDays.map((d) => d.dayNumber)) + 1 : 1;
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

  // ── Open Edit Day Modal ──
  const handleOpenEditDay = () => {
    if (!currentDay) return;
    setEditDayTitle(currentDay.title);
    setEditDayDate(currentDay.date || '');
    setIsEditDayOpen(true);
  };

  // ── Save Edited Day ──
  const handleSaveEditDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDay) return;
    if (!editDayTitle.trim()) return;

    const updatedDays = itineraryDays.map((d) => {
      if (d.dayNumber !== currentDay.dayNumber) return d;
      return {
        ...d,
        title: editDayTitle.trim(),
        date: editDayDate.trim() || d.date,
      };
    });

    updateHubData({ itineraryDays: updatedDays });
    setIsEditDayOpen(false);
  };

  // ── Delete Entire Day ──
  const handleDeleteDay = (dayNum: number) => {
    if (!confirm(`Delete Day ${dayNum} and all its activities?`)) return;
    const remaining = itineraryDays.filter((d) => d.dayNumber !== dayNum);
    const renumbered = remaining.map((d, index) => ({
      ...d,
      dayNumber: index + 1,
    }));
    updateHubData({ itineraryDays: renumbered });
    setSelectedDayNumber(1);
  };

  // ── Clear All Itinerary (Reset) ──
  const handleClearAllItinerary = () => {
    if (!confirm('Are you sure you want to clear all itinerary days and activities? You can enter everything fresh.')) return;
    updateHubData({ itineraryDays: [] });
    setSelectedDayNumber(1);
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
      seatsOrBerths: newTicketSeats.trim() || 'General',
      liveStatusUrl: newTicketLiveUrl.trim() || undefined,
      ticketPdfUrl: newTicketPdfUrl,
      ticketPdfName: newTicketPdfName,
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
    setNewTicketPdfUrl(undefined);
    setNewTicketPdfName(undefined);
    setIsAddTicketOpen(false);
  };

  // ── Open Edit Ticket Modal ──
  const handleOpenEditTicket = (t: TransportTicket) => {
    setEditingTicket(t);
    setEditTicketMode(t.mode);
    setEditTicketTitle(t.title);
    setEditTicketPnr(t.pnr || '');
    setEditTicketDepStation(t.departureStation);
    setEditTicketArrStation(t.arrivalStation);
    setEditTicketDepTime(t.departureTime);
    setEditTicketArrTime(t.arrivalTime || '');
    setEditTicketSeats(t.seatsOrBerths);
    setEditTicketLiveUrl(t.liveStatusUrl || '');
    setEditTicketPdfUrl(t.ticketPdfUrl);
    setEditTicketPdfName(t.ticketPdfName);
  };

  // ── Save Edited Ticket ──
  const handleSaveEditTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    if (!editTicketTitle.trim() || !editTicketDepStation.trim()) return;

    const updated = transportTickets.map((t) => {
      if (t.id !== editingTicket.id) return t;
      return {
        ...t,
        mode: editTicketMode,
        title: editTicketTitle.trim(),
        pnr: editTicketPnr.trim() || undefined,
        departureStation: editTicketDepStation.trim(),
        arrivalStation: editTicketArrStation.trim(),
        departureTime: editTicketDepTime.trim() || '08:00 AM',
        arrivalTime: editTicketArrTime.trim() || undefined,
        seatsOrBerths: editTicketSeats.trim() || 'General',
        liveStatusUrl: editTicketLiveUrl.trim() || undefined,
        ticketPdfUrl: editTicketPdfUrl,
        ticketPdfName: editTicketPdfName,
      };
    });

    updateHubData({ transportTickets: updated });
    setEditingTicket(null);
  };

  // ── Delete Ticket ──
  const handleDeleteTicket = (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this travel ticket?')) return;
    const updated = transportTickets.filter((t) => t.id !== ticketId);
    updateHubData({ transportTickets: updated });
  };

  // ── Save Cab Logistics ──
  const handleSaveCabLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    updateHubData({ cabLogistics: cabForm });
    setIsEditCabOpen(false);
  };

  // ── Delete Cab Logistics ──
  const handleDeleteCabLogistics = () => {
    if (!confirm('Delete cab and rental driver details?')) return;
    updateHubData({ cabLogistics: null });
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

  // ── Delete Award ──
  const handleDeleteAward = (awardId: string) => {
    if (!confirm('Are you sure you want to delete this award category?')) return;
    const updated = awards.filter((aw) => aw.id !== awardId);
    updateHubData({ awards: updated });
  };

  // ── Email Dispatch Handlers ──
  const handleSendEmail = async (type: 'itinerary' | 'transport' | 'awards') => {
    setEmailStatus({ loading: true });

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
        if (!currentDay) {
          setEmailStatus({ loading: false, success: false, message: 'No day selected to email.' });
          return;
        }
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
          cabLogistics: cabLogistics || undefined,
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
    <div className="space-y-4 pb-12 sm:pb-6">
      {/* ── TOP SEGMENTED SUB-NAVIGATION ── */}
      <div className="glass-card p-1 sm:p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-xs border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('itinerary')}
          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all touch-manipulation min-h-[42px] ${
            activeSubTab === 'itinerary'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span>📅 Itinerary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('transport')}
          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all touch-manipulation min-h-[42px] ${
            activeSubTab === 'transport'
              ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Car className="h-4 w-4 shrink-0" />
          <span>🚗 Commute</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('awards')}
          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all touch-manipulation min-h-[42px] ${
            activeSubTab === 'awards'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="h-4 w-4 shrink-0" />
          <span>🏆 Awards</span>
        </button>
      </div>

      {/* ── EMAIL FEEDBACK BANNER ── */}
      {emailStatus.message && (
        <div
          className={`p-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between animate-fadeIn ${
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
            className="text-xs opacity-75 hover:opacity-100 ml-2 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-MODULE 1: DAY-BY-DAY INTERACTIVE ITINERARY ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'itinerary' && (
        <div className="space-y-3.5">
          {/* Day Selector Pills Bar */}
          {itineraryDays.length > 0 && (
            <div className="space-y-2">
              {/* Swipeable Day Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-0.5">
                {itineraryDays.map((d) => {
                  const isSelected = currentDay && d.dayNumber === currentDay.dayNumber;
                  const completedCount = d.activities.filter((a) => a.status === 'completed').length;
                  return (
                    <button
                      key={d.dayNumber}
                      type="button"
                      onClick={() => setSelectedDayNumber(d.dayNumber)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 touch-manipulation min-h-[38px] ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                          : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="font-extrabold tracking-tight">Day {d.dayNumber}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          isSelected
                            ? 'bg-emerald-700/90 text-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {completedCount} / {d.activities.length}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsAddDayOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-dashed border-emerald-300 dark:border-emerald-700 shrink-0 touch-manipulation min-h-[38px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Day</span>
                </button>
              </div>

              {/* Action Buttons Row on Mobile */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all min-h-[42px] touch-manipulation"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Activity</span>
                </button>

                <button
                  type="button"
                  disabled={emailStatus.loading}
                  onClick={() => handleSendEmail('itinerary')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 min-h-[42px] touch-manipulation"
                >
                  <Mail className="h-4 w-4 text-emerald-500" />
                  <span className="hidden sm:inline">Email Schedule</span>
                </button>

                {currentDay && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDay(currentDay.dayNumber)}
                    title="Delete this entire day"
                    className="flex items-center justify-center p-2.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 min-h-[42px] touch-manipulation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Current Day Header Card with Edit & Delete Day Buttons */}
          {currentDay && (
            <div className="glass-card p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Day {currentDay.dayNumber} Timeline
                    </span>
                    {currentDay.date && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        • {currentDay.date}
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 truncate">
                    {currentDay.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Edit Day Button */}
                  <button
                    type="button"
                    onClick={handleOpenEditDay}
                    title="Edit day title and date"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clean State: If No Days Exist */}
          {itineraryDays.length === 0 ? (
            <div className="glass-card p-6 sm:p-8 rounded-3xl text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl shadow-xs">
                📅
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Your Itinerary is Clean & Ready
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Start fresh! Create Day 1 to plan morning, afternoon, and evening timelines with 1-click Google Maps navigation and friend assignees.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDayOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 touch-manipulation min-h-[42px]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Day 1</span>
              </button>
            </div>
          ) : currentDay && currentDay.activities.length === 0 ? (
            /* Empty State for a created day without activities */
            <div className="glass-card p-6 rounded-2xl text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No activities entered for Day {currentDay.dayNumber} yet
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tap the button below to add your first planned spot, darshan, meal, or evening spot.
              </p>
              <button
                type="button"
                onClick={() => setIsAddActivityOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 touch-manipulation min-h-[40px]"
              >
                <Plus className="h-4 w-4" />
                <span>Add Activity to Day {currentDay.dayNumber}</span>
              </button>
            </div>
          ) : currentDay ? (
            /* Activities Cards List (Mobile-Optimized Architecture with Edit Option) */
            <div className="space-y-3">
              {currentDay.activities.map((act) => {
                const locInfo = formatLocationDisplay(act.location);

                return (
                  <div
                    key={act.id}
                    className={`glass-card p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 ${
                      act.status === 'completed'
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/15 dark:bg-emerald-950/10'
                        : act.status === 'in_progress'
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/15 ring-1 ring-amber-400/25'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    {/* Top Row: Time, Status Toggle & Action Buttons (Edit + Delete) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Time Badge */}
                        <div className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{act.time}</span>
                        </div>

                        {/* Interactive Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleActivityStatus(currentDay.dayNumber, act.id)}
                          title="Click to cycle: Upcoming ➔ In Progress ➔ Completed"
                          className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-all touch-manipulation ${
                            act.status === 'completed'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : act.status === 'in_progress'
                              ? 'bg-amber-400 text-amber-950 animate-pulse font-black'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {act.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                          {act.status === 'in_progress' && <CircleDot className="h-3 w-3 animate-spin" />}
                          {act.status === 'upcoming' && <Clock className="h-3 w-3" />}
                          <span>
                            {act.status === 'completed'
                              ? 'Completed ✅'
                              : act.status === 'in_progress'
                              ? 'In Progress ⏳'
                              : 'Upcoming'}
                          </span>
                        </button>
                      </div>

                      {/* Action Buttons: Edit and Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Edit Activity Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditActivity(currentDay.dayNumber, act)}
                          title="Edit activity details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors touch-manipulation"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {/* Delete Activity Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(currentDay.dayNumber, act.id)}
                          title="Delete this activity"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors touch-manipulation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Title & Location */}
                    <div>
                      <h3
                        className={`text-sm sm:text-base font-black ${
                          act.status === 'completed'
                            ? 'text-slate-500 dark:text-slate-400 line-through'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {act.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                        <span className="shrink-0 text-emerald-500">📍</span>
                        <span className="truncate">{locInfo.display}</span>
                      </p>
                    </div>

                    {/* Notes Box (If provided) */}
                    {act.notes && (
                      <div className="text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
                        💡 {act.notes}
                      </div>
                    )}

                    {/* Bottom Action Bar: Google Maps Navigation & Lead Picker */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 1-Click Google Maps Navigation Button */}
                      <a
                        href={locInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors min-h-[38px] touch-manipulation"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Navigate in Maps ↗</span>
                      </a>

                      {/* Lead Friend Picker */}
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 min-h-[38px]">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          👤 Lead:
                        </span>
                        <select
                          value={act.leadMemberId || ''}
                          onChange={(e) =>
                            handleAssignLead(currentDay.dayNumber, act.id, e.target.value)
                          }
                          className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-bold outline-none cursor-pointer w-full truncate"
                        >
                          <option value="">No lead assigned</option>
                          {trip.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Reset / Clear Entire Itinerary Button */}
          {itineraryDays.length > 0 && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={handleClearAllItinerary}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors py-1.5 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear All Days & Start Fresh</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-MODULE 2: TRANSPORT & LOGISTICS HUB ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'transport' && (
        <div className="space-y-4">
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Transport & Commute Hub
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keep all train/flight tickets, berths, driver contacts & ticket PDFs in one tap
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={emailStatus.loading}
                onClick={() => handleSendEmail('transport')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 min-h-[38px] touch-manipulation"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Email Travel Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewTicketPdfUrl(undefined);
                  setNewTicketPdfName(undefined);
                  setIsAddTicketOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-sky-600 text-white hover:bg-sky-700 min-h-[38px] touch-manipulation shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Ticket</span>
              </button>
            </div>
          </div>

          {/* Empty State for Tickets */}
          {transportTickets.length === 0 && (
            <div className="glass-card p-6 rounded-2xl text-center border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No tickets or PNR reservations added yet
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Add your group flight, train, or bus tickets so everyone has coach/berth numbers and official ticket PDFs ready.
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewTicketPdfUrl(undefined);
                  setNewTicketPdfName(undefined);
                  setIsAddTicketOpen(true);
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white min-h-[38px] touch-manipulation"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Ticket</span>
              </button>
            </div>
          )}

          {/* Tickets Cards Grid */}
          {transportTickets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {transportTickets.map((t) => {
                const isFlight = t.mode === 'flight';
                const isTrain = t.mode === 'train';

                return (
                  <div
                    key={t.id}
                    className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 relative overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        isFlight
                          ? 'bg-gradient-to-r from-sky-500 to-indigo-500'
                          : isTrain
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                    />

                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{isFlight ? '✈️' : isTrain ? '🚆' : '🚌'}</span>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            {t.title}
                          </h3>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-600 dark:text-sky-400">
                          {t.mode}
                        </span>
                      </div>

                      {/* Edit and Delete Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTicket(t)}
                          title="Edit ticket details"
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(t.id)}
                          title="Delete ticket"
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {t.pnr && (
                      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                            PNR / Booking Ref
                          </span>
                          <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-slate-900 dark:text-white">
                            {t.pnr}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPnr(t.id, t.pnr || '')}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs"
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

                    <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-700/40 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>{t.departureStation}</span>
                        <span className="text-slate-400">➔</span>
                        <span>{t.arrivalStation}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>Dep: {t.departureTime}</span>
                        {t.arrivalTime && <span>Arr: {t.arrivalTime}</span>}
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 flex items-center gap-1.5">
                      <span>🪑</span>
                      <span className="truncate">{t.seatsOrBerths}</span>
                    </div>

                    {/* View / Download Ticket PDF Option */}
                    {t.ticketPdfUrl && (
                      <a
                        href={t.ticketPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={t.ticketPdfName || 'Ticket.pdf'}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-colors min-h-[38px] touch-manipulation shadow-xs"
                      >
                        <FileText className="h-4 w-4" />
                        <span>View / Download Ticket PDF ({t.ticketPdfName || 'PDF'})</span>
                      </a>
                    )}

                    {t.liveStatusUrl && (
                      <a
                        href={t.liveStatusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black bg-sky-600 hover:bg-sky-700 text-white transition-colors min-h-[38px] touch-manipulation"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Live Tracking Status ↗</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cab & Rental Logistics Section */}
          <div className="glass-card p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/15 dark:bg-amber-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚕</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Cab & Private Vehicle Rental
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Driver contacts, pickup timings, and vehicle plates
                  </p>
                </div>
              </div>

              {cabLogistics ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCabForm(cabLogistics);
                      setIsEditCabOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCabLogistics}
                    title="Delete cab details"
                    className="p-1.5 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditCabOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Cab</span>
                </button>
              )}
            </div>

            {cabLogistics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
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

                <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                      Driver
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">
                      {cabLogistics.driverName}
                    </span>
                  </div>
                  {cabLogistics.driverPhone && (
                    <a
                      href={`tel:${cabLogistics.driverPhone.replace(/\s+/g, '')}`}
                      className="mt-2 inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white min-h-[36px] touch-manipulation"
                    >
                      <Phone className="h-3 w-3" />
                      <span>Call {cabLogistics.driverPhone}</span>
                    </a>
                  )}
                </div>

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

                <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Contract / Notes
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block mt-0.5">
                    {cabLogistics.notes || 'None'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                No cab or driver details added. Tap &quot;Add Cab&quot; to keep contact info ready.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-MODULE 3: TRIP AWARDS & SUPERLATIVES ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'awards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Trip Awards & Superlatives
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Live Voting
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vote for funny titles, see live leaderboards, and download official certificates
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={emailStatus.loading}
                onClick={() => handleSendEmail('awards')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 min-h-[38px] touch-manipulation"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Email Awards</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddAwardOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 text-white hover:bg-amber-600 min-h-[38px] touch-manipulation shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Award</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {awards.map((aw) => {
              const voteCounts: Record<string, number> = {};
              const totalVotes = Object.keys(aw.votes || {}).length;

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

              const leaderMember = trip.members.find((m) => m.id === leaderId);
              const myVoteCandidateId = aw.votes?.[currentMember.id];

              return (
                <div
                  key={aw.id}
                  className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="text-2xl p-2 rounded-2xl bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center shrink-0">
                        {aw.icon}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {aw.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          &quot;{aw.description}&quot;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {leaderMember ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 shadow-2xs">
                          👑 {leaderMember.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          Awaiting votes
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAward(aw.id)}
                        title="Delete award"
                        className="p-1 text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {totalVotes > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Live Standings ({totalVotes} votes)
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
                                <span>
                                  {candMember?.name || 'Friend'}
                                  {candId === myVoteCandidateId && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold ml-1">
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
                                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-1.5 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                        Vote:
                      </span>
                      <select
                        value={myVoteCandidateId || ''}
                        onChange={(e) => handleVote(aw.id, e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none w-full sm:w-auto"
                      >
                        <option value="">Select a friend...</option>
                        {trip.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
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
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white min-h-[36px] touch-manipulation"
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
      {/* ── MODALS (ADD/EDIT ACTIVITY, ADD/EDIT DAY, ADD/EDIT TICKET, CAB, AWARD) ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}

      {/* Modal: Add Activity */}
      {isAddActivityOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-500" />
                <span>Add Activity {currentDay ? `to Day ${currentDay.dayNumber}` : ''}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddActivityOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Time (e.g. 10:30 AM, 02:30 PM) *
                </label>
                <input
                  type="text"
                  required
                  value={newActivityTime}
                  onChange={(e) => setNewActivityTime(e.target.value)}
                  placeholder="10:30 AM"
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
                  placeholder="e.g. Train Boarding / Temple Darshan / Dinner"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Location (Name or Google Maps Link) *
                </label>
                <input
                  type="text"
                  required
                  value={newActivityLocation}
                  onChange={(e) => setNewActivityLocation(e.target.value)}
                  placeholder="e.g. Talcher Road Station / Puri Golden Beach"
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
                  placeholder="e.g. Arrive Early in Time, dress code, tickets, etc."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 min-h-[38px]"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Activity */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-emerald-500" />
                <span>Edit Activity Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditActivity} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={editActTime}
                    onChange={(e) => setEditActTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Status
                  </label>
                  <select
                    value={editActStatus}
                    onChange={(e: any) => setEditActStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  required
                  value={editActTitle}
                  onChange={(e) => setEditActTitle(e.target.value)}
                  placeholder="e.g. Train Boarding"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Location (Name or Google Maps Link) *
                </label>
                <input
                  type="text"
                  required
                  value={editActLocation}
                  onChange={(e) => setEditActLocation(e.target.value)}
                  placeholder="e.g. Talcher Road Station"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lead Friend In Charge
                </label>
                <select
                  value={editActLead}
                  onChange={(e) => setEditActLead(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">No lead assigned</option>
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
                  value={editActNotes}
                  onChange={(e) => setEditActNotes(e.target.value)}
                  placeholder="e.g. Arrive Early in Time"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px]"
                >
                  Update Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Day */}
      {isAddDayOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Add Day {itineraryDays.length + 1}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDayOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDay} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Day Focus / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newDayTitle}
                  onChange={(e) => setNewDayTitle(e.target.value)}
                  placeholder="e.g. Boarding from Talcher Road"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px]"
                >
                  Create Day
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Day */}
      {isEditDayOpen && currentDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-emerald-500" />
                <span>Edit Day {currentDay.dayNumber} Focus</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditDayOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDay} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Day Focus / Title *
                </label>
                <input
                  type="text"
                  required
                  value={editDayTitle}
                  onChange={(e) => setEditDayTitle(e.target.value)}
                  placeholder="e.g. Boarding from Talcher Road"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editDayDate}
                  onChange={(e) => setEditDayDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditDayOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Transport Ticket */}
      {isAddTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="h-4 w-4 text-sky-500" />
                <span>Add Travel Ticket / Reservation</span>
              </h3>
              <button
                type="button"
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
                    placeholder="e.g. 245-8971203"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Carrier / Train / Flight Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="e.g. Purushottam Express / IndiGo 6E"
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
                    placeholder="e.g. Talcher Road / KGP"
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
                    placeholder="e.g. Puri / Bhubaneswar"
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
                    placeholder="10:30 AM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="text"
                    value={newTicketArrTime}
                    onChange={(e) => setNewTicketArrTime(e.target.value)}
                    placeholder="02:30 PM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Seats / Berths *
                </label>
                <input
                  type="text"
                  required
                  value={newTicketSeats}
                  onChange={(e) => setNewTicketSeats(e.target.value)}
                  placeholder="e.g. Coach B3, Berths 21, 22, 23"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Upload Actual Ticket PDF / Document (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 bg-slate-50 dark:bg-slate-800/60 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Upload className="h-4 w-4 text-sky-500" />
                    <span className="truncate">{newTicketPdfName || 'Choose PDF / Ticket Image (<6MB)'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file, false);
                      }}
                    />
                  </label>
                  {newTicketPdfUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTicketPdfUrl(undefined);
                        setNewTicketPdfName(undefined);
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                      title="Remove PDF"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Live Tracking URL (Optional)
                </label>
                <input
                  type="url"
                  value={newTicketLiveUrl}
                  onChange={(e) => setNewTicketLiveUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTicketOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-sky-600 hover:bg-sky-700 text-white min-h-[38px]"
                >
                  Save Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Transport Ticket */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-sky-500" />
                <span>Edit Ticket Reservation</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTicket} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mode of Travel *
                  </label>
                  <select
                    value={editTicketMode}
                    onChange={(e: any) => setEditTicketMode(e.target.value)}
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
                    value={editTicketPnr}
                    onChange={(e) => setEditTicketPnr(e.target.value)}
                    placeholder="e.g. 245-8971203"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Carrier / Train / Flight Name *
                </label>
                <input
                  type="text"
                  required
                  value={editTicketTitle}
                  onChange={(e) => setEditTicketTitle(e.target.value)}
                  placeholder="e.g. Purushottam Express"
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
                    value={editTicketDepStation}
                    onChange={(e) => setEditTicketDepStation(e.target.value)}
                    placeholder="e.g. Talcher Road"
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
                    value={editTicketArrStation}
                    onChange={(e) => setEditTicketArrStation(e.target.value)}
                    placeholder="e.g. Puri"
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
                    value={editTicketDepTime}
                    onChange={(e) => setEditTicketDepTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="text"
                    value={editTicketArrTime}
                    onChange={(e) => setEditTicketArrTime(e.target.value)}
                    placeholder="02:30 PM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Seats / Berths *
                </label>
                <input
                  type="text"
                  required
                  value={editTicketSeats}
                  onChange={(e) => setEditTicketSeats(e.target.value)}
                  placeholder="e.g. Coach B3, Berths 21, 22, 23"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ticket PDF Document
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 bg-slate-50 dark:bg-slate-800/60 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Upload className="h-4 w-4 text-sky-500" />
                    <span className="truncate">{editTicketPdfName || 'Choose PDF / Image (<6MB)'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file, true);
                      }}
                    />
                  </label>
                  {editTicketPdfUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditTicketPdfUrl(undefined);
                        setEditTicketPdfName(undefined);
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                      title="Remove PDF"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Live Tracking URL (Optional)
                </label>
                <input
                  type="url"
                  value={editTicketLiveUrl}
                  onChange={(e) => setEditTicketLiveUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-sky-600 hover:bg-sky-700 text-white min-h-[38px]"
                >
                  Update Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Cab Rental Logistics */}
      {isEditCabOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-500" />
                <span>Edit Cab & Rental Logistics</span>
              </h3>
              <button
                type="button"
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
                    placeholder="Innova / Ertiga / Tempo"
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
                    placeholder="OD 02 AB 1234"
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
                    placeholder="Driver's Name"
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
                    placeholder="+91 98765 43210"
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
                    placeholder="Airport / Station Gate"
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
                    placeholder="06:30 AM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Contract / Fuel Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cabForm.notes || ''}
                  onChange={(e) => setCabForm({ ...cabForm, notes: e.target.value })}
                  placeholder="300 km/day included with AC, starting odometer, etc."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditCabOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white min-h-[38px]"
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Propose Trip Award</span>
              </h3>
              <button
                type="button"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white min-h-[38px]"
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
