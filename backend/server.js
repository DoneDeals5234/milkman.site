import express from "express";
import cors from "cors";
import path from "path";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { initWhatsApp, sendWhatsAppOTP, sendWhatsAppMessage } from "./whatsapp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' })); // Allow JSON body parsing
app.use(cors({
    origin: "*", // allow all for dev, adjust in prod
    credentials: true
}));

// Serve website frontend directly (supports running from backend/ or milkman.site root)
const candidateStaticPaths = [
    path.join(__dirname, "../website"),
    path.join(__dirname, "../public"),
    path.join(__dirname, "./website"),
    path.join(__dirname, "./public")
];
const websiteStaticDir = candidateStaticPaths.find(p => fs.existsSync(p)) || path.join(__dirname, "../website");
app.use(express.static(websiteStaticDir));

// In-memory OTP store (for development)
const otpStore = new Map();

// Add custom OTP endpoints
app.post("/api/custom/send-otp", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: "Phone number is required" });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(phoneNumber, otp);

        // Send via WhatsApp
        await sendWhatsAppOTP(phoneNumber, otp);
        res.json({ success: true, message: "OTP sent" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

app.post("/api/custom/verify-otp", (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (otpStore.get(phoneNumber) === otp) {
        // OTP verified successfully
        otpStore.delete(phoneNumber);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Invalid or expired OTP" });
    }
});

// Import DB client
import { createClient } from "@libsql/client";
import "dotenv/config";
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || ""
});

app.post("/api/custom/update-player-id", async (req, res) => {
    try {
        const { email, playerId } = req.body;
        if (!email || !playerId) return res.status(400).json({ error: "Missing fields" });
        await db.execute({
            sql: "UPDATE user SET playerId = ? WHERE email = ?",
            args: [playerId, email]
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Player ID update error:", e);
        res.status(500).json({ error: "Failed to update" });
    }
});

app.post("/api/custom/update-status", async (req, res) => {
    try {
        const { email, status, phone } = req.body;
        if (!email || !status) return res.status(400).json({ error: "Missing fields" });

        let lastLoginAtSql = status === 'active' ? ", lastLoginAt = ?" : "";
        let phoneSql = phone ? ", phoneNumber = ?" : "";

        let args = [status];
        if (status === 'active') args.push(Date.now());
        if (phone) args.push(phone);
        args.push(email);

        const result = await db.execute({
            sql: `UPDATE user SET status = ?${lastLoginAtSql}${phoneSql} WHERE email = ?`,
            args: args
        });

        console.log(`Status update for ${email}:`, result.rowsAffected, "rows affected");
        res.json({ success: true });
    } catch (e) {
        console.error("Status update error:", e);
        res.status(500).json({ error: "Failed to update status" });
    }
});

app.post("/api/custom/campaign/whatsapp", async (req, res) => {
    try {
        const { message, password } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        const users = await db.execute("SELECT phoneNumber FROM user WHERE phoneNumber IS NOT NULL");

        let count = 0;
        for (const row of users.rows) {
            const phone = row.phoneNumber;
            if (phone) {
                // We format the message and send
                const cleanNumber = phone.replace(/\D/g, '');
                const num = cleanNumber.length === 10 ? '91' + cleanNumber : cleanNumber;
                const chatId = `${num}@c.us`;

                // Assuming client is exposed or we have a generic sendMessage method
                // Wait, we need to export sendWhatsAppMessage from whatsapp.js
                // I will update whatsapp.js to export a sendWhatsAppMessage function
                // For now, I'll just use a placeholder
                await import('./whatsapp.js').then(w => w.sendWhatsAppMessage(chatId, message));
                count++;
            }
        }
        res.json({ success: true, count });
    } catch (e) {
        console.error("WA Campaign Error:", e);
        res.status(500).json({ error: "Failed to send campaign" });
    }
});

app.post("/api/custom/campaign/notification", async (req, res) => {
    try {
        const { title, body, imageUrl, password } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        const users = await db.execute("SELECT playerId FROM user WHERE playerId IS NOT NULL");
        const playerIds = users.rows.map(row => row.playerId);

        if (playerIds.length === 0) return res.json({ success: true, count: 0 });

        const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${process.env.VITE_FIREBASE_SERVER_KEY}`
            },
            body: JSON.stringify({
                registration_ids: playerIds,
                notification: {
                    title: title,
                    body: body,
                    image: imageUrl
                }
            })
        });

        const fcmData = await fcmRes.json();
        res.json({ success: true, count: playerIds.length, result: fcmData });
    } catch (e) {
        console.error("FCM Campaign Error:", e);
        res.status(500).json({ error: "Failed to send notification" });
    }
});

app.get("/api/products", async (req, res) => {
    try {
        const products = await db.execute("SELECT * FROM products");
        res.json({ success: true, products: products.rows });
    } catch (e) {
        console.error("Fetch products error:", e);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.post("/api/products", async (req, res) => {
    try {
        const { name, category_id, price, quantity, description, imageUrl, available_stock, password } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        const id = 'p' + Math.random().toString(36).substr(2, 9);
        await db.execute({
            sql: `INSERT INTO products (id, name, category_id, price, quantity, description, image_url, image_base64, available_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [id, name, category_id || 'general', price, quantity, description, imageUrl, '', available_stock !== undefined ? available_stock : 100]
        });

        res.json({ success: true, productId: id });
    } catch (e) {
        console.error("Add product error:", e);
        res.status(500).json({ error: "Failed to add product" });
    }
});

app.put("/api/products/:id", async (req, res) => {
    try {
        const { name, category_id, price, quantity, description, imageUrl, available_stock, password } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        await db.execute({
            sql: `UPDATE products SET name = ?, category_id = ?, price = ?, quantity = ?, description = ?, image_url = ?, available_stock = ? WHERE id = ?`,
            args: [name, category_id || 'general', price, quantity, description, imageUrl, available_stock !== undefined ? available_stock : 100, req.params.id]
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Update product error:", e);
        res.status(500).json({ error: "Failed to update product" });
    }
});

app.put("/api/products/:id/stock", async (req, res) => {
    try {
        const { password, available_stock } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        await db.execute({
            sql: `UPDATE products SET available_stock = ? WHERE id = ?`,
            args: [available_stock, req.params.id]
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Update stock error:", e);
        res.status(500).json({ error: "Failed to update stock" });
    }
});

app.delete("/api/products/:id", async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        await db.execute({
            sql: `DELETE FROM products WHERE id = ?`,
            args: [req.params.id]
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Delete product error:", e);
        res.status(500).json({ error: "Failed to delete product" });
    }
});

app.get("/api/custom/user-address", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: "Email is required" });

        const userRes = await db.execute({
            sql: "SELECT id, name, phoneNumber, deliveryArea, houseNo, landmark, latitude, longitude FROM user WHERE email = ?",
            args: [email]
        });

        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const u = userRes.rows[0];

        const hasSavedAddress = !!(u.deliveryArea && u.houseNo);
        res.json({
            success: true,
            hasSavedAddress,
            address: hasSavedAddress ? {
                deliveryArea: u.deliveryArea,
                houseNo: u.houseNo,
                landmark: u.landmark,
                latitude: u.latitude,
                longitude: u.longitude
            } : null
        });
    } catch (e) {
        console.error("Get user address error:", e);
        res.status(500).json({ error: "Failed to fetch user address" });
    }
});
// Calculate estimated delivery: approx 24 hours after order, constrained to 9 AM - 9 PM window
function calculateEstimatedDeliveryTime(createdAt) {
    const orderDate = new Date(createdAt || Date.now());
    const est = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000);
    const hour = orderDate.getHours();
    const minutes = orderDate.getMinutes();

    if (hour < 9) {
        // Before 9:00 AM (e.g. 7 AM) -> opening working hour: 9:00 AM next day
        est.setHours(9, 0, 0, 0);
    } else if (hour >= 21) {
        // 9:00 PM or later (e.g. 10 PM) -> last working hour: 9:00 PM next day
        est.setHours(21, 0, 0, 0);
    } else {
        // Between 9:00 AM and 9:00 PM (e.g. 7 PM) -> approx 24 hours later (7 PM next day)
        est.setHours(hour, minutes, 0, 0);
    }
    return est.getTime();
}

