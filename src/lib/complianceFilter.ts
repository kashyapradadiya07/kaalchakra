// Server-side Compliance Filter for Financial Regulatory Alignment
// Strictly avoids advisory words: buy, sell, target, recommend, signal, prediction, advice
// Replaces them with: level, zone, pattern, historical frequency, observation

const FORBIDDEN_WORDS = [
  'buy',
  'sell',
  'target',
  'recommend',
  'signal',
  'prediction',
  'advice'
];

// Compile a strict check regex
const FORBIDDEN_CHECK_REGEX = new RegExp(
  `\\b(${FORBIDDEN_WORDS.join('|')})(s|ing|ed|er|ers|ation|ations|y|ies)?\\b`,
  'i'
);

// Map of replacements for auto-rephrasing
const REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  // Buy & variations
  { pattern: /\b(buy|buys|buying|buyer|buyers)\b/gi, replacement: 'observation zone' },
  // Sell & variations
  { pattern: /\b(sell|sells|selling|seller|sellers)\b/gi, replacement: 'distribution zone' },
  // Target & variations
  { pattern: /\b(target|targets|targeting|targeted)\b/gi, replacement: 'level' },
  // Recommend & variations
  { pattern: /\b(recommend|recommends|recommending|recommended|recommendation|recommendations)\b/gi, replacement: 'observe' },
  // Signal & variations
  { pattern: /\b(signal|signals|signaled|signaling|signalled|signalling)\b/gi, replacement: 'pattern' },
  // Prediction & variations
  { pattern: /\b(prediction|predictions|predict|predicts|predicting|predicted)\b/gi, replacement: 'historical frequency' },
  // Advice & variations
  { pattern: /\b(advice|advise|advises|advising|advisers|advisors|advisory)\b/gi, replacement: 'educational analysis' }
];

/**
 * Checks if a string contains any forbidden words (case-insensitive, matching word boundaries and suffixes).
 */
export function hasForbiddenWords(text: string): boolean {
  return FORBIDDEN_CHECK_REGEX.test(text);
}

/**
 * Auto-rephrases text by substituting forbidden words with compliant educational/descriptive equivalents.
 */
export function rephraseComplianceText(text: string): string {
  let cleaned = text;
  for (const { pattern, replacement } of REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

/**
 * Ensures text is fully compliant. Auto-rephrases the text first. If any forbidden terms remain
 * (due to obscure variations), returns a generic compliant fallback statement.
 */
export function sanitizeAndFilterText(text: string): string {
  if (!text) return '';
  
  // First attempt auto-rephrase
  const rephrased = rephraseComplianceText(text);
  
  // Double check if any forbidden words still linger
  if (hasForbiddenWords(rephrased)) {
    console.warn(`Compliance Warning: Text contains forbidden words even after rephrasing: "${rephrased}". Blocking output.`);
    return 'Descriptive historical observation: The asset price aligns with standard mathematical levels. Users should monitor relevant support and resistance zones based on historical frequency.';
  }
  
  return rephrased;
}
