// Unified Database Client for Kaalchakra (Supabase with Local File Fallback)
import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  created_at?: string;
}

export interface DailyPrice {
  id?: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi: number | null;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  razorpay_subscription_id?: string;
  current_period_end: string;
  created_at?: string;
  updated_at?: string;
}

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'data', 'db_fallback.json');

// Helper to check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes('placeholder') && !key.includes('placeholder'));
}

// Local file DB schema structure
interface LocalDB {
  stocks: Stock[];
  daily_prices: DailyPrice[];
  waitlist: WaitlistEntry[];
  watchlists: Record<string, string[]>; // userId -> symbols[]
  plans: Plan[];
  subscriptions: Subscription[];
}

// Initialize local DB file if it doesn't exist
function getLocalDB(): LocalDB {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      const initialDB: LocalDB = { 
        stocks: [], 
        daily_prices: [], 
        waitlist: [], 
        watchlists: {},
        plans: [{ id: 'pro_monthly', name: 'Pro Monthly Plan', price: 499, currency: 'INR', interval: 'month' }],
        subscriptions: []
      };
      const dir = path.dirname(FALLBACK_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(initialDB, null, 2), 'utf8');
      return initialDB;
    }
    const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf8');
    const db = JSON.parse(data);
    
    // Ensure fields are initialized for backwards compatibility
    if (!db.plans) {
      db.plans = [{ id: 'pro_monthly', name: 'Pro Monthly Plan', price: 499, currency: 'INR', interval: 'month' }];
    }
    if (!db.subscriptions) {
      db.subscriptions = [];
    }
    return db;
  } catch (error) {
    console.error('Error reading local fallback database:', error);
    return { 
      stocks: [], 
      daily_prices: [], 
      waitlist: [], 
      watchlists: {}, 
      plans: [{ id: 'pro_monthly', name: 'Pro Monthly Plan', price: 499, currency: 'INR', interval: 'month' }],
      subscriptions: [] 
    };
  }
}

function saveLocalDB(db: LocalDB) {
  try {
    const dir = path.dirname(FALLBACK_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing local fallback database:', error);
  }
}

/**
 * Get all stocks.
 */
export async function getStocks(): Promise<Stock[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('stocks').select('*');
      if (!error && data) return data as Stock[];
      console.error('Supabase getStocks error, trying local fallback:', error);
    } catch (e) {
      console.error('Supabase getStocks exception, trying local fallback:', e);
    }
  }

  const db = getLocalDB();
  return db.stocks;
}

/**
 * Seed stocks.
 */
export async function seedStocks(stocksList: Stock[]): Promise<Stock[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('stocks').upsert(stocksList, { onConflict: 'symbol' }).select();
      if (!error && data) return data as Stock[];
      console.error('Supabase seedStocks error, trying local fallback:', error);
    } catch (e) {
      console.error('Supabase seedStocks exception, trying local fallback:', e);
    }
  }

  const db = getLocalDB();
  // Merge stocks into local db
  for (const stock of stocksList) {
    if (!db.stocks.some((s) => s.symbol === stock.symbol)) {
      db.stocks.push({ ...stock, created_at: new Date().toISOString() });
    }
  }
  saveLocalDB(db);
  return db.stocks;
}

/**
 * Get daily prices for a given symbol or all.
 */
export async function getDailyPrices(symbol?: string): Promise<DailyPrice[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('daily_prices').select('*').order('date', { ascending: false });
      if (symbol) {
        query = query.eq('symbol', symbol);
      }
      const { data, error } = await query;
      if (!error && data) return data as DailyPrice[];
      console.error('Supabase getDailyPrices error, trying local fallback:', error);
    } catch (e) {
      console.error('Supabase getDailyPrices exception, trying local fallback:', e);
    }
  }

  const db = getLocalDB();
  if (symbol) {
    return db.daily_prices
      .filter((p) => p.symbol === symbol)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return db.daily_prices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Upsert daily prices in chunks.
 */
export async function upsertDailyPrices(prices: DailyPrice[]): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      // Chunk upserts to avoid rate limit or payload limits
      const chunkSize = 100;
      for (let i = 0; i < prices.length; i += chunkSize) {
        const chunk = prices.slice(i, i + chunkSize);
        const { error } = await supabase.from('daily_prices').upsert(chunk, { onConflict: 'symbol,date' });
        if (error) throw error;
      }
      return true;
    } catch (e) {
      console.error('Supabase upsertDailyPrices error/exception, trying local fallback:', e);
    }
  }

  const db = getLocalDB();
  
  // Create a map for quick lookup
  const priceMap = new Map<string, DailyPrice>();
  // Seed current
  db.daily_prices.forEach((p) => {
    priceMap.set(`${p.symbol}_${p.date}`, p);
  });

  // Upsert new ones
  prices.forEach((p) => {
    priceMap.set(`${p.symbol}_${p.date}`, p);
  });

  db.daily_prices = Array.from(priceMap.values());
  saveLocalDB(db);
  return true;
}

