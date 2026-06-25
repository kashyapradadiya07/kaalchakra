'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, User, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Redirect if already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/screener');
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');

      if (isPlaceholder) {
        // Fallback Mock Login (for local out-of-the-box demo without credentials)
        console.log('Using mock login fallback (placeholder Supabase configured)...');
        
        // Save mock session in local storage for Navbar/state tracking
        const mockUser = {
          id: 'mock-user-123',
          email: email,
          role: 'authenticated',
        };
        
        // Trigger a fake supabase login by storing session object directly
        // We write to localStorage and set auth cookie, but since navbar uses supabase.auth.onAuthStateChange,
        // let's override navbar session logic. To simulate auth on onAuthStateChange, we can set mock user
        // and notify window storage events, or we can use custom signIn mock inside supabase client.
        // Wait, since we are using supabase.auth client directly, let's write to local storage
        // using the key Supabase uses so that it gets read as logged in if it initializes!
        // Supabase storage keys look like: sb-<project-ref>-auth-token
        localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: mockUser,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }));

        // Fire custom event so that listeners (like the Navbar client session checks) trigger refresh
        window.dispatchEvent(new Event('storage'));
        
        setStatus('success');
        setMessage(isSignUp ? 'Mock Account Created!' : 'Successfully Logged In (Demo Mode)!');
        
        setTimeout(() => {
          router.push('/screener');
          // Full page reload to reset navbar states cleanly
          window.location.href = '/screener';
        }, 1200);
      } else {
        // Real Supabase Auth
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          if (error) throw error;
          setStatus('success');
          setMessage('Check your email to complete registration.');
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          setStatus('success');
          setMessage('Successfully Logged In!');
          setTimeout(() => {
            router.push('/screener');
            window.location.href = '/screener';
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setStatus('error');
      setMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');
      if (isPlaceholder) {
        // Mock Google login
        localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { id: 'mock-google-user', email: 'google.demo@example.com', role: 'authenticated' },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }));
        window.dispatchEvent(new Event('storage'));
        router.push('/screener');
        window.location.href = '/screener';
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      setStatus('error');
      setMessage(err.message || 'OAuth initialization failed.');
    }
  };

  return (
    <div className="flex items-center justify-center py-10 sm:py-16 relative">
      <div className="absolute top-10 w-[300px] h-[300px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-md p-8 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl flex flex-col gap-6">
        {/* Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 font-bold text-xl shadow-lg shadow-amber-500/10 mb-3">
            ॐ
          </div>
          <h1 className="text-xl font-bold text-slate-200">
            {isSignUp ? 'Create your Account' : 'Welcome back to Kaalchakra'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access customized watchlists and save historical technical observation zones.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 text-slate-200"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 text-slate-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow shadow-amber-500/10 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* OAuth Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800/80"></div>
          </div>
          <span className="relative px-3 bg-slate-950 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Or continue with
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-200 text-xs font-semibold hover:bg-slate-800/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google Workspace
        </button>

        {/* Message Banner */}
        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-semibold ${
            status === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            <span>{message}</span>
          </div>
        )}

        {/* Toggle Signin/Signup */}
        <p className="text-center text-[10px] text-slate-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
              setStatus('idle');
            }}
            className="text-amber-500 hover:text-amber-400 font-semibold underline outline-none"
          >
            {isSignUp ? 'Sign In here' : 'Sign Up here'}
          </button>
        </p>
      </div>
    </div>
  );
}
