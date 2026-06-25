'use client';

import React, { useState } from 'react';
import GannWheel from '@/components/GannWheel';
import { Target, HelpCircle, Info } from 'lucide-react';

export default function GannPage() {
  const [priceInput, setPriceInput] = useState<string>('100');
  const [activePrice, setActivePrice] = useState<number>(100);
  const [error, setError] = useState<string>('');

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(priceInput);
    
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive price level.');
      return;
    }

    setError('');
    setActivePrice(val);
  };

  return (
    <div className="flex flex-col gap-6 py-4 max-w-4xl mx-auto w-full">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
          <Target className="w-6 h-6 text-amber-500" />
          Gann Square of 9 Calculator
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Calculate mathematical price support and resistance levels using W.D. Gann's concentric root-vibration algorithm. 
        </p>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left column: Manual Input & Instructions */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Set Reference Level</h2>
            
            <form onSubmit={handleCalculate} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="price-input" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Reference Price (Pivot)
                </label>
                <div className="flex gap-2">
                  <input
                    id="price-input"
                    type="number"
                    step="any"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="e.g. 2450.5"
                    className="flex-1 px-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 text-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow shadow-amber-500/10 transition-all active:scale-95"
                  >
                    Calculate
                  </button>
                </div>
                {error && <span className="text-[10px] text-rose-500 font-medium">{error}</span>}
              </div>
            </form>

            <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-900 pt-4 space-y-2">
              <p className="font-semibold text-slate-300">How to use:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Input a significant recent pivot high, low, or last traded close price.</li>
                <li>The calculator will extract the mathematical square root of this value.</li>
                <li>Adding step constants outputs resistance zones; subtracting outputs support zones.</li>
                <li>Hover over the radial nodes on the right to examine specific angle calculations.</li>
              </ul>
            </div>
          </div>

          <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">The Square of 9 theory:</span> W.D. Gann believed that financial price movements vibrationally synchronize with geometrical angles. A full 360-degree rotation of price is mapped by adding 2.00 to the square root of the price, completing a circle in the spiral grid.
            </div>
          </div>
        </div>

        {/* Right column: Interactive Wheel */}
        <div className="md:col-span-7 flex justify-center">
          <GannWheel price={activePrice} />
        </div>
      </div>

      {/* Compliance Disclaimer Footer Note */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl mt-4">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Observation Mode Only:</span> The values generated by the Gann Square of 9 are purely mathematical projections based on historical formulas. They represent pivot structures and do not predict direction, guarantee market reactions, or suggest executable trades.
        </div>
      </div>
    </div>
  );
}
