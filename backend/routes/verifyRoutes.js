import express from "express";
import { verifyCertificate, markAttendance } from "../controllers/verifyController.js";

const router = express.Router();

router.get("/:aceId", verifyCertificate);
router.post("/mark-attendance", markAttendance);

export default router;