app.post("/api/custom/order", async (req, res) => {
    try {
        const { email, items, deliveryArea, houseNo, landmark, latitude, longitude, orderType, saveAddress } = req.body;
        if (!email || !items || items.length === 0) return res.status(400).json({ error: "Missing fields" });

        // Get userId and phoneNumber from email
        const userRes = await db.execute({
            sql: "SELECT id, phoneNumber FROM user WHERE email = ?",
            args: [email]
        });

        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const userRow = userRes.rows[0];
        const userId = userRow.id;
        const userPhone = userRow.phoneNumber;
        const orderId = 'ord_' + Math.random().toString(36).substr(2, 9);

        // Calculate total amount from DB or item payload
        let totalAmount = 0;
        const orderItemsSql = [];
        let hasPlan = false;
        let planTitles = [];

        for (const item of items) {
            const qty = Number(item.quantity || item.qty || 1);
            const prodRes = await db.execute({
                sql: "SELECT name, price FROM products WHERE id = ?",
                args: [item.productId]
            });
            if (prodRes.rows.length > 0) {
                const prod = prodRes.rows[0];
                totalAmount += (prod.price * qty);
                orderItemsSql.push({
                    sql: `INSERT INTO order_items (id, orderId, productId, productName, quantity, priceAtPurchase) VALUES (?, ?, ?, ?, ?, ?)`,
                    args: ['oi_' + Math.random().toString(36).substr(2, 9), orderId, item.productId, prod.name, qty, prod.price]
                });
                if (item.productId && item.productId.startsWith('plan_')) {
                    hasPlan = true;
                    planTitles.push(prod.name);
                }
            } else if (item.price && item.productName) {
                // Support direct plan / promo bookings
                totalAmount += (item.price * qty);
                orderItemsSql.push({
                    sql: `INSERT INTO order_items (id, orderId, productId, productName, quantity, priceAtPurchase) VALUES (?, ?, ?, ?, ?, ?)`,
                    args: ['oi_' + Math.random().toString(36).substr(2, 9), orderId, item.productId, item.productName, qty, item.price]
                });
                if (item.productId && item.productId.startsWith('plan_')) {
                    hasPlan = true;
                    planTitles.push(item.productName);
                }
            }
        }

        if (totalAmount === 0) return res.status(400).json({ error: "Invalid products" });

        const createdAt = Date.now();
        const estimatedDelivery = calculateEstimatedDeliveryTime(createdAt);

        // Insert Order with calculated estimatedDelivery (24h constrained to 9 AM - 9 PM)
        await db.execute({
            sql: `INSERT INTO "order" (id, userId, orderType, status, estimatedDelivery, deliveryArea, houseNo, landmark, latitude, longitude, totalAmount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [orderId, userId, orderType || (hasPlan ? 'SUBSCRIPTION_PLAN' : 'INSTANT_BUY'), 'PENDING', estimatedDelivery, deliveryArea || null, houseNo || null, landmark || null, latitude || null, longitude || null, totalAmount, createdAt]
        });

        // Insert Order Items (Not real tx for LibSQL basic, but good enough loop)
        for (const oi of orderItemsSql) {
            await db.execute(oi);
        }

        // Save / Update user's address in user table so they don't have to re-enter it next time
        if (deliveryArea && houseNo) {
            try {
                await db.execute({
                    sql: "UPDATE user SET deliveryArea = ?, houseNo = ?, landmark = ?, latitude = ?, longitude = ? WHERE id = ?",
                    args: [deliveryArea, houseNo, landmark || null, latitude || null, longitude || null, userId]
                });
            } catch (addrErr) {
                console.error("Failed to update user address:", addrErr);
            }
        }

        // If order contains a subscription plan, create or update user_subscriptions
        if (hasPlan) {
            try {
                const subId = 'sub_' + Math.random().toString(36).substring(2, 9);
                const planItem = items.find(i => i.productId && i.productId.startsWith('plan_')) || items[0];
                const isHalf = planItem.productId && planItem.productId.includes('half');
                const isCow = planItem.productId && planItem.productId.includes('cow');
                const planName = planItem.productName || (isCow ? 'Pure Cow Milk Plan' : 'Pure Buffalo Milk Plan');
                const dailyQty = isHalf ? '500 ml' : '1 Liter';
                const rate = isHalf ? (isCow ? 28 : 33) : (isCow ? 56 : 66);
                const startStr = new Date().toISOString().split('T')[0];
                const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                const endStr = end.toISOString().split('T')[0];

                await db.execute({
                    sql: `INSERT INTO user_subscriptions 
                          (id, userId, planId, planName, dailyQuantity, ratePerUnit, totalDays, startDate, endDate, totalAmount, paymentStatus, status, nextDayPaused, createdAt) 
                          VALUES (?, ?, ?, ?, ?, ?, 30, ?, ?, ?, 'PENDING_AT_DOORSTEP', 'ACTIVE', 0, ?)`,
                    args: [subId, userId, planItem.productId || 'plan_cow', planName, dailyQty, rate, startStr, endStr, totalAmount, Date.now()]
                });

                await db.execute({
                    sql: "UPDATE user SET isSubscribed = 1 WHERE id = ?",
                    args: [userId]
                });
            } catch (subErr) {
                console.error("Failed to auto-create user subscription record:", subErr);
            }
        }

        // Send WhatsApp confirmation if user has phoneNumber
        if (userPhone) {
            try {
                const cleanNumber = userPhone.replace(/\D/g, '');
                const num = cleanNumber.length === 10 ? '91' + cleanNumber : cleanNumber;
                const chatId = `${num}@c.us`;

                let msg = '';
                if (hasPlan) {
                    msg = `🥛 *Milkman Dairy - Plan Booked Successfully!* 🎉\n\n` +
                        `Dear Customer, your subscription *${planTitles.join(', ') || 'Milk Subscription Plan'}* has been *Successfully Booked*!\n\n` +
                        `📌 Order ID: *#${orderId}*\n` +
                        `💰 Total Amount: *₹${totalAmount}*\n` +
                        `📍 Address: *${houseNo ? houseNo + ', ' : ''}${deliveryArea || ''}*\n\n` +
                        `🛵 *Our agent will come to your location for confirmation and payment.*\n\n` +
                        `Thank you for choosing Milkman! 🐄`;
                } else {
                    msg = `🥛 *Milkman Dairy - Order Placed* 📦\n\n` +
                        `Your order *#${orderId}* of *₹${totalAmount}* has been placed successfully!\n\n` +
                        `We will deliver it to your address shortly. Thank you!`;
                }
                sendWhatsAppMessage(chatId, msg).catch(e => console.log('WhatsApp send notice:', e.message));
            } catch (err) {
                console.error("WhatsApp notification dispatch error:", err);
            }
        }

        res.json({ success: true, orderId, totalAmount, hasPlan });
    } catch (e) {
        console.error("Order error:", e);
        res.status(500).json({ error: "Failed to place order" });
    }
});

