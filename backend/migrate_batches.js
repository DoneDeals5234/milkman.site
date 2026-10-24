import 'dotenv/config';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function runBatchesMigration() {
  try {
    console.log("Starting product_batches migration...");

    // 1. Create product_batches table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS product_batches (
        id TEXT PRIMARY KEY,
        batch_no TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        product_name TEXT NOT NULL,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        preparation_date TEXT,
        fat_percentage TEXT,
        snf_percentage TEXT,
        farm_location TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    console.log("✓ product_batches table ensured.");

    // 2. Check if we already have batches
    const existing = await db.execute("SELECT COUNT(*) as count FROM product_batches");
    const count = existing.rows[0].count;
    console.log(`Current batches count: ${count}`);

    if (count === 0) {
      console.log("Seeding sample batches...");
      const sampleBatches = [
        {
          id: 'batch_seed_1',
          batch_no: 'BATCH-COW-101',
          title: 'Early Dawn Milking & 4°C Rapid Plate Cooling Process',
          product_name: 'Pure Desi Gir Cow Milk (A2 Raw)',
          video_url: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?w=800&auto=format&fit=crop&q=80',
          preparation_date: 'Today, 04:30 AM',
          fat_percentage: '4.8%',
          snf_percentage: '8.9%',
          farm_location: 'Gir Cow Sanctuary & Vedic Farm - Shed A',
          notes: 'Zero heat treatment, untouched by human hands, 100% natural A2 beta-casein.',
          created_at: Date.now()
        },
        {
          id: 'batch_seed_2',
          batch_no: 'BATCH-BUF-202',
          title: 'Creamy Murrah Buffalo Milking & Automated In-line Filtration',
          product_name: 'Rich Murrah Buffalo Milk (A2 Fresh)',
          video_url: 'https://www.youtube.com/watch?v=kYJyb8rS3qg',
          thumbnail_url: 'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?w=800&auto=format&fit=crop&q=80',
          preparation_date: 'Today, 05:00 AM',
          fat_percentage: '7.2%',
          snf_percentage: '9.5%',
          farm_location: 'Murrah Dairy Green Pastures - Shed C',
          notes: 'Extra thick malai yield, tested negative for urea, starch and chemical adulterants.',
          created_at: Date.now() - 3600000
        },
        {
          id: 'batch_seed_3',
          batch_no: 'BATCH-GHEE-303',
          title: 'Traditional Earthen Pot Bilona Churning & Slow Wood-fire Clarification',
          product_name: 'Vedic Bilona Cow Ghee',
          video_url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
          thumbnail_url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800&auto=format&fit=crop&q=80',
          preparation_date: 'Yesterday, 06:00 PM',
          fat_percentage: '99.8%',
          snf_percentage: '0.2%',
          farm_location: 'Artisanal Bilona Kitchen, Vedic Dairy',
          notes: 'Prepared from cultured A2 curd churned bidirectionally with wooden ravaiya.',
          created_at: Date.now() - 7200000
        },
        {
          id: 'batch_seed_4',
          batch_no: 'BATCH-PANEER-404',
          title: 'Warm Curdling with Lemon Whey & Natural Muslin Cloth Pressing',
          product_name: 'Fresh Farm Malai Paneer',
          video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnail_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
          preparation_date: 'Today, 06:15 AM',
          fat_percentage: '24.5%',
          snf_percentage: '18.0%',
          farm_location: 'Clean Processing Unit #2',
          notes: 'Super soft velvety texture, made from 100% whole cow milk without citric acid.',
          created_at: Date.now() - 10800000
        }
      ];

      for (const batch of sampleBatches) {
        await db.execute({
          sql: `INSERT INTO product_batches (
            id, batch_no, title, product_name, video_url, thumbnail_url,
            preparation_date, fat_percentage, snf_percentage, farm_location, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            batch.id,
            batch.batch_no,
            batch.title,
            batch.product_name,
            batch.video_url,
            batch.thumbnail_url,
            batch.preparation_date,
            batch.fat_percentage,
            batch.snf_percentage,
            batch.farm_location,
            batch.notes,
            batch.created_at
          ]
        });
      }
      console.log(`✓ Seeded ${sampleBatches.length} sample batches.`);
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

runBatchesMigration();
