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

async function callGeminiApi(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  responseJson: boolean = false
): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        payload.generationConfig.responseMimeType = 'application/json';
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Gemini API model ${model} failed (${res.status}): ${errorText}`);
        lastError = new Error(`Gemini API error (${res.status}): ${errorText}`);
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate content from Gemini API.');
}

export async function POST(req: NextRequest) {
  try {
    const headerKey = req.headers.get('x-gemini-api-key');
    const apiKey =
      (headerKey && headerKey.trim().length > 5 ? headerKey.trim() : null) ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'MISSING_API_KEY',
          message:
            'Google Gemini API key not found. Please provide an API key in the app settings or set GEMINI_API_KEY in your environment.',
        },
        { status: 401 }
      );
    }

    const body: GeminiRequestPayload = await req.json();
    const { action } = body;

    // ── 1. GENERATE ITINERARY ──
    if (action === 'generate_itinerary') {
      const destination = body.destination || 'Puri & Konark, Odisha';
      const dayNum = body.dayNumber || 1;
      const membersList = (body.members || []).map((m) => m.name).join(', ') || 'Friends group';
      const prefs = body.preferences || 'Local sightseeing, beach relaxation, authentic Odia food & dhabas';
      const customP = body.customPrompt ? `Special instructions: ${body.customPrompt}` : '';

      const systemInstruction = `You are an expert local tour guide and intelligent travel copilot.
Your job is to generate a realistic, well-timed, high-value day itinerary for a group of friends visiting ${destination}.
Include real local landmarks, temples, scenic spots, dress codes (e.g. temples prohibiting phones, cameras, leather), accurate driving/walking sequences, and top food stops (authentic local eateries, famous dhabas, seafood spots).
You MUST return valid JSON matching this schema:
{
  "dayTitle": "Descriptive and engaging title for Day ${dayNum}",
  "summary": "Brief 2-3 sentence overview of the day's vibe and highlights",
  "activities": [
    {
      "time": "08:30 AM",
      "title": "Clear activity or spot name",
      "location": "Exact landmark, beach, or venue name with city/area",
      "notes": "Actionable local tips, dress code, what to try, or entrance guidance"
    }
  ],
  "dressCodeAndTips": [
    "Crucial rule or dress code alert",
    "Local travel tip"
  ]
}`;

      const prompt = `Generate Day ${dayNum} itinerary for ${destination}.
Group members: ${membersList}.
Preferences/Style: ${prefs}.
${customP}

Generate between 3 to 6 logical activities spread across Morning, Mid-day, Afternoon, Golden Hour/Sunset, and Dinner/Night.
Ensure timings and travel sequence make real geographic sense.`;

      const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
      const parsed = JSON.parse(result);
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
      const parsed = JSON.parse(result);
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
      const parsed = JSON.parse(result);
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
      const parsed = JSON.parse(result);
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
