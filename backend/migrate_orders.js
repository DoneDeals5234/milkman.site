import 'dotenv/config';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function runMigrations() {
  try {
    // 1. Rename old order table or just drop it if it's not being used yet.
    // Wait, let's just drop it since it was a dummy implementation.
    console.log("Dropping old order table if exists...");
    await db.execute('DROP TABLE IF EXISTS "order"');
    await db.execute('DROP TABLE IF EXISTS "order_items"');
    await db.execute('DROP TABLE IF EXISTS "serviceable_areas"');

    // 2. Create new "order" table
    console.log("Creating order table...");
    await db.execute(`
      CREATE TABLE "order" (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        orderType TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        estimatedDelivery INTEGER,
        paymentMode TEXT DEFAULT 'COD',
        deliveryArea TEXT,
        houseNo TEXT,
        landmark TEXT,
        latitude REAL,
        longitude REAL,
        totalAmount INTEGER NOT NULL,
        createdAt INTEGER NOT NULL
      )
    `);

    // 3. Create new "order_items" table
    console.log("Creating order_items table...");
    await db.execute(`
      CREATE TABLE "order_items" (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        priceAtPurchase INTEGER NOT NULL
      )
    `);

    // 4. Create new "serviceable_areas" table
    console.log("Creating serviceable_areas table...");
    await db.execute(`
      CREATE TABLE "serviceable_areas" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        isActive INTEGER DEFAULT 1
      )
    `);

    // 5. Seed default serviceable areas
    const defaultAreas = [
      'Haveli Kalan', 'Garden Colony', 'Mahindra Colony', 
      'Surtapur Mand', 'Sampura', 'Kirti Vihar', 
      'Gyani Jail Singh Colony', 'Mata Rani Mohalla'
    ];

    for (const area of defaultAreas) {
      const areaId = 'area_' + Math.random().toString(36).substr(2, 9);
      await db.execute({
        sql: 'INSERT INTO serviceable_areas (id, name, isActive) VALUES (?, ?, 1)',
        args: [areaId, area]
      });
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigrations();
