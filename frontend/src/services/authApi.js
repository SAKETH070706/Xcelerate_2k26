import axios from "axios";

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

const AUTH_STORAGE_KEY = "ace_portal_auth_token";

export const getStoredAuthToken = () => {
    try {
        return (
            sessionStorage.getItem(AUTH_STORAGE_KEY) ||
            localStorage.getItem(AUTH_STORAGE_KEY) ||
            null
        );
    } catch {
        return null;
    }
};

export const setStoredAuthToken = (token, remember = true) => {
    try {
        if (remember) {
            localStorage.setItem(AUTH_STORAGE_KEY, token);
        }
        sessionStorage.setItem(AUTH_STORAGE_KEY, token);
    } catch (e) {
        console.error("Failed to save auth token", e);
    }
};

export const clearStoredAuthToken = () => {
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to clear auth token", e);
    }
};

/**
 * Login by validating the code with the backend
 */
export const loginWithCode = async (code) => {
    API.defaults.baseURL = getBaseUrl();
    const base = (API.defaults.baseURL || "").replace(/\/+$/, "");
    const endpoint = base.endsWith("/api") ? "/auth/login" : "/api/auth/login";

    const response = await API.post(endpoint, { code });
    if (response.data && response.data.token) {
        setStoredAuthToken(response.data.token, true);
    }
    return response.data;
};

/**
 * Verify if stored session token is still valid
 */
export const verifySession = async (token) => {
    const activeToken = token || getStoredAuthToken();
    if (!activeToken) return false;

    API.defaults.baseURL = getBaseUrl();
    const base = (API.defaults.baseURL || "").replace(/\/+$/, "");
    const endpoint = base.endsWith("/api")
        ? "/auth/verify-session"
        : "/api/auth/verify-session";

    try {
        const response = await API.get(endpoint, {
            headers: {
                Authorization: `Bearer ${activeToken}`,
            },
        });
        return response.data && response.data.valid === true;
    } catch {
        clearStoredAuthToken();
        return false;
    }
};
