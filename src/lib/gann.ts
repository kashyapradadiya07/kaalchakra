// W.D. Gann Square of 9 Price Level Calculator
// Strictly educational math utility.

export interface GannLevel {
  angle: number;
  cycle: number;
  factor: number;
  resistance: number;
  support: number;
  isCardinal: boolean; // 90, 180, 270, 360
}

/**
 * Calculates Gann Square of 9 levels (resistance and support) for a given pivot price.
 * 
 * Formula:
 * Resistance = (sqrt(Price) + (Angle / 180))^2
 * Support = (sqrt(Price) - (Angle / 180))^2
 * 
 * @param price Pivot price to calculate levels around
 * @param cycles Number of full 360-degree rotations (default 2)
 */
export function calculateGannLevels(price: number, cycles: number = 2): GannLevel[] {
  if (!price || price <= 0) {
    return [];
  }

  const root = Math.sqrt(price);
  const levels: GannLevel[] = [];

  // Core Gann angles in a single 360-degree cycle
  const baseAngles = [45, 90, 135, 180, 225, 270, 315, 360];

  for (let c = 1; c <= cycles; c++) {
    const angleOffset = (c - 1) * 360;

    for (const angle of baseAngles) {
      const targetAngle = angle + angleOffset;
      const factor = targetAngle / 180;

      // Resistance level
      const resistanceVal = Math.pow(root + factor, 2);
      
      // Support level (ensure we don't go below zero)
      const supportVal = Math.max(0.01, Math.pow(root - factor, 2));

      // Cardinal angles are multiples of 90 (90, 180, 270, 360, 450, 540, 630, 720)
      const isCardinal = targetAngle % 90 === 0;

      levels.push({
        angle: targetAngle,
        cycle: c,
        factor,
        resistance: parseFloat(resistanceVal.toFixed(2)),
        support: parseFloat(supportVal.toFixed(2)),
        isCardinal,
      });
    }
  }

  return levels;
}
