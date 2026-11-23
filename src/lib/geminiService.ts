/**
 * Service for interacting with the Google Gemini AI backend API
 */

export function getStoredGeminiApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gemini_api_key') || null;
}

export function saveStoredGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const clean = key.trim();
  if (clean) {
    localStorage.setItem('gemini_api_key', clean);
  } else {
    localStorage.removeItem('gemini_api_key');
  }
}

export function removeStoredGeminiApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('gemini_api_key');
}

async function postToGeminiApi(payload: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const storedKey = getStoredGeminiApiKey();
  if (storedKey) {
    headers['x-gemini-api-key'] = storedKey;
  }

  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.message || 'Gemini AI request failed');
    error.code = data.error;
    throw error;
  }

  return data;
}

export interface GeneratedItineraryResponse {
  dayTitle: string;
  summary: string;
  activities: {
    time: string;
    title: string;
    location: string;
    notes?: string;
  }[];
  dressCodeAndTips: string[];
}

export async function generateGeminiItinerary(options: {
  destination: string;
  tripName: string;
  dayNumber: number;
  members: { id: string; name: string }[];
  preferences?: string;
  customPrompt?: string;
}): Promise<GeneratedItineraryResponse> {
  const response = await postToGeminiApi({
    action: 'generate_itinerary',
    ...options,
  });
  return response.data;
}

export interface WhatNextAlternative {
  title: string;
  location: string;
  distanceEstimate: string;
  whyItWorksNow: string;
  insiderTip: string;
}

export interface WhatNextResponse {
  situationAdvice: string;
  alternatives: WhatNextAlternative[];
}

export async function getGeminiWhatNext(options: {
  destination: string;
  currentSpot: string;
  weatherInfo?: string;
  reason?: string;
}): Promise<WhatNextResponse> {
  const response = await postToGeminiApi({
    action: 'what_next',
    ...options,
  });
  return response.data;
}

export interface HiddenGemItem {
  name: string;
  category: 'dhaba' | 'sunset' | 'food' | 'scenic' | string;
  location: string;
  mustTryOrHighlight: string;
  insiderTip: string;
}

export interface HiddenGemsResponse {
  category: string;
  gems: HiddenGemItem[];
}

export async function getGeminiHiddenGems(options: {
  destination: string;
  preferences?: string;
}): Promise<HiddenGemsResponse> {
  const response = await postToGeminiApi({
    action: 'hidden_gems',
    ...options,
  });
  return response.data;
}

export interface TripWrappedResponse {
  vibeTitle: string;
  catchphrase: string;
  totalSpendFormatted?: string;
  chapters: {
    chapterNumber: number;
    title: string;
    icon: string;
    story: string;
    statBadges: string[];
  }[];
  memberSuperlatives: {
    memberName: string;
    awardTitle: string;
    reason: string;
  }[];
}

export async function getGeminiTripWrapped(options: {
  tripName: string;
  destination: string;
  financialSummary: {
    totalSpend: number;
    currency: string;
    expenseCount: number;
    expenses: { title: string; amount: number; category: string; paidBy: string; date?: string }[];
    topCategories: { category: string; amount: number; pct: number }[];
    balances: { memberName: string; netBalance: number; totalPaid: number }[];
  };
}): Promise<TripWrappedResponse> {
  const response = await postToGeminiApi({
    action: 'trip_wrapped',
    ...options,
  });
  return response.data;
}

export async function chatWithGeminiGuide(options: {
  destination: string;
  customPrompt: string;
}): Promise<string> {
  const response = await postToGeminiApi({
    action: 'chat',
    ...options,
  });
  return response.text;
}