// Areas APIs
app.get("/api/areas", async (req, res) => {
    try {
        const areas = await db.execute("SELECT * FROM serviceable_areas WHERE isActive = 1");
        res.json({ success: true, areas: areas.rows });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch areas" });
    }
});

app.post("/api/areas/manage", async (req, res) => {
    try {
        const { password, name, isActive, id } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        if (id && isActive !== undefined) {
            await db.execute({ sql: "UPDATE serviceable_areas SET isActive = ? WHERE id = ?", args: [isActive ? 1 : 0, id] });
        } else if (name) {
            const newId = 'area_' + Math.random().toString(36).substr(2, 9);
            await db.execute({ sql: "INSERT INTO serviceable_areas (id, name, isActive) VALUES (?, ?, 1)", args: [newId, name] });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Orders Staff APIs
app.get("/api/orders/pending", async (req, res) => {
    try {
        // password check in query
        if (req.query.password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        const twentyFourHoursAgo = Date.now() - 86400000;
        const orders = await db.execute({
            sql: `SELECT o.*, u.name as userName, u.phoneNumber FROM "order" o JOIN user u ON o.userId = u.id WHERE o.status != 'DELIVERED' AND (o.status != 'CANCELLED' OR o.createdAt > ?) ORDER BY o.createdAt DESC`,
            args: [twentyFourHoursAgo]
        });

        // Fetch items
        const results = [];
        for (const o of orders.rows) {
            const items = await db.execute({ sql: "SELECT * FROM order_items WHERE orderId = ?", args: [o.id] });
            results.push({ ...o, items: items.rows });
        }
        res.json({ success: true, orders: results });
    } catch (e) {
        res.status(500).json({ error: "Failed" });
    }
});

app.post("/api/orders/update-status", async (req, res) => {
    try {
        const { password, orderId, status, estimatedDelivery } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        let query = "UPDATE \"order\" SET status = ?";
        let args = [status];
        if (estimatedDelivery) {
            query += ", estimatedDelivery = ?";
            args.push(estimatedDelivery);
        }
        query += " WHERE id = ?";
        args.push(orderId);

        await db.execute({ sql: query, args });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed" });
    }
});

// User Order History
app.get("/api/orders/history", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: "Missing email" });

        const userRes = await db.execute({ sql: "SELECT id FROM user WHERE email = ?", args: [email] });
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const userId = userRes.rows[0].id;

        const orders = await db.execute({
            sql: "SELECT * FROM \"order\" WHERE userId = ? ORDER BY createdAt DESC",
            args: [userId]
        });

        // fetch items
        const results = [];
        for (const o of orders.rows) {
            const items = await db.execute({ sql: "SELECT * FROM order_items WHERE orderId = ?", args: [o.id] });
            results.push({ ...o, items: items.rows });
        }
        res.json({ success: true, orders: results });
    } catch (e) {
        console.error("Order history error:", e);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// User Cancel Order
app.post("/api/orders/user-cancel", async (req, res) => {
    try {
        const { email, orderId } = req.body;
        if (!email || !orderId) return res.status(400).json({ error: "Missing fields" });

        const userRes = await db.execute({ sql: "SELECT id FROM user WHERE email = ?", args: [email] });
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
        const userId = userRes.rows[0].id;

        // Verify order belongs to user and is PENDING
        const orderRes = await db.execute({ sql: "SELECT status FROM \"order\" WHERE id = ? AND userId = ?", args: [orderId, userId] });
        if (orderRes.rows.length === 0) return res.status(404).json({ error: "Order not found" });

        if (orderRes.rows[0].status !== 'PENDING') {
            return res.status(400).json({ error: "Only PENDING orders can be cancelled." });
        }

        await db.execute({ sql: "UPDATE \"order\" SET status = 'CANCELLED' WHERE id = ?", args: [orderId] });
        res.json({ success: true });
    } catch (e) {
        console.error("User cancel error:", e);
        res.status(500).json({ error: "Failed to cancel order" });
    }
});



// Users Staff API
app.get("/api/users", async (req, res) => {
    try {
        if (req.query.password !== "52345234") return res.status(401).json({ error: "Unauthorized" });
        const users = await db.execute("SELECT id, name, phoneNumber, createdAt, status, lastLoginAt FROM user ORDER BY createdAt DESC");
        res.json({ success: true, users: users.rows });
    } catch (e) {
        res.status(500).json({ error: "Failed" });
    }
});

// ==========================================
// SUBSCRIPTION & PASSWORDLESS AUTH ENDPOINTS
// ==========================================

// 1. Passwordless Check & Instant Login for Listed Users
app.post("/api/custom/check-user-auth", async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: "Phone number is required" });

        const raw = phoneNumber.replace(/\D/g, '');
        const with91 = raw.length === 10 ? '91' + raw : raw;
        const without91 = raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw;

        const userRes = await db.execute({
            sql: "SELECT id, name, email, phoneNumber, deliveryArea, houseNo, isSubscribed, deviceToken FROM user WHERE phoneNumber = ? OR phoneNumber = ? LIMIT 1",
            args: [with91, without91]
        });

        if (userRes.rows.length === 0) {
            return res.json({ isListed: false });
        }

        const u = userRes.rows[0];

        // Ensure deviceToken exists
        let token = u.deviceToken;
        if (!token) {
            token = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            await db.execute({
                sql: "UPDATE user SET deviceToken = ?, lastLoginAt = ? WHERE id = ?",
                args: [token, Date.now(), u.id]
            });
        } else {
            await db.execute({
                sql: "UPDATE user SET lastLoginAt = ? WHERE id = ?",
                args: [Date.now(), u.id]
            });
        }

        // Check if user has active subscription
        const subRes = await db.execute({
            sql: "SELECT id FROM user_subscriptions WHERE userId = ? AND status = 'ACTIVE' LIMIT 1",
            args: [u.id]
        });

        const isSubscribed = subRes.rows.length > 0 || !!u.isSubscribed;

        res.json({
            isListed: true,
            user: {
                id: u.id,
                name: u.name,
                phone: u.phoneNumber || with91,
                email: u.email,
                deliveryArea: u.deliveryArea,
                houseNo: u.houseNo,
                deviceToken: token,
                isSubscribed: isSubscribed
            }
        });
    } catch (e) {
        console.error("Check user auth error:", e);
        res.status(500).json({ error: "Failed to check user" });
    }
});

