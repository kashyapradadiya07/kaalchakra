'use client';

import React, { useState } from 'react';
import { calculateGannLevels, GannLevel } from '@/lib/gann';
import { Target, HelpCircle } from 'lucide-react';

interface GannWheelProps {
  price: number;
}

export default function GannWheel({ price }: GannWheelProps) {
  const [selectedCycles, setSelectedCycles] = useState<number>(2);
  const levels = calculateGannLevels(price, selectedCycles);
  const [hoveredLevel, setHoveredLevel] = useState<any>(null);

  // Position nodes radially around a center point
  // 0 degrees starts at the top (modified angleRad calculation)
  const getPosition = (angle: number, cycle: number) => {
    // Offset by -90 deg so that 0/360 is at the top
    const rad = ((angle - 90) * Math.PI) / 180;
    // Map cycles to radii: Cycle 1 = 120px, Cycle 2 = 190px
    const radius = 60 + cycle * 65;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    return { x, y };
  };

  const centerPrice = parseFloat(price.toFixed(2));

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full">
      {/* Controls & Header */}
      <div className="flex justify-between items-center w-full pb-4 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-200">Gann Wheel Visualizer</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">Cycles:</label>
          <select
            value={selectedCycles}
            onChange={(e) => setSelectedCycles(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value={1}>1 Cycle (8 Levels)</option>
            <option value={2}>2 Cycles (16 Levels)</option>
            <option value={3}>3 Cycles (24 Levels)</option>
          </select>
        </div>
      </div>

      {/* The Radial Wheel Container */}
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center bg-slate-950 rounded-full border border-slate-900/50 p-4">
        {/* SVG background grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 420 420">
          <g transform="translate(210, 210)">
            {/* Concentric circles */}
            <circle r="40" className="fill-none stroke-slate-900" strokeWidth="1" />
            <circle r="125" className="fill-none stroke-slate-900/70" strokeWidth="1.5" />
            {selectedCycles >= 2 && (
              <circle r="190" className="fill-none stroke-slate-900/40" strokeWidth="1.5" />
            )}
            {selectedCycles >= 3 && (
              <circle r="255" className="fill-none stroke-slate-900/20" strokeWidth="1.5" />
            )}

            {/* Angle dividing axes lines */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = ((angle - 90) * Math.PI) / 180;
              const maxRadius = 60 + selectedCycles * 65;
              const x2 = Math.cos(rad) * maxRadius;
              const y2 = Math.sin(rad) * maxRadius;
              return (
                <line
                  key={angle}
                  x1="0"
                  y1="0"
                  x2={x2}
                  y2={y2}
                  className="stroke-slate-900/50"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}
          </g>
        </svg>

        {/* Center Node (Pivot Price) */}
        <div className="absolute z-10 w-20 h-20 rounded-full bg-slate-900 border-2 border-amber-500/80 shadow-lg shadow-amber-500/10 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-500/70">Pivot</span>
          <span className="text-xs font-bold text-slate-100">{centerPrice}</span>
        </div>

        {/* Radial Level Nodes */}
        {levels.map((level, idx) => {
          // Compute positions using 210x210 center reference for 420x420 dimensions
          const pos = getPosition(level.angle, level.cycle);
          // Scale from 420 width to percentage relative to container
          const leftPercent = `calc(50% + ${pos.x}px)`;
          const topPercent = `calc(50% + ${pos.y}px)`;

          // Highlight card/ord colors
          const borderStyle = level.isCardinal
            ? 'border-indigo-500/70 hover:border-indigo-400'
            : 'border-slate-800 hover:border-slate-600';

          return (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: leftPercent, top: topPercent }}
            >
              {/* Radial bubble */}
              <button
                className={`w-10 h-10 rounded-full flex flex-col items-center justify-center bg-slate-900 border text-[9px] font-medium transition-all duration-200 cursor-help active:scale-95 shadow-md ${borderStyle} ${
                  hoveredLevel?.angle === level.angle && hoveredLevel?.cycle === level.cycle
                    ? 'ring-2 ring-amber-500 bg-slate-800 scale-105 border-transparent'
                    : 'text-slate-300'
                }`}
                onMouseEnter={() => setHoveredLevel(level)}
                onMouseLeave={() => setHoveredLevel(null)}
              >
                <span className="font-bold text-slate-100 text-[8px]">{level.angle}°</span>
                <span className="text-[7px] text-slate-400">{level.cycle}C</span>
              </button>

              {/* Tooltip trigger angle marker */}
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-slate-900 border border-slate-800 text-[7px] text-slate-400 px-1 py-0.5 rounded pointer-events-none uppercase whitespace-nowrap">
                {level.isCardinal ? 'Cardinal' : 'Ordinal'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Info Display / Hover Details */}
      <div className="w-full min-h-[92px] p-4 rounded-xl bg-slate-900/60 border border-slate-900 flex flex-col justify-center">
        {hoveredLevel ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Angle & Rotation
              </p>
              <p className="text-sm font-bold text-slate-200">
                {hoveredLevel.angle}° <span className="text-xs text-slate-400 font-normal">({hoveredLevel.isCardinal ? 'Cardinal Axis' : 'Ordinal Diagonal'}, Cycle {hoveredLevel.cycle})</span>
              </p>
              <p className="text-[9px] text-slate-500 mt-1">
                Math Factor: +{(hoveredLevel.factor).toFixed(2)} to √Pivot
              </p>
            </div>
            <div className="flex flex-col gap-1 border-l border-slate-800 pl-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-rose-500 mr-2">Support:</span>
                <span className="text-xs font-semibold text-rose-300">{hoveredLevel.support}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-500 mr-2">Resistance:</span>
                <span className="text-xs font-semibold text-emerald-300">{hoveredLevel.resistance}</span>
              </div>
              <p className="text-[8px] text-slate-500 italic mt-0.5">
                Price levels from pivot {centerPrice}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-400 py-2">
            <HelpCircle className="w-5 h-5 text-indigo-500 animate-pulse" />
            <div className="text-xs">
              <p className="font-semibold text-slate-300">Interactive Visualization</p>
              <p className="text-[11px] text-slate-500">
                Hover over any node in the circular wheel to inspect the computed Support/Resistance values.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Static Summary Table */}
      <details className="w-full">
        <summary className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold py-1 outline-none text-center select-none">
          View Complete Levels Table
        </summary>
        <div className="mt-4 max-h-[220px] overflow-y-auto border border-slate-900 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-500 tracking-wider">
                <th className="p-2.5 pl-4">Angle</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5 text-rose-500">Support</th>
                <th className="p-2.5 text-emerald-500">Resistance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {levels.map((level, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-900/50 transition-colors ${
                    level.isCardinal ? 'bg-slate-900/10' : ''
                  }`}
                >
                  <td className="p-2.5 pl-4 font-semibold text-slate-300">
                    {level.angle}° <span className="text-[10px] text-slate-500">({level.cycle}C)</span>
                  </td>
                  <td className="p-2.5 text-slate-400 text-[10px]">
                    {level.isCardinal ? (
                      <span className="text-indigo-400 font-medium">Cardinal</span>
                    ) : (
                      <span className="text-slate-500">Ordinal</span>
                    )}
                  </td>
                  <td className="p-2.5 font-semibold text-rose-400">{level.support}</td>
                  <td className="p-2.5 font-semibold text-emerald-400">{level.resistance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
