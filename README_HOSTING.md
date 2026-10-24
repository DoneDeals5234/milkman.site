# 🥛 Milkman Platform Hosting Guide (milkman.site)

Yeh folder **`milkman.site`** aapki website ko kisi bhi cloud host, VPS, cPanel, ya server par live karne ke liye banaya gaya hai. Isme frontend, backend, database configuration, assets aur scripts sab kuch pre-configured hain.

---

## 📁 Folder Structure Overview

```
milkman.site/
├── public/                 <-- Static Frontend files (index.html, orders.html, etc.)
├── website/                <-- Frontend mirror (HTML, CSS, JS, Assets)
│   ├── index.html          <-- Home, Plans, Products & Cart
│   ├── orders.html         <-- Order History, Invoices, Top In-App Notifications
│   ├── subscription.html   <-- 30-Day Delivery Calendar & Management
│   ├── staff.html          <-- Staff & Rider Dispatch Portal
│   ├── trace.html          <-- Farm Batch QR Code Traceability
│   ├── benefits.html       <-- Health Benefits
│   ├── css/                <-- style.css, benefits.css
│   ├── js/                 <-- main.js, orders.js, loader.js
│   └── assets/             <-- All 15 images, illustrations & logo
├── backend/                <-- Full Node.js REST API + Cloud Database Client
│   ├── server.js           <-- Central Express Server (Port 8080 or process.env.PORT)
│   ├── whatsapp.js         <-- WhatsApp Web Engine for OTPs & Order Receipts
│   ├── auth.js             <-- Authentication & Session Handling
│   ├── schema.js           <-- Database Tables & Schema
│   └── .env                <-- Cloud Turso Database & Firebase Keys (Pre-configured)
├── server.js               <-- Root production entry point
├── package.json            <-- Full dependencies manifest
├── Procfile                <-- For Render / Railway / Heroku
├── vercel.json             <-- For Vercel Serverless Hosting
└── .env                    <-- Environment Variables
```

---

## 🚀 Hosting Methods (Aap Apni Choice Se Select Kar Sakte Hain):

### Option 1: Render / Railway (Recommended - Easiest & Most Reliable)
1. **GitHub** par ek naya private/public repo banayein aur is `milkman.site` folder ki files upload karein.
2. [Render.com](https://render.com) ya [Railway.app](https://railway.app) par login karein.
3. **New Web Service** select karein aur apna GitHub repo connect karein.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Render/Railway aapko instant live URL de dega (e.g., `https://milkman.onrender.com`).
6. Apna custom domain `milkman.site` connect kar lijiye!

---

### Option 2: VPS / Cloud Server (DigitalOcean, AWS, Hostinger VPS, Linode)
1. Server par Node.js (v18+) install karein.
2. `milkman.site` folder ko server par upload karein (via SCP, Git, ya FileZilla).
3. Folder ke andar jakar dependencies install karein:
   ```bash
   cd milkman.site
   npm install
   ```
4. PM2 ke through 24/7 background me run karein:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "milkman-site"
   pm2 save
   pm2 startup
   ```
5. Nginx me reverse proxy set karein:
   ```nginx
   server {
       server_name milkman.site www.milkman.site;
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
6. Free SSL lagayein: `sudo certbot --nginx -d milkman.site -d www.milkman.site`.

---

### Option 3: cPanel / Hostinger Shared Hosting (Setup Node.js App)
1. cPanel me jayein aur **Setup Node.js App** par click karein.
2. **Create Application**:
   - **Node.js version**: 18 ya 20
   - **Application root**: `milkman.site`
   - **Application URL**: `milkman.site`
   - **Application startup file**: `server.js`
3. File Manager se saari files `milkman.site` folder me upload kar dein.
4. **Run NPM Install** button par click karein.
5. App restart karein — aapki website live ho jayegi!

---

## 🔍 How to Test Locally on Your Computer Before Uploading:

Aap apne computer par hi test kar sakte hain:
```bash
cd "milkman.site"
npm install
npm start
```
Browser me open karein: `http://localhost:8080`. Sabhi features, tabs, live tracking, order cancellation, aur loading animations flawlessly chalenge!
