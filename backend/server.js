import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

/*
    Fail fast on missing required config instead of discovering
    it later when the first registration or admin login fails.
*/
const REQUIRED_ENV_VARS = [
  "MONGO_URI",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
];

const missingEnvVars = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key]
);

if (missingEnvVars.length > 0) {

    console.error(
        `FATAL ERROR: Missing required environment variables: ${missingEnvVars.join(", ")}`
    );

    process.exit(1);

}

if (!process.env.BACKEND_URL) {
    process.env.BACKEND_URL = `http://localhost:${PORT}`;
}

if (process.env.USE_CUSTOM_DNS === "true") {
    dns.setServers([
        "8.8.8.8",
        "8.8.4.4"
    ]);
}

const startServer = async () => {

    try {

        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {

            console.log(
                `Server running on http://localhost:${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "Failed to start server:",
            error.message
        );

        process.exit(1);

    }

};

startServer();