import { NextRequest, NextResponse } from 'next/server';

interface GeminiRequestPayload {
  action: 'generate_itinerary' | 'what_next' | 'hidden_gems' | 'trip_wrapped' | 'chat';
  destination?: string;
  tripName?: string;
  dayNumber?: number;
  durationDays?: number;
  members?: { id: string; name: string }[];
  preferences?: string;
  customPrompt?: string;
  currentSpot?: string;
  weatherInfo?: string;
  reason?: string;
  financialSummary?: {
    totalSpend: number;
    currency: string;
    expenseCount: number;
    expenses: { title: string; amount: number; category: string; paidBy: string; date?: string }[];
    topCategories: { category: string; amount: number; pct: number }[];
    balances: { memberName: string; netBalance: number; totalPaid: number }[];
  };
  chatMessages?: { role: 'user' | 'model'; content: string }[];
}

interface ModelEndpoint {
  version: 'v1beta' | 'v1';
  model: string;
}

let cachedWorkingEndpoint: ModelEndpoint | null = null;

function cleanJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }
  return JSON.parse(cleaned);
}

async function fetchGeminiWithEndpoint(
  endpoint: ModelEndpoint,
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  responseJson: boolean = false
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/${endpoint.version}/models/${endpoint.model}:generateContent?key=${apiKey}`;
  const payload: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (responseJson) {
    // Only newer models support responseMimeType
    if (
      endpoint.model.includes('1.5') ||
      endpoint.model.includes('2.0') ||
      endpoint.model.includes('flash')
    ) {
      payload.generationConfig.responseMimeType = 'application/json';
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Gemini API error (${res.status}) on ${endpoint.version}/${endpoint.model}: ${errorText}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }

  return text;
}

async function discoverAvailableModels(apiKey: string): Promise<ModelEndpoint[]> {
  const versions: ('v1beta' | 'v1')[] = ['v1beta', 'v1'];
  const candidates: ModelEndpoint[] = [];

  for (const ver of versions) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          for (const m of data.models) {
            if (m.supportedGenerationMethods?.includes('generateContent')) {
              const modelName = m.name?.replace(/^models\//, '');
              if (modelName) {
                candidates.push({ version: ver, model: modelName });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn(`ListModels error on ${ver}:`, e);
    }
  }

  // Prioritize flash/fast models first
  candidates.sort((a, b) => {
    const score = (name: string) => {
      if (name.includes('2.0-flash')) return 100;
      if (name.includes('1.5-flash-latest')) return 95;
      if (name.includes('1.5-flash')) return 90;
      if (name.includes('flash')) return 80;
      if (name.includes('1.5-pro')) return 70;
      if (name.includes('pro')) return 60;
      return 10;
    };
    return score(b.model) - score(a.model);
  });

  return candidates;
}

async function callGeminiApi(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  responseJson: boolean = false
): Promise<string> {
  // Try cached working endpoint first
  if (cachedWorkingEndpoint) {
    try {
      return await fetchGeminiWithEndpoint(
        cachedWorkingEndpoint,
        apiKey,
        prompt,
        systemInstruction,
        responseJson
      );
    } catch (e) {
      console.warn('Cached Gemini endpoint failed, falling back to discovery:', e);
      cachedWorkingEndpoint = null;
    }
  }

  // Common production model endpoints across v1beta and v1
  const candidates: ModelEndpoint[] = [
    { version: 'v1beta', model: 'gemini-1.5-flash-latest' },
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-2.0-flash' },
    { version: 'v1beta', model: 'gemini-2.0-flash-exp' },
    { version: 'v1beta', model: 'gemini-1.5-flash' },
    { version: 'v1', model: 'gemini-1.5-pro' },
    { version: 'v1beta', model: 'gemini-1.5-pro-latest' },
    { version: 'v1', model: 'gemini-pro' },
  ];

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const result = await fetchGeminiWithEndpoint(
        candidate,
        apiKey,
        prompt,
        systemInstruction,
        responseJson
      );
      cachedWorkingEndpoint = candidate;
      return result;
    } catch (err: any) {
      lastError = err;
    }
  }

  // If all static candidates failed (e.g. 404), dynamically query ModelService.ListModels
  try {
    const discovered = await discoverAvailableModels(apiKey);
    for (const endpoint of discovered) {
      try {
        const result = await fetchGeminiWithEndpoint(
          endpoint,
          apiKey,
          prompt,
          systemInstruction,
          responseJson
        );
        cachedWorkingEndpoint = endpoint;
        return result;
      } catch (err: any) {
        lastError = err;
      }
    }
  } catch (discoveryErr) {
    console.warn('Dynamic model discovery failed:', discoveryErr);
  }

  throw lastError || new Error('Failed to generate content from Gemini API with any available model.');
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'MISSING_API_KEY',
          message:
            'GEMINI_API_KEY environment variable is not configured on the server. Please add GEMINI_API_KEY in Vercel settings (Environment Variables).',
        },
        { status: 503 }
      );
    }

    const body: GeminiRequestPayload = await req.json();
    const { action } = body;

    // ── 1. GENERATE ITINERARY ──
    if (action === 'generate_itinerary') {
      const destination = body.destination || 'Odisha';
      const dayNum = body.dayNumber || 1;
      const membersList = (body.members || []).map((m) => m.name).join(', ') || 'Friends group';
      const userInput = (body.customPrompt || body.preferences || '').trim();

      const systemInstruction = `You are an expert travel assistant and intelligent itinerary organizer for trips to ${destination}.
Your job is to take the user's travel ideas or rough itinerary—typed in ANY language (English, Hindi, Odia, Bengali, Hinglish, shorthand notes)—and automatically extract, format, and seed them into a realistic, structured chronological day schedule.

GUIDELINES:
1. Parse the user's instructions regardless of language, slang, or formatting.
2. If the user mentions specific timings (e.g. "8am", "morning", "lunch around 2", "sunset"), preserve and organize them chronologically.
3. If the user gives only locations or food items, assign realistic logical times and sequence them geographically in or around ${destination}.
4. If the user gives a brief prompt, enrich it with genuine local knowledge, scenic spots, authentic highway dhabas, local specialties, and temple/beach guidelines for ${destination}.
5. For each activity, include:
   - "time": e.g. "08:30 AM" (12-hour format with AM/PM)
   - "title": Clear and punchy activity name
   - "location": Specific venue, beach, temple, viewpoint, or dhaba name
   - "notes": Helpful insider guidance, what to try/eat, entry/dress code details, or photography tips
6. Under "dressCodeAndTips", add 1-3 actionable travel reminders (e.g. footwear, camera permits, best sunset timing).

You MUST return valid JSON matching this schema:
{
  "dayTitle": "Engaging descriptive title for Day ${dayNum}",
  "summary": "1-2 sentence overview of today's schedule and vibe",
  "activities": [
    {
      "time": "08:30 AM",
      "title": "Concise activity title",
      "location": "Exact landmark/place name",
      "notes": "Practical local tip, recommended dish, or timing advice"
    }
  ],
  "dressCodeAndTips": [
    "Helpful local tip, reminder, or dress code alert"
  ]
}`;

      const prompt = `Plan Day ${dayNum} for trip in ${destination}.
Group members: ${membersList}.

USER'S TRAVEL PLAN / INSTRUCTIONS (IN THEIR OWN LANGUAGE):
"""
${userInput || `Plan a memorable, well-balanced Day ${dayNum} exploring top spots, hidden gems, and delicious local food in ${destination}.`}
"""

Please format this into structured chronological activities (3 to 6 activities).`;

      const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
      const parsed = cleanJsonParse(result);
      return NextResponse.json({ success: true, data: parsed });
    }

    // ── 2. EMERGENCY PIVOT ("WHAT SHOULD WE DO NEXT?") ──
    if (action === 'what_next') {
      const destination = body.destination || 'Puri & Konark';
      const currentSpot = body.currentSpot || 'Near City Center';
      const weather = body.weatherInfo || 'Partly Cloudy, 28°C';
      const reason = body.reason || 'Spot is overly crowded or it started raining';

      const systemInstruction = `You are a real-time local travel copilot assisting travelers on the ground in ${destination}.
Travelers are at or near "${currentSpot}".
Current weather conditions: "${weather}".
Problem / Situation: "${reason}".
Suggest 3 immediate, high-quality, practical alternative activities nearby.
Return valid JSON matching:
{
  "situationAdvice": "Empathetic, quick strategic advice for this situation",
  "alternatives": [
    {
      "title": "Catchy name of alternative activity",
      "location": "Exact location / venue name",
      "distanceEstimate": "Estimated driving/auto distance (e.g., 10 mins away (3.5 km))",
      "whyItWorksNow": "Why this is ideal right now given weather/crowds",
      "insiderTip": "What to do, see, or eat there"
    }
  ]
}`;

      const prompt = `Recommend 3 immediate emergency pivot alternatives for travelers stuck at "${currentSpot}" in ${destination}.
Situation: ${reason}. Current weather: ${weather}.`;

      const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
      const parsed = cleanJsonParse(result);
      return NextResponse.json({ success: true, data: parsed });
    }

    // ── 3. HIDDEN GEMS & LOCAL DHABAS ──
    if (action === 'hidden_gems') {
      const destination = body.destination || 'Odisha Road Trip (Puri, Konark, Bhubaneswar)';
      const style = body.preferences || 'Local Dhabas & Authentic Street Food, Clean Sunset Spots';

      const systemInstruction = `You are a native local food and travel insider for ${destination}.
Provide 4 authentic, non-touristy hidden gems: authentic highway dhabas, local sweet shops (e.g. Khaja, Chhena Poda/Gaja), secluded coastal/sunset spots, or cultural secrets.
Return valid JSON matching:
{
  "category": "Hidden Gems & Authentic Eats",
  "gems": [
    {
      "name": "Name of gem / dhaba / spot",
      "category": "dhaba" | "sunset" | "food" | "scenic",
      "location": "Exact spot or highway stretch",
      "mustTryOrHighlight": "Signature dish or view that makes it special",
      "insiderTip": "Local secret, best timing, or ordering tip"
    }
  ]
}`;

      const prompt = `Provide 4 authentic hidden gems and local dhabas for ${destination}. Focus on ${style}.`;

      const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
      const parsed = cleanJsonParse(result);
      return NextResponse.json({ success: true, data: parsed });
    }

    // ── 4. END-OF-TRIP "TRIP WRAPPED" STORYTELLER ──
    if (action === 'trip_wrapped') {
      const summary = body.financialSummary;
      const tripName = body.tripName || 'Our Trip';
      const destination = body.destination || 'Odisha';

      if (!summary || !summary.expenses || summary.expenses.length === 0) {
        return NextResponse.json(
          {
            error: 'NO_EXPENSES',
            message: 'No expenses found to generate Trip Wrapped story.',
          },
          { status: 400 }
        );
      }

      const systemInstruction = `You are the witty, observant group storyteller for a Spotify Wrapped style trip financial recap.
Analyze this group's ACTUAL expenses, category breakdown, and settlement balances.
Write a fun, warm, memorable 3-chapter story highlighting spending habits, peak days, front-line cash payers vs UPI collectors, and assign a witty superlative title to group members based on their actual spending/paying patterns.
Return valid JSON matching:
{
  "vibeTitle": "3-5 word clever theme for this group's trip spending vibe (e.g. 'The Seafood Royalty Expedition')",
  "catchphrase": "Punchy 1-sentence recap of the trip's financial journey",
  "totalSpendFormatted": "Total formatted spend string",
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Where The Treasure Went",
      "icon": "💸",
      "story": "2-3 paragraphs analyzing where the money flew, dominant spending categories, and group habits with witty humor.",
      "statBadges": ["Category spend stat", "Interesting transaction fact"]
    },
    {
      "chapterNumber": 2,
      "title": "The Big Spender Day & Peak Hour",
      "icon": "⚡",
      "story": "Story of the most expensive day or largest single bills, who stepped up with cash, and the climax of group spending.",
      "statBadges": ["Peak day bill amount", "Hero payer mention"]
    },
    {
      "chapterNumber": 3,
      "title": "The Group Hall of Fame",
      "icon": "🏆",
      "story": "Humorous and affectionate awards and behavioral archetypes for the friends based on who paid, who owes, and who collected.",
      "statBadges": ["Group friendship metric", "Settlement status"]
    }
  ],
  "memberSuperlatives": [
    {
      "memberName": "Name of member",
      "awardTitle": "Creative and funny award (e.g. 'The Cash ATM Hero', 'The QR Code Ninja')",
      "reason": "Why they earned this based on the real ledger"
    }
  ]
}`;

      const prompt = `Analyze this group trip: "${tripName}" in ${destination}.
