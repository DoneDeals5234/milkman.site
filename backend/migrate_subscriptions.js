import 'dotenv/config';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function runSubscriptionsMigration() {
  try {
    console.log("Starting subscriptions migration...");

    // 1. Create user_subscriptions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        planId TEXT NOT NULL,
        planName TEXT NOT NULL,
        dailyQuantity TEXT NOT NULL,
        ratePerUnit INTEGER NOT NULL,
        totalDays INTEGER NOT NULL DEFAULT 30,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        totalAmount INTEGER NOT NULL,
        paymentStatus TEXT DEFAULT 'PENDING_AT_DOORSTEP',
        status TEXT DEFAULT 'ACTIVE',
        nextDayPaused INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      )
    `);
    console.log("✓ user_subscriptions table ensured.");

    // 2. Create subscription_deliveries table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_deliveries (
        id TEXT PRIMARY KEY,
        subscriptionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        deliveryDate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DELIVERED',
        markedBy TEXT DEFAULT 'STAFF',
        markedAt INTEGER NOT NULL
      )
    `);
    console.log("✓ subscription_deliveries table ensured.");

    // 3. Add deviceToken and isSubscribed to user table if missing
    try {
      await db.execute(`ALTER TABLE user ADD COLUMN deviceToken TEXT`);
      console.log("✓ Added deviceToken column to user table.");
    } catch (e) {
      // Column might already exist
      console.log("deviceToken column check:", e.message);
    }

    try {
      await db.execute(`ALTER TABLE user ADD COLUMN isSubscribed INTEGER DEFAULT 0`);
      console.log("✓ Added isSubscribed column to user table.");
    } catch (e) {
      console.log("isSubscribed column check:", e.message);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runSubscriptionsMigration();
