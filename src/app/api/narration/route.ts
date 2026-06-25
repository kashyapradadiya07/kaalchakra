// API Route for SEBI-compliant AI Narration of technical & astro setups
import { NextResponse } from 'next/server';
import { hasProAccess } from '@/lib/billing';
import { getDailyPrices } from '@/lib/db';
import { detectPlanetaryEvents } from '@/lib/ephemeris';
import { calculateGannLevels } from '@/lib/gann';
import { SETUPS } from '@/lib/rulesEngine';
import { generateAIObservation } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { symbol, userId } = await request.json();

    if (!symbol || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: symbol and userId are required.' },
        { status: 400 }
      );
    }

    // 1. Server-side entitlement check
    const isPro = await hasProAccess(userId);
    if (!isPro) {
      return NextResponse.json(
        { error: 'Pro membership required to access AI Narration.' },
        { status: 403 }
      );
    }

    // 2. Fetch daily prices
    const uppercaseSymbol = symbol.toUpperCase();
    const prices = await getDailyPrices(uppercaseSymbol);
    if (prices.length === 0) {
      return NextResponse.json(
        { error: `No price history available for ${uppercaseSymbol}.` },
        { status: 404 }
      );
    }

    // Sort ascending by date
    const sortedHistory = [...prices].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latest = sortedHistory[sortedHistory.length - 1];

    // 3. Pre-calculate planetary events over history range
    const start = new Date(sortedHistory[0].date);
    const end = new Date(sortedHistory[sortedHistory.length - 1].date);
    const astroEvents = detectPlanetaryEvents(start, end);
    const retrogradeDates = new Set<string>();
    const ingressDates = new Set<string>();

    astroEvents.forEach((e) => {
      if (e.type === 'retrograde_start' || e.type === 'retrograde_end') {
        retrogradeDates.add(e.date);
      } else if (e.type === 'ingress') {
        ingressDates.add(e.date);
      }
    });

    // 4. Evaluate which setups are active on the latest date
    const idx = sortedHistory.length - 1;
    const activeSetups = SETUPS.filter((setup) =>
      setup.evaluate(latest, sortedHistory, idx, retrogradeDates, ingressDates)
    ).map((s) => ({
      name: s.name,
      description: s.description,
      direction: s.direction,
    }));

    // 5. Find Gann Levels
    const gannLevels = calculateGannLevels(latest.close, 1);
    const gannSupport = gannLevels.length > 0 ? gannLevels[0].support : latest.close * 0.98;
    const gannResistance = gannLevels.length > 0 ? gannLevels[0].resistance : latest.close * 1.02;

    // 6. Find planetary events within 3 days of the latest date
    const latestTime = new Date(latest.date).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const nearEvents = astroEvents.filter((e) => {
      const diffDays = Math.abs(new Date(e.date).getTime() - latestTime) / dayMs;
      return diffDays <= 3;
    });

    const retrogrades = nearEvents
      .filter((e) => e.type === 'retrograde_start' || e.type === 'retrograde_end')
      .map(
        (e) =>
          `${e.planet} ${e.type === 'retrograde_start' ? 'Retrograde Start' : 'Retrograde End'}`
      );

    const ingresses = nearEvents
      .filter((e) => e.type === 'ingress')
      .map((e) => e.description);

    // 7. Invoke compliance-wrapped Gemini AI Generator
    const narration = await generateAIObservation({
      symbol: uppercaseSymbol,
      close: latest.close,
      date: latest.date,
      activeSetups,
      retrogrades,
      ingresses,
      gannSupport,
      gannResistance,
    });

    return NextResponse.json({
      success: true,
      symbol: uppercaseSymbol,
      date: latest.date,
      close: latest.close,
      activeSetups,
      narration,
    });
  } catch (error: any) {
    console.error('Error generating AI Narration response:', error);
    return NextResponse.json(
      { error: error.message || 'Server error occurred during AI narration generation.' },
      { status: 500 }
    );
  }
}
