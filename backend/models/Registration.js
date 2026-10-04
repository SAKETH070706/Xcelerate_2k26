import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        registrationNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        branch: {
            type: String,
            required: true,
            trim: true,
        },
        section: {
            type: String,
            required: true,
            enum: ["A", "B", "C", "D", "E", "F"],
            trim: true,
        },
        whatsappNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        isAcmMember: {
            type: Boolean,
            required: true,
            default: false,
        },
        aceId: {
            type: String,
            trim: true,
            default: null,
            index: true,
        },
        paymentMode: {
            type: String,
            enum: ["Online", "Offline"],
            default: "Online",
        },
        // Optional if paymentMode === "Offline"
        paymentScreenshot: {
            type: String,
            default: null,
        },
        // Optional if paymentMode === "Offline"
        utrId: {
            type: String,
            trim: true,
            default: null,
        },
        declarationConfirmed: {
            type: Boolean,
            required: true,
            default: true,
        },
        // Unique attendance token generated for all attendees
        qrToken: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            index: true,
        },
        attendanceMarked: {
            type: Boolean,
            default: false,
        },
        attendanceMarkedAt: {
            type: Date,
            default: null,
        },
        attendanceMarkedBy: {
            type: String,
            default: null,
        },
        emailStatus: {
            type: String,
            enum: ["Pending", "Sent", "Failed"],
            default: "Pending",
        },
        registeredAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Registration = mongoose.model("Registration", registrationSchema, "xcelerate_real_registrations");

export default Registration;