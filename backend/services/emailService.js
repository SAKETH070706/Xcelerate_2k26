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
        <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 16px; padding: 26px 20px; margin: 28px 0; text-align: center;">
            <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #0f172a;">
                Your Attendance QR 📲
            </h3>
            <p style="margin: 0 auto 18px; font-size: 14px; line-height: 1.5; color: #475569; max-width: 440px;">
                The QR code below is unique to you. Please present it for scanning on both days of the event.
            </p>
            <div style="background: #ffffff; padding: 16px; display: inline-block; border-radius: 14px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                <img src="cid:attendance-qr.png" alt="Your Attendance QR Code" width="220" height="220" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
            </div>
            <p style="margin: 14px 0 0; font-size: 12px; color: #64748b;">
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
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
    <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);">
        
        <!-- HEADER HERO -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #38bdf8; margin-bottom: 8px;">
                SRKR ACM STUDENT CHAPTER
            </div>
            <h1 style="margin: 0 0 10px; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                Xcelerate-2K26 Registration Successful! 🎉
            </h1>
            <p style="margin: 0; font-size: 15px; color: #94a3b8; font-weight: 500;">
                Two-Day Technical Event &bull; Engage &bull; Explore &bull; Evolve
            </p>
        </div>

        <!-- MAIN BODY -->
        <div style="padding: 32px 30px;">
            <p style="font-size: 17px; line-height: 1.6; color: #0f172a; margin-top: 0; font-weight: 600;">
                Dear ${name},
            </p>

            <p style="font-size: 15px; line-height: 1.7; color: #334155;">
                Congratulations! Your registration for <strong>Xcelerate-2K26</strong> has been successfully completed.
            </p>

            <p style="font-size: 15px; line-height: 1.7; color: #334155;">
                We’re delighted to have you join us for this two-day technical event, where you’ll <em>Engage, Explore, and Evolve</em> while discovering emerging technologies and exploring your areas of interest.
            </p>

            <!-- WHAT YOU'LL EXPLORE CARD -->
            <div style="background: #f8fafc; border-left: 4px solid #38bdf8; border-radius: 10px; padding: 20px 22px; margin: 26px 0;">
                <h3 style="margin: 0 0 14px; font-size: 16px; font-weight: 700; color: #0f172a;">
                    What You’ll Explore 📚
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14.5px; line-height: 1.9;">
                    <li>Emerging technologies &amp; applications</li>
                    <li>Hands-on technical skills</li>
                    <li>Insights into diverse domains</li>
                    <li>Career &amp; learning pathways</li>
                    <li>Direction for your technical journey</li>
                </ul>
            </div>

            ${qrSectionHtml}

            <p style="font-size: 15px; line-height: 1.7; color: #334155; margin-top: 24px;">
                We look forward to having you at <strong>Xcelerate-2K26</strong> and making these two days a meaningful and enriching learning experience.
            </p>

            <!-- INSPIRATIONAL CLOSING -->
            <div style="margin: 28px 0 0; text-align: center; padding: 18px 22px; background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.25);">
                <p style="margin: 0 0 6px; font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">
                    Your journey starts here.
                </p>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0284c7; font-style: italic; line-height: 1.5;">
                    - with ACM by your side, opening the door to new technologies, opportunities, and possibilities. ✨
                </p>
            </div>
        </div>

        <!-- FOOTER -->
        <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
            <p style="margin: 0 0 6px; font-weight: 600; color: #334155;">
                SRKR ACM Student Chapter
            </p>
            <p style="margin: 0; font-size: 12px;">
                Department of Computer Science &amp; Engineering, SRKR Engineering College
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