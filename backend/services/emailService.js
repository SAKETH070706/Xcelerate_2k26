import dotenv from "dotenv";
import QRCode from "qrcode";

dotenv.config();

/**
 * Generates an attendance QR code as base64 string
 */
export const generateQrDataUrl = async (content) => {
    try {
        const qrDataUrl = await QRCode.toDataURL(content, {
            width: 320,
            margin: 2,
            color: {
                dark: "#0F172A",
                light: "#FFFFFF",
            },
            errorCorrectionLevel: "H",
        });
        return qrDataUrl;
    } catch (err) {
        console.error("Failed to generate QR Code:", err.message);
        return null;
    }
};

/**
 * Constructs modern, mobile-friendly HTML email for Xcelerate-2K26
 */
const buildEmailHtml = ({ name, isAcmMember, qrDataUrl }) => {
    const qrSectionHtml = qrDataUrl ? `
        <!-- QR CODE ATTENDANCE SECTION -->
        <p style="margin: 22px 0 6px; font-weight: 700; color: #0f172a; font-size: 15px;">
            Your Attendance QR 📲
        </p>
        <p style="margin: 0 0 14px; font-size: 14.5px; color: #334155; line-height: 1.6;">
            The QR code below is unique to you. Please present it for scanning on both days of the event.
        </p>
        <div style="text-align: center; margin: 18px 0 22px;">
            <div style="background: #ffffff; padding: 12px; display: inline-block; border-radius: 12px; border: 1.5px solid #cbd5e1;">
                <img src="cid:attendance-qr.png" alt="Your Attendance QR Code" width="220" height="220" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
            </div>
            <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">
                (Also attached to this email as <strong>attendance-qr.png</strong>)
            </p>
        </div>
    ` : "";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xcelerate-2K26 Registration Successful</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; font-size: 15px; line-height: 1.7;">
        
        <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a;">
            Xcelerate-2K26 Registration Successful! 🎉
        </h2>

        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a; font-weight: 600;">
            Dear ${name},
        </p>

        <p style="margin: 0 0 14px; font-size: 15px; color: #334155;">
            Congratulations! Your registration for <strong>Xcelerate-2K26</strong> has been successfully completed.
        </p>

        <p style="margin: 0 0 20px; font-size: 15px; color: #334155;">
            We’re delighted to have you join us for this two-day technical event, where you’ll <em>Engage, Explore, and Evolve</em> while discovering emerging technologies and exploring your areas of interest.
        </p>

        <p style="margin: 22px 0 8px; font-size: 15px; font-weight: 700; color: #0f172a;">
            What You’ll Explore 📚
        </p>
        <ul style="margin: 0 0 22px; padding-left: 20px; color: #334155; font-size: 14.5px; line-height: 1.85;">
            <li>Emerging technologies &amp; applications</li>
            <li>Hands-on technical skills</li>
            <li>Insights into diverse domains</li>
            <li>Career &amp; learning pathways</li>
            <li>Direction for your technical journey</li>
        </ul>

        ${qrSectionHtml}

        <p style="margin: 20px 0 18px; font-size: 15px; color: #334155;">
            We look forward to having you at <strong>Xcelerate-2K26</strong> and making these two days a meaningful and enriching learning experience.
        </p>

        <p style="margin: 22px 0 4px; font-size: 15px; font-weight: 700; color: #0f172a;">
            Your journey starts here.
        </p>
        <p style="margin: 0 0 24px; font-size: 14.5px; color: #2563eb; font-style: italic;">
            - with ACM by your side, opening the door to new technologies, opportunities, and possibilities. ✨
        </p>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #0f172a;">
                SRKR ACM Student Chapter
            </p>
            <p style="margin: 0;">
                Department of Computer Science &amp; Engineering &bull; SRKR Engineering College
            </p>
        </div>
    </div>
</body>
</html>
    `;
};

/**
 * Sends confirmation email using Brevo (Sendinblue) API v3
 */
export const sendRegistrationEmail = async ({
    name,
    email,
    isAcmMember,
    qrToken,
    registrationNumber,
    branch,
}) => {
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        console.warn("⚠️ BREVO_API_KEY or BREVO_SENDER_EMAIL not set. Skipping email dispatch.");
        return false;
    }

    let qrDataUrl = null;
    let qrBase64Only = null;

    if (qrToken) {
        // Universal verification URL for camera scanning + EBM attendance verification
        const appBase = (process.env.APP_URL || "https://xcelerate-2k26.vercel.app").replace(/\/+$/, "");
        const verifyUrl = `${appBase}/verify/${qrToken}`;

        qrDataUrl = await generateQrDataUrl(verifyUrl);
        if (qrDataUrl) {
            qrBase64Only = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        }
    }

    const htmlContent = buildEmailHtml({ name, isAcmMember, qrDataUrl });
    const key = (process.env.BREVO_API_KEY || "").trim();

    // MODE 1: Brevo SMTP Relay via Nodemailer (used when key starts with xsmtpsib-)
    if (key.startsWith("xsmtpsib-")) {
        const nodemailer = (await import("nodemailer")).default;
        const smtpUser = process.env.BREVO_SMTP_LOGIN || process.env.BREVO_SENDER_EMAIL;

        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false,
            auth: {
                user: smtpUser,
                pass: key,
            },
        });

        const mailAttachments = [];
        if (qrBase64Only) {
            mailAttachments.push({
                filename: "attendance-qr.png",
                content: Buffer.from(qrBase64Only, "base64"),
                cid: "attendance-qr.png",
            });
        }

        await transporter.sendMail({
            from: `"SRKR ACM Student Chapter" <${process.env.BREVO_SENDER_EMAIL}>`,
            to: email,
            subject: "Xcelerate-2K26 Registration Successful! 🎉",
            html: htmlContent,
            attachments: mailAttachments,
        });

        return true;
    }

    // MODE 2: Brevo v3 HTTP REST API (used when key starts with xkeysib-)
    const attachments = [];
    if (qrBase64Only) {
        attachments.push({
            name: "attendance-qr.png",
            content: qrBase64Only,
        });
    }

    const payload = {
        sender: {
            name: "SRKR ACM Student Chapter",
            email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
            {
                email,
                name,
            },
        ],
        subject: "Xcelerate-2K26 Registration Successful! 🎉",
        htmlContent,
    };

    if (attachments.length > 0) {
        payload.attachment = attachments;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": key,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API Error (${response.status}): ${errorText}`);
    }

    return true;
};

/**
 * Wrapper with retry logic for robust email delivery
 */
export const sendRegistrationEmailWithRetry = async (data, attempts = 3) => {
    for (let i = 1; i <= attempts; i++) {
        try {
            await sendRegistrationEmail(data);
            console.log(`✅ Confirmation email sent to ${data.email} (${data.isAcmMember ? "ACM Member" : "Non-ACM Member"})`);
            return true;
        } catch (error) {
            console.error(`❌ Email attempt ${i} failed for ${data.email}:`, error.message);
            if (i < attempts) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * i));
            }
        }
    }
    return false;
};