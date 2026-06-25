// Unit test for Gann Square of 9 calculations
import { calculateGannLevels } from '../src/lib/gann.ts';
import assert from 'assert';

console.log('Testing W.D. Gann Square of 9 Calculator...');

try {
  // Test case 1: Standard input price of 100
  // Sqrt(100) = 10
  // 180 degrees resistance = (10 + (180/180))^2 = 11^2 = 121
  // 180 degrees support = (10 - (180/180))^2 = 9^2 = 81
  const levels100 = calculateGannLevels(100, 1);
  
  const level180 = levels100.find(l => l.angle === 180);
  assert.ok(level180, 'Angle 180 should be present in results');
  assert.strictEqual(level180.resistance, 121, '180 degree resistance for price 100 should be 121');
  assert.strictEqual(level180.support, 81, '180 degree support for price 100 should be 81');
  
  // Test case 2: 360 degrees rotation for price 100
  // Sqrt(100) = 10
  // 360 degrees resistance = (10 + 2)^2 = 12^2 = 144
  // 360 degrees support = (10 - 2)^2 = 8^2 = 64
  const level360 = levels100.find(l => l.angle === 360);
  assert.ok(level360, 'Angle 360 should be present in results');
  assert.strictEqual(level360.resistance, 144, '360 degree resistance for price 100 should be 144');
  assert.strictEqual(level360.support, 64, '360 degree support for price 100 should be 64');

  // Test case 3: Invalid input
  const levelsInvalid = calculateGannLevels(0);
  assert.strictEqual(levelsInvalid.length, 0, 'Invalid price should return empty array');

  // Test case 4: Cardinal identification
  const level90 = levels100.find(l => l.angle === 90);
  const level45 = levels100.find(l => l.angle === 45);
  assert.strictEqual(level90?.isCardinal, true, '90 degrees should be a cardinal angle');
  assert.strictEqual(level45?.isCardinal, false, '45 degrees should not be a cardinal angle');

  console.log('✅ All Gann calculations tests passed successfully!');
} catch (error) {
  console.error('❌ Test validation failed:');
  console.error(error);
  process.exit(1);
}
