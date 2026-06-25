'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, Sparkles, AlertCircle, ArrowRight, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';
import { signUpWaitlist } from './actions';
import confetti from 'canvas-confetti';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    const result = await signUpWaitlist(email);

    if (result.success) {
      setStatus('success');
      setEmail('');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#f59e0b', '#ec4899', '#6366f1']
      });
    } else {
      setStatus('error');
      setMessage(result.error || 'Something went wrong.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 gap-16 relative overflow-hidden">
      
      {/* Decorative radial gradients */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-rose-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-10 w-[350px] h-[350px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-4xl px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-400 mb-2 select-none shadow-inner shadow-amber-500/5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Deterministic Technical Math & Science</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Astro-Timing Meets
          </span>
          <br />
          <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
            Mathematical Precision
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Unlock deterministic support and resistance levels using W.D. Gann Square of 9 algorithms, paired with a robust rule-based NSE stock screener. 
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/screener"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Compass className="w-5 h-5" />
            Explore NSE Screener
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          
          <Link
            href="/gann"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
            Gann Calculator
          </Link>
        </div>
      </div>

      {/* Grid Highlights Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
        {/* Card 1 */}
        <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4 hover:border-slate-800/80 hover:bg-slate-900/60 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-md shadow-amber-500/5">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Gann Square of 9</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Deterministic support and resistance mapping using root-vibration formulas. Enter any custom price or pull live closes to plot your levels immediately.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4 hover:border-slate-800/80 hover:bg-slate-900/60 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-md shadow-rose-500/5">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Indicator Screener</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Filter through ~200 top liquid NSE stocks. Screen based on RSI overbought/oversold boundaries, volume surges, and critical SMA crossovers (20/50/200).
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4 hover:border-slate-800/80 hover:bg-slate-900/60 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-md shadow-indigo-500/5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Compliance & Trust</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Designed strictly as an analytical tool. Fully compliant with financial guidelines. No speculative recommendations or execution brokers.
          </p>
        </div>
      </div>

      {/* Waitlist Subscription Card */}
      <div className="w-full max-w-xl p-8 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center text-center gap-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-200">Join the Kaalchakra Pro Waitlist</h2>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Get early access to Phase 2, introducing Astro timings, planetary overlays, and real-time intraday price levels.
          </p>
        </div>

        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row w-full gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 flex items-center justify-center gap-2 shadow shadow-amber-500/15 disabled:opacity-50 transition-all"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Joining...' : 'Get Early Access'}
          </button>
        </form>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span>Success! You have been added to the waitlist.</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}
      </div>

    </div>
  );
}
