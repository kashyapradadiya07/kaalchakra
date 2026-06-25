// Gemini LLM Narration Client for compliance-filtered descriptive market insights
// Uses lightweight native fetch to call Gemini API and falls back to dynamic templates if key is missing/fails.

import { sanitizeAndFilterText } from './complianceFilter';

export interface NarrationData {
  symbol: string;
  close: number;
  date: string;
  activeSetups: { name: string; description: string; direction: string }[];
  retrogrades: string[];
  ingresses: string[];
  gannSupport: number;
  gannResistance: number;
}

/**
 * Invokes the Gemini API to get a compliance-filtered narration, or returns a high-fidelity mock if unavailable.
 */
export async function generateAIObservation(data: NarrationData): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  const setupList = data.activeSetups.map(s => `- ${s.name} (${s.direction}): ${s.description}`).join('\n') || 'None';
  const retroList = data.retrogrades.join(', ') || 'None';
  const ingressList = data.ingresses.join(', ') || 'None';

  const systemPrompt = `You are Kaalchakra, an educational market analysis assistant. 
Your goal is to provide a neutral, descriptive observation of the technical and astronomical state of ${data.symbol} for the date ${data.date}.

Strict Compliance Rules (SEBI / Regulatory Alignment):
- NEVER use these forbidden words: "buy", "sell", "target", "recommend", "signal", "prediction", "advice" (or any variations/plurals).
- Use these approved terms instead: "level", "zone", "pattern", "historical frequency", "observation".
- Focus purely on historical descriptive statistics and mathematical observations.
- Keep the tone academic, educational, and observational. Do not forecast, promise returns, or suggest any future directional certainty.

Asset Data:
- Symbol: ${data.symbol}
- Close Price: ${data.close}
- Active Rule Setups: 
${setupList}
- Gann Levels: Support ${data.gannSupport}, Resistance ${data.gannResistance}
- Planetary Stations: Retrogrades: ${retroList}, Ingresses: ${ingressList}

Provide a short, 2-3 sentence observation summarizing the alignment of the technical and astronomical levels without recommending action.`;

  let rawResponse = '';

  if (apiKey) {
    try {
      console.log('Invoking Gemini API for compliance-filtered narration...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 150,
            },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        rawResponse = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        const errText = await response.text();
        console.error('Gemini API returned error status:', response.status, errText);
      }
    } catch (err) {
      console.error('Failed to communicate with Gemini API:', err);
    }
  }

  // Fallback to local high-fidelity generator if Gemini is missing or failed
  if (!rawResponse) {
    console.log('Using local high-fidelity mock generator for narration...');
    rawResponse = generateLocalFallbackNarration(data);
  }

  // Clean the narration using the compliance regex filter
  const sanitizedResult = sanitizeAndFilterText(rawResponse);
  
  return sanitizedResult;
}

/**
 * Local high-fidelity mock narration generator that aligns with compliance guidelines.
 */
function generateLocalFallbackNarration(data: NarrationData): string {
  const { symbol, close, activeSetups, retrogrades, ingresses, gannSupport, gannResistance } = data;
  
  if (activeSetups.length > 0) {
    const primarySetup = activeSetups[0];
    const isBullish = primarySetup.direction === 'bullish';
    const zoneType = isBullish ? 'support/accumulation zone' : 'resistance/distribution zone';
    
    let text = `Historical pattern observation: On this period, ${symbol} closing at ${close} has matched conditions for the "${primarySetup.name}". `;
    text += `The asset price is trading within close proximity to the Gann ${isBullish ? 'Support' : 'Resistance'} level of ${isBullish ? gannSupport : gannResistance}, aligning with a critical mathematical ${zoneType}. `;
    
    if (retrogrades.length > 0) {
      text += `Planetary ephemeris notes a retrograde station (${retrogrades.join(', ')}) in this date window, showing a correlation with historical frequency points. `;
    } else if (ingresses.length > 0) {
      text += `An ingress event (${ingresses.join(', ')}) was detected, representing a mathematical boundary ingress. `;
    } else {
      text += `Astronomical indicators remain in standard geocentric coordinates. `;
    }
    
    text += `Historically, assets meeting these conditions have exhibited specific behaviors within these zones. This observation is for educational statistics, not financial advisory.`;
    return text;
  } else {
    let text = `Descriptive overview for ${symbol}: The asset closed at ${close}, positioned between the Gann Support of ${gannSupport} and Resistance of ${gannResistance}. `;
    text += `No active rule setups are currently matched for this period. `;
    
    if (retrogrades.length > 0 || ingresses.length > 0) {
      const events = [...retrogrades, ...ingresses].join(', ');
      text += `Planetary events observed include ${events}, which serves as a coordinate markers reference on the timeline. `;
    } else {
      text += `Planetary longitudes indicate normal geocentric alignment. `;
    }
    
    text += `Price actions continue to respect standard mathematical levels without showing deviations from the historical frequency baseline.`;
    return text;
  }
}
