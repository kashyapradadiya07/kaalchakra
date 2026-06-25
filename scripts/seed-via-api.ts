import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found!');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    const val = trimmed.substring(firstEq + 1).trim();
    env[key] = val;
  });
  
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local!');
  process.exit(1);
}

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  try {
    console.log('Loading local fallback database...');
    const dbPath = path.join(process.cwd(), 'data', 'db_fallback.json');
    if (!fs.existsSync(dbPath)) {
      throw new Error('db_fallback.json not found in data directory!');
    }
    const localDbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const stocks = localDbData.stocks || [];
    const dailyPrices = localDbData.daily_prices || [];

    console.log(`Found ${stocks.length} stocks and ${dailyPrices.length} daily price records to seed.`);

    // 1. Seed Stocks via API
    if (stocks.length > 0) {
      console.log('Seeding stocks...');
      const { error: stocksError } = await supabaseAdmin
        .from('stocks')
        .upsert(stocks, { onConflict: 'symbol' });
      
      if (stocksError) {
        throw new Error(`Failed to seed stocks: ${stocksError.message}`);
      }
      console.log('✅ Stocks seeded successfully!');
    }

    // 2. Seed Daily Prices in batches via API
    if (dailyPrices.length > 0) {
      console.log('Seeding daily prices in batches of 100...');
      const batchSize = 100;
      for (let i = 0; i < dailyPrices.length; i += batchSize) {
        const batch = dailyPrices.slice(i, i + batchSize);
        const { error: pricesError } = await supabaseAdmin
          .from('daily_prices')
          .upsert(batch, { onConflict: 'symbol,date' });
        
        if (pricesError) {
          throw new Error(`Failed to seed price batch starting at index ${i}: ${pricesError.message}`);
        }
        if ((i + batch.length) % 1000 === 0 || i + batch.length === dailyPrices.length) {
          console.log(`Seeded ${i + batch.length}/${dailyPrices.length} daily price records...`);
        }
      }
      console.log('✅ Daily prices seeded successfully!');
    }

    // 3. Create test users via Auth Admin API
    console.log('Configuring test users...');
    const testUsers = [
      {
        email: 'admin@kaalchakra.com',
        password: 'Admin@12345',
        isPro: true
      },
      {
        email: 'user@kaalchakra.com',
        password: 'User@12345',
        isPro: false
      }
    ];

    for (const u of testUsers) {
      console.log(`Checking if user ${u.email} already exists...`);
      
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        throw listError;
      }
      
      const existingUser = listData.users.find(usr => usr.email === u.email);
      let userId = existingUser?.id;

      if (!existingUser) {
        console.log(`Creating user ${u.email}...`);
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true
        });

        if (createError) {
          console.error(`Error creating user ${u.email}:`, createError.message);
          continue;
        }
        
        userId = createData.user.id;
        console.log(`User ${u.email} created successfully with ID: ${userId}`);
      } else {
        console.log(`User ${u.email} already exists with ID: ${userId}`);
      }

      // Handle subscription for Pro test user
      if (u.isPro && userId) {
        console.log(`Ensuring Pro subscription for user ${u.email}...`);
        
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 5); // 5 years from now
        
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_id: 'pro_monthly',
            status: 'active',
            current_period_end: periodEnd.toISOString()
          }, { onConflict: 'user_id' });
        
        if (subError) {
          console.error(`Failed to assign Pro subscription for ${u.email}:`, subError.message);
        } else {
          console.log(`✅ Pro subscription verified for ${u.email}.`);
        }
      }
    }

    console.log('🎉 Database seeding and user migrations completed successfully over HTTP!');
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message || error);
  }
}

main();