/**
 * Save to waitlist.
 */
export async function saveWaitlist(email: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('waitlist').insert([{ email }]);
      if (!error) return true;
      console.error('Supabase saveWaitlist error, trying local fallback:', error);
    } catch (e) {
      console.error('Supabase saveWaitlist exception, trying local fallback:', e);
    }
  }

  const db = getLocalDB();
  if (!db.waitlist.some((w) => w.email === email)) {
    db.waitlist.push({
      id: Math.random().toString(36).substr(2, 9),
      email,
      created_at: new Date().toISOString(),
    });
    saveLocalDB(db);
  }
  return true;
}

/**
 * Add/Remove watchlists (simplified for local demo)
 */
export async function getWatchlist(userId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('watchlists').select('symbol').eq('user_id', userId);
      if (!error && data) return data.map((d: any) => d.symbol);
    } catch (e) {
      console.error('Supabase watchlist fetch exception:', e);
    }
  }
  const db = getLocalDB();
  return db.watchlists[userId] || [];
}

export async function toggleWatchlist(userId: string, symbol: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    try {
      const current = await getWatchlist(userId);
      if (current.includes(symbol)) {
        await supabase.from('watchlists').delete().eq('user_id', userId).eq('symbol', symbol);
      } else {
        await supabase.from('watchlists').insert([{ user_id: userId, symbol }]);
      }
      return await getWatchlist(userId);
    } catch (e) {
      console.error('Supabase watchlist toggle exception:', e);
    }
  }

  const db = getLocalDB();
  if (!db.watchlists[userId]) {
    db.watchlists[userId] = [];
  }

  const idx = db.watchlists[userId].indexOf(symbol);
  if (idx > -1) {
    db.watchlists[userId].splice(idx, 1);
  } else {
    db.watchlists[userId].push(symbol);
  }
  saveLocalDB(db);
  return db.watchlists[userId];
}

/**
 * Get all subscription plans.
 */
export async function getPlans(): Promise<Plan[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('plans').select('*');
      if (!error && data) return data as Plan[];
    } catch (e) {
      console.error('Supabase plans fetch exception:', e);
    }
  }
  const db = getLocalDB();
  return db.plans;
}

/**
 * Get a user's subscription.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) return data as Subscription;
    } catch (e) {
      console.error('Supabase subscription fetch exception:', e);
    }
  }
  const db = getLocalDB();
  const sub = db.subscriptions.find((s) => s.user_id === userId);
  return sub || null;
}

/**
 * Create or update a user's subscription.
 */
export async function upsertSubscription(sub: Subscription): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .upsert(sub, { onConflict: 'user_id' });
      if (!error) return true;
      console.error('Supabase upsertSubscription error:', error);
    } catch (e) {
      console.error('Supabase upsertSubscription exception:', e);
    }
  }
  
  const db = getLocalDB();
  const existingIdx = db.subscriptions.findIndex((s) => s.user_id === sub.user_id);
  
  const timeStr = new Date().toISOString();
  const subWithTime = {
    ...sub,
    created_at: existingIdx > -1 ? db.subscriptions[existingIdx].created_at : timeStr,
    updated_at: timeStr
  };

  if (existingIdx > -1) {
    db.subscriptions[existingIdx] = subWithTime;
  } else {
    db.subscriptions.push(subWithTime);
  }
  
  saveLocalDB(db);
  return true;
}
