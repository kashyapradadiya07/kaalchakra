import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. Manually parse .env.local file to get variables
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
const connectionString = env.DATABASE_URL;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!connectionString || !supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables in .env.local!');
  process.exit(1);
}

// Log connection string (masking password)
const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
console.log(`Parsed Connection String: ${maskedUrl}`);
console.log(`Parsed Supabase URL: ${supabaseUrl}`);
console.log(`Parsed Service Role Key (first 15 chars): ${supabaseServiceKey.substring(0, 15)}...`);


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pgClient = new Client({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await pgClient.connect();
    console.log('Connected successfully!');

    // 2. Read and apply schema
    console.log('Applying SQL schema from supabase_schema.sql...');
    const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('supabase_schema.sql not found in project root!');
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pgClient.query(schemaSql);
    console.log('Schema applied successfully!');

    // 3. Load fallback database for seeding
    console.log('Loading local fallback database for seeding...');
    const dbPath = path.join(process.cwd(), 'data', 'db_fallback.json');
    if (!fs.existsSync(dbPath)) {
      throw new Error('db_fallback.json not found in data directory!');
    }
    const localDbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const stocks = localDbData.stocks || [];
    const dailyPrices = localDbData.daily_prices || [];

    console.log(`Found ${stocks.length} stocks and ${dailyPrices.length} daily price records to seed.`);

    // Seed Stocks
    if (stocks.length > 0) {
      console.log('Seeding stocks...');
      for (const stock of stocks) {
        await pgClient.query(
          `INSERT INTO public.stocks (symbol, name, sector)
           VALUES ($1, $2, $3)
           ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name, sector = EXCLUDED.sector`,
          [stock.symbol, stock.name, stock.sector]
        );
      }
      console.log('Stocks seeded successfully!');
    }

    // Seed Daily Prices in batches
    if (dailyPrices.length > 0) {
      console.log('Seeding daily prices in batches...');
      const batchSize = 100;
      for (let i = 0; i < dailyPrices.length; i += batchSize) {
        const batch = dailyPrices.slice(i, i + batchSize);
        await pgClient.query('BEGIN');
        try {
          for (const price of batch) {
            await pgClient.query(
              `INSERT INTO public.daily_prices 
               (symbol, date, open, high, low, close, volume, rsi, sma_20, sma_50, sma_200)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (symbol, date) DO NOTHING`,
              [
                price.symbol,
                price.date,
                price.open,
                price.high,
                price.low,
                price.close,
                price.volume,
                price.rsi,
                price.sma_20,
                price.sma_50,
                price.sma_200
              ]
            );
          }
          await pgClient.query('COMMIT');
        } catch (err) {
          await pgClient.query('ROLLBACK');
          throw err;
        }
        if ((i + batch.length) % 1000 === 0 || i + batch.length === dailyPrices.length) {
          console.log(`Seeded ${i + batch.length}/${dailyPrices.length} daily price records...`);
        }
      }
      console.log('Daily prices seeded successfully!');
    }

    // 4. Create test users via Supabase Auth
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
      
      // Check if user exists by listing users (or trying to create and catching error)
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
        
        // Insert into public.subscriptions using direct pgClient to bypass RLS policies
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 5); // 5 years from now
        
        await pgClient.query(
          `INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_end)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET 
             plan_id = EXCLUDED.plan_id, 
             status = EXCLUDED.status, 
             current_period_end = EXCLUDED.current_period_end`,
          [userId, 'pro_monthly', 'active', periodEnd.toISOString()]
        );
        console.log(`Pro subscription verified for ${u.email}.`);
      }
    }

    console.log('🎉 Database seeding and user migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pgClient.end();
    console.log('Database connection closed.');
  }
}

main();
