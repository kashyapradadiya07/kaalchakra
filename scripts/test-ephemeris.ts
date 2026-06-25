// Unit test for Astro ephemeris calculations
import { getPlanetaryPositions, detectPlanetaryEvents } from '../src/lib/ephemeris.ts';
import assert from 'assert';

console.log('Testing Geocentric Planetary Ephemeris...');

try {
  // Test case 1: June 24, 2026.
  // Sun Geocentric Longitude is approx 93 degrees (Cancer)
  const date = new Date('2026-06-24T12:00:00Z');
  const pos = getPlanetaryPositions(date);

  assert.ok(pos.Sun, 'Sun position should be calculated');
  assert.ok(pos.Moon, 'Moon position should be calculated');
  assert.ok(pos.Mercury, 'Mercury position should be calculated');
  assert.ok(pos.Rahu, 'Rahu position should be calculated');

  console.log('Sun Longitude:', pos.Sun.longitude, 'Sign:', pos.Sun.sign, 'Degree:', pos.Sun.signDegree);
  console.log('Moon Longitude:', pos.Moon.longitude, 'Sign:', pos.Moon.sign, 'Degree:', pos.Moon.signDegree);
  console.log('Mercury Longitude:', pos.Mercury.longitude, 'Sign:', pos.Mercury.sign);

  // Validate Sun is in Cancer (~93 deg)
  assert.strictEqual(pos.Sun.sign, 'Cancer', 'Sun on June 24, 2026 should be in Cancer');
  assert.ok(pos.Sun.longitude >= 90 && pos.Sun.longitude <= 95, 'Sun longitude should be between 90 and 95 degrees');

  // Test case 2: Event detection over 30 days
  const startDate = new Date('2026-06-01T00:00:00Z');
  const endDate = new Date('2026-06-30T00:00:00Z');
  const events = detectPlanetaryEvents(startDate, endDate);
  
  console.log(`Detected ${events.length} astronomical events in June 2026.`);
  if (events.length > 0) {
    console.log('Sample event:', events[0]);
  }

  console.log('✅ Ephemeris calculations verified successfully!');
} catch (error) {
  console.error('❌ Test validation failed:');
  console.error(error);
  process.exit(1);
}
