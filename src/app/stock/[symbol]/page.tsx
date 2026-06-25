'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStockDetailData } from '../../actions';
import GannWheel from '@/components/GannWheel';
import { supabase } from '@/lib/supabase';
import { 
  RefreshCw, 
  ChevronLeft, 
  Calendar, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  BarChart4, 
  Lock, 
  Star, 
  Moon,
  Sparkles 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import Link from 'next/link';

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params?.symbol as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stock, setStock] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [pctChange, setPctChange] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  
  // Pro States
  const [isPro, setIsPro] = useState(false);
  const [astroEvents, setAstroEvents] = useState<any[]>([]);
  const [eclipses, setEclipses] = useState<any[]>([]);
  const [currentAstro, setCurrentAstro] = useState<any>(null);
  const [narration, setNarration] = useState('');
  const [narrationLoading, setNarrationLoading] = useState(false);

  const loadData = async () => {
    if (!symbol) return;
    setLoading(true);
    setError('');

    // Fetch user session first to check subscription status
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    const res = await getStockDetailData(symbol, userId);
    if (res.success && res.stock) {
      setStock(res.stock);
      setLatest(res.latest);
      setPctChange(res.pctChange);
      setHistory(res.history);
      setIsPro(res.isPro || false);
      setAstroEvents(res.astroEvents || []);
      setEclipses(res.eclipses || []);
      setCurrentAstro(res.currentAstro || null);

      // Load AI Narration if Pro is enabled
      if (res.isPro && userId) {
        setNarrationLoading(true);
        try {
          const narrRes = await fetch('/api/narration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbol: symbol.toUpperCase(), userId })
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
      }
    } else {
      setError(res.error || 'Failed to fetch asset details.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading asset parameters and calculations...</p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-sm mx-auto">
        <div className="p-3 bg-rose-500/10 rounded-full text-rose-500">
          <Info className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-200">Asset Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1">{error || 'The requested stock code does not exist.'}</p>
        </div>
        <button
          onClick={() => router.push('/screener')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Screener
        </button>
      </div>
    );
  }

  const isPositive = pctChange >= 0;
  const lastClosePrice = latest?.close ?? 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-lg text-[10px]">
          <p className="text-slate-400 font-semibold">{payload[0].payload.date}</p>
          <p className="text-slate-100 font-bold mt-0.5">Close: ₹{payload[0].value.toFixed(2)}</p>
          {payload[0].payload.rsi && (
            <p className="text-indigo-400 font-medium mt-0.5">RSI: {payload[0].payload.rsi.toFixed(1)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/screener')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                {stock.sector}
              </span>
              {latest?.date && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Calendar className="w-3 h-3" />
                  As of {latest.date}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-200 mt-1 flex items-center gap-2">
              {stock.name}{' '}
              <span className="text-sm font-semibold text-slate-500 uppercase">({stock.symbol})</span>
            </h1>
          </div>
        </div>

        {/* Current price badge */}
        {latest && (
          <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-900 px-5 py-3 rounded-2xl self-start sm:self-auto">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Last Close Price</p>
              <p className="text-lg font-extrabold text-slate-100 mt-0.5">
                ₹{latest.close.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${
              isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isPositive ? '+' : ''}{pctChange}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Charts & Wheel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Historical chart & Metrics */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          
          {/* Chart Card */}
          <div className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4 relative">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart4 className="w-4 h-4 text-indigo-500" />
                30-Day Close Price Trend
              </span>
              <span className="text-[10px] text-slate-500 italic">EOD Historical Close</span>
            </div>

            <div className="w-full h-[240px] text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid stroke="#0f172a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={9}
                    tickFormatter={(val) => {
                      const parts = val.split('-');
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                    }}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={9}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Planetary overlays reference lines */}
                  {isPro && astroEvents.map((e, idx) => (
                    <ReferenceLine 
                      key={`rx-${idx}`}
                      x={e.date} 
                      stroke="#8b5cf6" 
                      strokeDasharray="4 4"
                      label={{ value: `${e.planet} Rx`, fill: '#a78bfa', fontSize: 8, position: 'top' }}
                    />
                  ))}
                  {isPro && eclipses.map((e, idx) => (
                    <ReferenceLine 
                      key={`eclipse-${idx}`}
                      x={e.date} 
                      stroke="#f43f5e" 
                      strokeDasharray="4 4"
                      label={{ value: 'Eclipse', fill: '#fb7185', fontSize: 8, position: 'top' }}
                    />
                  ))}

                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#ec4899' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Paywall Overlay Banner */}
            {!isPro && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1.5px] rounded-2xl flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center max-w-xs shadow-xl flex flex-col items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <p className="text-xs font-semibold text-slate-200">Planetary Chart Overlays Locked</p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Upgrade to Pro to display retrograde stations and eclipses on historical charts.
                  </p>
                  <Link
                    href="/billing"
                    className="mt-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 rounded-lg text-[10px] font-bold shadow"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Stats details card */}
          {latest && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Open</p>
                <p className="text-xs font-bold text-slate-300 mt-1">₹{latest.open}</p>
              </div>
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Daily High</p>
                <p className="text-xs font-bold text-emerald-400 mt-1">₹{latest.high}</p>
              </div>
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Daily Low</p>
                <p className="text-xs font-bold text-rose-400 mt-1">₹{latest.low}</p>
              </div>
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">RSI (14)</p>
                <p className="text-xs font-bold text-slate-300 mt-1">{latest.rsi ? latest.rsi.toFixed(1) : '-'}</p>
              </div>
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">SMA (20)</p>
                <p className="text-xs font-bold text-slate-300 mt-1">{latest.sma_20 ? `₹${latest.sma_20}` : '-'}</p>
              </div>
              <div className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">SMA (200)</p>
                <p className="text-xs font-bold text-slate-300 mt-1">{latest.sma_200 ? `₹${latest.sma_200}` : '-'}</p>
              </div>
            </div>
          )}

          {/* AI Narration Layer */}
          {isPro ? (
            <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-450 animate-pulse" />
                  AI Pattern & Astro Observation
                </h3>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                  AI Narration
                </span>
              </div>
              
              {narrationLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-[10px] text-slate-400">Synthesizing technical setups and planetary positions...</span>
                </div>
              ) : narration ? (
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {narration}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">No observation generated for this asset.</p>
              )}
            </div>
          ) : (
            <div className="p-5 bg-slate-900/20 border border-slate-900 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center justify-between opacity-50">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  AI Pattern & Astro Observation
                </h3>
                <span className="text-[9px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                  Locked
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed blur-[2px] select-none">
                Asset observations: The asset exhibits alignment with standard mathematical levels. Planetary configurations are positioned to generate historical correlation marks.
              </p>
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-4">
                <div className="text-center flex flex-col items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-bold text-slate-200">Unlock AI Narration Layer</p>
                  <p className="text-[9px] text-slate-400 max-w-xs leading-normal">
                    Get real-time descriptive summaries combining price history, Gann levels, and retrograde crossings.
                  </p>
                  <Link
                    href="/billing"
                    className="mt-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 rounded-lg text-[9px] font-bold shadow"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Compliance statement card */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Observation Zone Check:</span> Market indicators like moving averages and RSI are purely mathematical structures for educational study. This is for educational analysis only.
            </div>
          </div>
        </div>

        {/* Right Column: Gann Wheel & Astro Sidebar */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          {/* Wheel */}
          <div className="flex justify-center w-full">
            {lastClosePrice > 0 ? (
              <GannWheel price={lastClosePrice} />
            ) : (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                Awaiting close price calculations to plot Gann Wheel...
              </div>
            )}
          </div>

          {/* Astro Sidebar */}
          <div className="p-5 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-3 relative">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Moon className="w-4 h-4 text-amber-500" />
              Current Ecliptic Positions
            </h3>
            
            {isPro && currentAstro ? (
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border border-slate-900 p-3 rounded-xl bg-slate-950/30">
                {Object.keys(currentAstro).map((name) => {
                  const body = currentAstro[name];
                  return (
                    <div key={name} className="flex justify-between border-b border-slate-900/50 pb-1">
                      <span className="font-bold text-slate-300">{name}:</span>
                      <span>{body.sign} {body.signDegree.toFixed(1)}°</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-slate-900/60 p-4 rounded-xl text-center flex flex-col items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <p className="text-[10px] text-slate-500">
                  Upgrade to Pro to display real-time planetary sign positions alongside levels.
                </p>
                <Link
                  href="/billing"
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-[9px] font-bold rounded-lg text-slate-400 hover:text-white"
                >
                  Unlock Astro Modules
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
