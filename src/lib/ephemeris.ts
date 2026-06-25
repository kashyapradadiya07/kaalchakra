// Geocentric planetary ephemeris calculation using astronomia
// Implements Jean Meeus algorithms. Strictly educational.

import { julian } from 'astronomia';
import * as planetposition from 'astronomia/planetposition';
import * as moonposition from 'astronomia/moonposition';

// Import VSOP87 heliocentric datasets
import earthData from 'astronomia/data/vsop87Bearth';
import mercuryData from 'astronomia/data/vsop87Bmercury';
import venusData from 'astronomia/data/vsop87Bvenus';
import marsData from 'astronomia/data/vsop87Bmars';
import jupiterData from 'astronomia/data/vsop87Bjupiter';
import saturnData from 'astronomia/data/vsop87Bsaturn';

// Initialize planet instances
const Earth = new planetposition.Planet(earthData);
const Mercury = new planetposition.Planet(mercuryData);
const Venus = new planetposition.Planet(venusData);
const Mars = new planetposition.Planet(marsData);
const Jupiter = new planetposition.Planet(jupiterData);
const Saturn = new planetposition.Planet(saturnData);

export interface PlanetaryPosition {
  name: string;
  longitude: number; // 0 to 360 degrees
  sign: string;      // Zodiac Sign Name
  signDegree: number; // 0 to 30 degree in sign
}

export interface AstroEvent {
  date: string; // YYYY-MM-DD
  planet: string;
  type: 'retrograde_start' | 'retrograde_end' | 'ingress';
  description: string;
}

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Maps ecliptic longitude (0-360) to zodiac sign name and degree.
 */
export function getZodiacInfo(longitude: number): { sign: string; degree: number } {
  const normLon = ((longitude % 360) + 360) % 360;
  const idx = Math.floor(normLon / 30);
  const degree = normLon % 30;
  return {
    sign: ZODIAC_SIGNS[idx],
    degree: parseFloat(degree.toFixed(2))
  };
}

