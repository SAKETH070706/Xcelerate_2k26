import Registration from "../models/Registration.js";

const renderPage = ({ valid, participant, query }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Xcelerate-2K26 Attendance Pass</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background: #090d16;
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .card {
            max-width: 440px;
            width: 100%;
            background: #111827;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            text-align: center;
        }
        .header {
            padding: 32px 20px 24px;
            background: ${valid ? "linear-gradient(135deg, #064e3b 0%, #065f46 100%)" : "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)"};
            position: relative;
        }
        .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.25);
            color: #fff;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding: 6px 14px;
            border-radius: 9999px;
            margin-bottom: 12px;
            backdrop-filter: blur(4px);
        }
        h1 { font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .subtitle { color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 500; }
        .body { padding: 24px 20px; }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.07);
            font-size: 14px;
        }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #9ca3af; font-weight: 600; text-align: left; }
        .value { color: #f9fafb; font-weight: 700; text-align: right; }
        .token-tag {
            font-family: monospace;
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 13px;
        }
        .checkin-status {
            margin-top: 18px;
            padding: 12px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 13px;
            background: ${participant?.attendanceMarked ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)"};
            color: ${participant?.attendanceMarked ? "#34d399" : "#fbbf24"};
            border: 1px solid ${participant?.attendanceMarked ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"};
        }
        .footer {
            padding: 16px 20px;
            background: #0d131f;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="badge">${valid ? "VALID ATTENDEE PASS ✓" : "INVALID TOKEN ✗"}</div>
            <h1>${valid ? participant.name : "Pass Not Found"}</h1>
            <p class="subtitle">Xcelerate-2K26 &bull; SRKR ACM Chapter</p>
        </div>
        <div class="body">
            ${valid ? `
                <div class="detail-row">
                    <span class="label">Registration No</span>
                    <span class="value">${participant.registrationNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Branch & Section</span>
                    <span class="value">${participant.branch} &bull; Sec ${participant.section}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Membership</span>
                    <span class="value">${participant.isAcmMember ? "ACE Member (Verified)" : "Non-Member"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Status</span>
                    <span class="value" style="color: #34d399;">${participant.paymentMode === "Offline" ? "Offline Desk (Cash)" : "Online (UPI)"}</span>
                </div>
                <div class="checkin-status">
                    ${participant.attendanceMarked
                        ? `✓ Attendance Recorded (${new Date(participant.attendanceMarkedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`
                        : "⏳ Ready for Check-in at Entry Desk"}
                </div>
            ` : `
                <p style="color: #ef4444; font-size: 14px; margin-bottom: 12px;">
                    No attendee record matches the scanned QR code or pass code:
                </p>
                <p style="font-family: monospace; color: #9ca3af; background: #1f2937; padding: 10px; border-radius: 8px;">
                    ${query}
                </p>
            `}
        </div>
        <div class="footer">
            SRKR ACM Student Chapter &bull; Technical Event 2026
        </div>
    </div>
</body>
</html>
`;

export const verifyCertificate = async (req, res) => {
    try {
        let query = (req.params.aceId || req.params.token || req.query.token || "").trim();
        if (query.includes("/verify/")) {
            query = query.split("/verify/")[1].split("?")[0].split("/")[0].trim();
        }

        if (!query) {
            return res.status(400).send(renderPage({ valid: false, query: "None provided" }));
        }

        const participant = await Registration.findOne({
            $or: [
                { qrToken: query },
                { registrationNumber: query.toUpperCase() },
                { email: query.toLowerCase() },
                { aceId: query.toUpperCase() },
            ],
        });

        const wantsJson = Boolean(
            req.query.json === "true" ||
            req.headers.accept?.includes("application/json") ||
            req.xhr
        );

        if (!participant) {
            if (wantsJson) {
                return res.status(404).json({
                    success: false,
                    valid: false,
                    message: "No attendee record matches this pass code.",
                    query,
                });
            }
            return res.status(404).send(renderPage({ valid: false, query }));
        }

        if (wantsJson) {
            return res.json({
                success: true,
                valid: true,
                participant: {
                    name: participant.name,
                    registrationNumber: participant.registrationNumber,
                    branch: participant.branch,
                    section: participant.section,
                    isAcmMember: participant.isAcmMember,
                    paymentMode: participant.paymentMode,
                    qrToken: participant.qrToken,
                    attendanceMarked: participant.attendanceMarked,
                    attendanceMarkedAt: participant.attendanceMarkedAt,
                },
            });
        }

        return res.send(renderPage({ valid: true, participant, query }));
    } catch (err) {
        console.error("Verification error:", err);
        return res.status(500).send("Internal server error during verification.");
    }
};

/**
 * EBM Check-in scanner API to mark attendance
 */
export const markAttendance = async (req, res) => {
    try {
        let { token, adminPasscode, scannedBy = "EBM Desk" } = req.body;

        if (adminPasscode !== "admin123") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Invalid admin passcode.",
            });
        }

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "QR Token is required.",
            });
        }

        token = String(token).trim();
        if (token.includes("/verify/")) {
            token = token.split("/verify/")[1].split("?")[0].split("/")[0].trim();
        }

        const participant = await Registration.findOne({
            $or: [
                { qrToken: token },
                { registrationNumber: token.toUpperCase() },
            ],
        });

        if (!participant) {
            return res.status(404).json({
                success: false,
                message: "No registration found with this QR Token.",
            });
        }

        if (participant.attendanceMarked) {
            return res.json({
                success: true,
                alreadyMarked: true,
                message: `Attendance was already marked at ${new Date(participant.attendanceMarkedAt).toLocaleTimeString("en-IN")}.`,
                participant: {
                    name: participant.name,
                    registrationNumber: participant.registrationNumber,
                    branch: participant.branch,
                    section: participant.section,
                    markedAt: participant.attendanceMarkedAt,
                },
            });
        }

        participant.attendanceMarked = true;
        participant.attendanceMarkedAt = new Date();
        participant.attendanceMarkedBy = scannedBy;
        await participant.save();

        // Also update 'checkins' collection in MongoDB for sync
        try {
            const db = mongoose.connection.db;
            if (db) {
                await db.collection("checkins").updateOne(
                    {
                        $or: [
                            { qrToken: participant.qrToken },
                            { participantId: participant.registrationNumber },
                        ],
                    },
                    {
                        $set: {
                            "sessions.0.checkedIn": true,
                            "sessions.0.checkedInAt": new Date(),
                            attendedSessions: 1,
                            attendancePercentage: 50,
                            updatedAt: new Date(),
                        },
                    }
                );
            }
        } catch (syncErr) {
            console.warn("Checkins attendance sync notice:", syncErr.message);
        }

        return res.json({
            success: true,
            message: `Attendance marked successfully for ${participant.name}!`,
            participant: {
                name: participant.name,
                registrationNumber: participant.registrationNumber,
                branch: participant.branch,
                section: participant.section,
                markedAt: participant.attendanceMarkedAt,
            },
        });
    } catch (err) {
        console.error("Mark attendance error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to mark attendance.",
        });
    }
};
