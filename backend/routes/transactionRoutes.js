import express from "express";
import { getTransactionHistory } from "../controllers/transactionController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Protected by JWT Auth Middleware
router.get("/", protect, getTransactionHistory);

export default router;