const toDeg = (rad: number): number => {
  let deg = (rad * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
};

/**
 * Calculates geocentric ecliptic longitudes for Sun, Moon, and 5 classical planets + Rahu/Ketu.
 */
export function getPlanetaryPositions(date: Date): Record<string, PlanetaryPosition> {
  const jde = julian.DateToJD(date);
  
  // 1. Earth Position (used for geocentric parallax offset on heliocentric planets)
  const p_e = Earth.position(jde);
  const xe = p_e.range * Math.cos(p_e.lat) * Math.cos(p_e.lon);
  const ye = p_e.range * Math.cos(p_e.lat) * Math.sin(p_e.lon);
  const ze = p_e.range * Math.sin(p_e.lat);

  // Helper to compute geocentric longitude from a planet
  const getGeoLon = (planet: planetposition.Planet): number => {
    const p_p = planet.position(jde);
    const xp = p_p.range * Math.cos(p_p.lat) * Math.cos(p_p.lon);
    const yp = p_p.range * Math.cos(p_p.lat) * Math.sin(p_p.lon);
    const zp = p_p.range * Math.sin(p_p.lat);
    
    const x = xp - xe;
    const y = yp - ye;
    const z = zp - ze;
    
    let geo = Math.atan2(y, x);
    return toDeg(geo);
  };

  // 2. Calculations
  const positions: Record<string, number> = {};

  // Sun geocentric longitude = Earth heliocentric longitude + 180 degrees
  positions['Sun'] = toDeg(p_e.lon + Math.PI);
  
  // Moon geocentric longitude (direct)
  const p_m = moonposition.position(jde);
  positions['Moon'] = toDeg(p_m.lon);

  // Rahu (Mean ascending lunar node)
  const rahuRad = moonposition.node(jde);
  positions['Rahu'] = toDeg(rahuRad);
  
  // Ketu (Opposite of Rahu)
  positions['Ketu'] = toDeg(rahuRad + Math.PI);

  // Classical planets
  positions['Mercury'] = getGeoLon(Mercury);
  positions['Venus'] = getGeoLon(Venus);
  positions['Mars'] = getGeoLon(Mars);
  positions['Jupiter'] = getGeoLon(Jupiter);
  positions['Saturn'] = getGeoLon(Saturn);

  // Format response
  const results: Record<string, PlanetaryPosition> = {};
  Object.keys(positions).forEach((name) => {
    const lon = positions[name];
    const { sign, degree } = getZodiacInfo(lon);
    results[name] = {
      name,
      longitude: parseFloat(lon.toFixed(4)),
      sign,
      signDegree: degree
    };
  });

  return results;
}

/**
 * Detects retrogrades and sign ingresses in a calendar range.
 */
export function detectPlanetaryEvents(startDate: Date, endDate: Date): AstroEvent[] {
  const events: AstroEvent[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // We scan day by day
  const dailyPositions: { dateStr: string; pos: Record<string, number> }[] = [];

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const positions = getPlanetaryPositions(current);
    
    const dayMap: Record<string, number> = {};
    Object.keys(positions).forEach((name) => {
      dayMap[name] = positions[name].longitude;
    });

    dailyPositions.push({ dateStr, pos: dayMap });
    current.setDate(current.getDate() + 1);
  }

  if (dailyPositions.length < 2) return [];

  // Track state to identify transitions
  // A planet speed goes negative: retrograde starts. Speed goes positive: retrograde ends.
  // We skip Sun, Moon, Rahu, Ketu for retrograde. Rahu and Ketu are always retrograde in Mean calculations.
  const planetsToTrack = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

  // Keep track of speeds and sign index
  for (let i = 1; i < dailyPositions.length - 1; i++) {
    const prev = dailyPositions[i - 1];
    const curr = dailyPositions[i];
    const next = dailyPositions[i + 1];

    planetsToTrack.forEach((planet) => {
      const p1 = prev.pos[planet];
      const p2 = curr.pos[planet];
      const p3 = next.pos[planet];

      // Calculate daily differences, handling boundary wrap-around (360 -> 0)
      const diff1 = getDiff(p2, p1);
      const diff2 = getDiff(p3, p2);

      // Retrograde transitions
      if (diff1 >= 0 && diff2 < 0) {
        events.push({
          date: curr.dateStr,
          planet,
          type: 'retrograde_start',
          description: `${planet} goes Retrograde station.`
        });
      } else if (diff1 < 0 && diff2 >= 0) {
        events.push({
          date: curr.dateStr,
          planet,
          type: 'retrograde_end',
          description: `${planet} ends Retrograde and goes Direct.`
        });
      }

      // Ingress transitions: sign crosses 30 degree boundaries
      const signIdxPrev = Math.floor(p1 / 30);
      const signIdxCurr = Math.floor(p2 / 30);

      if (signIdxPrev !== signIdxCurr) {
        events.push({
          date: curr.dateStr,
          planet,
          type: 'ingress',
          description: `${planet} enters ${ZODIAC_SIGNS[signIdxCurr]} from ${ZODIAC_SIGNS[signIdxPrev]}.`
        });
      }
    });

    // Sun, Moon ingress checks
    ['Sun', 'Moon'].forEach((planet) => {
      const p1 = prev.pos[planet];
      const p2 = curr.pos[planet];
      
      const signIdxPrev = Math.floor(p1 / 30);
      const signIdxCurr = Math.floor(p2 / 30);

      if (signIdxPrev !== signIdxCurr) {
        events.push({
          date: curr.dateStr,
          planet,
          type: 'ingress',
          description: `${planet} enters ${ZODIAC_SIGNS[signIdxCurr]} from ${ZODIAC_SIGNS[signIdxPrev]}.`
        });
      }
    });
  }

  return events;
}

// Computes standard difference between angles, taking wrapping into account
function getDiff(angle2: number, angle1: number): number {
  let diff = angle2 - angle1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}
