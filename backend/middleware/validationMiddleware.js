import Joi from "joi";

const BRANCHES = [
    "CSE",
    "AIML",
    "CIC",
    "IT",
    "AIDS",
    "CSBS",
    "CSIT",
    "CSD",
    "ECE",
    "EEE",
    "Mechanical",
    "Civil",
];

const SECTIONS = ["A", "B", "C", "D", "E", "F"];
const MAX_10MB_BASE64_LENGTH = Math.ceil(10 * 1024 * 1024 * 1.37);

const registrationSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Name is required.",
            "string.min": "Name must contain at least 2 characters.",
            "string.max": "Name cannot exceed 100 characters.",
            "any.required": "Name is required.",
        }),

    email: Joi.string()
        .trim()
        .lowercase()
        .custom((value, helpers) => {
            if (value.includes("@")) {
                if (value.endsWith("@gmail.com")) {
                    return value;
                }
                return helpers.error("string.gmailOnly");
            }
            return `${value}@gmail.com`;
        })
        .pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)
        .required()
        .messages({
            "string.empty": "Gmail address is required.",
            "string.gmailOnly": "Only @gmail.com addresses are allowed.",
            "string.pattern.base": "Please provide a valid Gmail address.",
            "any.required": "Gmail address is required.",
        }),

    registrationNumber: Joi.string()
        .trim()
        .uppercase()
        .min(3)
        .max(25)
        .required()
        .messages({
            "string.empty": "College Registration number is required.",
            "any.required": "College Registration number is required.",
        }),

    branch: Joi.string()
        .valid(...BRANCHES)
        .required()
        .messages({
            "any.only": `Branch must be one of: ${BRANCHES.join(", ")}.`,
            "any.required": "Branch is required.",
        }),

    section: Joi.string()
        .valid(...SECTIONS)
        .required()
        .messages({
            "any.only": `Section must be one of: ${SECTIONS.join(", ")}.`,
            "any.required": "Section is required.",
        }),

    whatsappNumber: Joi.string()
        .trim()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
            "string.empty": "WhatsApp number is required.",
            "string.pattern.base": "WhatsApp number must contain exactly 10 digits.",
            "any.required": "WhatsApp number is required.",
        }),

    isAcmMember: Joi.boolean()
        .required()
        .messages({
            "any.required": "Please indicate if you are an ACM Member.",
        }),

    aceId: Joi.string()
        .trim()
        .allow("", null)
        .optional(),

    paymentMode: Joi.string()
        .valid("Online", "Offline")
        .default("Online"),

    // Required only for Online payments
    paymentScreenshot: Joi.string()
        .allow("", null)
        .when("paymentMode", {
            is: "Online",
            then: Joi.string()
                .required()
                .max(MAX_10MB_BASE64_LENGTH)
                .messages({
                    "string.empty": "Payment screenshot is required for online payments.",
                    "string.max": "Payment screenshot exceeds 10MB limit.",
                    "any.required": "Payment screenshot is required for online payments.",
                }),
            otherwise: Joi.string().allow("", null).optional(),
        }),

    // Required only for Online payments: exactly 12 numeric digits
    utrId: Joi.string()
        .trim()
        .allow("", null)
        .when("paymentMode", {
            is: "Online",
            then: Joi.string()
                .pattern(/^[0-9]{12}$/)
                .required()
                .messages({
                    "string.empty": "12-digit numeric UPI UTR ID is required.",
                    "string.pattern.base": "UPI UTR must be exactly 12 digits, purely numeric.",
                    "any.required": "12-digit numeric UPI UTR ID is required.",
                }),
            otherwise: Joi.string().allow("", null).optional(),
        }),

    declarationConfirmed: Joi.boolean()
        .valid(true)
        .required()
        .messages({
            "any.only": "You must confirm the declaration to proceed.",
            "any.required": "You must confirm the declaration to proceed.",
        }),

    adminPasscode: Joi.string().allow("", null).optional(),
});

export const validateRegistration = (req, res, next) => {
    // Normalize branch case
    if (typeof req.body.branch === "string") {
        const inputBranch = req.body.branch.trim();
        const matched = BRANCHES.find(
            (b) => b.toLowerCase() === inputBranch.toLowerCase()
        );
        if (matched) {
            req.body.branch = matched;
        }
    }

    // Normalize section case
    if (typeof req.body.section === "string") {
        req.body.section = req.body.section.trim().toUpperCase();
    }

    // Coerce isAcmMember if passed as string "Yes"/"No" or "true"/"false"
    if (typeof req.body.isAcmMember === "string") {
        const val = req.body.isAcmMember.trim().toLowerCase();
        req.body.isAcmMember = val === "yes" || val === "true";
    }

    // Coerce declarationConfirmed if passed as string
    if (typeof req.body.declarationConfirmed === "string") {
        req.body.declarationConfirmed = req.body.declarationConfirmed === "true";
    }

    // Validate admin passcode if offline registration is attempted
    if (req.body.paymentMode === "Offline") {
        const expectedPasscode = (process.env.ADMIN_PASSCODE || "admin123").trim();
        if (!req.body.adminPasscode || req.body.adminPasscode.trim() !== expectedPasscode) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Invalid offline desk admin passcode.",
            });
        }
    }

    const { error, value } = registrationSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation failed.",
            errors: error.details.map((detail) => detail.message),
        });
    }

    req.body = value;
    next();
};