// 2. Fetch User's Active Subscription & Delivery Calendar Status
app.get("/api/subscription/my-status", async (req, res) => {
    try {
        const { phone, userId } = req.query;
        if (!phone && !userId) return res.status(400).json({ error: "Phone or userId is required" });

        let targetUserId = userId;
        let userData = null;
        if (!targetUserId && phone) {
            const raw = phone.replace(/\D/g, '');
            const with91 = raw.length === 10 ? '91' + raw : raw;
            const without91 = raw.length === 12 && raw.startsWith('91') ? raw.slice(2) : raw;
            const uRes = await db.execute({
                sql: "SELECT * FROM user WHERE phoneNumber = ? OR phoneNumber = ? LIMIT 1",
                args: [with91, without91]
            });
            if (uRes.rows.length > 0) {
                targetUserId = uRes.rows[0].id;
                userData = uRes.rows[0];
            }
        } else if (targetUserId) {
            const uRes = await db.execute({
                sql: "SELECT * FROM user WHERE id = ? LIMIT 1",
                args: [targetUserId]
            });
            if (uRes.rows.length > 0) {
                userData = uRes.rows[0];
            }
        }

        if (!targetUserId) {
            return res.json({ success: true, hasSubscription: false, subscriptions: [] });
        }

        // Fetch all subscriptions for the user (latest first)
        const subsRes = await db.execute({
            sql: "SELECT * FROM user_subscriptions WHERE userId = ? ORDER BY createdAt DESC",
            args: [targetUserId]
        });

        if (subsRes.rows.length === 0) {
            return res.json({ success: true, hasSubscription: false, subscriptions: [] });
        }

        // Calculate tomorrow's date string YYYY-MM-DD
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const formattedSubs = [];
        for (const sub of subsRes.rows) {
            // Fetch all delivery records for this subscription
            const delRes = await db.execute({
                sql: "SELECT * FROM subscription_deliveries WHERE subscriptionId = ? ORDER BY deliveryDate ASC",
                args: [sub.id]
            });

            const deliveries = delRes.rows.map(d => ({
                ...d,
                quantityDelivered: d.quantityDelivered || sub.dailyQuantity || '1L',
                deliveryTime: d.deliveryTime || (d.markedAt ? new Date(d.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '06:45 AM')
            }));
            const deliveredCount = deliveries.filter(d => d.status === 'DELIVERED').length;
            const remainingDays = Math.max(0, (sub.totalDays || 30) - deliveredCount);

            // Check if tomorrow is paused
            const tomorrowDelivery = deliveries.find(d => d.deliveryDate === tomorrowStr);
            const isTomorrowPaused = (tomorrowDelivery && tomorrowDelivery.status === 'SKIPPED_BY_USER') || !!sub.nextDayPaused;

            formattedSubs.push({
                ...sub,
                userName: userData ? userData.name : undefined,
                phoneNumber: userData ? userData.phoneNumber : undefined,
                deliveryArea: userData ? userData.deliveryArea : undefined,
                houseNo: userData ? userData.houseNo : undefined,
                landmark: userData ? userData.landmark : undefined,
                deliveredDays: deliveredCount,
                remainingDays: remainingDays,
                nextDayPaused: isTomorrowPaused,
                tomorrowDate: tomorrowStr,
                deliveries: deliveries
            });
        }

        res.json({
            success: true,
            hasSubscription: true,
            subscription: formattedSubs[0],
            subscriptions: formattedSubs
        });
    } catch (e) {
        console.error("Subscription status error:", e);
        res.status(500).json({ error: "Failed to fetch subscription" });
    }
});

// 3. User Action: Stop / Resume Next Day's Delivery (Cutoff: 11:00 PM IST)
app.post("/api/subscription/toggle-pause", async (req, res) => {
    try {
        const { subscriptionId, userId, action } = req.body; // action: 'pause' or 'resume'
        if (!subscriptionId || !userId) return res.status(400).json({ error: "Missing required fields" });

        // Check cutoff: 11:00 PM IST (Indian Standard Time = UTC + 5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const currentHour = istDate.getUTCHours();

        if (currentHour >= 23) {
            return res.status(400).json({
                error: "Cut-off time (11:00 PM) ho chuka hai! Kal ki delivery route lock ho chuki hai."
            });
        }

        // Calculate tomorrow's date in IST
        const tomorrow = new Date(istDate.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const shouldPause = (action === 'pause');

        // Update user_subscriptions nextDayPaused flag
        await db.execute({
            sql: "UPDATE user_subscriptions SET nextDayPaused = ? WHERE id = ?",
            args: [shouldPause ? 1 : 0, subscriptionId]
        });

        // Check if delivery record already exists for tomorrow
        const existRes = await db.execute({
            sql: "SELECT id FROM subscription_deliveries WHERE subscriptionId = ? AND deliveryDate = ?",
            args: [subscriptionId, tomorrowStr]
        });

        if (shouldPause) {
            if (existRes.rows.length > 0) {
                await db.execute({
                    sql: "UPDATE subscription_deliveries SET status = 'SKIPPED_BY_USER', markedBy = 'USER', markedAt = ? WHERE id = ?",
                    args: [Date.now(), existRes.rows[0].id]
                });
            } else {
                const newId = 'del_' + Math.random().toString(36).substring(2, 9);
                await db.execute({
                    sql: "INSERT INTO subscription_deliveries (id, subscriptionId, userId, deliveryDate, status, markedBy, markedAt) VALUES (?, ?, ?, ?, 'SKIPPED_BY_USER', 'USER', ?)",
                    args: [newId, subscriptionId, userId, tomorrowStr, Date.now()]
                });
            }
        } else {
            // Resuming tomorrow
            if (existRes.rows.length > 0) {
                await db.execute({
                    sql: "DELETE FROM subscription_deliveries WHERE id = ?",
                    args: [existRes.rows[0].id]
                });
            }
        }

        res.json({
            success: true,
            nextDayPaused: shouldPause,
            message: shouldPause
                ? `Kal (${tomorrowStr}) ki milk delivery pause kar di gayi hai.`
                : `Kal (${tomorrowStr}) ki milk delivery resume kar di gayi hai.`
        });
    } catch (e) {
        console.error("Toggle pause error:", e);
        res.status(500).json({ error: "Failed to update delivery preference" });
    }
});

// 4. Staff API: Get all subscribers with active status
app.get("/api/staff/subscribers", async (req, res) => {
    try {
        if (req.query.password !== "52345234") return res.status(401).json({ error: "Unauthorized" });

        const date = req.query.date || new Date().toISOString().split('T')[0];

        const subsRes = await db.execute(`
            SELECT s.*, u.name as userName, u.phoneNumber, u.deliveryArea, u.houseNo, u.landmark
            FROM user_subscriptions s
            JOIN user u ON s.userId = u.id
            WHERE s.status = 'ACTIVE'
            ORDER BY s.createdAt DESC
        `);

        // Attach delivery count & status for the requested date
        const results = [];
        for (const sub of subsRes.rows) {
            const delRes = await db.execute({
                sql: "SELECT deliveryDate, status FROM subscription_deliveries WHERE subscriptionId = ?",
                args: [sub.id]
            });
            const deliveredCount = delRes.rows.filter(d => d.status === 'DELIVERED').length;
            const remainingDays = Math.max(0, (sub.totalDays || 30) - deliveredCount);
            const dateRecord = delRes.rows.find(d => d.deliveryDate === date);

            results.push({
                ...sub,
                deliveredDays: deliveredCount,
                remainingDays: remainingDays,
                dateStatus: dateRecord ? dateRecord.status : 'PENDING'
            });
        }

        res.json({ success: true, subscribers: results, date });
    } catch (e) {
        console.error("Staff subscribers fetch error:", e);
        res.status(500).json({ error: "Failed to fetch subscribers" });
    }
});

// 5. Staff API: Add / Register Subscriber
app.post("/api/staff/subscribers/add", async (req, res) => {
    try {
        const {
            password, name, phoneNumber, planId, planName, dailyQuantity,
            ratePerUnit, totalAmount, paymentStatus, startDate, deliveryArea, houseNo
        } = req.body;

        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });
        if (!name || !phoneNumber || !planId) return res.status(400).json({ error: "Missing required fields" });

        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const with91 = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        const without91 = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;

        // Find or create user
        let userRes = await db.execute({
            sql: "SELECT id FROM user WHERE phoneNumber = ? OR phoneNumber = ? LIMIT 1",
            args: [with91, without91]
        });

        let userId = '';
        if (userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
            await db.execute({
                sql: "UPDATE user SET isSubscribed = 1, deliveryArea = COALESCE(?, deliveryArea), houseNo = COALESCE(?, houseNo) WHERE id = ?",
                args: [deliveryArea || null, houseNo || null, userId]
            });
        } else {
            userId = 'u_' + Math.random().toString(36).substring(2, 9);
            const email = `${with91}@milkman.local`;
            const devToken = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            await db.execute({
                sql: `INSERT INTO user (id, name, email, phoneNumber, emailVerified, phoneNumberVerified, deliveryArea, houseNo, isSubscribed, deviceToken, createdAt, updatedAt) 
                      VALUES (?, ?, ?, ?, 1, 1, ?, ?, 1, ?, ?, ?)`,
                args: [userId, name, email, with91, deliveryArea || null, houseNo || null, devToken, Date.now(), Date.now()]
            });
        }

        // Calculate end date (startDate + 30 days)
        const start = startDate ? new Date(startDate) : new Date();
        const startStr = start.toISOString().split('T')[0];
        const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        const endStr = end.toISOString().split('T')[0];

        const subId = 'sub_' + Math.random().toString(36).substring(2, 9);

        await db.execute({
            sql: `INSERT INTO user_subscriptions 
                  (id, userId, planId, planName, dailyQuantity, ratePerUnit, totalDays, startDate, endDate, totalAmount, paymentStatus, status, nextDayPaused, createdAt) 
                  VALUES (?, ?, ?, ?, ?, ?, 30, ?, ?, ?, ?, 'ACTIVE', 0, ?)`,
            args: [
                subId, userId, planId, planName || 'Milk Plan', dailyQuantity || '1 Liter',
                ratePerUnit || 56, startStr, endStr, totalAmount || 1699,
                paymentStatus || 'PENDING_AT_DOORSTEP', Date.now()
            ]
        });

        res.json({ success: true, subscriptionId: subId, userId });
    } catch (e) {
        console.error("Add subscriber error:", e);
        res.status(500).json({ error: "Failed to add subscriber" });
    }
});

