'use client';

import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  KeyRound,
  Shield,
  Briefcase,
  Share2,
  Car,
  Hotel,
  UtensilsCrossed,
  Compass,
  Camera,
  UserPlus,
} from 'lucide-react';
import { Trip, Member, MemberRole, TripSpecialty } from '@/types';

interface TripGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSaveMembers: (updatedMembers: Member[]) => void;
}

const SPECIALTY_OPTIONS: { value: TripSpecialty; label: string; icon: string; desc: string }[] = [
  { value: 'transport', label: 'Transport Lead', icon: '🚕', desc: 'Manages taxis, bus, fuel & tolls' },
  { value: 'stay', label: 'Stay Coordinator', icon: '🏨', desc: 'Manages hotel check-in & rooms' },
  { value: 'food', label: 'Food & Dining Lead', icon: '🍽️', desc: 'Chooses restaurants & food bills' },
  { value: 'activities', label: 'Activities Guide', icon: '⛷️', desc: 'Tickets, skiing, adventure sports' },
  { value: 'photos', label: 'Media & Memories', icon: '📸', desc: 'Shared album, photos & video' },
  { value: 'none', label: 'General Member', icon: '👤', desc: 'Tracks share & participates' },
];

const AVATAR_PALETTE = [
  'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
  'bg-amber-600', 'bg-teal-600', 'bg-indigo-600', 'bg-rose-600',
  'bg-cyan-600', 'bg-orange-600',
];

export function TripGroupMembersModal({
  isOpen,
  onClose,
  trip,
  onSaveMembers,
}: TripGroupMembersModalProps) {
  const [members, setMembers] = useState<Member[]>(trip.members);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New member inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState<TripSpecialty>('none');
  const [role, setRole] = useState<MemberRole>('member');
  const [upiId, setUpiId] = useState('');

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!loginId || loginId === name.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      setLoginId(slug);
    }
    if (!password || password.startsWith(name.toLowerCase())) {
      setPassword(`${slug}123`);
    }
  };

  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedLogin = (loginId.trim() || name.trim().toLowerCase().replace(/\s+/g, ''));
    const trimmedPass = (password.trim() || `${trimmedLogin}123`);

    const newMember: Member = {
      id: `member_${Date.now()}`,
      name: name.trim(),
      loginId: trimmedLogin,
      password: trimmedPass,
      role,
      specialty,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      upiId: upiId.trim() || undefined,
      avatarColor: AVATAR_PALETTE[members.length % AVATAR_PALETTE.length],
      pin: trimmedPass,
    };

    const updated = [...members, newMember];
    setMembers(updated);
    onSaveMembers(updated);

    // Reset form
    setName('');
    setEmail('');
    setPhone('');
    setLoginId('');
    setPassword('');
    setSpecialty('none');
    setRole('member');
    setUpiId('');
    setShowAddForm(false);
  };

  const handleUpdateMember = (id: string, field: keyof Member, val: any) => {
    const updated = members.map((m) => (m.id === id ? { ...m, [field]: val } : m));
    setMembers(updated);
    onSaveMembers(updated);
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 1) {
      alert('A trip group requires at least 1 member!');
      return;
    }
    if (confirm('Remove this member from the trip group?')) {
      const updated = members.filter((m) => m.id !== id);
      setMembers(updated);
      onSaveMembers(updated);
    }
  };

  const copyCredentials = (member: Member) => {
    const appUrl = typeof window !== 'undefined' ? `${window.location.origin}?trip=${trip.id}` : 'https://trip-manager.vercel.app';
    const text = `✈️ *${trip.name} Portal Invite*\nHey ${member.name}, you are in our trip group!\n\n🌐 Portal Link: ${appUrl}\n🔑 Trip Code: *${trip.inviteCode || trip.id}*\n👤 Your Login ID: *${member.loginId}*\n🔑 Your Password: *${member.password}*\n${member.upiId ? `💳 Receiving UPI: ${member.upiId}\n` : ''}\nTap the link to sign in, check pending dues, and split bills!`;

    navigator.clipboard.writeText(text);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyAllGroupCredentials = () => {
    const appUrl = typeof window !== 'undefined' ? `${window.location.origin}?trip=${trip.id}` : 'https://trip-manager.vercel.app';
    const lines = [
      `✈️ *${trip.name} Portal - Team Invites*`,
      `Destination: ${trip.destination}`,
      `🌐 Portal Link: ${appUrl}`,
      `🔑 Trip Code: *${trip.inviteCode || trip.id}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 Member Logins:`,
      ...members.map((m) => `• *${m.name}*: ID: \`${m.loginId}\` | Password: \`${m.password}\``),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Tap the link above, pick your profile, and enter your password to sign in!`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Trip Friends & Sign-In Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage members, login credentials, and receiving UPI IDs for instant payouts.
            </p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {members.length} Members in &quot;{trip.name}&quot;
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyAllGroupCredentials}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
                copiedId === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title="Copy WhatsApp invite message for the entire group"
            >
              {copiedId === 'all' ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5 text-emerald-500" />}
              <span>{copiedId === 'all' ? 'All Invites Copied!' : 'Copy Group Invites'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {showAddForm ? 'Close Form' : '+ Add New Member'}
            </button>
          </div>
        </div>

        {/* Add Member Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddNewMember}
            className="mb-6 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 p-4 space-y-3 animate-in fade-in"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              Add Friend to Trip Group
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Friend&apos;s Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email (for PDF Payment Slips)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Member Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="member">General Group Member</option>
                  <option value="finance_manager">Finance Manager (FM - Treasury & Slips)</option>
                  <option value="trip_manager">Trip Manager (TM - Onboarding & Admin)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Login ID (Assigned by TM) *
                </label>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. rahul"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. rahul123"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receiving UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. rahul@okaxis or 9876543210@ybl"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sky-600 hover:bg-sky-700 px-4 py-1.5 text-xs font-bold text-white shadow"
              >
                Save Member & Credentials
              </button>
            </div>
          </form>
        )}

        {/* Members Roster with Credentials */}
        <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
          {members.map((member) => {
            const isCopied = copiedId === member.id;
            const spec = SPECIALTY_OPTIONS.find((s) => s.value === member.specialty) || SPECIALTY_OPTIONS[5];

            return (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-white font-extrabold text-xs shadow-sm ${member.avatarColor}`}
                    >
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {member.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        📞 +91 {member.phone || 'Not set'} • UPI: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{member.upiId || 'Not set'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyCredentials(member)}
                      className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Copy WhatsApp invite with Login ID & Password"
                    >
                      {isCopied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                      <span>{isCopied ? 'Copied!' : 'Send WhatsApp Invite'}</span>
                    </button>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Credential & Payment Editor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                      Login ID
                    </span>
                    <input
                      type="text"
                      value={member.loginId}
                      onChange={(e) => handleUpdateMember(member.id, 'loginId', e.target.value)}
                      className="w-full bg-transparent font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:underline"
                    />
                  </div>

                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                      Password
                    </span>
                    <input
                      type="text"
                      value={member.password}
                      onChange={(e) => handleUpdateMember(member.id, 'password', e.target.value)}
                      className="w-full bg-transparent font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:underline"
                    />
                  </div>

                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
                      Receiving UPI ID
                    </span>
                    <input
                      type="text"
                      value={member.upiId || ''}
                      placeholder="e.g. name@okaxis"
                      onChange={(e) => handleUpdateMember(member.id, 'upiId', e.target.value)}
                      className="w-full bg-transparent font-mono font-bold text-emerald-600 dark:text-emerald-400 placeholder-slate-400 focus:outline-none focus:underline"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-5 py-2 text-xs font-bold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
