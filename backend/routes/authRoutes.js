import express from "express";
import rateLimit from "express-rate-limit";
import {
    loginHandler,
    verifySessionHandler,
} from "../controllers/authController.js";

const router = express.Router();

// Rate limiter specifically for login attempts (15 attempts per 5 minutes per IP)
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please wait 5 minutes before trying again.",
    },
});

router.post("/login", authLimiter, loginHandler);
router.get("/verify-session", verifySessionHandler);

export default router;
