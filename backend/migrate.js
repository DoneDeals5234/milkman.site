import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || ""
});

async function run() {
    try {
        console.log("Updating tables (No dropping!)...");

        console.log("Creating user table if not exists...");
        await client.execute(`
            CREATE TABLE IF NOT EXISTS user (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phoneNumber TEXT UNIQUE,
                emailVerified INTEGER NOT NULL,
                phoneNumberVerified INTEGER,
                playerId TEXT,
                status TEXT DEFAULT 'offline',
                lastLoginAt INTEGER,
                image TEXT,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL
            );
        `);

        // Try adding the columns if the table already exists
        try {
            await client.execute(`ALTER TABLE user ADD COLUMN status TEXT DEFAULT 'offline'`);
        } catch (e) { /* column exists */ }
        
        try {
            await client.execute(`ALTER TABLE user ADD COLUMN lastLoginAt INTEGER`);
        } catch (e) { /* column exists */ }

        console.log("Creating session table...");
        await client.execute(`
            CREATE TABLE IF NOT EXISTS session (
                id TEXT PRIMARY KEY,
                expiresAt INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                ipAddress TEXT,
                userAgent TEXT,
                userId TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES user(id)
            );
        `);

        console.log("Creating account table...");
        await client.execute(`
            CREATE TABLE IF NOT EXISTS account (
                id TEXT PRIMARY KEY,
                accountId TEXT NOT NULL,
                providerId TEXT NOT NULL,
                userId TEXT NOT NULL,
                accessToken TEXT,
                refreshToken TEXT,
                idToken TEXT,
                accessTokenExpiresAt INTEGER,
                refreshTokenExpiresAt INTEGER,
                scope TEXT,
                password TEXT,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                FOREIGN KEY (userId) REFERENCES user(id)
            );
        `);

        console.log("Creating verification table...");
        await client.execute(`
            CREATE TABLE IF NOT EXISTS verification (
                id TEXT PRIMARY KEY,
                identifier TEXT NOT NULL,
                value TEXT NOT NULL,
                expiresAt INTEGER NOT NULL,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL
            );
        `);
        
        console.log("Creating order table...");
        await client.execute(`
            CREATE TABLE IF NOT EXISTS "order" (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                productId INTEGER NOT NULL,
                productName TEXT NOT NULL,
                price TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                createdAt INTEGER NOT NULL,
                FOREIGN KEY (userId) REFERENCES user(id)
            );
        `);
        
        console.log("All tables created successfully on Turso!");
    } catch (e) {
        console.error("Error creating tables:", e);
    }
}

run();
