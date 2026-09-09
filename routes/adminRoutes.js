import express from "express";
import { getAllUsersWithBalances, updateUserStatus } from "../controllers/adminController.js";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";

const router = express.Router();

// Apply protect & adminOnly middleware to ALL admin endpoints
router.use(protect, adminOnly);

router.get("/users", getAllUsersWithBalances);
router.patch("/users/:userId/status", updateUserStatus);

export default router;