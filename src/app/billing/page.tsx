'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSubscriptionState, triggerMockSubscriptionUpgrade, triggerMockSubscriptionCancellation } from '../actions';
import { ShieldCheck, HelpCircle, Check, Star, RefreshCw, XCircle, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState('');

  const loadSubscription = async (userId: string) => {
    const res = await getUserSubscriptionState(userId);
    if (res.success) {
      setSubscription(res.subscription);
    } else {
      setError(res.error || 'Failed to fetch subscription status.');
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUser(session.user);
      loadSubscription(session.user.id);
    };

    checkUser();
  }, []);

  const handleUpgrade = async () => {
    if (!user) return;
    setActionLoading(true);
    
    // Call server action to simulate subscription activation
    const res = await triggerMockSubscriptionUpgrade(user.id);
    if (res.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b']
      });
      await loadSubscription(user.id);
    } else {
      setError(res.error || 'Upgrade process failed.');
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to cancel your Pro membership? You will lose access to astro timing tools.')) return;
    
    setActionLoading(true);
    const res = await triggerMockSubscriptionCancellation(user.id);
    if (res.success) {
      await loadSubscription(user.id);
    } else {
      setError(res.error || 'Cancellation process failed.');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-slate-400">Verifying customer status...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-sm mx-auto">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          <CreditCard className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-200">Sign In Required</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in or register an account to inspect tier details and manage billing options.
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

  const isPro = subscription?.status === 'active';

  return (
    <div className="flex flex-col gap-6 py-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-amber-500" />
          Billing & Subscription Plan
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review your subscription plan, entitlement benefits, and manage billing features.
        </p>
      </div>

      {/* Main card panels */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details panel */}
        <div className="md:col-span-7 flex flex-col gap-6">
          
          {/* Current Tier Badge */}
          <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Subscription Status</h2>

            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Tier</p>
                <p className="text-lg font-extrabold text-slate-100 mt-0.5">
                  {isPro ? 'Pro Member Tier' : 'Free Analyst Tier'}
                </p>
              </div>

              {isPro ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-850 border border-slate-800 text-slate-400 text-xs font-semibold rounded-lg">
                  Free
                </span>
              )}
            </div>

            {isPro && subscription?.current_period_end && (
              <div className="text-[11px] text-slate-400 flex flex-col gap-1">
                <p>
                  <span className="font-semibold text-slate-300">Renewal Date:</span>{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-[10px] text-slate-500 italic mt-1">
                  Pricing: ₹499/month via Razorpay hosted billing.
                </p>
              </div>
            )}

            {/* Error messaging */}
            {error && (
              <div className="text-[11px] text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg font-semibold">
                {error}
              </div>
            )}

            {/* User action button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isPro ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 text-rose-400 hover:bg-slate-800/20 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    {actionLoading ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                  <Link
                    href="/screener"
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs transition"
                  >
                    Go to Screener
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 flex items-center justify-center gap-1.5 shadow shadow-amber-500/10 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  {actionLoading ? 'Activating Pro...' : 'Upgrade to Pro — ₹499 / Month (Demo)'}
                </button>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300">Razorpay Simulation mode:</span> While real integrations use Razorpay checkouts, this checkout executes a mock authorization payload in local sandboxes. To test out-of-the-box Pro modules instantly, click the Upgrade button above.
            </div>
          </div>
        </div>

        {/* Right Column: Pro Tier Features Overview */}
        <div className="md:col-span-5 flex flex-col gap-4 bg-slate-900/10 border border-slate-900 p-6 rounded-2xl">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-bold text-slate-200">Unlock Pro Module Benefits</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-2">
            Upgrade to Pro to expand your analytical toolkit with advanced timing and pattern search features.
          </p>

          <div className="flex flex-col gap-3 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-200">Planetary Ephemeris Calendar</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Explore sign ingresses, planetary retrograde crossings, and hardcoded eclipse schedules.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-200">Astro-Timing Chart Overlays</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Overlay vertical markers representing retrograde stations and eclipses on historical price charts.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-200">Rule Setup Backtester</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Run mathematical filters (e.g. Price close to Gann level + RSI oversold) and examine descriptive historical return metrics.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-200">AI-Assisted Observations</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Read structured contextual summaries explaining asset levels, passing through a strict keyword safety filter.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
