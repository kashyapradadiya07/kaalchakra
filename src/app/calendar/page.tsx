'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getAstroCalendarData } from '../actions';
import { ECLIPSE_EVENTS, EclipseEvent } from '@/lib/eclipses';
import { Sparkles, Calendar, Moon, ArrowRight, Star, AlertCircle, RefreshCw, Compass, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isPaywall, setIsPaywall] = useState(false);
  const [positions, setPositions] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [upcomingEclipses, setUpcomingEclipses] = useState<EclipseEvent[]>([]);
  const [error, setError] = useState('');

  const loadData = async (userId: string) => {
    const res = await getAstroCalendarData(userId);
    if (res.success) {
      setPositions(res.positions);
      setEvents(res.events || []);
      
      // Load upcoming eclipses for next 365 days
      const today = new Date();
      const nextYear = new Date();
      nextYear.setDate(today.getDate() + 365);
      const todayStr = today.toISOString().split('T')[0];
      const nextYearStr = nextYear.toISOString().split('T')[0];

      const eclipses = ECLIPSE_EVENTS.filter(e => e.date >= todayStr && e.date <= nextYearStr);
      setUpcomingEclipses(eclipses);
    } else if (res.isPaywall) {
      setIsPaywall(true);
    } else {
      setError(res.error || 'Failed to load astronomical calculations.');
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
      loadData(session.user.id);
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading planetary longitudes and coordinate frames...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 max-w-sm mx-auto">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          <Calendar className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-200">Sign In Required</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access astronomical timing calendars, sign ingresses, and overlays.
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
            <h1 className="text-xl font-bold text-slate-200">Planetary Astro Calendar (Pro Feature)</h1>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
              Get detailed planetary geocentric longitude coordinates, retrograde stations, and sign crossings to identify potential vibration zones.
            </p>
          </div>

          <div className="w-full text-left py-4 px-6 bg-slate-950 border border-slate-900 rounded-xl space-y-3">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Premium Access Includes:</p>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Geocentric longitudes for classical planets + Rahu/Ketu nodes</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Planetary retrogrades and sign crossings scan calendar (30 days)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Historical timing overlays directly on stock charts</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Advanced rule-based backtesting setups library</span>
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
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
          <Calendar className="w-6 h-6 text-amber-500" />
          Planetary Ephemeris Calendar
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor geocentric planetary coordinates, sign crossings, and upcoming eclipses for educational market study.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Planetary Longitudes */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Moon className="w-4 h-4 text-amber-500" />
              Planetary Coordinates (Geocentric)
            </h2>

            {positions && (
              <div className="divide-y divide-slate-900 border border-slate-900 rounded-xl overflow-hidden text-xs bg-slate-950/40">
                <div className="grid grid-cols-3 p-3 bg-slate-900/60 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">
                  <div>Body</div>
                  <div className="text-right">Longitude</div>
                  <div className="text-right">Zodiac Sign</div>
                </div>
                {Object.keys(positions).map((name) => {
                  const body = positions[name];
                  
                  // Rahu / Ketu nodes are always retrograde (negative speed)
                  // Mercury, Venus, Mars, Jupiter, Saturn are checked in the calendar
                  const isNode = name === 'Rahu' || name === 'Ketu';

                  return (
                    <div key={name} className="grid grid-cols-3 p-3 items-center hover:bg-slate-900/30 transition-colors">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        {name}
                        {isNode && (
                          <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-1 py-0.2 rounded uppercase">Node</span>
                        )}
                      </span>
                      <span className="text-right font-medium text-slate-300">
                        {body.longitude.toFixed(2)}°
                      </span>
                      <span className="text-right font-semibold text-slate-400">
                        {body.sign} {body.signDegree.toFixed(1)}°
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ingresses & Upcoming Retrogrades */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Calendar events */}
          <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Planetary Events (Next 30 Days)
            </h2>

            {events.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No retrograde or ingress events detected in the next 30 days.</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto border border-slate-900 rounded-xl divide-y divide-slate-900 text-xs">
                {events.map((e, idx) => (
                  <div key={idx} className="p-3 flex items-start justify-between gap-4 hover:bg-slate-900/30">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-200">{e.description}</p>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        e.type === 'ingress' 
                          ? 'bg-blue-500/10 text-blue-400' 
                          : e.type === 'retrograde_start' 
                          ? 'bg-rose-500/10 text-rose-400' 
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {e.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[10px] shrink-0 font-medium">{e.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Eclipses */}
          <div className="p-6 bg-slate-900/40 border border-slate-900 rounded-2xl flex flex-col gap-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Eclipses Lookup (Next 12 Months)
            </h2>

            {upcomingEclipses.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No eclipses scheduled in the next 12 months.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingEclipses.map((e, idx) => (
                  <div key={idx} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded ${
                        e.type === 'solar' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {e.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">{e.date}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{e.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
