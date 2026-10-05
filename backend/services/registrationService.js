import crypto from "crypto";
import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import { sendRegistrationEmailWithRetry } from "./emailService.js";

const formatTitleCase = (str) => {
    if (!str) return "";
    return String(str)
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
};

export const registerUser = async (data) => {
    const {
        name: rawName,
        email: rawEmail,
        registrationNumber: rawRegNo,
        branch,
        section,
        whatsappNumber: rawPhone,
        isAcmMember = false,
        aceId: rawAceId = null,
        paymentMode = "Online",
        paymentScreenshot = null,
        utrId: rawUtrId = null,
        declarationConfirmed = true,
    } = data;

    const name = formatTitleCase(rawName);
    const email = String(rawEmail).trim().toLowerCase();
    const registrationNumber = String(rawRegNo).trim().toUpperCase();
    const whatsappNumber = String(rawPhone).replace(/\D/g, "").slice(-10);
    const aceId = rawAceId ? String(rawAceId).trim().toUpperCase() : null;
    const utrId = rawUtrId ? String(rawUtrId).replace(/\D/g, "").slice(0, 12) : (paymentMode === "Offline" ? `OFFLINE-CASH-${crypto.randomBytes(3).toString("hex").toUpperCase()}` : null);

    // 1. Check duplicate email in actual registrations
    const existingEmail = await Registration.findOne({ email });
    if (existingEmail) {
        const error = new Error("This email is already registered for Xcelerate-2K26.");
        error.statusCode = 409;
        throw error;
    }

    // 2. Check duplicate college registration number
    const existingReg = await Registration.findOne({ registrationNumber });
    if (existingReg) {
        const error = new Error(`College Registration Number ${registrationNumber} is already registered.`);
        error.statusCode = 409;
        throw error;
    }

    // 3. Check duplicate WhatsApp number in actual registrations
    const existingPhone = await Registration.findOne({ whatsappNumber });
    if (existingPhone) {
        const error = new Error(`Phone number ${whatsappNumber} has already been registered for Xcelerate-2K26.`);
        error.statusCode = 409;
        throw error;
    }

    // 4. Check valid format and duplicate UTR ID for online registrations (strictly 12 numeric digits)
    if (paymentMode === "Online") {
        if (!utrId || !/^[0-9]{12}$/.test(utrId)) {
            const error = new Error("UPI UTR must be exactly 12 digits, purely numeric.");
            error.statusCode = 400;
            throw error;
        }
        const existingUtr = await Registration.findOne({ utrId });
        if (existingUtr) {
            const error = new Error(`UTR / Transaction Reference ${utrId} has already been submitted.`);
            error.statusCode = 409;
            throw error;
        }
    }

    // 5. Generate unique attendance QR token for all attendees (universal pass)
    // Style: XCEL-<REGNO>-<CRYPTO-HEX>
    const qrToken = `XCEL-${registrationNumber}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // 6. Create registration record in xcelerate_real_registrations
    const registration = await Registration.create({
        name,
        email,
        registrationNumber,
        branch,
        section,
        whatsappNumber,
        isAcmMember: Boolean(isAcmMember),
        aceId,
        paymentMode,
        paymentScreenshot: paymentMode === "Online" ? paymentScreenshot : null,
        utrId,
        declarationConfirmed: Boolean(declarationConfirmed),
        qrToken,
    });

    // 6b. Automatically sync attendee into 'checkins' collection for QR Scanner App
    try {
        const db = mongoose.connection.db;
        if (db) {
            // Find the active event from events collection
            const activeEvent = await db.collection("events").findOne({
                $or: [
                    { "checkIn.enabled": true },
                    { eventName: { $regex: /xcelerate/i } },
                    { title: { $regex: /xcelerate/i } },
                ],
            }) || await db.collection("events").findOne({});

            if (activeEvent) {
                const eventSessions = (activeEvent.checkIn?.sessions && activeEvent.checkIn.sessions.length > 0)
                    ? activeEvent.checkIn.sessions
                    : [
                        { sessionId: "xcel-day-1", date: "2026-10-05", name: "Day 1 - Foundations & Architecture Deep-Dive" },
                        { sessionId: "xcel-day-2", date: "2026-10-06", name: "Day 2 - Hands-on Lab & Hackathon Showcase" },
                    ];

                const sessions = eventSessions.map((s) => ({
                    sessionId: s.sessionId,
                    date: s.date,
                    sessionName: s.name || s.sessionName || "General Session",
                    checkedIn: false,
                    checkedInAt: null,
                    method: "qr",
                }));

                await db.collection("checkins").updateOne(
                    {
                        eventId: activeEvent._id,
                        $or: [
                            { participantId: registrationNumber },
                            { email },
                        ],
                    },
                    {
                        $setOnInsert: {
                            eventId: activeEvent._id,
                            participantId: registrationNumber,
                            aceId: null, // STRICT RULE: Never store or expose aceId
                            memberType: isAcmMember ? "ace" : "non-ace",
                            name,
                            email,
                            qrToken,
                            sessions,
                            totalSessions: sessions.length,
                            attendedSessions: 0,
                            attendancePercentage: 0,
                            eligible: false,
                            createdAt: new Date(),
                        },
                        $set: {
                            updatedAt: new Date(),
                        },
                    },
                    { upsert: true }
                );
            }
        }
    } catch (syncError) {
        console.warn("⚠️ Attendance check-in sync skipped:", syncError.message);
    }

    // 6c. If attendee is an ACM member, directly update their member record in xcelerate_2026_batch collection
    if (isAcmMember) {
        try {
            const db = mongoose.connection.db;
            if (db) {
                const batchCol = db.collection("xcelerate_2026_batch");
                const query = aceId
                    ? { $or: [{ aceId }, { phone: whatsappNumber }] }
                    : { phone: whatsappNumber };

                const updateDoc = {
                    $set: {
                        name,
                        email,
                        phone: whatsappNumber,
                        branch,
                        registrationNumber,
                        section,
                        updatedAt: new Date(),
                    },
                };

                const updateResult = await batchCol.updateOne(query, updateDoc);
                console.log(`✅ Directly updated xcelerate_2026_batch member record: matched ${updateResult.matchedCount}, modified ${updateResult.modifiedCount}`);
            }
        } catch (batchErr) {
            console.error("⚠️ Failed to update xcelerate_2026_batch member record:", batchErr.message);
        }
    }

    // 7. Send confirmation email via Brevo with QR attendance pass
    try {
        const sent = await sendRegistrationEmailWithRetry({
            name,
            email,
            isAcmMember,
            qrToken,
            registrationNumber,
            branch,
            paymentMode,
        });
        registration.emailStatus = sent ? "Sent" : "Failed";
    } catch (emailError) {
        console.error(`Email dispatch failed for ${email}:`, emailError.message);
        registration.emailStatus = "Failed";
    }

    await registration.save();

    return {
        id: registration._id,
        name: registration.name,
        email: registration.email,
        registrationNumber: registration.registrationNumber,
        branch: registration.branch,
        section: registration.section,
        isAcmMember: registration.isAcmMember,
        aceId: registration.aceId,
        paymentMode: registration.paymentMode,
        qrToken: registration.qrToken,
        emailStatus: registration.emailStatus,
    };
};
