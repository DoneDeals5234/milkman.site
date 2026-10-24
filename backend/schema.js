import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").unique(),
    phoneNumber: text("phoneNumber").unique(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
    phoneNumberVerified: integer("phoneNumberVerified", { mode: "boolean" }),
    playerId: text("playerId"),
    status: text("status").default('offline'),
    lastLoginAt: integer("lastLoginAt"),
    image: text("image"),
    deliveryArea: text("deliveryArea"),
    houseNo: text("houseNo"),
    landmark: text("landmark"),
    latitude: integer("latitude"),
    longitude: integer("longitude"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id)
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const order = sqliteTable("order", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id),
    orderType: text("orderType").notNull(),
    status: text("status").default("PENDING"),
    estimatedDelivery: integer("estimatedDelivery", { mode: "timestamp" }),
    paymentMode: text("paymentMode").default("COD"),
    deliveryArea: text("deliveryArea"),
    houseNo: text("houseNo"),
    landmark: text("landmark"),
    latitude: integer("latitude", { mode: 'number' }), // Turso REAL maps to TS number
    longitude: integer("longitude", { mode: 'number' }), // Turso REAL maps to TS number
    totalAmount: integer("totalAmount").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export const orderItems = sqliteTable("order_items", {
    id: text("id").primaryKey(),
    orderId: text("orderId").notNull().references(() => order.id),
    productId: text("productId").notNull(),
    productName: text("productName").notNull(),
    quantity: integer("quantity").notNull(),
    priceAtPurchase: integer("priceAtPurchase").notNull(),
});

export const serviceableAreas = sqliteTable("serviceable_areas", {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    isActive: integer("isActive", { mode: "boolean" }).default(true),
});

export const products = sqliteTable("products", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category_id: text("category_id"),
    price: integer("price").notNull(),
    quantity: text("quantity"),
    description: text("description"),
    imageUrl: text("image_url"),
});

export const userSubscriptions = sqliteTable("user_subscriptions", {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id),
    planId: text("planId").notNull(),
    planName: text("planName").notNull(),
    dailyQuantity: text("dailyQuantity").notNull(),
    ratePerUnit: integer("ratePerUnit").notNull(),
    totalDays: integer("totalDays").notNull().default(30),
    startDate: text("startDate").notNull(),
    endDate: text("endDate").notNull(),
    totalAmount: integer("totalAmount").notNull(),
    paymentStatus: text("paymentStatus").default("PENDING_AT_DOORSTEP"),
    status: text("status").default("ACTIVE"),
    nextDayPaused: integer("nextDayPaused", { mode: "boolean" }).default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export const subscriptionDeliveries = sqliteTable("subscription_deliveries", {
    id: text("id").primaryKey(),
    subscriptionId: text("subscriptionId").notNull().references(() => userSubscriptions.id),
    userId: text("userId").notNull().references(() => user.id),
    deliveryDate: text("deliveryDate").notNull(),
    status: text("status").notNull().default("DELIVERED"),
    markedBy: text("markedBy").default("STAFF"),
    markedAt: integer("markedAt", { mode: "timestamp" }).notNull(),
    quantityDelivered: text("quantityDelivered"),
    deliveryTime: text("deliveryTime"),
});

export const productBatches = sqliteTable("product_batches", {
    id: text("id").primaryKey(),
    batchNo: text("batch_no").notNull().unique(),
    title: text("title").notNull(),
    productName: text("product_name").notNull(),
    videoUrl: text("video_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    preparationDate: text("preparation_date"),
    fatPercentage: text("fat_percentage"),
    snfPercentage: text("snf_percentage"),
    farmLocation: text("farm_location"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});


