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
  UserPlus,
  Edit2,
  Save,
} from 'lucide-react';
import { Trip, Member, MemberRole, TripSpecialty } from '@/types';

interface TripGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentMember?: Member | null;
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
  currentMember,
  onSaveMembers,
}: TripGroupMembersModalProps) {
  const [members, setMembers] = useState<Member[]>(trip.members);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMyUpiId, setEditingMyUpiId] = useState<string | null>(null);
  const [myUpiInput, setMyUpiInput] = useState('');

  const isTripManager = Boolean(
    !currentMember ||
    currentMember.role === 'trip_manager' ||
    currentMember.role === 'finance_manager' ||
    currentMember.id === trip.financeLeadId ||
    currentMember.isFinanceLead ||
    trip.members[0]?.id === currentMember.id
  );
  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    email: string;
    loginId: string;
    password: string;
    upiId: string;
  }>({ name: '', phone: '', email: '', loginId: '', password: '', upiId: '' });
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

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
    if (!isTripManager || !name.trim()) return;

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
    if (!isTripManager) return;
    const updated = members.map((m) => (m.id === id ? { ...m, [field]: val } : m));
    setMembers(updated);
    onSaveMembers(updated);
  };

  const handleStartEdit = (m: Member) => {
    if (!isTripManager && m.id !== currentMember?.id) return;
    setEditingMemberId(m.id);
    setEditForm({
      name: m.name,
      phone: m.phone || '',
      email: m.email || '',
      loginId: m.loginId,
      password: m.password,
      upiId: m.upiId || '',
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!isTripManager && id !== currentMember?.id) return;
    if (!editForm.name.trim() || !editForm.loginId.trim() || !editForm.password.trim()) {
      alert('Name, Login ID, and Password cannot be empty.');
      return;
    }

    const updated = members.map((m) =>
      m.id === id
        ? {
            ...m,
            name: editForm.name.trim(),
            phone: editForm.phone.trim() || undefined,
            email: editForm.email.trim() || undefined,
            loginId: editForm.loginId.trim().toLowerCase(),
            password: editForm.password.trim(),
            upiId: editForm.upiId.trim() || undefined,
          }
        : m
    );
    setMembers(updated);
    onSaveMembers(updated);
    setEditingMemberId(null);
    setSavedSuccessId(id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const handleSaveMyUpi = (memberId: string) => {
    const cleanUpi = myUpiInput.trim();
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, upiId: cleanUpi || undefined } : m
    );
    setMembers(updated);
    onSaveMembers(updated);
    setEditingMyUpiId(null);
    setSavedSuccessId(memberId);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const handleDeleteMember = (id: string) => {
    if (!isTripManager) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 touch-manipulation"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Trip Friends & Credentials
              </h3>
              {isTripManager ? (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>🛡️</span> Trip Manager Access
                </span>
              ) : (
                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>✏️</span> Member Profile Access
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isTripManager
                ? 'Trip Manager has full access to update login IDs, passwords, phone numbers, and receiving UPI IDs for all friends.'
                : 'You have full access to edit your own name, phone number, login credentials, and receiving UPI ID at any time.'}
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
            {isTripManager && (
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {showAddForm ? 'Close Form' : '+ Add New Member'}
              </button>
            )}
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Member Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-mono font-bold text-slate-900 dark:text-white"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-mono font-bold text-slate-900 dark:text-white"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-mono text-slate-900 dark:text-white"
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

        {/* Members Roster with Edit Mode */}
        <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
          {members.map((member) => {
            const isCopied = copiedId === member.id;
            const isEditing = editingMemberId === member.id;

            return (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-3"
              >
                {isEditing ? (
                  <div className="rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/40 p-3.5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-900/60">
                      <h5 className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                        <Edit2 className="h-3.5 w-3.5 text-sky-500" />
                        <span>{member.id === currentMember?.id ? 'Edit Your Details' : `Edit Details for ${member.name}`}</span>
                      </h5>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400">Modify any field & save</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="e.g. Laxman Sahoo"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 sm:py-1.5 text-base sm:text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Phone Number (WhatsApp)
                        </label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="e.g. 7008995654"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 sm:py-1.5 text-base sm:text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Email Address (for instant bill & PDF receipts)
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="e.g. laxman@gmail.com"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 sm:py-1.5 text-base sm:text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Login ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.loginId}
                          onChange={(e) => setEditForm({ ...editForm, loginId: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                          placeholder="e.g. laxmansahoo"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 sm:py-1.5 text-base sm:text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Account Password *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          placeholder="e.g. laxman123"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 sm:py-1.5 text-base sm:text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Receiving UPI ID (for GPay / PhonePe settlements)
                        </label>
                        <input
                          type="text"
                          value={editForm.upiId}
                          onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                          placeholder="e.g. laxman@okaxis or 7008995654@ybl"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 sm:py-1.5 text-base sm:text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-200 dark:border-sky-900/60">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(member.id)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : editingMyUpiId === member.id ? (
                  <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-900/60">
                      <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Edit2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Update Your Receiving UPI ID</span>
                      </h5>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">GPay • PhonePe • Paytm • BHIM</span>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Receiving UPI ID (where friends send your reimbursements)
                      </label>
                      <input
                        type="text"
                        value={myUpiInput}
                        onChange={(e) => setMyUpiInput(e.target.value)}
                        placeholder="e.g. yourname@okaxis or 9876543210@ybl"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base sm:text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400">
                        Enter your personal UPI handle. Other members will scan or pay directly to this ID.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-200 dark:border-emerald-900/60">
                      <button
                        type="button"
                        onClick={() => setEditingMyUpiId(null)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveMyUpi(member.id)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save My UPI</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-black text-sm flex-shrink-0 shadow-sm ${member.avatarColor}`}
                      >
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {member.name}
                          </h4>
                          {savedSuccessId === member.id && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-in fade-in">
                              <Check className="h-3 w-3" /> Updated!
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>📞 {member.phone ? `+91 ${member.phone}` : 'No phone set'}</span>
                          <span>•</span>
                          <span>
                            💳 UPI: <strong className={member.upiId ? "text-emerald-600 dark:text-emerald-400 font-mono" : "text-slate-400 italic"}>{member.upiId || 'Not set'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                          <span>ID: <strong className="text-slate-800 dark:text-slate-200">{member.loginId}</strong></span>
                          <span>•</span>
                          <span>
                            Pass: <strong className="text-slate-800 dark:text-slate-200">
                              {isTripManager || member.id === currentMember?.id ? member.password : '••••••••'}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                      {isTripManager ? (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(member)}
                          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
                          title="Edit member details (Trip Manager)"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-sky-500" />
                          <span>Edit</span>
                        </button>
                      ) : member.id === currentMember?.id ? (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(member)}
                          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all shadow-sm active:scale-95"
                          title="Edit your own name, phone, login ID, password, or receiving UPI ID"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>✏️ Edit My Details</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => copyCredentials(member)}
                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-all active:scale-95 shadow-sm ${
                          isCopied
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                        title="Copy WhatsApp invite with Login ID & Password"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5 text-emerald-500" />}
                        <span>{isCopied ? 'Copied!' : 'WhatsApp'}</span>
                      </button>

                      {isTripManager && members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                          title="Remove member (Trip Manager only)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
