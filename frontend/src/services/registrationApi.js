import axios from "axios";

// Dynamically determine the backend API URL:
// 1. If VITE_API_URL is set to an external domain (production), use it.
// 2. If running in browser and accessed via a local network IP (e.g. 192.168.137.126:5173),
//    automatically route to http://<hostname>:5000/api so mobile devices connect seamlessly.
// 3. Otherwise fall back to http://localhost:5000/api.
const getBaseUrl = () => {
    const envUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        return envUrl;
    }

    if (typeof window !== "undefined" && window.location && window.location.hostname) {
        const hostname = window.location.hostname;
        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
            return `http://${hostname}:5000/api`;
        }
    }

    return envUrl || "http://localhost:5000/api";
};

const API = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Check if a 10-digit phone number is registered in the official 2025 ACM member database
 */
export const checkMemberPhone = async (phone) => {
    API.defaults.baseURL = getBaseUrl();
    const base = (API.defaults.baseURL || "").replace(/\/+$/, "");
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);

    const endpoint = base.endsWith("/api")
        ? `/registrations/check-member/${cleanPhone}`
        : `/api/registrations/check-member/${cleanPhone}`;

    const response = await API.get(endpoint);
    return response.data;
};

/**
 * Submit participant registration (online UPI or secret offline desk)
 */
export const registerParticipant = async (data) => {
    API.defaults.baseURL = getBaseUrl();

    const base = (API.defaults.baseURL || "").replace(/\/+$/, "");
    const endpoint = base.endsWith("/api")
        ? "/registrations"
        : "/api/registrations";

    const response = await API.post(
        endpoint,
        data
    );

    return response.data;
};