// 6. Staff API: Mark Delivery for a Date
app.post("/api/staff/delivery/mark", async (req, res) => {
    try {
        const { password, subscriptionId, userId, deliveryDate, status, quantityDelivered, deliveryTime } = req.body;
        if (password !== "52345234") return res.status(401).json({ error: "Unauthorized" });
        if (!subscriptionId || !deliveryDate || !status) return res.status(400).json({ error: "Missing required fields" });

        const now = new Date();
        const defaultTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const resolvedTime = deliveryTime || defaultTime;

        // Resolve quantity delivered with subscription fallback
        let finalQty = quantityDelivered;
        if (!finalQty) {
            const subRow = await db.execute({
                sql: "SELECT dailyQuantity FROM user_subscriptions WHERE id = ? LIMIT 1",
                args: [subscriptionId]
            });
            finalQty = (subRow.rows.length > 0 && subRow.rows[0].dailyQuantity) ? subRow.rows[0].dailyQuantity : '1L';
        }

        const existRes = await db.execute({
            sql: "SELECT id, quantityDelivered, deliveryTime FROM subscription_deliveries WHERE subscriptionId = ? AND deliveryDate = ?",
            args: [subscriptionId, deliveryDate]
        });

        if (existRes.rows.length > 0) {
            await db.execute({
                sql: "UPDATE subscription_deliveries SET status = ?, markedBy = 'STAFF', markedAt = ?, quantityDelivered = COALESCE(?, quantityDelivered), deliveryTime = COALESCE(?, deliveryTime) WHERE id = ?",
                args: [status, Date.now(), finalQty, resolvedTime, existRes.rows[0].id]
            });
        } else {
            const newId = 'del_' + Math.random().toString(36).substring(2, 9);
            await db.execute({
                sql: "INSERT INTO subscription_deliveries (id, subscriptionId, userId, deliveryDate, status, markedBy, markedAt, quantityDelivered, deliveryTime) VALUES (?, ?, ?, ?, ?, 'STAFF', ?, ?, ?)",
                args: [newId, subscriptionId, userId || '', deliveryDate, status, Date.now(), finalQty, resolvedTime]
            });
        }

        res.json({ success: true, quantityDelivered: finalQty, deliveryTime: resolvedTime });
    } catch (e) {
        console.error("Mark delivery error:", e);
        res.status(500).json({ error: "Failed to mark delivery" });
    }
});

