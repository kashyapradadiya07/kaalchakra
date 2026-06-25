'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getScreenerData } from '../actions';
import { Search, Compass, RefreshCw, ChevronUp, ChevronDown, Sparkles, Filter, Check, Info } from 'lucide-react';

interface ScreenerItem {
  symbol: string;
  name: string;
  sector: string;
  close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  rsi: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  date: string | null;
  pctChange: number;
}

type SortField = 'symbol' | 'close' | 'pctChange' | 'volume' | 'rsi';
type SortOrder = 'asc' | 'desc';

export default function ScreenerPage() {
  const [data, setData] = useState<ScreenerItem[]>([]);
  const [filteredData, setFilteredData] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState('All');
  const [selectedRsiFilter, setSelectedRsiFilter] = useState('All');
  const [selectedSmaFilter, setSelectedSmaFilter] = useState('All');
  const [hasVolumeSpike, setHasVolumeSpike] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('pctChange');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const res = await getScreenerData();
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and sort computation
  useEffect(() => {
    let filtered = [...data];

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.symbol.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSector !== 'All') {
      filtered = filtered.filter((item) => item.sector === selectedSector);
    }

    // Price range filter
    if (selectedPriceRange !== 'All') {
      filtered = filtered.filter((item) => {
        if (!item.close) return false;
        switch (selectedPriceRange) {
          case 'under200':
            return item.close < 200;
          case '200to1000':
            return item.close >= 200 && item.close < 1000;
          case '1000to3000':
            return item.close >= 1000 && item.close < 3000;
          case 'above3000':
            return item.close >= 3000;
          default:
            return true;
        }
      });
    }

    // RSI filter
    if (selectedRsiFilter !== 'All') {
      filtered = filtered.filter((item) => {
        if (!item.rsi) return false;
        switch (selectedRsiFilter) {
          case 'overbought':
            return item.rsi >= 70;
          case 'oversold':
            return item.rsi <= 30;
          case 'bullish':
            return item.rsi > 55 && item.rsi < 70;
          case 'bearish':
            return item.rsi > 30 && item.rsi < 45;
          default:
            return true;
        }
      });
    }

    // SMA filters
    if (selectedSmaFilter !== 'All') {
      filtered = filtered.filter((item) => {
        if (!item.close) return false;
        switch (selectedSmaFilter) {
          case 'above20':
            return item.sma_20 ? item.close > item.sma_20 : false;
          case 'above50':
            return item.sma_50 ? item.close > item.sma_50 : false;
          case 'above200':
            return item.sma_200 ? item.close > item.sma_200 : false;
          case 'goldenCross':
            return item.sma_50 && item.sma_200 ? item.sma_50 > item.sma_200 : false;
          case 'deathCross':
            return item.sma_50 && item.sma_200 ? item.sma_50 < item.sma_200 : false;
          default:
            return true;
        }
      });
    }

    // Volume Spike filter (Mock logic: volume greater than 1.5M for general active trade filter)
    if (hasVolumeSpike) {
      filtered = filtered.filter((item) => item.volume ? item.volume > 1500000 : false);
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nulls
      if (valA === null) return 1;
      if (valB === null) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    setFilteredData(filtered);
  }, [
    data,
    searchQuery,
    selectedSector,
    selectedPriceRange,
    selectedRsiFilter,
    selectedSmaFilter,
    hasVolumeSpike,
    sortField,
    sortOrder,
  ]);

  // Extract unique sectors for dropdown filter
  const sectors = ['All', ...Array.from(new Set(data.map((item) => item.sector)))];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatVolume = (vol: number | null) => {
    if (!vol) return '-';
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
    return vol.toString();
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-500" />
            NSE Technical Screener
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze and filter active NSE assets using core SMA overlays and RSI oscillators. 
            Select any stock to inspect its mathematical Gann Square of 9 levels.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/40 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Filter Control Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-5 bg-slate-900/20 border border-slate-900 rounded-2xl">
        {/* Search */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search-input" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker or name..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Sector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sector-select" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Sector</label>
          <select
            id="sector-select"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 text-slate-300"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="price-range-select" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Price Level</label>
          <select
            id="price-range-select"
            value={selectedPriceRange}
            onChange={(e) => setSelectedPriceRange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 text-slate-300"
          >
            <option value="All">All Prices</option>
            <option value="under200">Under ₹200</option>
            <option value="200to1000">₹200 - ₹1,000</option>
            <option value="1000to3000">₹1,000 - ₹3,000</option>
            <option value="above3000">Above ₹3,000</option>
          </select>
        </div>

        {/* RSI Oscillator */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rsi-filter-select" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">RSI Oscillator</label>
          <select
            id="rsi-filter-select"
            value={selectedRsiFilter}
            onChange={(e) => setSelectedRsiFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 text-slate-300"
          >
            <option value="All">All Oscillations</option>
            <option value="overbought">Overbought (&gt;= 70)</option>
            <option value="bullish">Bullish Momentum (55 - 70)</option>
            <option value="bearish">Bearish Momentum (30 - 45)</option>
            <option value="oversold">Oversold (&lt;= 30)</option>
          </select>
        </div>

        {/* SMA Cross / Filter */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trend-filter-select" className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Trend Filter</label>
          <select
            id="trend-filter-select"
            value={selectedSmaFilter}
            onChange={(e) => setSelectedSmaFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 text-slate-300"
          >
            <option value="All">All Trends</option>
            <option value="above20">Price Above SMA(20)</option>
            <option value="above50">Price Above SMA(50)</option>
            <option value="above200">Price Above SMA(200)</option>
            <option value="goldenCross">SMA(50) &gt; SMA(200) [Golden Cross]</option>
            <option value="deathCross">SMA(50) &lt; SMA(200) [Death Cross]</option>
          </select>
        </div>

        {/* Active Volume Spike Toggle */}
        <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-2 pt-2 border-t border-slate-900">
          <button
            onClick={() => setHasVolumeSpike(!hasVolumeSpike)}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              hasVolumeSpike ? 'bg-amber-500 border-transparent text-slate-950' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {hasVolumeSpike && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
          <span className="text-xs text-slate-400 cursor-pointer select-none" onClick={() => setHasVolumeSpike(!hasVolumeSpike)}>
            Limit to high liquidity assets (Volume &gt; 1.5M)
          </span>
        </div>
      </div>

      {/* Main Screener Table Card */}
      <div className="bg-slate-900/10 border border-slate-900 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading and initializing market screener data...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <Filter className="w-8 h-8 text-slate-700" />
            <p className="text-sm font-semibold text-slate-300">No assets match your criteria</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Try adjusting your searches or loosening up indicator thresholds to discover items.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-900 text-[10px] uppercase text-slate-500 tracking-wider font-semibold select-none">
                  <th className="p-3.5 pl-5 cursor-pointer hover:text-slate-300" onClick={() => handleSort('symbol')}>
                    <span className="flex items-center gap-1.5">
                      Symbol
                      {sortField === 'symbol' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </span>
                  </th>
                  <th className="p-3.5">Company Name & Sector</th>
                  <th className="p-3.5 cursor-pointer hover:text-slate-300 text-right" onClick={() => handleSort('close')}>
                    <span className="flex items-center justify-end gap-1.5">
                      Close Price
                      {sortField === 'close' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </span>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:text-slate-300 text-right" onClick={() => handleSort('pctChange')}>
                    <span className="flex items-center justify-end gap-1.5">
                      Change %
                      {sortField === 'pctChange' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </span>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:text-slate-300 text-right" onClick={() => handleSort('volume')}>
                    <span className="flex items-center justify-end gap-1.5">
                      Volume
                      {sortField === 'volume' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </span>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:text-slate-300 text-center" onClick={() => handleSort('rsi')}>
                    <span className="flex items-center justify-center gap-1.5">
                      RSI (14)
                      {sortField === 'rsi' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </span>
                  </th>
                  <th className="p-3.5 text-center">Trend Indicators</th>
                  <th className="p-3.5 text-center pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredData.map((item) => {
                  const isPositive = item.pctChange >= 0;
                  const isRsiOverbought = item.rsi && item.rsi >= 70;
                  const isRsiOversold = item.rsi && item.rsi <= 30;

                  return (
                    <tr key={item.symbol} className="hover:bg-slate-900/30 transition-colors group">
                      {/* Symbol */}
                      <td className="p-3.5 pl-5 font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                        <Link href={`/stock/${item.symbol}`}>
                          {item.symbol}
                        </Link>
                      </td>
                      
                      {/* Name & Sector */}
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-300 text-[11px] truncate max-w-[200px]">{item.name}</p>
                        <span className="text-[10px] text-slate-500 font-medium">{item.sector}</span>
                      </td>

                      {/* Close Price */}
                      <td className="p-3.5 text-right font-bold text-slate-100">
                        ₹{item.close?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Percent Change */}
                      <td className="p-3.5 text-right font-semibold">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] ${
                          isPositive 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isPositive ? '+' : ''}{item.pctChange}%
                        </span>
                      </td>

                      {/* Volume */}
                      <td className="p-3.5 text-right text-slate-400 font-medium">
                        {formatVolume(item.volume)}
                      </td>

                      {/* RSI */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex font-semibold px-2 py-0.5 rounded text-[10px] ${
                          isRsiOverbought 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                            : isRsiOversold 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-900 text-slate-300'
                        }`}>
                          {item.rsi ? item.rsi.toFixed(1) : '-'}
                        </span>
                      </td>

                      {/* SMAs */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.close && item.sma_20 && item.close > item.sma_20 ? (
                            <span className="bg-slate-900 text-[9px] font-semibold text-indigo-400 px-1 py-0.5 rounded border border-indigo-500/10">SMA20</span>
                          ) : null}
                          {item.close && item.sma_50 && item.close > item.sma_50 ? (
                            <span className="bg-slate-900 text-[9px] font-semibold text-blue-400 px-1 py-0.5 rounded border border-blue-500/10">SMA50</span>
                          ) : null}
                          {item.close && item.sma_200 && item.close > item.sma_200 ? (
                            <span className="bg-slate-900 text-[9px] font-semibold text-violet-400 px-1 py-0.5 rounded border border-violet-500/10">SMA200</span>
                          ) : null}
                          {!((item.close && item.sma_20 && item.close > item.sma_20) || 
                             (item.close && item.sma_50 && item.close > item.sma_50) || 
                             (item.close && item.sma_200 && item.close > item.sma_200)) && (
                            <span className="text-slate-600 text-[10px]">No active trend</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center pr-5">
                        <Link
                          href={`/stock/${item.symbol}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-amber-500 hover:text-amber-400 text-[10px] font-semibold active:scale-95 transition-all"
                        >
                          <Sparkles className="w-3 h-3" />
                          Gann Levels
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helper Compliance Info Card */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Technical Calculation Frequency:</span> Daily candle parameters are seeded or fetched at EOD closures. Real-time updates or alerts are strictly omitted. Indicators are evaluated using standard mathematical rules of moving averages and Wilder's RSI smoothing. None of the indicators constitute a call to place broker orders.
        </div>
      </div>
    </div>
  );
}
