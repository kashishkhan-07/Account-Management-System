import express from "express";
import { getBalance, deposit, withdraw, transfer } from "../controllers/accountController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All banking routes are protected by JWT Auth Middleware
router.get("/balance", protect, getBalance);
router.post("/deposit", protect, deposit);
router.post("/withdraw", protect, withdraw);
router.post("/transfer", protect, transfer);

export default router;