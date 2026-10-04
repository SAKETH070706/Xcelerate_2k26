import crypto from "crypto";

const getSecret = () => process.env.AUTH_SECRET || "ace_freshers_default_auth_key_2026";
const getExpectedCode = () => (process.env.APP_ACCESS_CODE || "").trim();

/**
 * Creates a signed HMAC SHA256 session token
 */
export const createSessionToken = () => {
    const payload = JSON.stringify({
        authenticated: true,
        issuedAt: Date.now(),
        // 7 days validity
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    const base64Payload = Buffer.from(payload).toString("base64url");
    const signature = crypto
        .createHmac("sha256", getSecret())
        .update(base64Payload)
        .digest("base64url");
    return `${base64Payload}.${signature}`;
};

/**
 * Validates a signed session token
 */
export const validateSessionToken = (token) => {
    if (!token || typeof token !== "string") return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [base64Payload, signature] = parts;
    const expectedSignature = crypto
        .createHmac("sha256", getSecret())
        .update(base64Payload)
        .digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    if (
        signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    ) {
        return false;
    }

    try {
        const payload = JSON.parse(
            Buffer.from(base64Payload, "base64url").toString("utf-8")
        );
        if (!payload.expiresAt || Date.now() > payload.expiresAt) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};

/**
 * Handler for POST /api/auth/login
 */
export const loginHandler = async (req, res) => {
    try {
        const { code } = req.body || {};

        if (!code || typeof code !== "string") {
            return res.status(400).json({
                success: false,
                message: "Access code is required.",
            });
        }

        const inputCode = code.trim();
        const expectedCode = getExpectedCode();

        if (!expectedCode) {
            return res.status(500).json({
                success: false,
                message: "Server access code is not configured.",
            });
        }

        if (!inputCode) {
            return res.status(400).json({
                success: false,
                message: "Access code cannot be empty.",
            });
        }

        const inputBuf = Buffer.from(inputCode);
        const expectedBuf = Buffer.from(expectedCode);

        // Constant-time secure comparison
        const isMatch =
            inputBuf.length === expectedBuf.length &&
            crypto.timingSafeEqual(inputBuf, expectedBuf);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid access code. Please check and try again.",
            });
        }

        const token = createSessionToken();

        return res.status(200).json({
            success: true,
            message: "Access granted successfully.",
            token,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Authentication service error. Please try again.",
        });
    }
};

/**
 * Handler for GET /api/auth/verify-session
 */
export const verifySessionHandler = async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : authHeader.trim();

        if (!token || !validateSessionToken(token)) {
            return res.status(401).json({
                success: false,
                valid: false,
                message: "Session is invalid or expired.",
            });
        }

        return res.status(200).json({
            success: true,
            valid: true,
            message: "Session is valid.",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            valid: false,
            message: "Error verifying session.",
        });
    }
};
