// Test script for compliance filter regulatory alignment
import { hasForbiddenWords, rephraseComplianceText, sanitizeAndFilterText } from '../src/lib/complianceFilter.ts';

const testCases = [
  {
    input: 'You should buy TCS at this support level.',
    expectedContainsNoForbidden: true,
  },
  {
    input: 'Selling pressure is increasing near the resistance level.',
    expectedContainsNoForbidden: true,
  },
  {
    input: 'The target price for Reliance is 2600.',
    expectedContainsNoForbidden: true,
  },
  {
    input: 'We recommend this stock for long term investment.',
    expectedContainsNoForbidden: true,
  },
  {
    input: 'The system generated a strong buy signal.',
    expectedContainsNoForbidden: true,
  },
  {
    input: 'Our prediction is that the market will reverse near retrograde dates.',
    expectedContainsNoForbidden: true,
  },
  {
    input: 'This is educational advice only.',
    expectedContainsNoForbidden: true,
  }
];

let failed = false;

console.log('--- RUNNING COMPLIANCE FILTER TESTS ---');
testCases.forEach((tc, idx) => {
  console.log(`\nTest Case ${idx + 1}:`);
  console.log(`Original:  "${tc.input}"`);
  
  const hasBefore = hasForbiddenWords(tc.input);
  console.log(`Has forbidden words before filter: ${hasBefore}`);
  
  const sanitized = sanitizeAndFilterText(tc.input);
  console.log(`Sanitized: "${sanitized}"`);
  
  const hasAfter = hasForbiddenWords(sanitized);
  console.log(`Has forbidden words after filter:  ${hasAfter}`);
  
  if (hasAfter) {
    console.error(`❌ FAIL: Output still contains forbidden words!`);
    failed = true;
  } else {
    console.log(`✅ PASS`);
  }
});

console.log('\nTesting direct replacement check:');
const edgeCase = 'Our targets are hit, recommend immediate sells and buys. Strong signal prediction advise.';
console.log(`Input:  "${edgeCase}"`);
const edgeCleaned = sanitizeAndFilterText(edgeCase);
console.log(`Result: "${edgeCleaned}"`);
if (hasForbiddenWords(edgeCleaned)) {
  console.error(`❌ FAIL: Edge case still has forbidden words!`);
  failed = true;
} else {
  console.log(`✅ PASS`);
}

if (failed) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL COMPLIANCE FILTER TESTS PASSED');
  process.exit(0);
}
