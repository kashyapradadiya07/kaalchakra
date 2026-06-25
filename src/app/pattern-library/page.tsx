'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getStocks, Stock } from '@/lib/db';
import { runStockBacktests, getScreenerData } from '../actions';
import { Sparkles, Star, RefreshCw, AlertCircle, ArrowRight, BarChart3, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function PatternLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [backtesting, setBacktesting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPaywall, setIsPaywall] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [narration, setNarration] = useState('');
  const [narrationLoading, setNarrationLoading] = useState(false);

  // Load stocks dropdown list
  const loadStocks = async () => {
    const res = await getScreenerData();
    if (res.success && res.data) {
      setStocks(res.data as any[]);
      if (res.data.length > 0) {
        setSelectedSymbol(res.data[0].symbol);
      }
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUser(session.user);
      await loadStocks();
      setLoading(false);
    };

    checkUser();
  }, []);

  // Run backtests and fetch AI observation when symbol selection updates
  useEffect(() => {
    const executeBacktests = async () => {
      if (!selectedSymbol || !user) return;
      setBacktesting(true);
      setError('');
      setNarration('');

      const res = await runStockBacktests(selectedSymbol, user.id);
      if (res.success && res.results) {
        setResults(res.results);

        // Fetch AI narration
        setNarrationLoading(true);
        try {
          const narrRes = await fetch('/api/narration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbol: selectedSymbol, userId: user.id })
          });
          if (narrRes.ok) {
            const narrData = await narrRes.json();
            if (narrData.success) {
              setNarration(narrData.narration);
            }
          }
        } catch (err) {
          console.error('Error fetching narration:', err);
        } finally {
          setNarrationLoading(false);
        }
      } else if (res.isPaywall) {
        setIsPaywall(true);
      } else {
        setError(res.error || 'Failed to complete backtesting.');
      }
      setBacktesting(false);
    };

    executeBacktests();
  }, [selectedSymbol, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading pattern setups database...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-sm mx-auto">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-200">Sign In Required</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access rule-based pattern libraries and backtesting descriptive statistics.
          </p>
        </div>
        <Link
          href="/login"
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs shadow transition-all flex items-center justify-center"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  // Render Paywall Screen
  if (isPaywall) {
    return (
      <div className="flex items-center justify-center py-10 relative">
        <div className="absolute top-10 w-[300px] h-[300px] bg-rose-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="w-full max-w-xl p-8 bg-slate-900/60 border border-slate-850 rounded-2xl shadow-xl flex flex-col gap-6 text-center items-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-md">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-200">Pattern Backtest Sandbox (Pro Feature)</h1>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
              Run transparent, rule-based setups against years of historical price records and examine descriptive return speeds and direction frequencies.
            </p>
          </div>

          <div className="w-full text-left py-4 px-6 bg-slate-950 border border-slate-900 rounded-xl space-y-3">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Premium Access Includes:</p>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Transparent mathematical rules backtests (no black-box AI modeling)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Descriptive 5-day average forward returns statistics</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Upward/Downward speed frequency mapping (1.5% boundaries)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Historical overlays directly mapped on stock charts</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 w-full">
            <div className="text-sm font-bold text-slate-200">
              ₹499 <span className="text-xs text-slate-500 font-normal">/ month</span>
            </div>
            <Link
              href="/billing"
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow shadow-amber-500/10"
            >
              Upgrade in Billing Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-500" />
          Rule-Based Pattern Library & Backtests
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Examine descriptive historical frequency statistics for transparent, rule-based setups combining Gann zones, technical oscillators, and planetary transits.
        </p>
      </div>

      {/* Selector board */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-900/20 border border-slate-900 rounded-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">
            Select Asset Universe:
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-4 py-2 w-full sm:w-64 focus:outline-none focus:border-amber-500"
          >
            {stocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>
        </div>

        {backtesting && (
          <span className="flex items-center gap-2 text-xs text-amber-500 font-semibold bg-amber-500/5 border border-amber-500/10 px-3.5 py-1.5 rounded-xl shrink-0">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Simulating walk forward backtests...
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Narration layer */}
      {!backtesting && !isPaywall && (narrationLoading || narration) && (
        <div className="p-6 bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-405 animate-pulse" />
              AI Observation Narration - {selectedSymbol}
            </h3>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold">
              Descriptive Statistics
            </span>
          </div>

          {narrationLoading ? (
            <div className="flex items-center gap-2 py-2">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="text-[10.5px] text-slate-400">Synthesizing setup occurrences and planetary markers...</span>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {narration}
            </p>
          )}
        </div>
      )}

      {/* Grid of Results */}
      {!backtesting && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {results.map((r, idx) => {
            const isBullish = r.setupId.includes('support') || r.setupId.includes('ingress');
            return (
              <div 
                key={idx} 
                className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl hover:border-slate-850 hover:bg-slate-900/60 transition-all flex flex-col gap-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    isBullish ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {isBullish ? 'Bullish' : 'Bearish'}
                  </span>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Occurrences</span>
                    <span className="text-sm font-bold text-slate-300">{r.totalOccurrences}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200">{r.setupName}</h3>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">{r.description}</p>
                </div>

                <div className="border-t border-slate-900/80 pt-4 mt-auto flex flex-col gap-2.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Avg 5d Forward Return:</span>
                    <span className={`font-bold ${r.avgForwardReturn5d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {r.avgForwardReturn5d >= 0 ? '+' : ''}{r.avgForwardReturn5d}%
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Upward Speed Frequency (+1.5%):</span>
                    <span className="font-semibold text-slate-300">{r.upwardMovementFrequency5d}%</span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Downward Speed Frequency (-1.5%):</span>
                    <span className="font-semibold text-slate-300">{r.downwardMovementFrequency5d}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compliance statement card */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Descriptive Historical Analysis:</span> All statistics generated above are strictly historical observations showing frequency rates of price movements after conditions were met. They represent mathematical observations and do not suggest expected returns, pricing levels, action-zones, or future performance.
        </div>
      </div>
    </div>
  );
}
