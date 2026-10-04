import express from "express";
import rateLimit from "express-rate-limit";

import {
    register,
    checkMember,
} from "../controllers/registrationController.js";

import {
    validateRegistration,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // Limit each IP to 60 registrations per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many registrations submitted from this network. Please wait a few minutes before trying again.",
    },
});

const checkMemberLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100, // Allow 100 checks per 5 min
    standardHeaders: true,
    legacyHeaders: false,
});

router.get("/check-member/:phone", checkMemberLimiter, checkMember);

router.post(
    "/",
    registrationLimiter,
    validateRegistration,
    register
);

export default router;