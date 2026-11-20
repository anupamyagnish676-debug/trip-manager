/**
 * Session management — stored in localStorage.
 * No server-side auth; identity is chosen on the join/login screen.
 */
import { AppSession, MemberRole } from '@/types';

const SESSION_KEY = 'trip_portal_session_v2';

export function getSession(): AppSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AppSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function isFinanceManager(role?: MemberRole): boolean {
  return role === 'finance_manager';
}

export function isTripManager(role?: MemberRole): boolean {
  return role === 'finance_manager' || role === 'trip_manager';
}