Total Spend: ${summary.currency} ${summary.totalSpend} across ${summary.expenseCount} bills.
Top Categories: ${JSON.stringify(summary.topCategories)}.
Balances and Members: ${JSON.stringify(summary.balances)}.
Sample Expenses: ${JSON.stringify(summary.expenses.slice(0, 15))}.

Write a brilliant, engaging, customized Trip Wrapped story for this group!`;

      const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
      const parsed = cleanJsonParse(result);
      return NextResponse.json({ success: true, data: parsed });
    }

    // ── 5. FREE-FORM TOUR GUIDE CHAT ──
    if (action === 'chat') {
      const destination = body.destination || 'Odisha';
      const chatMessages = body.chatMessages || [];
      const userMessage = body.customPrompt || chatMessages[chatMessages.length - 1]?.content || 'Hello!';

      const systemInstruction = `You are an expert local guide and travel concierge for ${destination}.
Help travelers with real insider knowledge about temples, opening hours, photography restrictions, dress codes, seafood dhabas, beach tides, toll highways, and local customs.
Keep replies friendly, practical, and direct with bullet points where useful.`;

      const result = await callGeminiApi(apiKey, userMessage, systemInstruction, false);
      return NextResponse.json({ success: true, text: result });
    }

    return NextResponse.json({ error: 'INVALID_ACTION', message: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/gemini route:', error);
    return NextResponse.json(
      {
        error: 'GEMINI_ERROR',
        message: error.message || 'Internal error while processing Gemini AI request.',
      },
      { status: 500 }
    );
  }
}
