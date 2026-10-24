import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";
import { sendWhatsAppOTP } from "./whatsapp.js";
import "dotenv/config";

// Connect to Turso Database via Drizzle
const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || ""
});

const db = drizzle(client, { schema });

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite"
    }),
    baseURL: "http://localhost:8080/api/auth",
    trustedOrigins: ["http://localhost:3000", "http://10.49.177.146:3000", "http://127.0.0.1:3000", "http://localhost:61578", "http://127.0.0.1:61578"], // Add the origin seen in the screenshot
    emailAndPassword: {  
        enabled: true, 
    },
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                // Extract phone number from our dummy email format
                const phoneNumber = email.replace('@milkman.local', '');
                await sendWhatsAppOTP(phoneNumber, otp);
            }
        })
    ]
});
