import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();
import registerRoutes from "./routes/registerRoutes.js";
import verifyRoutes from "./routes/verifyRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";

const app = express();

/*
    Configure CORS to allow requests from:
    - Configured FRONTEND_URL in .env
    - Any localhost or 127.0.0.1 port
    - Any local network LAN/Hotspot IP (192.168.*, 10.*, 172.*)
*/
const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
    if (!origin) return true; // Non-browser clients (curl, mobile apps)
    
    const normalized = origin.replace(/\/+$/, "");
    if (allowedOrigins.includes(normalized)) return true;

    // Allow localhost & 127.0.0.1 on any port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true;

    // Allow private network LAN & Wi-Fi / Hotspot IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
    if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalized)) return true;

    return true; // For student registration API, allow incoming registration requests
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health check routes for Render / UptimeRobot / cron-job.org keep-alive
const healthCheckHandler = (req, res) => {
    res.status(200).json({
        success: true,
        status: "healthy",
        uptime: `${Math.floor(process.uptime())}s`,
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
    });
};

app.get("/", healthCheckHandler);
app.get("/health", healthCheckHandler);
app.get("/healthz", healthCheckHandler);
app.get("/api/health", healthCheckHandler);

app.use(
    "/api/auth",
    authRoutes
);
app.use(
    "/api/registrations",
    registerRoutes
);
app.use(
    "/verify",
    verifyRoutes
);
app.use(
    "/api/verify",
    verifyRoutes
);

app.use(errorMiddleware);

export default app;
