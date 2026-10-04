export const errorMiddleware = (
    error,
    req,
    res,
    next
) => {

    console.error(error);

    // MongoDB duplicate key error
    if (error.code === 11000) {

        const duplicateField =
            Object.keys(error.keyPattern || {})[0];

        let message =
            "A registration with these details already exists.";

        if (duplicateField === "email") {

            message =
                "This email is already registered.";

        } else if (duplicateField === "phone") {

            message =
                "This phone number is already registered.";

        } else if (duplicateField === "aceId") {

            message =
                "Unable to generate a unique ACE ID. Please try again.";

        }

        return res.status(409).json({
            success: false,
            message
        });
    }

    const statusCode =
        error.statusCode || 500;

    const isProd = process.env.NODE_ENV === "production";
    const message =
        isProd && statusCode === 500
            ? "Internal server error."
            : error.message || "Internal server error.";

    res.status(statusCode).json({
        success: false,
        message,
    });
};