import React, { useState } from "react";
import { loginWithCode } from "../services/authApi";
import aceLogo from "../assets/ace-logo.png";

export default function LoginPage({ onLoginSuccess }) {
    const [passcode, setPasscode] = useState("");
    const [showPasscode, setShowPasscode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isShaking, setIsShaking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const trimmedCode = passcode.trim();
        if (!trimmedCode) {
            setError("Please enter the access code to continue.");
            triggerShake();
            return;
        }

        setLoading(true);
        try {
            const res = await loginWithCode(trimmedCode);
            if (res.success) {
                onLoginSuccess(res.token);
            } else {
                setError(res.message || "Invalid access code. Please try again.");
                triggerShake();
            }
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                "Invalid access code or network connection error.";
            setError(msg);
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
    };

    return (
        <div className="login-screen-wrapper">
            <div className="login-backdrop-glow" />

            <div className={`login-card ${isShaking ? "shake-anim" : ""}`}>
                {/* Header / Brand */}
                <div className="login-header">
                    <div className="login-logo-container">
                        <img src={aceLogo} alt="ACM Logo" className="login-logo-img" />
                        <div className="logo-pulse-ring" />
                    </div>

                    <h1 className="login-title">
                        ACM <span className="highlight-text">Freshers Portal</span>
                    </h1>
                    <p className="login-subtitle">
                        Association for Computing Machinery &bull; SRKR Engineering College
                    </p>
                </div>

                {/* Security Badge */}
                <div className="login-security-badge">
                    <svg
                        className="badge-lock-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Authorized Access Only</span>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="login-form" noValidate>
                    <div className="login-input-group">
                        <label htmlFor="accessCodeInput" className="login-label">
                            Enter Portal Access Code
                        </label>

                        <div className="login-input-wrapper">
                            <span className="input-icon-left">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M21 2l-2 2m-1.5 1.5L16 7m-1.5 1.5L13 10m-1.5 1.5L10 13m-1.5 1.5L7 16m-1.5 1.5L4 19a2 2 0 0 1-2.83-2.83l1.83-1.83a2 2 0 0 1 2.83 0L7 16" />
                                    <circle cx="16.5" cy="7.5" r="3.5" />
                                </svg>
                            </span>

                            <input
                                id="accessCodeInput"
                                type={showPasscode ? "text" : "password"}
                                className={`login-input ${error ? "has-error" : ""}`}
                                placeholder="Enter access code..."
                                value={passcode}
                                onChange={(e) => {
                                    setPasscode(e.target.value);
                                    if (error) setError("");
                                }}
                                disabled={loading}
                                autoFocus
                                autoComplete="off"
                                spellCheck="false"
                            />

                            <button
                                type="button"
                                className="input-icon-right-btn"
                                onClick={() => setShowPasscode(!showPasscode)}
                                tabIndex={-1}
                                title={showPasscode ? "Hide Code" : "Show Code"}
                                aria-label={showPasscode ? "Hide Code" : "Show Code"}
                            >
                                {showPasscode ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="login-error-message" role="alert">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className={`login-submit-btn ${loading ? "is-loading" : ""}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="btn-loading-content">
                                <span className="login-spinner" />
                                Verifying Access...
                            </span>
                        ) : (
                            <span className="btn-normal-content">
                                <span>Unlock Portal</span>
                                <svg
                                    className="btn-arrow-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M5 12h14" />
                                    <path d="M12 5l7 7-7 7" />
                                </svg>
                            </span>
                        )}
                    </button>
                </form>

                {/* Footer Notes */}
                <div className="login-footer">
                    <p>Contact ACM coordinators if you don't have the pass key.</p>
                </div>
            </div>
        </div>
    );
}