// 7. Staff API: Fetch Customer Delivery History
app.get("/api/staff/delivery/history", async (req, res) => {
    try {
        if (req.query.password !== "52345234") return res.status(401).json({ error: "Unauthorized" });
        const { subscriptionId } = req.query;
        if (!subscriptionId) return res.status(400).json({ error: "subscriptionId is required" });

        const delRes = await db.execute({
            sql: "SELECT * FROM subscription_deliveries WHERE subscriptionId = ? ORDER BY deliveryDate ASC",
            args: [subscriptionId]
        });

        const deliveries = delRes.rows.map(d => ({
            ...d,
            quantityDelivered: d.quantityDelivered || '1L',
            deliveryTime: d.deliveryTime || (d.markedAt ? new Date(d.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '06:45 AM')
        }));

        res.json({ success: true, deliveries });
    } catch (e) {
        console.error("Staff history error:", e);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// ==========================================
// Product Batch & Traceability Video APIs
// ==========================================

// Helper: Extract YouTube ID & Thumbnail
function getYouTubeThumbnail(url) {
    if (!url) return "";
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
    const match = url.match(regExp);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}

// 1. Get all batches (ordered newest first)
app.get("/api/batches", async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM product_batches ORDER BY created_at DESC");
        res.json({ success: true, batches: result.rows });
    } catch (e) {
        console.error("Fetch batches error:", e);
        res.status(500).json({ error: "Failed to fetch batches" });
    }
});

// 2. Search batch by Batch Number (Case-insensitive)
app.get("/api/batches/:batchNo", async (req, res) => {
    try {
        const { batchNo } = req.params;
        if (!batchNo) return res.status(400).json({ error: "Batch number required" });

        const cleanNo = batchNo.trim();
        const result = await db.execute({
            sql: "SELECT * FROM product_batches WHERE LOWER(TRIM(batch_no)) = LOWER(TRIM(?)) LIMIT 1",
            args: [cleanNo]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Batch not found" });
        }

        res.json({ success: true, batch: result.rows[0] });
    } catch (e) {
        console.error("Search batch error:", e);
        res.status(500).json({ error: "Failed to search batch" });
    }
});

// 3. Add or Update Batch (Staff PIN protected)
app.post("/api/batches", async (req, res) => {
    try {
        const {
            password,
            batch_no,
            title,
            product_name,
            video_url,
            thumbnail_url,
            preparation_date,
            fat_percentage,
            snf_percentage,
            farm_location,
            notes
        } = req.body;

        if (password !== "52345234") {
            return res.status(401).json({ error: "Unauthorized: Invalid PIN" });
        }

        if (!batch_no || !title || !product_name || !video_url) {
            return res.status(400).json({ error: "Batch number, title, product name, and video URL are required" });
        }

        const cleanBatchNo = batch_no.trim().toUpperCase();
        let thumb = (thumbnail_url && thumbnail_url.trim()) || getYouTubeThumbnail(video_url) || "https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?w=800&auto=format&fit=crop&q=80";

        // Check if batch_no already exists
        const existRes = await db.execute({
            sql: "SELECT id FROM product_batches WHERE LOWER(TRIM(batch_no)) = LOWER(TRIM(?))",
            args: [cleanBatchNo]
        });

        let batchId;
        if (existRes.rows.length > 0) {
            batchId = existRes.rows[0].id;
            await db.execute({
                sql: `UPDATE product_batches SET 
                        title = ?, product_name = ?, video_url = ?, thumbnail_url = ?,
                        preparation_date = ?, fat_percentage = ?, snf_percentage = ?,
                        farm_location = ?, notes = ?
                      WHERE id = ?`,
                args: [
                    title,
                    product_name,
                    video_url,
                    thumb,
                    preparation_date || new Date().toLocaleString(),
                    fat_percentage || "4.8%",
                    snf_percentage || "8.9%",
                    farm_location || "Vedic Gir Dairy Farm",
                    notes || "100% Pure, Untouched, Certified Clean",
                    batchId
                ]
            });
        } else {
            batchId = 'batch_' + Math.random().toString(36).substring(2, 9);
            await db.execute({
                sql: `INSERT INTO product_batches (
                        id, batch_no, title, product_name, video_url, thumbnail_url,
                        preparation_date, fat_percentage, snf_percentage, farm_location, notes, created_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    batchId,
                    cleanBatchNo,
                    title,
                    product_name,
                    video_url,
                    thumb,
                    preparation_date || new Date().toLocaleString(),
                    fat_percentage || "4.8%",
                    snf_percentage || "8.9%",
                    farm_location || "Vedic Gir Dairy Farm",
                    notes || "100% Pure, Untouched, Certified Clean",
                    Date.now()
                ]
            });
        }

        res.json({ success: true, batchId, batch_no: cleanBatchNo });
    } catch (e) {
        console.error("Create batch error:", e);
        res.status(500).json({ error: "Failed to save batch: " + e.message });
    }
});

// 4. Delete Batch (Staff PIN protected)
app.delete("/api/batches/:id", async (req, res) => {
    try {
        const password = req.body?.password || req.query?.password;
        if (password !== "52345234") {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { id } = req.params;
        await db.execute({
            sql: "DELETE FROM product_batches WHERE id = ?",
            args: [id]
        });

        res.json({ success: true, message: "Batch deleted successfully" });
    } catch (e) {
        console.error("Delete batch error:", e);
        res.status(500).json({ error: "Failed to delete batch" });
    }
});

// Pass auth routes to Better Auth handler
app.use("/api/auth", toNodeHandler(auth));

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "Milkman Backend Running 🥛" });
});

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) {
                ips.push(alias.address);
            }
        }
    }
    return ips;
}

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    const localIps = getLocalIpAddresses();
    const primaryIp = localIps[0] || 'localhost';
    console.log(`====================================================`);
    console.log(`🥛 Milkman Fullstack Server Listening on Port ${PORT}`);
    console.log(`👉 Local:        http://localhost:${PORT}`);
    console.log(`👉 Trace Batch: http://localhost:${PORT}/trace.html`);
    console.log(`👉 Staff:       http://localhost:${PORT}/staff.html`);
    console.log(`📱 Mobile Wi-Fi:http://${primaryIp}:${PORT}`);
    console.log(`🥛 Subscription:http://${primaryIp}:${PORT}/subscription.html`);
    if (localIps.length > 1) {
        console.log(`🌐 All Active IPs: ${localIps.join(', ')}`);
    }
    console.log(`====================================================`);

    // Start the WhatsApp engine
    initWhatsApp();

    // Auto-calculate and backfill any older orders missing estimatedDelivery using the 9 AM - 9 PM 24-hr rule
    (async () => {
        try {
            const rows = await db.execute({ sql: 'SELECT id, createdAt FROM "order" WHERE estimatedDelivery IS NULL OR estimatedDelivery = 0' });
            for (const r of rows.rows) {
                if (r.createdAt) {
                    const est = calculateEstimatedDeliveryTime(r.createdAt);
                    await db.execute({ sql: 'UPDATE "order" SET estimatedDelivery = ? WHERE id = ?', args: [est, r.id] });
                }
            }
        } catch (e) {
            // non-blocking
        }
    })();
});

