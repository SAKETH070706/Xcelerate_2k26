# Xcelerate-2K26 Registration & Attendance Pass Portal

Official full-stack event registration, payment verification, and QR-based attendance tracking platform for **Xcelerate-2K26**, organized by the **SRKR ACM Student Chapter** & **ACE** (Association of Computer Engineers), Department of Computer Science & Engineering, S.R.K.R. Engineering College (Autonomous), Bhimavaram.

---

## 🚀 Key Features

### 1. 3-Phase Progressive Registration Flow
- **Phase 1 (Membership Verification):** Asks attendees whether they are an ACE / ACM member. For members, an inline 10-digit WhatsApp number verification looks up and authenticates against the verified membership database.
- **Phase 2 (Profile & Details):** Automatically pre-fills authenticated member details (Name, Email, Branch, Year) and prompts only for remaining missing fields (College Roll Number & Section). Non-members complete standard manual entry.
- **Phase 3 (UPI Payment & Verification):** 
  - Dynamic UPI QR Code for instant scanning (`srkr.acm@upi`).
  - 1-tap copy button for UPI ID.
  - Automatic client-side canvas compression for payment screenshots (resizes to ~80–120 KB to completely prevent database storage bloat).
  - 12-digit bank UTR / Transaction Reference ID validation with duplicate submission prevention.

### 2. Digital Attendance Pass & QR Code Verification
- **Universal Attendee Pass:** Generates a personalized attendee pass upon successful registration.
- **Clickable Verification QR Code:** Encodes a direct verification URL (`/verify/<token>`).
- **Multi-Camera Support:** Scannable using normal mobile cameras (Google Lens, iPhone Camera, WhatsApp), instantly opening the live Attendee Pass card.
- **Coordinator & EBM Check-In Sync:** Automatically synchronizes registration records with the event check-in system (`checkins`) for seamless volunteer gate scanning.
- **Strict Privacy Compliance:** Strict data protection policy ensures that internal member identifiers (`aceId`) are never displayed anywhere on public screens, receipts, passes, or scanner cards.

### 3. Transactional Email System (Brevo)
- Branded, mobile-responsive HTML confirmation emails dispatched via Brevo REST API / SMTP.
- Includes event schedule, instructions, venue details, and the unique Attendance Pass QR code embedded and attached as `attendance-qr.png`.

### 4. Admin Secret Offline Desk
- Triple-click trigger on the chapter brand logo opens a passcode-protected modal (`admin123`) for offline on-spot cash registrations at the venue desk.

---

## 🛠️ Technology Stack

- **Frontend:**
  - React 19
  - Vite 8
  - Vanilla CSS (Rich dark-mode glassmorphism, responsive grid & flexbox layouts)
  - `qrcode` for in-browser QR generation
  - HTML5 Canvas for client-side image compression
- **Backend:**
  - Node.js & Express.js (ES Modules)
  - MongoDB Atlas (Mongoose ODM)
  - Brevo Transactional Email API (`@sendinblue/client` / REST v3)
  - Crypto for cryptographically secure pass token generation (`XCEL-<REGNO>-<HEX>`)

---

## 📁 Project Structure

```
Xcelerate/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection logic
│   ├── controllers/
│   │   ├── authController.js     # Admin authentication
│   │   ├── registrationController.js # Registration & member verification
│   │   └── verifyController.js   # QR attendance verification & pass rendering
│   ├── middleware/
│   │   ├── errorMiddleware.js    # Global error handler
│   │   └── validationMiddleware.js # Input sanitization
│   ├── models/
│   │   └── Registration.js       # Attendee registration schema
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth
│   │   ├── registerRoutes.js     # /api/registrations
│   │   └── verifyRoutes.js       # /verify & /api/verify
│   ├── services/
│   │   ├── emailService.js       # Brevo email dispatch with embedded QR pass
│   │   └── registrationService.js # Business logic, duplicate checks, checkin sync
│   ├── .env.example              # Backend environment template
│   └── server.js                 # Server entry point
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg           # Site favicon
│   ├── src/
│   │   ├── assets/               # Logos and event photography
│   │   ├── components/           # UI components (AsteroidsBackground, LoginPage)
│   │   ├── data/                 # Event schedule, curriculum tracks, perks, FAQs
│   │   ├── services/             # API client calls (registrationApi.js)
│   │   ├── App.jsx               # 3-phase stepper, QR generator, pass viewer
│   │   ├── index.css             # Unified modern dark theme stylesheet
│   │   └── main.jsx              # React DOM mounting
│   ├── .env.example              # Frontend environment template
│   ├── vercel.json               # SPA routing rewrite rule
│   └── vite.config.js            # Vite config with /api & /verify proxies
│
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=production

# MongoDB Atlas URI
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.llosnyj.mongodb.net/ACE?retryWrites=true&w=majority

# DNS SRV Lookup Fix
USE_CUSTOM_DNS=true

# Brevo API (Transactional Emails)
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=srkracmofficial@gmail.com
BREVO_SENDER_NAME=SRKR ACM Student Chapter

# Cloudinary / Email Header Banner
EMAIL_HEADER_IMAGE_URL=https://res.cloudinary.com/...

# URLs & CORS
FRONTEND_URL=https://your-frontend.vercel.app,http://localhost:5173
BACKEND_URL=https://your-backend.onrender.com
APP_URL=https://your-frontend.vercel.app
```

### Frontend (`frontend/.env`)
```env
# Backend API Base URL
# Local dev: /api (proxied via Vite to http://localhost:5000)
# Production: https://your-backend.onrender.com/api
VITE_API_URL=/api

# Public URL encoded in Attendee Pass QR Codes
# Local dev: http://192.168.0.4:5173
# Production: https://your-frontend.vercel.app
VITE_PASS_URL=https://your-frontend.vercel.app
```

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/SAKETH070706/Xcelerate_2k26.git
cd Xcelerate_2k26
```

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your backend/.env using backend/.env.example
node server.js
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
# Configure your frontend/.env using frontend/.env.example
npm run dev
```

---

## 🌐 Production Deployment

### Deploy Backend (Render)
1. Go to [render.com](https://render.com) &rarr; **New Web Service**.
2. Connect repository `SAKETH070706/Xcelerate_2k26`.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `npm install` and **Start Command** to `node server.js`.
5. Add environment variables from `backend/.env.example`.

### Deploy Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com) &rarr; **New Project**.
2. Connect repository `SAKETH070706/Xcelerate_2k26`.
3. Set **Root Directory** to `frontend`.
4. Set **Build Command** to `npm run build` and **Output Directory** to `dist`.
5. Under Environment Variables, set `VITE_API_URL` to `https://your-render-url.onrender.com/api`.
6. Click **Deploy**.

---

## 📄 License & Credits
Developed with ❤️ by the **SRKR ACM Student Chapter** & **ACE**.
All rights reserved © 2026.
