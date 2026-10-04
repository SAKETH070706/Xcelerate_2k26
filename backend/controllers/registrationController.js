import mongoose from "mongoose";
import { registerUser } from "../services/registrationService.js";

/**
 * Check if a phone number belongs to an official ACE / ACM member from xcelerate_2026_batch
 */
export const checkMember = async (req, res, next) => {
    try {
        const rawPhone = (req.params.phone || req.query.phone || "").trim();
        const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

        if (!cleanPhone || cleanPhone.length !== 10) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 10-digit phone number.",
            });
        }

        const batchCol = mongoose.connection.db.collection("xcelerate_2026_batch");
        const member = await batchCol.findOne({ phone: cleanPhone });

        if (!member) {
            return res.json({
                success: true,
                isMember: false,
                message: "Phone number not found in member database.",
            });
        }

        return res.json({
            success: true,
            isMember: true,
            member: {
                aceId: member.aceId,
                name: member.name,
                email: member.email,
                phone: member.phone,
                branch: member.branch,
                year: member.year || "2nd Year",
                gender: member.gender || "Other",
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handle new participant registration (online or offline)
 */
export const register = async (req, res, next) => {
    try {
        const result = await registerUser(req.body);

        let message;
        if (result.paymentMode === "Offline") {
            message = "Offline registration verified! Attendance pass & confirmation email dispatched.";
        } else if (result.emailStatus === "Sent") {
            message = "Registration successful! Confirmation email with your Attendance QR Code has been sent.";
        } else {
            message = "Registration recorded successfully! Confirmation email will arrive shortly.";
        }

        res.status(201).json({
            success: true,
            message,
            registration: {
                id: result.id,
                name: result.name,
                email: result.email,
                registrationNumber: result.registrationNumber,
                branch: result.branch,
                section: result.section,
                isAcmMember: result.isAcmMember,
                aceId: result.aceId,
                paymentMode: result.paymentMode,
                qrToken: result.qrToken,
            },
            emailStatus: result.emailStatus,
        });
    } catch (error) {
        next(error);
    }
};
