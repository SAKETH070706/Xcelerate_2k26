import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";
import { registerParticipant, checkMemberPhone } from "./services/registrationApi";
import AsteroidsBackground from "./components/AsteroidsBackground";
import aceLogo from "./assets/ace-logo.png";
import { EVENT_DATA } from "./data/eventContent";
import "./index.css";

const BRANCH_OPTIONS = [
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

const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F"];

export default function App() {
    // Exact 3 Phases:
    // Phase 1 = Membership Check ("Are you an ACM Member?" -> If yes, shows WhatsApp number field right there)
    // Phase 2 = Student Details (Autofilled profile + ONLY remaining details: Roll No & Section for ACM; manual for Non-Members)
    // Phase 3 = Payment & Verification (UPI QR + Screenshot + 12-digit UTR ID + unique validation)
    const [currentStep, setCurrentStep] = useState(1);
    const [membershipChoice, setMembershipChoice] = useState(null); // null | 'yes' | 'no'

    const [showEventModal, setShowEventModal] = useState(false);
    const [activeEventTab, setActiveEventTab] = useState("schedule");
    const [activeDayIndex, setActiveDayIndex] = useState(0);

    // Secret Offline Desk State
    const [isOfflineDesk, setIsOfflineDesk] = useState(false);
    const [showOfflinePasscodeModal, setShowOfflinePasscodeModal] = useState(false);
    const [offlinePasscodeInput, setOfflinePasscodeInput] = useState("");
    const [offlinePasscodeError, setOfflinePasscodeError] = useState("");
    const logoClickCountRef = useRef(0);
    const logoClickTimerRef = useRef(null);

    // UPI copy feedback state
    const [copiedUpi, setCopiedUpi] = useState(false);

    // Dynamic QR Code data URLs
    const [upiQrDataUrl, setUpiQrDataUrl] = useState("");
    const [passQrDataUrl, setPassQrDataUrl] = useState("");

    // Scanned attendee pass verification state (/verify/:token or #verify/:token)
    const [scannedPassToken, setScannedPassToken] = useState(() => {
        if (typeof window !== "undefined") {
            const path = window.location.pathname;
            const hash = window.location.hash;
            if (path.includes("/verify/")) {
                const t = path.split("/verify/")[1]?.split("/")[0]?.split("?")[0];
                return t ? t.trim() : null;
            } else if (hash.includes("verify/")) {
                const t = hash.split("verify/")[1]?.split("/")[0]?.split("?")[0];
                return t ? t.trim() : null;
            }
        }
        return null;
    });
    const [scannedAttendee, setScannedAttendee] = useState(null);
    const [scannedLoading, setScannedLoading] = useState(() => {
        if (typeof window !== "undefined") {
            const path = window.location.pathname;
            const hash = window.location.hash;
            return path.includes("/verify/") || hash.includes("verify/");
        }
        return false;
    });
    const [scannedError, setScannedError] = useState("");
    const [copiedPassToken, setCopiedPassToken] = useState(false);

    // Form element ref for smooth mobile auto-scroll
    const formCardRef = useRef(null);

    // Device submission cache
    const [existingSubmission, setExistingSubmission] = useState(() => {
        try {
            const saved = localStorage.getItem("xcelerate_registered_pass");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // Form data state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        registrationNumber: "",
        branch: "",
        section: "",
        whatsappNumber: "",
        isAcmMember: false,
        aceId: "",
        paymentScreenshot: "",
        utrId: "",
        declarationConfirmed: false,
    });

    // Member live verification state
    const [memberLoading, setMemberLoading] = useState(false);
    const [verifiedMember, setVerifiedMember] = useState(null);

    const [previews, setPreviews] = useState({
        payment: null, // { url, name, size }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successData, setSuccessData] = useState(null);

    const paymentFileInputRef = useRef(null);

    const scrollToForm = () => {
        setTimeout(() => {
            if (formCardRef.current) {
                formCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 60);
    };

    // Generate UPI QR Code on mount
    useEffect(() => {
        QRCode.toDataURL("upi://pay?pa=srkr.acm@upi&pn=SRKR%20ACM%20Student%20Chapter&cu=INR", {
            width: 240,
            margin: 1.5,
            color: {
                dark: "#0f172a",
                light: "#ffffff",
            },
        })
            .then(setUpiQrDataUrl)
            .catch((err) => console.error("UPI QR Error:", err));
    }, []);

    // Generate Attendance Pass QR Code when token is present
    useEffect(() => {
        const token = existingSubmission?.qrToken || successData?.qrToken;
        if (token) {
            // Encode clickable verification URL from VITE_PASS_URL .env (or origin / Wi-Fi fallback)
            let appBase = (import.meta.env.VITE_PASS_URL || "").trim().replace(/\/+$/, "");
            if (typeof window !== "undefined" && window.location.origin) {
                // In production (e.g. Vercel), always prefer the real origin
                if (!window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
                    appBase = window.location.origin;
                }
            }
            if (!appBase && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
                appBase = "http://192.168.0.4:5173";
            }
            if (!appBase && typeof window !== "undefined") {
                appBase = window.location.origin;
            }
            const passUrl = `${appBase}/verify/${token}`;
            QRCode.toDataURL(passUrl, {
                width: 220,
                margin: 1.5,
                color: {
                    dark: "#0f172a",
                    light: "#ffffff",
                },
            })
                .then(setPassQrDataUrl)
                .catch((err) => console.error("Pass QR Error:", err));
        }
    }, [existingSubmission, successData]);

    // Listen to /offline, /verify/:token, or #verify/:token on URL
    useEffect(() => {
        const checkUrl = async () => {
            const path = window.location.pathname;
            const hash = window.location.hash;

            if (path.toLowerCase().includes("offline") || hash.toLowerCase().includes("offline")) {
                setShowOfflinePasscodeModal(true);
            }

            // Extract verify token if present (/verify/<token> or #verify/<token>)
            let token = null;
            if (path.includes("/verify/")) {
                token = path.split("/verify/")[1]?.split("/")[0]?.split("?")[0];
            } else if (hash.includes("verify/")) {
                token = hash.split("verify/")[1]?.split("/")[0]?.split("?")[0];
            }

            if (token && token.trim()) {
                const cleanToken = token.trim();
                setScannedPassToken(cleanToken);
                setScannedLoading(true);
                setScannedError("");

                // Multi-endpoint fallback to ensure verification works seamlessly
                const candidateUrls = [
                    (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/verify/${cleanToken}?json=true` : null),
                    `https://xcelerate-2k26.onrender.com/api/verify/${cleanToken}?json=true`,
                    `/api/verify/${cleanToken}?json=true`,
                    `${window.location.protocol}//${window.location.hostname}:5000/api/verify/${cleanToken}?json=true`,
                ].filter(Boolean);

                let resolved = false;
                for (const url of candidateUrls) {
                    try {
                        const res = await fetch(url, { headers: { Accept: "application/json" } });
                        const data = await res.json();
                        if (data && (data.valid !== undefined || data.success !== undefined)) {
                            if (data.valid && data.participant) {
                                setScannedAttendee(data.participant);
                            } else {
                                setScannedError(data.message || "No attendee record matches this pass code.");
                            }
                            resolved = true;
                            break;
                        }
                    } catch {
                        // try next candidate
                    }
                }

                if (!resolved) {
                    setScannedError("Could not reach verification server. Please check your internet connection.");
                }
                setScannedLoading(false);
            } else {
                setScannedPassToken(null);
                setScannedAttendee(null);
                setScannedError("");
            }
        };

        checkUrl();
        window.addEventListener("hashchange", checkUrl);
        window.addEventListener("popstate", checkUrl);
        return () => {
            window.removeEventListener("hashchange", checkUrl);
            window.removeEventListener("popstate", checkUrl);
        };
    }, []);

    // Triple-click on ACM Logo triggers admin offline desk modal
    const handleLogoClick = () => {
        logoClickCountRef.current += 1;
        if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);
        logoClickTimerRef.current = setTimeout(() => {
            logoClickCountRef.current = 0;
        }, 800);

        if (logoClickCountRef.current >= 3) {
            logoClickCountRef.current = 0;
            setShowOfflinePasscodeModal(true);
        }
    };

    const handleUnlockOfflineDesk = (e) => {
        e.preventDefault();
        if (offlinePasscodeInput === "admin123") {
            setIsOfflineDesk(true);
            setShowOfflinePasscodeModal(false);
            setOfflinePasscodeInput("");
            setOfflinePasscodeError("");
            setError("");
        } else {
            setOfflinePasscodeError("Invalid passcode. Please enter the correct admin passcode.");
        }
    };

    const handleExitOfflineDesk = () => {
        setIsOfflineDesk(false);
        setError("");
    };

    const copyUpiId = () => {
        navigator.clipboard?.writeText("srkr.acm@upi").catch(() => {});
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2500);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === "checkbox") {
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
        if (error) setError("");
    };

    // Toggle Membership Choice in Phase 1
    const handleMembershipChoiceChange = (choice) => {
        setMembershipChoice(choice);
        setError("");
        if (choice === "yes") {
            setFormData((prev) => ({
                ...prev,
                isAcmMember: true,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                isAcmMember: false,
                name: "",
                email: "",
                branch: "",
                aceId: "",
                whatsappNumber: "",
            }));
            setVerifiedMember(null);
        }
    };

    // Reset flow to register another attendee
    const handleRegisterAnother = () => {
        try {
            localStorage.removeItem("xcelerate_registered_pass");
        } catch (e) {
            console.warn(e);
        }
        setExistingSubmission(null);
        setSuccessData(null);
        setPassQrDataUrl("");
        setMembershipChoice(null);
        setVerifiedMember(null);
        setFormData({
            name: "",
            email: "",
            registrationNumber: "",
            branch: "",
            section: "",
            whatsappNumber: "",
            isAcmMember: false,
            aceId: "",
            paymentScreenshot: "",
            utrId: "",
            declarationConfirmed: false,
        });
        setPreviews({ payment: null });
        setCurrentStep(1);
        setError("");
        scrollToForm();
    };

    // ========================================================
    // PHASE 1 -> PHASE 2
    // ========================================================
    const handleNextFromPhase1 = async () => {
        setError("");

        if (!membershipChoice) {
            setError("Please select whether you are an ACM Member or a Regular Participant.");
            return;
        }

        if (membershipChoice === "yes") {
            const cleanPhone = formData.whatsappNumber.replace(/\D/g, "").slice(-10);
            if (cleanPhone.length !== 10) {
                setError("Please enter your 10-digit WhatsApp phone number that is registered in the official ACM WhatsApp group.");
                return;
            }

            setMemberLoading(true);
            try {
                const res = await checkMemberPhone(cleanPhone);
                if (res.isMember && res.member) {
                    const mem = res.member;
                    setVerifiedMember(mem);
                    const emailUser = (mem.email || "").replace(/@.*$/, "").trim().toLowerCase();

                    // Autofill verified member fields
                    setFormData((prev) => ({
                        ...prev,
                        name: mem.name || "",
                        email: emailUser || "",
                        branch: mem.branch || "",
                        aceId: mem.aceId || "",
                        whatsappNumber: cleanPhone,
                    }));
                    setCurrentStep(2);
                    scrollToForm();
                } else {
                    setError("This phone number was not found in the ACM 2025 Member Directory. Please make sure you entered the exact phone number added in the official ACM WhatsApp group, or choose 'No, Regular Participant'.");
                }
            } catch (err) {
                console.error("Member check error:", err);
                setError("Could not connect to member verification service. Please check your network and try again.");
            } finally {
                setMemberLoading(false);
            }
        } else {
            // Regular Participant proceeds straight to fill details in Phase 2
            setCurrentStep(2);
            scrollToForm();
        }
    };

    // ========================================================
    // PHASE 2 -> PHASE 3 (Payment)
    // ========================================================
    const handleNextFromPhase2 = () => {
        setError("");

        if (formData.isAcmMember) {
            if (!formData.name.trim()) {
                setError("Full Name is missing. Please go back and verify your WhatsApp number.");
                return;
            }
            if (!formData.registrationNumber.trim()) {
                setError("Please enter your College Registration Number (Roll No).");
                return;
            }
            if (!formData.section) {
                setError("Please select your section.");
                return;
            }
        } else {
            if (!formData.name.trim()) {
                setError("Please enter your full name.");
                return;
            }
            const rawEmail = formData.email.trim();
            if (!rawEmail) {
                setError("Please enter your Gmail username.");
                return;
            }
            if (!formData.registrationNumber.trim()) {
                setError("Please enter your College Registration Number.");
                return;
            }
            const cleanPhone = formData.whatsappNumber.replace(/\D/g, "");
            if (cleanPhone.length !== 10) {
                setError("WhatsApp Number must be exactly 10 digits.");
                return;
            }
            if (!formData.branch) {
                setError("Please select your branch.");
                return;
            }
            if (!formData.section) {
                setError("Please select your section.");
                return;
            }
        }

        setCurrentStep(3);
        scrollToForm();
    };

    // Compress image using HTML5 canvas (resizes to max 1000px, 0.75 quality, ~80-120 KB)
    const compressImage = (file, maxWidth = 1000, quality = 0.75) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
                    resolve(compressedBase64);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // File selection for Payment Screenshot with automatic compression
    const handlePaymentScreenshotChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            setError(
                `Payment screenshot is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max limit is 15 MB.`
            );
            if (paymentFileInputRef.current) paymentFileInputRef.current.value = "";
            return;
        }

        try {
            const compressedBase64 = await compressImage(file);
            const approxKb = Math.round((compressedBase64.length * 3) / 4 / 1024);
            setFormData((prev) => ({ ...prev, paymentScreenshot: compressedBase64 }));
            setPreviews((prev) => ({
                ...prev,
                payment: {
                    url: compressedBase64,
                    name: file.name,
                    size: `${approxKb} KB (Optimized)`,
                },
            }));
            setError("");
        } catch (compErr) {
            console.error("Compression fallback:", compErr);
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result;
                setFormData((prev) => ({ ...prev, paymentScreenshot: base64 }));
                setPreviews((prev) => ({
                    ...prev,
                    payment: {
                        url: base64,
                        name: file.name,
                        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                    },
                }));
                setError("");
            };
            reader.readAsDataURL(file);
        }
    };

    const removePaymentScreenshot = (e) => {
        e.stopPropagation();
        setFormData((prev) => ({ ...prev, paymentScreenshot: "" }));
        setPreviews((prev) => ({ ...prev, payment: null }));
        if (paymentFileInputRef.current) paymentFileInputRef.current.value = "";
    };

    // ========================================================
    // PHASE 3 SUBMISSION (Online UPI or Offline Desk)
    // ========================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!isOfflineDesk) {
            if (!formData.paymentScreenshot) {
                setError("Please upload your PhonePe / UPI payment screenshot.");
                return;
            }
            if (!formData.utrId.trim()) {
                setError("Please enter your 12-digit Unique Transaction Reference (UTR) ID.");
                return;
            }
        }

        if (!formData.declarationConfirmed) {
            setError("Please accept the confirmation declaration to complete your registration.");
            return;
        }

        setLoading(true);

        try {
            const emailUsername = formData.email.trim().toLowerCase().replace(/@.*$/, "");
            const fullEmail = `${emailUsername}@gmail.com`;

            const payload = {
                name: formData.name,
                email: fullEmail,
                registrationNumber: formData.registrationNumber.trim().toUpperCase(),
                whatsappNumber: formData.whatsappNumber.replace(/\D/g, "").slice(-10),
                branch: formData.branch,
                section: formData.section,
                isAcmMember: formData.isAcmMember,
                aceId: formData.aceId || null,
                paymentMode: isOfflineDesk ? "Offline" : "Online",
                paymentScreenshot: isOfflineDesk ? null : formData.paymentScreenshot,
                utrId: isOfflineDesk ? null : formData.utrId.trim().toUpperCase(),
                declarationConfirmed: formData.declarationConfirmed,
                adminPasscode: isOfflineDesk ? "admin123" : undefined,
            };

            const response = await registerParticipant(payload);

            const submissionRecord = {
                name: formData.name,
                registrationNumber: payload.registrationNumber,
                branch: formData.branch,
                section: formData.section,
                isAcmMember: formData.isAcmMember,
                aceId: formData.aceId || null,
                paymentMode: payload.paymentMode,
                email: fullEmail,
                message: response.message,
                qrToken: response.registration?.qrToken,
                registeredAt: new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }),
            };

            try {
                localStorage.setItem("xcelerate_registered_pass", JSON.stringify(submissionRecord));
            } catch (storageErr) {
                console.warn("Storage warning:", storageErr);
            }

            setExistingSubmission(submissionRecord);
            setSuccessData(submissionRecord);

            // Reset form
            setFormData({
                name: "",
                email: "",
                registrationNumber: "",
                branch: "",
                section: "",
                whatsappNumber: "",
                isAcmMember: false,
                aceId: "",
                paymentScreenshot: "",
                utrId: "",
                declarationConfirmed: false,
            });
            setPreviews({ payment: null });
            setCurrentStep(1);
            if (paymentFileInputRef.current) paymentFileInputRef.current.value = "";
            scrollToForm();
        } catch (err) {
            const msg =
                err.response?.data?.errors?.[0] ||
                err.response?.data?.message ||
                "Registration failed. Please check your inputs and network connection.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const renderEventGuideBody = () => (
        <>
            <div className="event-overview-grid">
                <div className="event-info-chip">
                    <div className="event-info-chip-label">Event Format</div>
                    <div className="event-info-chip-val">{EVENT_DATA.meta.dates}</div>
                </div>
                <div className="event-info-chip">
                    <div className="event-info-chip-label">Daily Timings</div>
                    <div className="event-info-chip-val">{EVENT_DATA.meta.timing}</div>
                </div>
                <div className="event-info-chip">
                    <div className="event-info-chip-label">Campus Venue</div>
                    <div className="event-info-chip-val">{EVENT_DATA.meta.venue}</div>
                </div>
            </div>

            <div className="event-overview-desc">
                {EVENT_DATA.meta.description}
            </div>

            <div className="event-tabs-bar">
                <button
                    type="button"
                    className={`event-tab-btn ${activeEventTab === "schedule" ? "active" : ""}`}
                    onClick={() => setActiveEventTab("schedule")}
                >
                    Schedule &amp; Domains
                </button>
                <button
                    type="button"
                    className={`event-tab-btn ${activeEventTab === "tracks" ? "active" : ""}`}
                    onClick={() => setActiveEventTab("tracks")}
                >
                    Tracks &amp; Curriculum
                </button>
                <button
                    type="button"
                    className={`event-tab-btn ${activeEventTab === "perks" ? "active" : ""}`}
                    onClick={() => setActiveEventTab("perks")}
                >
                    Perks
                </button>
                <button
                    type="button"
                    className={`event-tab-btn ${activeEventTab === "faqs" ? "active" : ""}`}
                    onClick={() => setActiveEventTab("faqs")}
                >
                    FAQs
                </button>
            </div>

            {activeEventTab === "schedule" && (
                <div>
                    <div className="day-switcher">
                        {(EVENT_DATA.schedule || []).map((dayPlan, idx) => (
                            <button
                                key={dayPlan.day || idx}
                                type="button"
                                className={`day-btn ${activeDayIndex === idx ? "active" : ""}`}
                                onClick={() => setActiveDayIndex(idx)}
                            >
                                <span style={{ fontWeight: "800", marginRight: "6px" }}>{dayPlan.day}</span>
                                <span style={{ opacity: 0.9 }}>&bull; {dayPlan.title}</span>
                            </button>
                        ))}
                    </div>

                    {/* DAY HIGHLIGHT BANNER */}
                    <div style={{
                        background: activeDayIndex === 0
                            ? "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(56, 189, 248, 0.08))"
                            : "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 95, 70, 0.08))",
                        border: `1.5px solid ${activeDayIndex === 0 ? "#bfdbfe" : "#bbf7d0"}`,
                        borderRadius: "14px",
                        padding: "14px 18px",
                        marginBottom: "18px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px"
                    }}>
                        <div style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            background: activeDayIndex === 0 ? "#eff6ff" : "#f0fdf4",
                            color: activeDayIndex === 0 ? "#2563eb" : "#16a34a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            flexShrink: 0
                        }}>
                            {activeDayIndex === 0 ? "📘" : "💻"}
                        </div>
                        <div>
                            <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>
                                {activeDayIndex === 0 ? "Day 1: Comprehensive Foundations" : "Day 2: Dedicated Hands-on Lab"}
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.4" }}>
                                {EVENT_DATA.schedule?.[activeDayIndex]?.subtitle}
                            </div>
                        </div>
                    </div>

                    {/* TIMELINE AGENDA */}
                    <div className="schedule-timeline">
                        {(EVENT_DATA.schedule?.[activeDayIndex]?.sessions || []).map((slot, sIdx) => {
                            const isBreak = slot.title.toLowerCase().includes("break") || slot.title.toLowerCase().includes("lunch");
                            const isLab = slot.title.toLowerCase().includes("lab") || slot.title.toLowerCase().includes("hands-on") || slot.title.toLowerCase().includes("allocation");
                            const isTheory = slot.title.toLowerCase().includes("theory");

                            const pillBadge = isBreak
                                ? { label: "Refreshment", cls: "pill-break" }
                                : isLab
                                ? { label: "Hands-on Lab", cls: "pill-lab" }
                                : isTheory
                                ? { label: "Theory Session", cls: "pill-theory" }
                                : { label: "Ceremony / Event", cls: "pill-ceremony" };

                            return (
                                <div key={sIdx} className="schedule-card-item">
                                    <div className="schedule-time-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        <span>{slot.time}</span>
                                    </div>
                                    <div className="schedule-card-body">
                                        <div className="schedule-card-top">
                                            <h4 className="schedule-card-title">{slot.title}</h4>
                                            <span className={`schedule-type-pill ${pillBadge.cls}`}>{pillBadge.label}</span>
                                        </div>
                                        <p className="schedule-card-desc">{slot.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeEventTab === "tracks" && (
                <div className="tracks-tab-content">
                    <h4 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px", color: "#0f172a" }}>
                        Day 1 Core Theory Tracks
                    </h4>
                    <div className="tracks-list-grid">
                        {(EVENT_DATA.tracks || []).map((t) => (
                            <div key={t.id} className="track-detail-card">
                                <div className="track-badge">{t.tag}</div>
                                <h4>{t.name}</h4>
                                <p>{t.summary}</p>
                            </div>
                        ))}
                    </div>

                    <h4 style={{ fontSize: "15px", fontWeight: "700", margin: "24px 0 12px", color: "#0f172a" }}>
                        Day 2 Hands-on Domains (Choose 1)
                    </h4>
                    <div className="tracks-list-grid">
                        {(EVENT_DATA.day2Domains || []).map((d) => (
                            <div key={d.id} className="track-detail-card">
                                <div className="track-badge">{d.tag}</div>
                                <h4>{d.title}</h4>
                                <p>{d.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeEventTab === "perks" && (
                <div className="perks-grid">
                    {(EVENT_DATA.perks || []).map((perk, pIdx) => (
                        <div key={pIdx} className="perk-card">
                            <div className="perk-title">{perk.title}</div>
                            <p>{perk.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {activeEventTab === "faqs" && (
                <div className="faqs-list">
                    {(EVENT_DATA.faqs || []).map((faq, fIdx) => (
                        <div key={fIdx} className="faq-card">
                            <h4>{faq.q}</h4>
                            <p>{faq.a}</p>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // =========================================================
    // STANDALONE ATTENDEE PASS VIEW (WHEN SCANNED VIA QR CODE)
    // The exact green-themed black card design from verifyController!
    // =========================================================
    if (scannedPassToken) {
        return (
            <div style={{
                minHeight: "100vh",
                background: "#090d16",
                color: "#f1f5f9",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
                fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}>
                <div style={{
                    maxWidth: "440px",
                    width: "100%",
                    background: "#111827",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "24px",
                    overflow: "hidden",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
                    textAlign: "center"
                }}>
                    {scannedLoading ? (
                        <div style={{ padding: "48px 24px" }}>
                            <div style={{
                                width: "42px",
                                height: "42px",
                                border: "3px solid rgba(16, 185, 129, 0.2)",
                                borderTop: "3px solid #34d399",
                                borderRadius: "50%",
                                margin: "0 auto 18px",
                                animation: "spin 0.9s linear infinite"
                            }}></div>
                            <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>
                                Verifying Attendee Pass...
                            </h3>
                            <p style={{ color: "#9ca3af", fontSize: "13px" }}>
                                Authenticating pass with official registry
                            </p>
                        </div>
                    ) : scannedError ? (
                        <div>
                            {/* RED ERROR HEADER */}
                            <div style={{
                                padding: "32px 20px 24px",
                                background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
                                position: "relative"
                            }}>
                                <div style={{
                                    display: "inline-block",
                                    background: "rgba(255, 255, 255, 0.25)",
                                    color: "#fff",
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    textTransform: "uppercase",
                                    letterSpacing: "1.5px",
                                    padding: "6px 14px",
                                    borderRadius: "9999px",
                                    marginBottom: "12px",
                                    backdropFilter: "blur(4px)"
                                }}>
                                    INVALID TOKEN ✗
                                </div>
                                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", marginBottom: "4px" }}>
                                    Pass Not Found
                                </h1>
                                <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "13px", fontWeight: "500" }}>
                                    Xcelerate-2K26 &bull; SRKR ACM Chapter
                                </p>
                            </div>

                            <div style={{ padding: "24px 20px" }}>
                                <p style={{ color: "#ef4444", fontSize: "14px", marginBottom: "12px" }}>
                                    {scannedError}
                                </p>
                                <p style={{ fontFamily: "monospace", color: "#9ca3af", background: "#1f2937", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", wordBreak: "break-all" }}>
                                    {scannedPassToken}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScannedPassToken(null);
                                        setScannedAttendee(null);
                                        setScannedError("");
                                        window.history.pushState({}, "", "/");
                                    }}
                                    style={{
                                        background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "12px",
                                        padding: "12px 24px",
                                        fontWeight: "700",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        width: "100%"
                                    }}
                                >
                                    &larr; Return to Event Home
                                </button>
                            </div>
                        </div>
                    ) : scannedAttendee ? (
                        <div>
                            {/* GREEN HEADER */}
                            <div style={{
                                padding: "32px 20px 24px",
                                background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
                                position: "relative"
                            }}>
                                <div style={{
                                    display: "inline-block",
                                    background: "rgba(255, 255, 255, 0.25)",
                                    color: "#fff",
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    textTransform: "uppercase",
                                    letterSpacing: "1.5px",
                                    padding: "6px 14px",
                                    borderRadius: "9999px",
                                    marginBottom: "12px",
                                    backdropFilter: "blur(4px)"
                                }}>
                                    VALID ATTENDEE PASS ✓
                                </div>
                                <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", marginBottom: "4px" }}>
                                    {scannedAttendee.name}
                                </h1>
                                <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "13px", fontWeight: "500" }}>
                                    Xcelerate-2K26 &bull; SRKR ACM Chapter
                                </p>
                            </div>

                            {/* BODY DETAIL ROWS */}
                            <div style={{ padding: "24px 20px", textAlign: "left" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.07)", fontSize: "14px" }}>
                                    <span style={{ color: "#9ca3af", fontWeight: "600" }}>Registration No</span>
                                    <span style={{ color: "#f9fafb", fontWeight: "700", fontFamily: "monospace", fontSize: "15px" }}>{scannedAttendee.registrationNumber}</span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.07)", fontSize: "14px" }}>
                                    <span style={{ color: "#9ca3af", fontWeight: "600" }}>Branch &amp; Section</span>
                                    <span style={{ color: "#f9fafb", fontWeight: "700" }}>{scannedAttendee.branch} &bull; Sec {scannedAttendee.section}</span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.07)", fontSize: "14px" }}>
                                    <span style={{ color: "#9ca3af", fontWeight: "600" }}>Membership</span>
                                    <span style={{ color: "#f9fafb", fontWeight: "700" }}>
                                        {scannedAttendee.isAcmMember ? "🌟 ACM Member (Verified)" : "Non-Member"}
                                    </span>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", fontSize: "14px" }}>
                                    <span style={{ color: "#9ca3af", fontWeight: "600" }}>Payment Status</span>
                                    <span style={{ color: "#34d399", fontWeight: "700" }}>
                                        {scannedAttendee.paymentMode === "Offline" ? "Offline Desk (Cash)" : "Online (UPI) ✓"}
                                    </span>
                                </div>

                                {/* CHECK-IN STATUS */}
                                <div style={{
                                    marginTop: "18px",
                                    padding: "12px 14px",
                                    borderRadius: "12px",
                                    fontWeight: "700",
                                    fontSize: "13px",
                                    textAlign: "center",
                                    background: scannedAttendee.attendanceMarked ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                    color: scannedAttendee.attendanceMarked ? "#34d399" : "#fbbf24",
                                    border: `1px solid ${scannedAttendee.attendanceMarked ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                                }}>
                                    {scannedAttendee.attendanceMarked
                                        ? `✓ Attendance Recorded (${new Date(scannedAttendee.attendanceMarkedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`
                                        : "⏳ Ready for Check-in at Entry Desk"}
                                </div>

                                {/* ACTION BUTTON */}
                                <div style={{ marginTop: "18px" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setScannedPassToken(null);
                                            setScannedAttendee(null);
                                            setScannedError("");
                                            window.history.pushState({}, "", "/");
                                        }}
                                        style={{
                                            width: "100%",
                                            background: "rgba(255, 255, 255, 0.08)",
                                            color: "#e2e8f0",
                                            border: "1px solid rgba(255, 255, 255, 0.15)",
                                            borderRadius: "12px",
                                            padding: "12px 18px",
                                            fontWeight: "600",
                                            fontSize: "14px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        &larr; Return to Event Home
                                    </button>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div style={{
                                padding: "16px 20px",
                                background: "#0d131f",
                                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                                fontSize: "12px",
                                color: "#6b7280"
                            }}>
                                SRKR ACM Student Chapter &bull; Technical Event 2026
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <AsteroidsBackground />

            {/* HEADER */}
            <header className="site-header">
                <div className="header-inner">
                    <div
                        className="brand"
                        onClick={handleLogoClick}
                        title="Triple-click for Secret Offline Desk"
                        style={{ cursor: "pointer", userSelect: "none" }}
                    >
                        <img src={aceLogo} alt="ACM Logo" className="header-logo" />
                        <div className="brand-text">
                            <strong>SRKR ACM CHAPTER</strong>
                            <span>STUDENT CHAPTER &bull; SRKR ENGINEERING COLLEGE</span>
                        </div>
                    </div>

                    <div className="header-event-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        Xcelerate-2K26
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="main-content">
                {/* HERO BANNER */}
                <section className="hero-wrapper">
                    <div className="hero-pill-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        SRKR ACM Student Chapter Presents
                    </div>

                    <h1 className="hero-main-title">
                        Xcelerate-2K26
                    </h1>

                    <div className="hero-tagline-motto">
                        <span>Engage</span>
                        <span className="dot" />
                        <span>Explore</span>
                        <span className="dot" />
                        <span>Evolve</span>
                    </div>

                    <div className="hero-meta-strip">
                        <div className="hero-meta-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            2-Day Event
                        </div>
                        <div className="hero-meta-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            SRKR ACM Chapter
                        </div>
                        <div className="hero-meta-item">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                            SRKR Engineering College
                        </div>
                    </div>

                    <div className="hero-action-buttons">
                        <button
                            type="button"
                            className="hero-details-trigger-btn"
                            onClick={() => {
                                setActiveEventTab("schedule");
                                const el = document.getElementById("event-guide");
                                if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                                }
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            View Event Guide &amp; Schedule &darr;
                        </button>
                    </div>

                    <div className="hero-scroll-cue">
                        <span>Register Below (Phase 1 of 3)</span>
                        <svg className="cue-arrow-down" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </section>

                {/* PROGRESSIVE FORM CONTAINER */}
                <section className="form-section">
                    <div className="registration-card" ref={formCardRef} id="register-flow">
                        {/* ADMIN OFFLINE DESK BANNER */}
                        {isOfflineDesk && (
                            <div className="offline-desk-banner">
                                <div className="offline-desk-info">
                                    <span className="offline-desk-tag">🛠️ Admin Mode</span>
                                    <strong>Offline Desk Registration (Cash Payment)</strong>
                                    <p>Payment screenshot and UTR are bypassed. Cash collected at desk.</p>
                                </div>
                                <button
                                    type="button"
                                    className="offline-desk-exit-btn"
                                    onClick={handleExitOfflineDesk}
                                >
                                    Exit Desk Mode
                                </button>
                            </div>
                        )}

                        {existingSubmission ? (
                            <div className="already-submitted-container">
                                <div className="submitted-status-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>

                                <div className="submitted-status-badge">
                                    Registration Confirmed
                                </div>

                                <h2 className="submitted-heading">
                                    You’ve registered for Xcelerate-2K26!
                                </h2>

                                <p className="submitted-desc">
                                    Your response is safely recorded. Here is your official pass summary:
                                </p>

                                {/* ATTENDANCE PASS QR CODE */}
                                {passQrDataUrl && (
                                    <div className="pass-qr-card">
                                        <div className="pass-qr-header">
                                            <span>Universal Attendance Pass</span>
                                            <span className="pass-tag">Scan on Event Days</span>
                                        </div>
                                        <img src={passQrDataUrl} alt="Attendance Pass QR Code" className="pass-qr-image" />
                                        <div className="pass-token-code">{existingSubmission.qrToken}</div>
                                    </div>
                                )}

                                <div className="submitted-receipt-card">
                                    <div className="submitted-receipt-row">
                                        <span className="submitted-label">Attendee Name</span>
                                        <span className="submitted-val">{existingSubmission.name}</span>
                                    </div>
                                    <div className="submitted-receipt-row">
                                        <span className="submitted-label">Registration Number</span>
                                        <span className="submitted-val">{existingSubmission.registrationNumber}</span>
                                    </div>
                                    <div className="submitted-receipt-row">
                                        <span className="submitted-label">Branch &amp; Section</span>
                                        <span className="submitted-val">{existingSubmission.branch} - Sec {existingSubmission.section}</span>
                                    </div>
                                    <div className="submitted-receipt-row">
                                        <span className="submitted-label">Category</span>
                                        <span className="submitted-val">
                                            {existingSubmission.isAcmMember ? "🌟 ACM Member (Verified)" : "🎓 Regular Participant"}
                                        </span>
                                    </div>
                                    <div className="submitted-receipt-row">
                                        <span className="submitted-label">Payment Status</span>
                                        <span className="submitted-val" style={{ color: "#16a34a", fontWeight: "700" }}>
                                            {existingSubmission.paymentMode === "Offline" ? "Offline Desk (Cash)" : "Online (UPI)"}
                                        </span>
                                    </div>
                                    <div className="submitted-receipt-row">
                                        <span className="submitted-label">Email Confirmation</span>
                                        <span className="submitted-val">{existingSubmission.email}</span>
                                    </div>
                                </div>

                                <div className="submitted-notice-box">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    <div>
                                        Your personalized <strong>Attendance QR Code</strong> has also been sent to <strong>{existingSubmission.email}</strong>. Please take a screenshot of this pass!
                                    </div>
                                </div>

                                <div style={{ marginTop: "24px" }}>
                                    <button
                                        type="button"
                                        className="register-another-btn"
                                        onClick={handleRegisterAnother}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        Register Another Attendee
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* 3-PHASE PROGRESS NAV */}
                                <div className="stepper-nav">
                                    <div className="stepper-line-bg" />
                                    <div
                                        className="stepper-line-progress"
                                        style={{
                                            width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "92%",
                                        }}
                                    />

                                    {/* NODE 1 */}
                                    <button
                                        type="button"
                                        className={`step-node ${currentStep === 1 ? "active" : "completed"}`}
                                        onClick={() => {
                                            setCurrentStep(1);
                                            scrollToForm();
                                        }}
                                    >
                                        <div className="step-bubble">
                                            {currentStep > 1 ? (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            ) : (
                                                "1"
                                            )}
                                        </div>
                                        <span className="step-title">Membership</span>
                                    </button>

                                    {/* NODE 2 */}
                                    <button
                                        type="button"
                                        className={`step-node ${currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""}`}
                                        onClick={() => {
                                            if (currentStep > 2) {
                                                setCurrentStep(2);
                                                scrollToForm();
                                            }
                                        }}
                                        disabled={currentStep < 2}
                                    >
                                        <div className="step-bubble">
                                            {currentStep > 2 ? (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            ) : (
                                                "2"
                                            )}
                                        </div>
                                        <span className="step-title">Student Details</span>
                                    </button>

                                    {/* NODE 3 */}
                                    <button
                                        type="button"
                                        className={`step-node ${currentStep === 3 ? "active" : ""}`}
                                        disabled={currentStep < 3}
                                    >
                                        <div className="step-bubble">3</div>
                                        <span className="step-title">{isOfflineDesk ? "Offline Desk" : "Payment & Pass"}</span>
                                    </button>
                                </div>

                                {/* ========================================================
                                    PHASE 1: MEMBERSHIP CHECK & WHATSAPP NUMBER ONLY
                                ======================================================== */}
                                {currentStep === 1 && (
                                    <div className="step-pane">
                                        <div className="step-header-box">
                                            <span className="step-header-tag">Phase 01 of 03</span>
                                            <h3 className="step-header-title">ACM Chapter Membership Check</h3>
                                            <p className="step-header-desc">
                                                Select your membership status to proceed.
                                            </p>
                                        </div>

                                        {/* CHOICE CARDS */}
                                        <div className="membership-choice-container">
                                            <div className="membership-choice-label">
                                                Are you an ACM Chapter Member? <span className="req-star">*</span>
                                            </div>
                                            <div className="membership-cards-grid">
                                                <div
                                                    className={`membership-card ${membershipChoice === "yes" ? "active" : ""}`}
                                                    onClick={() => handleMembershipChoiceChange("yes")}
                                                >
                                                    <div className="card-radio-dot">
                                                        {membershipChoice === "yes" && <div className="dot-inner" />}
                                                    </div>
                                                    <div className="card-text-block">
                                                        <h4>🌟 Yes, I am an ACM Member</h4>
                                                        <p>Batch 2025 or 2nd-Year Lateral Member</p>
                                                    </div>
                                                </div>

                                                <div
                                                    className={`membership-card ${membershipChoice === "no" ? "active" : ""}`}
                                                    onClick={() => handleMembershipChoiceChange("no")}
                                                >
                                                    <div className="card-radio-dot">
                                                        {membershipChoice === "no" && <div className="dot-inner" />}
                                                    </div>
                                                    <div className="card-text-block">
                                                        <h4>🎓 No, Regular Participant</h4>
                                                        <p>General symposium attendee</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* IF ACM MEMBER: CLEAR NOTICE & WHATSAPP NUMBER INPUT */}
                                        {membershipChoice === "yes" && (
                                            <div className="phase1-phone-container">
                                                {/* PROMINENT ACM WHATSAPP GROUP NOTICE */}
                                                <div
                                                    className="acm-group-notice-banner"
                                                    style={{
                                                        background: "rgba(14, 165, 233, 0.12)",
                                                        border: "1.5px solid rgba(56, 189, 248, 0.4)",
                                                        borderRadius: "12px",
                                                        padding: "14px 16px",
                                                        marginBottom: "16px",
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: "12px",
                                                        boxShadow: "0 4px 14px rgba(2, 132, 199, 0.12)"
                                                    }}
                                                >
                                                    <span style={{ fontSize: "22px", lineHeight: "1" }}>📲</span>
                                                    <div>
                                                        <div style={{ color: "#38bdf8", fontWeight: "800", fontSize: "14px", marginBottom: "4px", letterSpacing: "0.2px" }}>
                                                            ACM WhatsApp Group Number Required
                                                        </div>
                                                        <div style={{ color: "#e2e8f0", fontSize: "13px", lineHeight: "1.5" }}>
                                                            Please enter the <strong>exact phone number that is currently added in your official ACM WhatsApp Group</strong>. Your membership is verified automatically using this number.
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="field">
                                                    <label>
                                                        <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                        Registered WhatsApp Number <span style={{ color: "#38bdf8", fontWeight: "600", fontSize: "12px" }}>(ACM Group Number)</span> <span className="req-star">*</span>
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="whatsappNumber"
                                                        value={formData.whatsappNumber}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                            setFormData((prev) => ({ ...prev, whatsappNumber: val }));
                                                            if (error) setError("");
                                                        }}
                                                        placeholder="10-digit number present in ACM WhatsApp group"
                                                        pattern="[0-9]{10}"
                                                        maxLength="10"
                                                        className="mobile-phone-input"
                                                    />
                                                    <span className="field-helper-text" style={{ color: "#94a3b8", display: "block", marginTop: "6px" }}>
                                                        ⚠️ <strong>Note:</strong> Must be the exact phone number added in the official ACM WhatsApp group.
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* ERROR NOTIFICATION */}
                                        {error && (
                                            <div className="error-message" style={{ margin: "16px 0 8px" }}>
                                                {error}
                                            </div>
                                        )}

                                        {/* PHASE 1 ACTION BUTTON */}
                                        <div className="step-nav-row" style={{ marginTop: "24px" }}>
                                            <button
                                                type="button"
                                                className="btn-nav-next"
                                                onClick={handleNextFromPhase1}
                                                disabled={memberLoading || !membershipChoice}
                                            >
                                                {memberLoading ? (
                                                    <span className="btn-spinner-content">
                                                        <span className="btn-spinner" />
                                                        Verifying Number...
                                                    </span>
                                                ) : (
                                                    <>
                                                        Next &bull; Student Details
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ========================================================
                                    PHASE 2: STUDENT DETAILS (AUTOFILLED OR MANUAL)
                                ======================================================== */}
                                {currentStep === 2 && (
                                    <div className="step-pane">
                                        <div className="step-header-box">
                                            <span className="step-header-tag">Phase 02 of 03</span>
                                            <h3 className="step-header-title">
                                                {formData.isAcmMember ? "Verified Member Details" : "Student Registration Details"}
                                            </h3>
                                            <p className="step-header-desc">
                                                {formData.isAcmMember
                                                    ? "Your ACM profile is verified. Fill in your college roll number and section to proceed."
                                                    : "Enter your academic and contact details for event registration."}
                                            </p>
                                        </div>

                                        {/* IF ACM MEMBER: SLEEK READ-ONLY VERIFIED CARD + ONLY REMAINING DETAILS */}
                                        {formData.isAcmMember ? (
                                            <>
                                                <div className="verified-member-card">
                                                    <div className="verified-card-header">
                                                        <div className="verified-pill">
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            Verified ACM Member
                                                        </div>
                                                    </div>
                                                    <div className="verified-info-grid">
                                                        <div className="verified-info-item">
                                                            <span className="info-label">Full Name</span>
                                                            <span className="info-value">{formData.name}</span>
                                                        </div>
                                                        <div className="verified-info-item">
                                                            <span className="info-label">Gmail</span>
                                                            <span className="info-value">{formData.email}@gmail.com</span>
                                                        </div>
                                                        <div className="verified-info-item">
                                                            <span className="info-label">Branch</span>
                                                            <span className="info-value">{formData.branch}</span>
                                                        </div>
                                                        <div className="verified-info-item">
                                                            <span className="info-label">WhatsApp</span>
                                                            <span className="info-value">{formData.whatsappNumber}</span>
                                                        </div>
                                                    </div>
                                                    <div className="verified-card-footer">
                                                        🔒 Verified from ACM 2025 Directory
                                                    </div>
                                                </div>

                                                <div className="remaining-fields-notice">
                                                    <strong>Please provide your college roll number and section:</strong>
                                                </div>

                                                <div className="grid-2-col">
                                                    {/* COLLEGE ROLL NO */}
                                                    <div className="field">
                                                        <label>
                                                            <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="13" y2="16"></line></svg>
                                                            College Roll Number (Reg No) <span className="req-star">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="registrationNumber"
                                                            value={formData.registrationNumber}
                                                            onChange={handleChange}
                                                            placeholder="e.g. 24B91A05XX"
                                                            style={{ textTransform: "uppercase" }}
                                                            required
                                                        />
                                                    </div>

                                                    {/* SECTION */}
                                                    <div className="field">
                                                        <label>
                                                            <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                                                            Section <span className="req-star">*</span>
                                                        </label>
                                                        <select
                                                            name="section"
                                                            value={formData.section}
                                                            onChange={handleChange}
                                                            required
                                                        >
                                                            <option value="">Select Section</option>
                                                            {SECTION_OPTIONS.map((sec) => (
                                                                <option key={sec} value={sec}>
                                                                    Section {sec}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            /* NON-MEMBER: MANUAL INPUTS */
                                            <>
                                                <div className="field">
                                                    <label>
                                                        <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                        Full Name <span className="req-star">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        placeholder="e.g. Gopala Krishna Saketh"
                                                        required
                                                    />
                                                </div>

                                                <div className="field">
                                                    <label>
                                                        <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                                        Gmail Address <span className="req-star">*</span>
                                                    </label>
                                                    <div className="email-input-wrapper">
                                                        <input
                                                            type="text"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            placeholder="Enter Gmail username"
                                                            required
                                                        />
                                                        <span className="gmail-suffix">@gmail.com</span>
                                                    </div>
                                                </div>

                                                <div className="field">
                                                    <label>
                                                        <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                        WhatsApp Number <span className="req-star">*</span>
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="whatsappNumber"
                                                        value={formData.whatsappNumber}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                            setFormData((prev) => ({ ...prev, whatsappNumber: val }));
                                                            if (error) setError("");
                                                        }}
                                                        placeholder="10-digit mobile number"
                                                        pattern="[0-9]{10}"
                                                        maxLength="10"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid-2-col">
                                                    <div className="field">
                                                        <label>
                                                            <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="13" y2="16"></line></svg>
                                                            College Roll Number <span className="req-star">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="registrationNumber"
                                                            value={formData.registrationNumber}
                                                            onChange={handleChange}
                                                            placeholder="e.g. 24B91A05XX"
                                                            style={{ textTransform: "uppercase" }}
                                                            required
                                                        />
                                                    </div>

                                                    <div className="field">
                                                        <label>
                                                            <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                                                            Section <span className="req-star">*</span>
                                                        </label>
                                                        <select
                                                            name="section"
                                                            value={formData.section}
                                                            onChange={handleChange}
                                                            required
                                                        >
                                                            <option value="">Select Section</option>
                                                            {SECTION_OPTIONS.map((sec) => (
                                                                <option key={sec} value={sec}>
                                                                    Section {sec}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="field">
                                                    <label>
                                                        <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                                                        Branch <span className="req-star">*</span>
                                                    </label>
                                                    <select
                                                        name="branch"
                                                        value={formData.branch}
                                                        onChange={handleChange}
                                                        required
                                                    >
                                                        <option value="">Select Branch</option>
                                                        {BRANCH_OPTIONS.map((branch) => (
                                                            <option key={branch} value={branch}>
                                                                {branch}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* ERROR NOTIFICATION */}
                                        {error && (
                                            <div className="error-message" style={{ margin: "16px 0 8px" }}>
                                                {error}
                                            </div>
                                        )}

                                        {/* STEP 2 ACTION BUTTONS */}
                                        <div className="step-nav-row" style={{ marginTop: "24px" }}>
                                            <button
                                                type="button"
                                                className="btn-nav-back"
                                                onClick={() => {
                                                    setError("");
                                                    setCurrentStep(1);
                                                    scrollToForm();
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                Back to Membership
                                            </button>

                                            <button
                                                type="button"
                                                className="btn-nav-next"
                                                onClick={handleNextFromPhase2}
                                            >
                                                {isOfflineDesk ? "Continue to Offline Desk" : "Continue to Payment"}
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ========================================================
                                    PHASE 3: PAYMENT, SCREENSHOT & UTR ID SUBMISSION
                                ======================================================== */}
                                {currentStep === 3 && (
                                    <form onSubmit={handleSubmit} noValidate className="step-pane">
                                        <div className="step-header-box">
                                            <span className="step-header-tag">Phase 03 of 03</span>
                                            <h3 className="step-header-title">
                                                {isOfflineDesk ? "Admin Offline Desk Confirmation" : "Registration Payment & Confirmation"}
                                            </h3>
                                            <p className="step-header-desc">
                                                {isOfflineDesk
                                                    ? "Verify cash receipt and issue attendance pass."
                                                    : "Scan the UPI QR, upload payment proof, and receive your attendance pass."}
                                            </p>
                                        </div>

                                        {/* SUMMARY BADGE */}
                                        <div className="checkout-summary-card">
                                            <div className="summary-row">
                                                <span className="summary-label">Attendee</span>
                                                <span className="summary-val">{formData.name}</span>
                                            </div>
                                            <div className="summary-row">
                                                <span className="summary-label">Roll No &amp; Branch</span>
                                                <span className="summary-val">{formData.registrationNumber} &bull; {formData.branch} (Sec {formData.section})</span>
                                            </div>
                                            <div className="summary-row">
                                                <span className="summary-label">Category</span>
                                                <span className="summary-val">
                                                    {formData.isAcmMember ? "🌟 ACM Member (Verified)" : "🎓 Regular Participant"}
                                                </span>
                                            </div>
                                            <div className="summary-row">
                                                <span className="summary-label">Payment Mode</span>
                                                <span className="summary-val" style={{ color: "#16a34a", fontWeight: "700" }}>
                                                    {isOfflineDesk ? "Offline Desk (Cash Collected)" : "Online (UPI)"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* ONLINE FLOW: QR CODE & PAYMENT UPLOADER */}
                                        {!isOfflineDesk && (
                                            <>
                                                {/* PAYMENT QR CARD */}
                                                <div className="payment-qr-card">
                                                    <h4>Scan &amp; Pay via UPI</h4>
                                                    <p className="payment-subtext">
                                                        Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM
                                                    </p>

                                                    <div className="upi-qr-display-box">
                                                        {upiQrDataUrl ? (
                                                            <img src={upiQrDataUrl} alt="UPI QR Code" className="upi-qr-img" />
                                                        ) : (
                                                            <div className="upi-qr-placeholder">Generating UPI QR...</div>
                                                        )}
                                                        <div className="upi-qr-badge">SRKR ACM UPI</div>
                                                    </div>

                                                    <div className="upi-copy-container">
                                                        <span className="upi-id-text">srkr.acm@upi</span>
                                                        <button
                                                            type="button"
                                                            className="copy-upi-btn"
                                                            onClick={copyUpiId}
                                                        >
                                                            {copiedUpi ? "Copied! ✓" : "Copy UPI ID"}
                                                        </button>
                                                    </div>

                                                    <p className="upi-note">
                                                        Pay fee via UPI, copy the 12-digit UTR ID, and upload screenshot below.
                                                    </p>
                                                </div>

                                                {/* PAYMENT SCREENSHOT UPLOADER */}
                                                <div className="file-upload-block">
                                                    <label>
                                                        <span>
                                                            Payment Transaction Screenshot <span className="req-star">*</span>
                                                        </span>
                                                        <span className="file-size-badge">Max 10 MB</span>
                                                    </label>

                                                    <input
                                                        type="file"
                                                        accept="image/png, image/jpeg, image/jpg, image/webp"
                                                        ref={paymentFileInputRef}
                                                        style={{ display: "none" }}
                                                        onChange={handlePaymentScreenshotChange}
                                                    />

                                                    {!previews.payment ? (
                                                        <div
                                                            className="file-dropzone"
                                                            onClick={() => paymentFileInputRef.current?.click()}
                                                        >
                                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                            <div className="file-dropzone-prompt">
                                                                <strong>Tap to upload</strong> PhonePe / UPI screenshot
                                                            </div>
                                                            <span className="file-dropzone-hint">
                                                                PNG, JPG or WEBP (Max 10 MB)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="file-preview-card">
                                                            <img src={previews.payment.url} alt="Payment Screenshot Preview" className="preview-thumb" />
                                                            <div className="preview-meta">
                                                                <div className="preview-name">{previews.payment.name}</div>
                                                                <div className="preview-size">{previews.payment.size} &bull; Ready</div>
                                                            </div>
                                                            <button type="button" className="preview-remove-btn" onClick={removePaymentScreenshot}>
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* UTR ID INPUT */}
                                                <div className="field" style={{ marginTop: "18px" }}>
                                                    <label>
                                                        <svg className="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                                                        Unique Transaction Reference (UTR) ID <span className="req-star">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="utrId"
                                                        value={formData.utrId}
                                                        onChange={handleChange}
                                                        placeholder="12-digit UTR ID from payment app"
                                                        style={{ textTransform: "uppercase" }}
                                                        required
                                                    />
                                                    <span className="field-helper-text">
                                                        Enter the 12-digit UTR / UPI Ref ID from your payment confirmation.
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {/* DECLARATION CHECKBOX */}
                                        <div className="declaration-container">
                                            <label className="declaration-label">
                                                <input
                                                    type="checkbox"
                                                    name="declarationConfirmed"
                                                    checked={formData.declarationConfirmed}
                                                    onChange={handleChange}
                                                    required
                                                />
                                                <span>
                                                    {isOfflineDesk
                                                        ? "I confirm that cash payment has been collected at the registration desk and student details are authentic."
                                                        : formData.isAcmMember
                                                        ? "I confirm that I am an active ACM Member and the submitted payment transaction reference is genuine."
                                                        : "I confirm that the details provided and payment screenshot are genuine and authentic."}
                                                </span>
                                            </label>
                                        </div>

                                        {/* ERROR BANNER */}
                                        {error && (
                                            <div className="error-message" style={{ margin: "16px 0 8px" }}>
                                                {error}
                                            </div>
                                        )}

                                        {/* STEP 3 ACTION BUTTONS */}
                                        <div className="step-nav-row" style={{ marginTop: "24px" }}>
                                            <button
                                                type="button"
                                                className="btn-nav-back"
                                                onClick={() => {
                                                    setError("");
                                                    setCurrentStep(2);
                                                    scrollToForm();
                                                }}
                                                disabled={loading}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                Back to Details
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn-nav-next btn-nav-submit"
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <span className="btn-spinner-content">
                                                        <span className="btn-spinner" />
                                                        Verifying UTR &amp; Registering...
                                                    </span>
                                                ) : (
                                                    <>
                                                        {isOfflineDesk ? "Register & Issue Cash Pass" : "Submit Registration"}
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* EVENT GUIDE & SYMPOSIUM DETAILS */}
                <section className="event-guide-section" id="event-guide">
                    <div className="event-guide-card">
                        <div className="event-guide-header">
                            <span className="event-guide-badge">Symposium Guide</span>
                            <h2 className="event-guide-title">Event Schedule &amp; Domains</h2>
                            <p className="event-guide-subtitle">
                                Day 1 theory sessions &bull; Day 2 dedicated full-day domain workshop.
                            </p>
                        </div>
                        {renderEventGuideBody()}
                    </div>
                </section>
            </main>

            {/* SECRET OFFLINE DESK PASSCODE MODAL */}
            {showOfflinePasscodeModal && (
                <div className="offline-modal-backdrop" onClick={() => setShowOfflinePasscodeModal(false)}>
                    <div className="offline-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="offline-modal-icon">🛠️</div>
                        <h3>Admin Offline Registration Desk</h3>
                        <p>Enter the master admin passcode to enable cash registration mode.</p>

                        <form onSubmit={handleUnlockOfflineDesk}>
                            <input
                                type="password"
                                value={offlinePasscodeInput}
                                onChange={(e) => setOfflinePasscodeInput(e.target.value)}
                                placeholder="Enter passcode"
                                className="offline-passcode-input"
                                autoFocus
                            />
                            {offlinePasscodeError && (
                                <div className="error-message" style={{ margin: "10px 0" }}>
                                    {offlinePasscodeError}
                                </div>
                            )}

                            <div className="offline-modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setShowOfflinePasscodeModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-confirm">
                                    Unlock Desk
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EVENT GUIDE MODAL */}
            {showEventModal && (
                <div className="event-modal-backdrop" onClick={() => setShowEventModal(false)}>
                    <div className="event-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="event-modal-header">
                            <div>
                                <span className="event-guide-badge">Event Guide</span>
                                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "4px 0 0" }}>
                                    Xcelerate-2K26 Schedule &amp; Domains
                                </h3>
                            </div>
                            <button
                                type="button"
                                className="event-modal-close-btn"
                                onClick={() => setShowEventModal(false)}
                                title="Close Guide"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        {renderEventGuideBody()}
                    </div>
                </div>
            )}

            {/* SUCCESS CONFIRMATION MODAL */}
            {successData && (
                <div className="success-modal-backdrop">
                    <div className="success-modal-card">
                        <div className="success-icon-badge">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>

                        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
                            Registration Successful! 🎉
                        </h2>

                        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 16px" }}>
                            Welcome to <strong>Xcelerate-2K26</strong>!
                        </p>

                        <div className="success-receipt-details">
                            <div className="receipt-row">
                                <span className="receipt-label">Student Name</span>
                                <span className="receipt-val">{successData.name}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Roll Number</span>
                                <span className="receipt-val">{successData.registrationNumber}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Branch &amp; Section</span>
                                <span className="receipt-val">{successData.branch} - Sec {successData.section}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Category</span>
                                <span className="receipt-val">
                                    {successData.isAcmMember ? "🌟 ACM Member (Verified)" : "Regular Attendee"}
                                </span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Payment Status</span>
                                <span className="receipt-val" style={{ color: "#16a34a", fontWeight: "700" }}>
                                    {successData.paymentMode === "Offline" ? "Offline Desk (Cash)" : "Online (UPI)"}
                                </span>
                            </div>
                            {successData.qrToken && (
                                <div className="receipt-row">
                                    <span className="receipt-label">Attendance Pass</span>
                                    <span className="receipt-val" style={{ color: "#2563eb", fontFamily: "monospace" }}>
                                        {successData.qrToken}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="success-email-notice">
                            Your official <strong>Attendance QR Pass</strong> has been sent to <strong>{successData.email}</strong>. Please present it for entry on both days!
                        </div>

                        <button
                            type="button"
                            className="success-modal-btn"
                            onClick={() => setSuccessData(null)}
                        >
                            Close &amp; View Pass
                        </button>
                    </div>
                </div>
            )}

            {/* SITE FOOTER */}
            <footer className="site-footer">
                <div className="footer-inner">
                    <p style={{ fontSize: "13px", color: "#64748b" }}>
                        &copy; 2026 SRKR ACM Student Chapter &bull; SRKR Engineering College (Autonomous)
                    </p>
                </div>
            </footer>
        </div>
    );
}
